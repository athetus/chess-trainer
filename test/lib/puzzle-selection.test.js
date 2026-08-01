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

// Empty input should return empty results.
const { selected: s3, overflow: o3 } = selectPuzzles([], { perGameCap: 2, overallCap: 15 });
assert(s3.length === 0, `expected 0 selected from empty input, got ${s3.length}`);
assert(o3.length === 0, `expected 0 overflow from empty input, got ${o3.length}`);

// Combined per-game AND overall overflow in one scenario.
// Four games: A has [10, 9, 8], B has [7, 6, 5], C has [4, 3, 2], D has [1].
// With perGameCap: 2, overallCap: 3: should select [10, 9, 7], overflow everything else.
const combined = [
  fake('A', 10), fake('A', 9), fake('A', 8),
  fake('B', 7), fake('B', 6), fake('B', 5),
  fake('C', 4), fake('C', 3), fake('C', 2),
  fake('D', 1)
];
const { selected: s4, overflow: o4 } = selectPuzzles(combined, { perGameCap: 2, overallCap: 3 });
assert(s4.length === 3, `expected 3 selected with overallCap 3, got ${s4.length}`);
assert(s4[0].dropPawns === 10 && s4[1].dropPawns === 9 && s4[2].dropPawns === 7,
  'selected must be [10, 9, 7] worst-first');
const overflowDropPawns = o4.map(x => x.dropPawns).sort((a, b) => b - a);
const expectedOverflow = [8, 6, 5, 4, 3, 2, 1].sort((a, b) => b - a);
assert(overflowDropPawns.length === 7, `expected 7 overflow, got ${overflowDropPawns.length}`);
assert(overflowDropPawns.every((val, i) => val === expectedOverflow[i]),
  'overflow must contain [8, 6, 5, 4, 3, 2, 1]');

// Exact boundary: one game with exactly perGameCap (2) instances, all survive per-game.
// Overall instances exactly equal to overallCap, so no overflow from overall cap.
const boundary = [fake('g1', 5.0), fake('g1', 3.0)];
const { selected: s5, overflow: o5 } = selectPuzzles(boundary, { perGameCap: 2, overallCap: 2 });
assert(s5.length === 2, `expected 2 selected at exact boundary, got ${s5.length}`);
assert(o5.length === 0, `expected 0 overflow at exact boundary, got ${o5.length}`);

// Tie-breaking: two instances with identical dropPawns from different games.
const tieBreakerInstances = [fake('g1', 5.0), fake('g2', 5.0), fake('g3', 3.0)];
const { selected: s6, overflow: o6 } = selectPuzzles(tieBreakerInstances, { perGameCap: 1, overallCap: 2 });
assert(s6.length === 2, `expected 2 selected with tie-breaker, got ${s6.length}`);
assert(s6.every(x => x.dropPawns === 5.0), 'both selected should have dropPawns 5.0 (tied for worst)');
assert(o6.length === 1 && o6[0].dropPawns === 3.0, 'overflow should contain the 3.0 instance');

console.log('puzzle-selection.test.js: all assertions passed');
