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
const { buildPuzzle } = require('./lib/tactics-classifier');
const { selectPuzzles } = require('./lib/puzzle-selection');
const { writeStore } = require('./lib/puzzle-store');

const DEFAULT_CACHE_PATH = path.join(__dirname, '..', '.chesscom-diagnostic-cache.json');
const DEFAULT_STORE_PATH = path.join(__dirname, '..', 'tactics-puzzles.js');

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

if (require.main === module) {
  try {
    const { report } = buildPuzzles();
    console.log(report);
  } catch (e) {
    console.error('Puzzle build failed:', e.message);
    process.exitCode = 1;
  }
}

module.exports = { buildPuzzles, flaggedInstancesFromCache, buildPuzzleFromInstance };
