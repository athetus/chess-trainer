// test/lib/puzzle-selection.js
//
// Picks which of the user's real flagged mistakes become puzzles. The first
// version of this ranked purely by eval-swing severity (dropPawns desc) --
// mate scores are sentinel-encoded (1000 - mateDistance) so they always
// outrank material, and that filled all 15 slots with rare forced-mate
// positions while 195 instances of the most common error (a 1.5-3 pawn hang)
// never surfaced. Fixed category quotas instead, so the common leak always
// gets its own guaranteed slice regardless of how it compares to a blunder
// that hangs mate.

// A flagged instance covers both directions of "the user's own mistake":
// `blunder` (gave something up) and `missed-win` (had a winning position and
// let it slip) -- the user wants both, not just blunders. Mate-related
// instances (mateAllowed/mateMissed) get their own bucket regardless of which
// of those two categories produced them, since a forced mate is the most
// teachable pattern either way. Everything else partitions on |dropPawns|:
// 3+ is a catastrophic swing, 1.5-3 is the everyday hang.
const BUCKET_ORDER = ['mate', 'catastrophic', 'common'];
const CATASTROPHIC_THRESHOLD_PAWNS = 3;
const DEFAULT_QUOTAS = { mate: 5, catastrophic: 5, common: 5 };
const DEFAULT_PER_GAME_CAP = 2;

function bucketOf(inst) {
  if (inst.mateAllowed || inst.mateMissed) return 'mate';
  return Math.abs(inst.dropPawns) >= CATASTROPHIC_THRESHOLD_PAWNS ? 'catastrophic' : 'common';
}

function bySeverityDesc(a, b) {
  return Math.abs(b.dropPawns) - Math.abs(a.dropPawns);
}

// flaggedInstances: array of { gameId, dropPawns, mateAllowed, mateMissed, ...puzzle payload }.
// Returns { selected, overflow, counts } -- overflow carries every instance
// that was available but didn't make the cut (per-game cap or bucket quota),
// tagged with why, so callers can report what was left out instead of
// silently dropping the 195-instance leak the old ranking hid.
function selectPuzzles(flaggedInstances, { perGameCap = DEFAULT_PER_GAME_CAP, quotas = DEFAULT_QUOTAS } = {}) {
  const byBucket = new Map(BUCKET_ORDER.map(b => [b, []]));
  for (const inst of flaggedInstances) byBucket.get(bucketOf(inst)).push(inst);

  const selected = [];
  const overflow = [];
  const counts = { available: {}, selected: {} };

  for (const bucket of BUCKET_ORDER) {
    const instances = byBucket.get(bucket);
    counts.available[bucket] = instances.length;

    const byGame = new Map();
    for (const inst of instances) {
      if (!byGame.has(inst.gameId)) byGame.set(inst.gameId, []);
      byGame.get(inst.gameId).push(inst);
    }

    const afterPerGameCap = [];
    for (const gameInstances of byGame.values()) {
      const sorted = gameInstances.slice().sort(bySeverityDesc);
      afterPerGameCap.push(...sorted.slice(0, perGameCap));
      for (const inst of sorted.slice(perGameCap)) {
        overflow.push({ ...inst, bucket, reason: 'per-game-cap' });
      }
    }
    afterPerGameCap.sort(bySeverityDesc);

    const quota = quotas[bucket] || 0;
    for (const inst of afterPerGameCap.slice(0, quota)) selected.push({ ...inst, bucket });
    for (const inst of afterPerGameCap.slice(quota)) overflow.push({ ...inst, bucket, reason: 'quota' });

    counts.selected[bucket] = Math.min(quota, afterPerGameCap.length);
  }

  return { selected, overflow, counts };
}

module.exports = { selectPuzzles, bucketOf, BUCKET_ORDER, CATASTROPHIC_THRESHOLD_PAWNS, DEFAULT_QUOTAS, DEFAULT_PER_GAME_CAP };
