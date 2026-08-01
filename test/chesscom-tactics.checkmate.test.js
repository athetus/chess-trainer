// test/chesscom-tactics.checkmate.test.js
//
// Regression test for the "delivered checkmate flagged as missed win" bug:
// Stockfish's `mate: 0` eval is ambiguous between checkmate and stalemate, and
// the classifier's eval-only view was misreading a user's own checkmating
// move as "let the win slip" (before: mate-for-user, after: mate:0 -> treated
// as "not winning"). scanGame() now bypasses classification entirely for the
// literal final ply of a game that chess.js confirms ended in checkmate.
//
// This test stubs the engine to report a LARGE eval swing for the final move
// (as if it were a blunder) to prove the bypass works via chess.js's own
// in_checkmate() game-state check, not by accident because the stubbed eval
// happened to look fine.
const os = require('os');
const path = require('path');
const fs = require('fs');
const { runScan } = require('./chesscom-tactics');
const { writeStore } = require('./lib/puzzle-store');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

async function main() {
  const tmpStorePath = path.join(os.tmpdir(), `tactics-checkmate-store-${Date.now()}.js`);
  writeStore(tmpStorePath, { puzzles: [], processedGameIds: [] });

  // Fool's Mate: FakeUser plays Black and delivers Qh4# on the final move.
  // 1. f3 e5 2. g4 Qh4# -- Black's plies are 1 and 3; ply 3 (Qh4#) is the
  // literal final ply of the game and ends in checkmate.
  const fakeGame = {
    uuid: 'fixture-foolsmate',
    pgn: '1. f3 e5 2. g4 Qh4#',
    rules: 'chess',
    time_class: 'rapid',
    end_time: 1783257898,
    white: { username: 'opponent1', result: 'checkmated' },
    black: { username: 'FakeUser', result: 'win' },
  };

  let evalCallCount = 0;
  // Ply 1 (...e5): quiet, no mistake. Ply 3 (...Qh4#): deliberately scripted
  // as if it were a huge blunder (before: winning mate-in-1 for Black, after:
  // a large eval swing in White's favor) to prove the bypass is driven by
  // in_checkmate(), not by the stubbed eval happening to look benign.
  const evalSequence = [
    { cp: 10, mate: null },   // ply 1 (...e5) before: quiet
    { cp: 5, mate: null },    // ply 1 (...e5) after: quiet
    { cp: null, mate: -1 },   // ply 3 (...Qh4#) before: White-perspective mate-in-1 FOR Black
    { cp: 900, mate: null },  // ply 3 (...Qh4#) after: scripted as a huge eval swing AGAINST Black
  ];

  const fakeDeps = {
    getRecentGames: async () => [fakeGame],
    makeEngine: () => ({
      start: async () => {},
      evalFen: async () => evalSequence[evalCallCount++],
      bestMoveSan: async () => 'Qh4+', // deliberately NOT '#' -- would also prove nothing was reused by accident
      quit: () => {},
    }),
    storePath: tmpStorePath,
  };

  const result = await runScan('FakeUser', { months: 1, limitGames: null, deps: fakeDeps });

  assert(Array.isArray(result.puzzles), 'runScan must return a puzzles array');
  assert(result.puzzles.length === 0,
    `delivered checkmate on the final ply must NEVER produce a puzzle, even with a scripted "blunder" eval, got ${result.puzzles.length}`);
  assert(evalCallCount === 2,
    `expected only 2 evalFen calls (the quiet ...e5 ply) -- the checkmating final ply must be skipped entirely before eval, got ${evalCallCount} calls`);
  assert(typeof result.report === 'string' && /Flagged 0 instances/.test(result.report),
    `report should show zero flagged instances, got: ${JSON.stringify(result.report)}`);

  fs.unlinkSync(tmpStorePath);
  console.log('chesscom-tactics.checkmate.test.js: all assertions passed');
}

main().catch(e => { console.error('FAIL:', e); process.exit(1); });
