// test/lib/puzzle-selection.js

function selectPuzzles(flaggedInstances, { perGameCap = 2, overallCap = 15 } = {}) {
  const byGame = new Map();
  for (const inst of flaggedInstances) {
    if (!byGame.has(inst.gameId)) byGame.set(inst.gameId, []);
    byGame.get(inst.gameId).push(inst);
  }

  const afterPerGameCap = [];
  const perGameOverflow = [];
  for (const instances of byGame.values()) {
    const sorted = instances.slice().sort((a, b) => b.dropPawns - a.dropPawns);
    afterPerGameCap.push(...sorted.slice(0, perGameCap));
    perGameOverflow.push(...sorted.slice(perGameCap));
  }

  afterPerGameCap.sort((a, b) => b.dropPawns - a.dropPawns);
  const selected = afterPerGameCap.slice(0, overallCap);
  const overallOverflow = afterPerGameCap.slice(overallCap);

  return {
    selected,
    overflow: perGameOverflow.concat(overallOverflow),
  };
}

module.exports = { selectPuzzles };
