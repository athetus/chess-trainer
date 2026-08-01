// test/chesscom-tactics.js
const path = require('path');
const { Chess } = require('chess.js');
const { getRecentGames: realGetRecentGames } = require('./lib/chesscom-fetch');
const { StockfishEngine } = require('./lib/stockfish-engine');
const { classifyPly, buildPuzzle } = require('./lib/tactics-classifier');
const { selectPuzzles } = require('./lib/puzzle-selection');
const { readStore, writeStore, mergeNewPuzzles } = require('./lib/puzzle-store');

const STORE_PATH = path.join(__dirname, '..', 'tactics-puzzles.js');
const STOCKFISH_DEPTH = 15;

async function scanGame(game, username, deps) {
  const g = new Chess();
  g.load_pgn(game.pgn);
  const sanMoves = g.history();

  const userIsWhite = game.white.username.toLowerCase() === username.toLowerCase();
  const userColor = userIsWhite ? 'w' : 'b';

  const replay = new Chess();
  const fensBeforePly = [];
  for (let i = 0; i < sanMoves.length; i++) {
    fensBeforePly.push(replay.fen());
    replay.move(sanMoves[i]);
  }
  const fenAfterLast = replay.fen();

  const engine = deps.makeEngine();
  const flagged = [];
  try {
    // start() lives inside the try so a startup failure (e.g. Stockfish's real
    // start() can reject after up to a 30s handshake timeout) still routes
    // through the finally below and quits the already-spawned process instead
    // of leaking it.
    await engine.start();
    for (let ply = 0; ply < sanMoves.length; ply++) {
      const turnColor = ply % 2 === 0 ? 'w' : 'b';
      if (turnColor !== userColor) continue;

      const fenBefore = fensBeforePly[ply];
      const fenAfter = ply + 1 < fensBeforePly.length ? fensBeforePly[ply + 1] : fenAfterLast;
      const evalBefore = await engine.evalFen(fenBefore, STOCKFISH_DEPTH);
      const evalAfter = await engine.evalFen(fenAfter, STOCKFISH_DEPTH);

      const cat = classifyPly({ evalBefore, evalAfter, userColor });
      if (!cat) continue;

      const bestMoveSan = await engine.bestMoveSan(fenBefore, STOCKFISH_DEPTH);

      const puzzle = buildPuzzle({
        id: `tactics-${game.uuid}-ply${ply}`,
        sanMoves,
        plyIndex: ply,
        userColor,
        correctMoveSan: bestMoveSan,
        evalBefore,
        evalAfter,
        cat,
        gameMeta: {
          opponent: userIsWhite ? game.black.username : game.white.username,
          endTime: game.end_time,
          timeClass: game.time_class,
          url: game.url,
        },
      });
      // Reuse buildPuzzle's own dropPawns (computed via scoreToPawns/toUserPerspective)
      // for ranking severity, rather than recomputing it with different logic here --
      // one source of truth for "how bad was this" shared by the puzzle's own text
      // and the cross-game ranking in selectPuzzles (Task 4).
      flagged.push({ gameId: game.uuid, dropPawns: puzzle.dropPawns, puzzle });
    }
  } finally {
    engine.quit();
  }
  return flagged;
}

async function runScan(username, { months = 1, limitGames = null, deps = null } = {}) {
  // storePath defaults to the real repo file, but is overridable via deps so
  // tests never read/write the actual tactics-puzzles.js as a side effect.
  const effectiveDeps = deps || {
    getRecentGames: realGetRecentGames,
    makeEngine: () => new StockfishEngine(),
    storePath: STORE_PATH,
  };
  const storePath = effectiveDeps.storePath || STORE_PATH;

  let games = await effectiveDeps.getRecentGames(username, months);
  const existing = readStore(storePath);
  games = games.filter(g => !existing.processedGameIds.includes(g.uuid));
  if (limitGames) games = games.slice(0, limitGames);

  let allFlagged = [];
  const successfulGameIds = [];
  let failedCount = 0;
  for (const game of games) {
    try {
      const flagged = await scanGame(game, username, effectiveDeps);
      allFlagged.push(...flagged);
      successfulGameIds.push(game.uuid);
    } catch (err) {
      // Isolate one flaky game (bad PGN, engine timeout, unexpected null eval)
      // from the rest of a ~100-game run. Do NOT mark it processed -- it gets
      // retried next run instead of being silently skipped forever, and the
      // work already completed for earlier games is still persisted below.
      failedCount++;
      console.error(`Warning: failed to scan game ${game.url || game.uuid}: ${err && err.message ? err.message : err}`);
    }
  }

  const { selected, overflow } = selectPuzzles(allFlagged);
  const newPuzzles = selected.map(s => s.puzzle);
  const mergedPuzzles = mergeNewPuzzles(existing.puzzles, newPuzzles);
  const newProcessedIds = existing.processedGameIds.concat(successfulGameIds);

  writeStore(storePath, { puzzles: mergedPuzzles, processedGameIds: newProcessedIds });

  const report = [
    `Scanned ${games.length} games (${failedCount} failed, skipped) for ${username}.`,
    `Flagged ${allFlagged.length} instances, kept ${selected.length} as puzzles, ${overflow.length} named but not built (cap reached).`,
    ...selected.map(s => `  - [${s.puzzle.cat}] ${s.puzzle.name}: ${s.puzzle.result}`),
    ...(overflow.length > 0
      ? ['Named but not built (cap reached):', ...overflow.map(o => `  - ${o.puzzle.name}: ${o.puzzle.result}`)]
      : []),
  ].join('\n');

  return { puzzles: newPuzzles, report };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const username = args[0];
  if (!username) {
    console.error('Usage: node test/chesscom-tactics.js <username> [--months N] [--limit-games N]');
    process.exit(1);
  }
  const monthsIdx = args.indexOf('--months');
  const months = monthsIdx >= 0 ? parseInt(args[monthsIdx + 1], 10) : 1;
  const limitIdx = args.indexOf('--limit-games');
  const limitGames = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null;

  runScan(username, { months, limitGames })
    .then(({ report }) => console.log(report))
    .catch(e => { console.error('Scan failed:', e); process.exit(1); });
}

module.exports = { runScan };
