// test/build-tactics-puzzles.js
//
// Builds tactics-puzzles.js from the diagnostic's cached scan
// (.chesscom-diagnostic-cache.json) -- NOT a new Stockfish scan. The
// diagnostic already walks every user move and evaluates it; this only
// selects and formats the flagged ones (see docs/SESSION_HANDOFF.md for why
// a second scan was deliberately avoided). Run
// `node test/chesscom-diagnostic.js <user> --months 2` first if the cache is
// missing or stale for puzzle purposes (i.e. predates plyIndex/correctMoveSan).
const fs = require('fs');
const path = require('path');
const { buildPuzzle, resolveFollowUp } = require('./lib/tactics-classifier');
const { selectPuzzles } = require('./lib/puzzle-selection');
const { writeStore } = require('./lib/puzzle-store');

const DEFAULT_CACHE_PATH = path.join(__dirname, '..', '.chesscom-diagnostic-cache.json');
const DEFAULT_STORE_PATH = path.join(__dirname, '..', 'tactics-puzzles.js');
// Must match chesscom-diagnostic.js's STOCKFISH_DEPTH -- the follow-up PV is
// fetched at the same depth the cached correctMoveSan was found at, so PV[0]
// should agree with it (guarded below in case a sharp position disagrees
// across separate engine invocations anyway).
const FOLLOWUP_DEPTH = 15;

// Joins a cache's moveRecords (per-ply) with its gameSummaries (per-game) to
// produce one flagged instance per flagged ply, carrying everything
// buildPuzzle() needs. Records from a stale cache (scanned before plyIndex/
// correctMoveSan were added) are skipped, not crashed on.
function flaggedInstancesFromCache(cache) {
  const gameById = new Map(cache.gameSummaries.map(gs => [gs.gameId, gs]));
  const instances = [];
  let skippedStale = 0;
  let skippedSameMove = 0;
  for (const rec of cache.moveRecords) {
    if (!rec.cat) continue;
    if (rec.plyIndex == null || rec.correctMoveSan == null || !rec.evalBefore || !rec.evalAfter) {
      skippedStale++;
      continue;
    }
    const game = gameById.get(rec.gameId);
    if (!game || !game.sanMoves) {
      skippedStale++;
      continue;
    }
    // The eval-swing classifier flags a ply purely from the before/after eval
    // delta of the move actually played -- it never checks whether that move
    // was itself the engine's own top choice. In already-decided positions a
    // fixed-depth search sometimes sees further into a bad continuation than
    // the "before" search did, producing a real eval swing even when the
    // played move WAS the engine's best (~2% of flagged plies, mostly wild
    // endgames). Showing "you played X, correct was X" is nonsensical, so
    // these can never become a puzzle even though they're valid diagnostic
    // signal for the aggregate mistake-count.
    if (game.sanMoves[rec.plyIndex] === rec.correctMoveSan) {
      skippedSameMove++;
      continue;
    }
    instances.push({
      gameId: rec.gameId,
      dropPawns: rec.dropPawns,
      mateAllowed: rec.mateAllowed,
      mateMissed: rec.mateMissed,
      rec,
      game,
    });
  }
  return { instances, skippedStale, skippedSameMove };
}

function buildPuzzleFromInstance(inst) {
  const { rec, game } = inst;
  return buildPuzzle({
    id: `tactics-${rec.gameId}-ply${rec.plyIndex}`,
    sanMoves: game.sanMoves,
    plyIndex: rec.plyIndex,
    userColor: game.userColor,
    correctMoveSan: rec.correctMoveSan,
    evalBefore: rec.evalBefore,
    evalAfter: rec.evalAfter,
    cat: rec.cat,
    gameMeta: {
      opponent: game.opponent,
      endTime: game.endTime,
      timeClass: game.timeClass,
      url: game.url,
    },
  });
}

function buildPuzzles({ cachePath = DEFAULT_CACHE_PATH, storePath = DEFAULT_STORE_PATH, selectOpts = {} } = {}) {
  if (!fs.existsSync(cachePath)) {
    throw new Error(`No diagnostic cache at ${cachePath} -- run test/chesscom-diagnostic.js first (60-90 min).`);
  }
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const { instances, skippedStale, skippedSameMove } = flaggedInstancesFromCache(cache);
  const { selected, overflow, counts } = selectPuzzles(instances, selectOpts);

  const puzzles = selected.map(buildPuzzleFromInstance);
  writeStore(storePath, puzzles);

  const reportLines = [
    `Read ${cache.moveRecords.length} move records (${cache.gamesScanned} games) from ${cachePath}.`,
    skippedStale > 0 ? `Skipped ${skippedStale} flagged instance(s) from a stale part of the cache (missing plyIndex/correctMoveSan) -- re-run the diagnostic scan to pick them up.` : null,
    skippedSameMove > 0 ? `Skipped ${skippedSameMove} flagged instance(s) where the played move was already the engine's best (eval-swing classifier artifact, not a real puzzle).` : null,
    `Available: mate=${counts.available.mate}, catastrophic=${counts.available.catastrophic}, common=${counts.available.common}.`,
    `Selected: mate=${counts.selected.mate}, catastrophic=${counts.selected.catastrophic}, common=${counts.selected.common} (${puzzles.length} total) -> ${storePath}`,
    overflow.length > 0 ? `${overflow.length} flagged instance(s) not built (per-game cap or quota) -- not silently dropped, just not built into a puzzle this run.` : null,
    ...puzzles.map(p => `  - [${p.cat}] ${p.name}: ${p.result}`),
  ].filter(Boolean);

  return { puzzles, overflow, counts, report: reportLines.join('\n') };
}

// Extends each already-built puzzle's single corrective move into a short
// resolved sequence (engine's reply, your follow-up, ...) by asking Stockfish
// for its PV at the position right before the corrective move (replayed via
// chess.js from the puzzle's own moves/baseMoves -- never hand-built). Kept
// separate from buildPuzzles() deliberately: that function stays synchronous
// and untouched (its existing tests never exercise an engine), and this only
// ever runs over the final ~15 selected puzzles, not the hundreds of flagged
// instances buildPuzzles() selects from -- cheap regardless of archive size.
// Mutates and returns the given puzzles array; failures for one puzzle (no
// PV, or the fresh PV disagreeing with the already-cached correctMoveSan)
// just leave that puzzle at its original single-move length, never crash.
async function attachFollowUps(puzzles, { makeEngine, depth = FOLLOWUP_DEPTH } = {}) {
  const { Chess } = require('chess.js');
  const engine = makeEngine();
  await engine.start();
  try {
    for (const p of puzzles) {
      const g = new Chess();
      for (let i = 0; i < p.baseMoves; i++) g.move(p.moves[i]);
      const fen = g.fen();
      const correctMoveSan = p.moves[p.baseMoves];
      let pv;
      try {
        pv = await engine.principalVariationSan(fen, depth);
      } catch (e) {
        continue;
      }
      if (pv.sanMoves[0] !== correctMoveSan) continue; // engine disagreed across calls -- skip, don't guess
      const followUp = resolveFollowUp(pv.sanMoves.slice(1), pv.endsInMate);
      if (followUp.length === 0) continue;
      p.moves = p.moves.slice(0, p.baseMoves + 1).concat(followUp);
    }
  } finally {
    engine.quit();
  }
  return puzzles;
}

if (require.main === module) {
  (async () => {
    try {
      const { puzzles, report } = buildPuzzles();
      console.log(report);
      const { StockfishEngine } = require('./lib/stockfish-engine');
      console.log('Fetching follow-up sequences for ' + puzzles.length + ' puzzle(s)...');
      await attachFollowUps(puzzles, { makeEngine: () => new StockfishEngine() });
      writeStore(DEFAULT_STORE_PATH, puzzles);
      const withFollowUp = puzzles.filter(p => p.moves.length > p.baseMoves + 1).length;
      console.log(withFollowUp + '/' + puzzles.length + ' puzzle(s) got a multi-move follow-up sequence.');
    } catch (e) {
      console.error('Puzzle build failed:', e.message);
      process.exitCode = 1;
    }
  })();
}

module.exports = { buildPuzzles, flaggedInstancesFromCache, buildPuzzleFromInstance, attachFollowUps };
