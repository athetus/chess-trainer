// test/lib/tactics-classifier.js

const BLUNDER_THRESHOLD_PAWNS = 1.5;
const MISSED_WIN_CP_THRESHOLD = 3.0;

// Encodes a {cp, mate} eval as one comparable number, in pawn units. Mates are
// encoded far outside any realistic cp range (which rarely exceeds +-20) so they
// always dominate comparisons, while still ordering faster mates as more extreme
// than slower ones (mate in 1 > mate in 5, in absolute value).
function scoreToPawns({ cp, mate }) {
  if (mate !== null && mate !== undefined) {
    const magnitude = 1000 - Math.abs(mate);
    return mate > 0 ? magnitude : -magnitude;
  }
  return cp / 100;
}

// Stockfish evals are produced White-perspective (see stockfish-engine.js).
// Flip to the user's own color so "positive = good for the user" always holds.
function toUserPerspective(evalWhite, userColor) {
  if (userColor === 'w') return evalWhite;
  return {
    cp: evalWhite.cp === null ? null : -evalWhite.cp,
    mate: evalWhite.mate === null || evalWhite.mate === undefined ? null : -evalWhite.mate,
  };
}

function isWinningFor(evalUser) {
  if (evalUser.mate !== null && evalUser.mate !== undefined && evalUser.mate > 0) return true;
  return evalUser.cp !== null && evalUser.cp >= MISSED_WIN_CP_THRESHOLD * 100;
}

// Returns 'blunder', 'missed-win', or null. evalBefore/evalAfter are White-
// perspective {cp, mate} objects (straight from stockfish-engine.js).
function classifyPly({ evalBefore, evalAfter, userColor }) {
  const before = toUserPerspective(evalBefore, userColor);
  const after = toUserPerspective(evalAfter, userColor);

  // Still a forced mate for the user on both sides -- just a different
  // distance, not a mistake (e.g. mate in 2 becoming mate in 5).
  const bothForcedMateForUser =
    before.mate != null && before.mate > 0 &&
    after.mate != null && after.mate > 0;
  if (bothForcedMateForUser) return null;

  const wasWinningBig = isWinningFor(before);
  const stillWinningBig = isWinningFor(after);
  if (wasWinningBig && !stillWinningBig) return 'missed-win';

  const drop = scoreToPawns(before) - scoreToPawns(after);
  if (drop >= BLUNDER_THRESHOLD_PAWNS) {
    return wasWinningBig ? 'missed-win' : 'blunder';
  }
  return null;
}

// Produces human-readable text for the before -> after eval swing. `before`/
// `after` are already-user-perspective {cp, mate} objects (pre-sentinel).
// scoreToPawns()/dropPawns stay numeric and untouched for ranking purposes
// (see the comment there) -- this only controls the display text, so a mate
// evaluation never leaks its ~1000-point sentinel into copy shown to a human.
function describeSwing(before, after, dropPawns) {
  const missedForcedMate =
    before.mate != null && before.mate > 0 &&
    !(after.mate != null && after.mate > 0);
  if (missedForcedMate) {
    return {
      resultPhrase: `missed a forced mate in ${before.mate}`,
      explanationPhrase: `missing a forced mate in ${before.mate}`,
    };
  }

  const allowsForcedMate = after.mate != null && after.mate < 0;
  if (allowsForcedMate) {
    const n = Math.abs(after.mate);
    return {
      resultPhrase: `allows a forced mate against you in ${n}`,
      explanationPhrase: `allowing a forced mate against you in ${n}`,
    };
  }

  const display = dropPawns.toFixed(1);
  return {
    resultPhrase: `drops ${display} pawns`,
    explanationPhrase: `dropping ${display} pawns`,
  };
}

function buildPuzzle({ id, sanMoves, plyIndex, userColor, correctMoveSan, evalBefore, evalAfter, cat, gameMeta }) {
  const prefix = sanMoves.slice(0, plyIndex);
  const moves = prefix.concat([correctMoveSan]);
  const before = toUserPerspective(evalBefore, userColor);
  const after = toUserPerspective(evalAfter, userColor);
  const dropPawns = scoreToPawns(before) - scoreToPawns(after);
  const swing = describeSwing(before, after, dropPawns);
  const actualMoveSan = sanMoves[plyIndex];
  const moveNumber = Math.floor(plyIndex / 2) + 1;

  return {
    id,
    name: `Tactics: ${gameMeta.opponent}, ${new Date(gameMeta.endTime * 1000).toISOString().slice(0, 10)}`,
    description: `From a real ${gameMeta.timeClass} game vs ${gameMeta.opponent}.`,
    result: `Move ${moveNumber}: you played ${actualMoveSan} (${swing.resultPhrase}, ${gameMeta.timeClass}). Correct was ${correctMoveSan}.`,
    isTrap: false,
    cat,
    moves,
    explanations: { [String(plyIndex)]: `You played ${actualMoveSan} here, ${swing.explanationPhrase}. ${correctMoveSan} was correct.` },
    baseMoves: plyIndex,
    playerColor: userColor,
    dropPawns,
  };
}

module.exports = { scoreToPawns, toUserPerspective, classifyPly, buildPuzzle, describeSwing, BLUNDER_THRESHOLD_PAWNS, MISSED_WIN_CP_THRESHOLD };
