// test/chesscom-tactics.smoke.test.js
const os = require('os');
const path = require('path');
const fs = require('fs');
const { runScan } = require('./chesscom-tactics');
const { writeStore } = require('./lib/puzzle-store');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

async function main() {
  const tmpStorePath = path.join(os.tmpdir(), `tactics-smoke-store-${Date.now()}.js`);
  writeStore(tmpStorePath, { puzzles: [], processedGameIds: [] });

  // FakeUser plays White: 1.e4 e5 2.Nf3 Nc6 3.Bc4 -- White's plies are 0, 2, 4.
  // The scripted eval sequence below makes ply 4 (Bc4) a blunder; plies 0 and 2 are quiet.
  const fakeGame = {
    uuid: 'fixture-game-1',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    rules: 'chess',
    time_class: 'rapid',
    end_time: 1783257898,
    white: { username: 'FakeUser', result: 'resigned' },
    black: { username: 'opponent1', result: 'win' },
  };

  let evalCallCount = 0;
  // Called twice per user ply (before/after): ply0, ply2, ply4 x 2 = 6 calls, in order.
  const evalSequence = [
    { cp: 20, mate: null }, { cp: 15, mate: null },   // ply 0 (e4): before/after, quiet
    { cp: 15, mate: null }, { cp: 25, mate: null },   // ply 2 (Nf3): before/after, quiet
    { cp: 25, mate: null }, { cp: -200, mate: null }, // ply 4 (Bc4): before/after, scripted blunder
  ];

  const fakeDeps = {
    getRecentGames: async () => [fakeGame],
    makeEngine: () => ({
      start: async () => {},
      evalFen: async () => evalSequence[evalCallCount++],
      bestMoveSan: async () => 'd3',
      quit: () => {},
    }),
    storePath: tmpStorePath,
  };

  const result = await runScan('FakeUser', { months: 1, limitGames: null, deps: fakeDeps });
  assert(Array.isArray(result.puzzles), 'runScan must return a puzzles array');
  assert(result.puzzles.length === 1, `expected exactly one scripted blunder to produce a puzzle, got ${result.puzzles.length}`);
  assert(result.puzzles[0].moves[result.puzzles[0].baseMoves] === 'd3',
    "the puzzle's final move must be the stubbed correct move, not the real Bc4");
  assert(result.puzzles[0].baseMoves === 4, `expected baseMoves to be the blunder's ply index (4), got ${result.puzzles[0].baseMoves}`);
  assert(typeof result.report === 'string' && result.report.includes('Bc4'),
    'report should mention the actual blunder move played');

  fs.unlinkSync(tmpStorePath);
  console.log('chesscom-tactics.smoke.test.js: all assertions passed');
}

main().catch(e => { console.error('FAIL:', e); process.exit(1); });
