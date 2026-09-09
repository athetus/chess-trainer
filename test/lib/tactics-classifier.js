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

// How far past the corrective move a puzzle continues, and where it stops.
// A puzzle that ends the instant you find the fix never shows why the fix
// mattered -- no opponent reply, no visible payoff. followUpSan is the PV
// AFTER the corrective move (engine's reply, your follow-up, ...); this trims
// it down to "until the tactic resolves":
//   - a PV that ends in forced mate is used in full (mate IS the resolution)
//   - otherwise, the opponent's immediate reply is always kept (you need to
//     see the position settle), then extended only through further forcing
//     moves (captures/checks) -- the first quiet move means the point has
//     already been made and anything after is just technique, not the tactic
//   - hard-capped regardless, so a messy PV can't balloon a puzzle
const MAX_FOLLOWUP_PLIES = 8;
function resolveFollowUp(pvAfterCorrectMove, endsInMate) {
  if (!pvAfterCorrectMove || pvAfterCorrectMove.length === 0) return [];
  const capped = pvAfterCorrectMove.slice(0, MAX_FOLLOWUP_PLIES);
  if (endsInMate) return capped;
  if (capped.length === 0) return [];
  // capped[0] is the opponent's immediate reply to the corrective move -- always
  // keep it, you need to see the position settle. From there, capped[1],[3],[5]...
  // are YOUR moves; walk them in (your move, their reply) pairs and keep extending
  // through a pair as long as your move in it is forcing (capture/check) -- their
  // reply is included too since it's the direct, usually forced, consequence of
  // your forcing move, not a free choice. Stop at the first pair where your move
  // is quiet: the tactic has already made its point, anything past that is just
  // technique.
  var cut = 1;
  for (var i = 1; i < capped.length; i += 2) {
    var yourMove = capped[i];
    var forcing = yourMove.indexOf('x') >= 0 || yourMove.indexOf('+') >= 0 || yourMove.indexOf('#') >= 0;
    if (!forcing) break;
    cut = Math.min(i + 2, capped.length);
  }
  return capped.slice(0, cut);
}

function buildPuzzle({ id, sanMoves, plyIndex, userColor, correctMoveSan, evalBefore, evalAfter, cat, gameMeta, followUpSan }) {
  const prefix = sanMoves.slice(0, plyIndex);
  const moves = prefix.concat([correctMoveSan]).concat(followUpSan || []);
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

module.exports = { scoreToPawns, toUserPerspective, classifyPly, buildPuzzle, describeSwing, resolveFollowUp, MAX_FOLLOWUP_PLIES, BLUNDER_THRESHOLD_PAWNS, MISSED_WIN_CP_THRESHOLD };
