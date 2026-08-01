// test/lib/puzzle-selection.test.js
const { selectPuzzles, bucketOf } = require('./puzzle-selection');

function assert(cond, msg) {
  if (!cond) { throw new Error('FAIL: ' + msg); }
}

function makeInstances(n, { gameId, dropPawns, mateAllowed = false, mateMissed = false }) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ gameId: gameId(i), dropPawns, mateAllowed, mateMissed, id: `${gameId(i)}-${i}` });
  }
  return out;
}

function main() {
  // --- bucketOf partitions correctly ---
  {
    assert(bucketOf({ dropPawns: 2.0, mateAllowed: false, mateMissed: false }) === 'common', 'a 2.0 pawn drop should bucket as common');
    assert(bucketOf({ dropPawns: 5.0, mateAllowed: false, mateMissed: false }) === 'catastrophic', 'a 5.0 pawn drop should bucket as catastrophic');
    assert(bucketOf({ dropPawns: 1.0, mateAllowed: true, mateMissed: false }) === 'mate', 'mateAllowed always buckets as mate regardless of dropPawns');
    assert(bucketOf({ dropPawns: 40, mateAllowed: false, mateMissed: true }) === 'mate', 'mateMissed always buckets as mate even with a huge sentinel-encoded drop');
  }

  // --- the regression this whole rewrite exists to fix: the common band must
  // surface even when a handful of mate instances exist, not get crowded out
  // by sentinel-encoded eval swings ---
  {
    const mateInstances = makeInstances(3, { gameId: i => `mate-game-${i}`, dropPawns: 995, mateAllowed: true });
    const commonInstances = makeInstances(20, { gameId: i => `common-game-${i}`, dropPawns: 2.0 });
    const { selected, counts } = selectPuzzles([...mateInstances, ...commonInstances]);

    const commonSelected = selected.filter(s => s.bucket === 'common');
    assert(commonSelected.length === 5, `expected 5 common puzzles selected regardless of mate instances present, got ${commonSelected.length}`);
    assert(counts.available.common === 20, `expected 20 common instances available, got ${counts.available.common}`);
    assert(counts.selected.mate === 3, `expected only the 3 real mate instances selected (quota is 5 but only 3 exist), got ${counts.selected.mate}`);
  }

  // --- per-game cap: one bad game can't dominate a bucket ---
  {
    const oneGame = makeInstances(6, { gameId: () => 'same-game', dropPawns: 2.0 });
    const { selected, overflow } = selectPuzzles(oneGame);
    const fromThatGame = selected.filter(s => s.gameId === 'same-game');
    assert(fromThatGame.length === 2, `expected per-game cap of 2, got ${fromThatGame.length}`);
    const capOverflow = overflow.filter(o => o.reason === 'per-game-cap');
    assert(capOverflow.length === 4, `expected 4 instances reported as per-game-cap overflow, got ${capOverflow.length}`);
  }

  // --- quota overflow is reported, not silently dropped ---
  {
    const manyCommon = makeInstances(30, { gameId: i => `game-${i}`, dropPawns: 1.6 });
    const { selected, overflow, counts } = selectPuzzles(manyCommon);
    const commonSelected = selected.filter(s => s.bucket === 'common');
    assert(commonSelected.length === 5, `expected quota of 5, got ${commonSelected.length}`);
    const quotaOverflow = overflow.filter(o => o.reason === 'quota' && o.bucket === 'common');
    assert(quotaOverflow.length === 25, `expected the remaining 25 reported as quota overflow, got ${quotaOverflow.length}`);
    assert(counts.available.common === 30, `available count should reflect all 30, got ${counts.available.common}`);
  }

  // --- severity ordering within a bucket: worse instances win the quota slots ---
  {
    const instances = [
      { gameId: 'g1', dropPawns: 1.6, id: 'small' },
      { gameId: 'g2', dropPawns: 2.9, id: 'big' },
      { gameId: 'g3', dropPawns: 1.7, id: 'medium' },
    ];
    const { selected } = selectPuzzles(instances, { quotas: { mate: 5, catastrophic: 5, common: 2 } });
    const ids = selected.filter(s => s.bucket === 'common').map(s => s.id);
    assert(ids.length === 2 && ids[0] === 'big' && ids[1] === 'medium', `expected the two most severe common instances selected in severity order, got ${JSON.stringify(ids)}`);
  }

  console.log('puzzle-selection.test.js: all assertions passed');
}

main();
