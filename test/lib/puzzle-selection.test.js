// test/lib/puzzle-selection.test.js
const { selectPuzzles } = require('./puzzle-selection');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

function fake(gameId, dropPawns) {
  return { gameId, dropPawns, puzzle: { id: `${gameId}-${dropPawns}`, dropPawns } };
}

// 3 instances from the same game, only 2 should survive the per-game cap, worst first.
const sameGame = [fake('g1', 2.0), fake('g1', 5.0), fake('g1', 1.6)];
const { selected: s1, overflow: o1 } = selectPuzzles(sameGame, { perGameCap: 2, overallCap: 15 });
assert(s1.length === 2, `expected 2 survivors from per-game cap, got ${s1.length}`);
assert(s1[0].dropPawns === 5.0 && s1[1].dropPawns === 2.0, 'per-game survivors must be the two worst, worst first');
assert(o1.length === 1 && o1[0].dropPawns === 1.6, 'the mildest of the three should be the overflow');

// Overall cap across many games.
const manyGames = Array.from({ length: 20 }, (_, i) => fake(`g${i}`, i));
const { selected: s2, overflow: o2 } = selectPuzzles(manyGames, { perGameCap: 2, overallCap: 15 });
assert(s2.length === 15, `expected the overall cap of 15, got ${s2.length}`);
assert(s2[0].dropPawns === 19, 'worst instance overall must be first');
assert(o2.length === 5, `expected 5 overflowed beyond the cap of 15, got ${o2.length}`);

console.log('puzzle-selection.test.js: all assertions passed');
