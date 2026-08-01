const fs = require('fs');
const os = require('os');
const path = require('path');
const { readStore, writeStore, mergeNewPuzzles } = require('./puzzle-store');

function assert(cond, msg) {
  if (!cond) { throw new Error('FAIL: ' + msg); }
}

const tmpFile = path.join(os.tmpdir(), `puzzle-store-test-${Date.now()}.js`);

try {
  // Start from nothing.
  writeStore(tmpFile, { puzzles: [], processedGameIds: [] });
  let store = readStore(tmpFile);
  assert(store.puzzles.length === 0 && store.processedGameIds.length === 0, 'fresh store should be empty');

  // Write some puzzles + processed ids, read them back.
  const puzzleA = { id: 'a', name: 'A', moves: ['e4'], baseMoves: 0, playerColor: 'w', cat: 'blunder', explanations: {} };
  writeStore(tmpFile, { puzzles: [puzzleA], processedGameIds: ['game-1'] });
  store = readStore(tmpFile);
  assert(store.puzzles.length === 1 && store.puzzles[0].id === 'a', 'should read back the written puzzle');
  assert(store.processedGameIds[0] === 'game-1', 'should read back the processed game id');

  // Merge: adding a puzzle with a new id keeps both; re-adding the same id doesn't duplicate.
  const puzzleB = { id: 'b', name: 'B', moves: ['d4'], baseMoves: 0, playerColor: 'b', cat: 'missed-win', explanations: {} };
  const merged = mergeNewPuzzles([puzzleA], [puzzleB, puzzleA]);
  assert(merged.length === 2, `expected 2 unique puzzles after merge, got ${merged.length}`);

  console.log('puzzle-store.test.js: all assertions passed');
} finally {
  fs.unlinkSync(tmpFile);
}
