// test/lib/tactics-classifier.test.js
const {
  scoreToPawns,
  toUserPerspective,
  classifyPly,
  buildPuzzle,
  resolveFollowUp,
  MAX_FOLLOWUP_PLIES,
} = require('./tactics-classifier');

function assert(cond, msg) {
  // Must throw, never process.exit() -- exit skips finally blocks and leaks
  // temp files (see CLAUDE.md's Testing section). Fixed while touching this
  // file for the follow-up-sequence tests below; pre-existing violation.
  if (!cond) { throw new Error('FAIL: ' + msg); }
}

// --- scoreToPawns ---
assert(scoreToPawns({ cp: 150, mate: null }) === 1.5, 'plain cp should convert to pawns directly');
assert(scoreToPawns({ cp: null, mate: 3 }) > 100, 'a mate-for should score far above any realistic cp swing');
assert(scoreToPawns({ cp: null, mate: -3 }) < -100, 'a mate-against should score far below any realistic cp swing');
assert(scoreToPawns({ cp: null, mate: 1 }) > scoreToPawns({ cp: null, mate: 5 }),
  'a faster mate-for should score higher than a slower one');

// --- toUserPerspective ---
assert(toUserPerspective({ cp: 200, mate: null }, 'w').cp === 200, 'White perspective unchanged for White user');
assert(toUserPerspective({ cp: 200, mate: null }, 'b').cp === -200, 'flips sign for Black user');

// --- classifyPly: plain blunder ---
assert(classifyPly({
  evalBefore: { cp: 20, mate: null }, evalAfter: { cp: -200, mate: null }, userColor: 'w',
}) === 'blunder', 'a 2.2 pawn drop should be a blunder');

// --- classifyPly: no flag for a small/normal move ---
assert(classifyPly({
  evalBefore: { cp: 20, mate: null }, evalAfter: { cp: 10, mate: null }, userColor: 'w',
}) === null, 'a small eval change should not be flagged');

// --- classifyPly: mate-against counts as blunder ---
assert(classifyPly({
  evalBefore: { cp: 30, mate: null }, evalAfter: { cp: null, mate: -4 }, userColor: 'w',
}) === 'blunder', 'allowing a forced mate against the user should be a blunder');

// --- classifyPly: missed win via cp ---
assert(classifyPly({
  evalBefore: { cp: 400, mate: null }, evalAfter: { cp: 100, mate: null }, userColor: 'w',
}) === 'missed-win', 'dropping from +4.0 to +1.0 should be a missed win, not a plain blunder');

// --- classifyPly: missed win via mate disappearing ---
assert(classifyPly({
  evalBefore: { cp: null, mate: 3 }, evalAfter: { cp: 150, mate: null }, userColor: 'w',
}) === 'missed-win', 'losing a forced mate but staying up material should be a missed win');

// --- classifyPly: mate-in-2 to mate-in-5 is NOT a missed win (still winning by force) ---
assert(classifyPly({
  evalBefore: { cp: null, mate: 2 }, evalAfter: { cp: null, mate: 5 }, userColor: 'w',
}) === null, 'a slower mate is still a won position, must not be flagged');

// --- classifyPly: works from Black's perspective too ---
assert(classifyPly({
  evalBefore: { cp: 20, mate: null }, evalAfter: { cp: 220, mate: null }, userColor: 'b',
}) === 'blunder', 'a 2 pawn drop for Black (White cp went up) should be a blunder for Black');

// --- classifyPly: large collapse within winning range is a missed-win, not null ---
assert(classifyPly({
  evalBefore: { cp: 1000, mate: null }, evalAfter: { cp: 310, mate: null }, userColor: 'w',
}) === 'missed-win', 'a 6.9 pawn drop from +10 to +3.1 (both winning) is a missed-win, not null');

// --- buildPuzzle ---
const puzzleEvalBefore = { cp: 20, mate: null };
const puzzleEvalAfter = { cp: -180, mate: null };
const puzzleCat = classifyPly({ evalBefore: puzzleEvalBefore, evalAfter: puzzleEvalAfter, userColor: 'w' });
const puzzle = buildPuzzle({
  id: 'tactics-2026-07-15-abc123-ply22',
  sanMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7'],
  plyIndex: 10, // 0-based index of the user's actual (bad) move -- 'Nxf7' in this example, replaced below
  userColor: 'w',
  correctMoveSan: 'd3',
  evalBefore: puzzleEvalBefore,
  evalAfter: puzzleEvalAfter,
  cat: puzzleCat,
  gameMeta: { opponent: 'someuser', endTime: 1783257898, timeClass: 'rapid', url: 'https://www.chess.com/game/live/123' },
});
assert(puzzle.moves.length === 11, 'puzzle moves should be the prefix (10 real plies) plus 1 corrected move');
assert(puzzle.moves[10] === 'd3', 'the final move must be the corrected move, not the real blunder');
assert(puzzle.moves.slice(0, 10).join(',') === ['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5','d5','exd5','Nxd5'].join(','),
  'the prefix must be the real game moves unchanged');
assert(puzzle.baseMoves === 10, 'baseMoves must equal the ply index so the engine auto-plays exactly up to the mistake');
assert(puzzle.playerColor === 'w', 'playerColor must be set per-puzzle');
assert(puzzle.cat === 'blunder', 'a >1.5 pawn drop from a modest position should be categorized as a blunder');
assert(typeof puzzle.dropPawns === 'number' && Math.abs(puzzle.dropPawns - 2.0) < 0.01,
  `expected dropPawns to be the before/after pawn difference (~2.0), got ${puzzle.dropPawns}`);
assert(typeof puzzle.explanations['10'] === 'string' && puzzle.explanations['10'].length > 0,
  'must have an explanation keyed at the corrected-move index');

// --- buildPuzzle: missed forced mate must not leak the sentinel number into text ---
const missedMateEvalBefore = { cp: null, mate: 12 };
const missedMateEvalAfter = { cp: 0, mate: null };
const missedMatePuzzle = buildPuzzle({
  id: 'tactics-missed-mate',
  sanMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng3', 'd6', 'd3', 'Bg4'],
  plyIndex: 8,
  userColor: 'w',
  correctMoveSan: 'Kh8',
  evalBefore: missedMateEvalBefore,
  evalAfter: missedMateEvalAfter,
  cat: 'missed-win',
  gameMeta: { opponent: 'someuser', endTime: 1783257898, timeClass: 'rapid', url: '' },
});
assert(!/\d{3,}/.test(missedMatePuzzle.result), `missed-mate result text must not contain a raw sentinel number, got: ${missedMatePuzzle.result}`);
assert(missedMatePuzzle.result.includes('forced mate in 12'), `missed-mate result text should describe the missed mate, got: ${missedMatePuzzle.result}`);
assert(missedMatePuzzle.explanations['8'].includes('forced mate in 12'), `missed-mate explanation should describe the missed mate, got: ${missedMatePuzzle.explanations['8']}`);
assert(missedMatePuzzle.dropPawns > 900, `dropPawns must still carry the large sentinel-based number unchanged, got: ${missedMatePuzzle.dropPawns}`);

// --- buildPuzzle: allowing a forced mate against the user must not leak the sentinel number into text ---
const allowsMateEvalBefore = { cp: 30, mate: null };
const allowsMateEvalAfter = { cp: null, mate: -4 };
const allowsMatePuzzle = buildPuzzle({
  id: 'tactics-allows-mate',
  sanMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng3', 'd6', 'd3', 'Bg4'],
  plyIndex: 8,
  userColor: 'w',
  correctMoveSan: 'Kh8',
  evalBefore: allowsMateEvalBefore,
  evalAfter: allowsMateEvalAfter,
  cat: 'blunder',
  gameMeta: { opponent: 'someuser', endTime: 1783257898, timeClass: 'rapid', url: '' },
});
assert(!/\d{3,}/.test(allowsMatePuzzle.result), `allows-mate result text must not contain a raw sentinel number, got: ${allowsMatePuzzle.result}`);
assert(allowsMatePuzzle.result.includes('forced mate against you in 4'), `allows-mate result text should describe the mate allowed, got: ${allowsMatePuzzle.result}`);
assert(allowsMatePuzzle.explanations['8'].includes('forced mate against you in 4'), `allows-mate explanation should describe the mate allowed, got: ${allowsMatePuzzle.explanations['8']}`);
assert(allowsMatePuzzle.dropPawns > 900, `dropPawns must still carry the large sentinel-based number unchanged, got: ${allowsMatePuzzle.dropPawns}`);

// --- buildPuzzle: plain cp-only swing text must be unchanged ---
assert(puzzle.result.includes('drops 2.0 pawns'), `plain cp swing result text must keep the existing "drops N.N pawns" wording, got: ${puzzle.result}`);
assert(puzzle.explanations['10'].includes('dropping 2.0 pawns'), `plain cp swing explanation text must keep the existing "dropping N.N pawns" wording, got: ${puzzle.explanations['10']}`);

// --- resolveFollowUp: no PV at all -> no follow-up ---
assert(resolveFollowUp([], false).length === 0, 'an empty PV should produce no follow-up');
assert(resolveFollowUp(null, false).length === 0, 'a missing PV should produce no follow-up, not throw');

// --- resolveFollowUp: PV ending in mate is used in full, however long ---
const mateFollowUp = resolveFollowUp(['Qh5', 'Kg8', 'Qxh7#'], true);
assert(mateFollowUp.length === 3, `a mate-ending PV should be kept in full, got ${JSON.stringify(mateFollowUp)}`);
assert(mateFollowUp[2] === 'Qxh7#', 'the mating move itself must be included');

// --- resolveFollowUp: quiet reply with no further forcing moves -> just the one reply ---
const quietFollowUp = resolveFollowUp(['Kg8', 'Re1', 'Nf6'], false);
assert(quietFollowUp.length === 1 && quietFollowUp[0] === 'Kg8',
  `a quiet PV should keep only the immediate reply, got ${JSON.stringify(quietFollowUp)}`);

// --- resolveFollowUp: forcing moves (captures/checks) extend the sequence, first quiet move stops it ---
const forcingFollowUp = resolveFollowUp(['Kxh7', 'Qh5+', 'Kg8', 'Nf3', 'Bxf3'], false);
assert(forcingFollowUp.length === 3, `should extend through both forcing replies and stop at the first quiet move, got ${JSON.stringify(forcingFollowUp)}`);
assert(forcingFollowUp[2] === 'Kg8', 'should stop right after the last forcing move, not include the quiet Nf3');

// --- resolveFollowUp: hard-capped even when EVERY move keeps being forcing (a long recapture chain) ---
const longForcing = ['Rxd4', 'Nxd4', 'Bxd4', 'Rxd4', 'Qxd4', 'Nxd4', 'Rxd4', 'Bxd4', 'Qxd4', 'Rxd4'];
const cappedFollowUp = resolveFollowUp(longForcing, false);
assert(cappedFollowUp.length === MAX_FOLLOWUP_PLIES,
  `an all-forcing PV longer than the cap should be trimmed to exactly ${MAX_FOLLOWUP_PLIES}, got ${cappedFollowUp.length}`);

// --- buildPuzzle: followUpSan appended after the corrective move, existing callers (no followUpSan) unaffected ---
const withFollowUpPuzzle = buildPuzzle({
  id: 'tactics-followup', sanMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'Nxe5', 'Nxe5'],
  plyIndex: 6, userColor: 'w', correctMoveSan: 'Bxf7+',
  evalBefore: { cp: 30, mate: null }, evalAfter: { cp: -100, mate: null },
  cat: 'blunder', gameMeta: { opponent: 'x', endTime: 1, timeClass: 'rapid', url: '' },
  followUpSan: ['Kxf7', 'Qh5+'],
});
assert(withFollowUpPuzzle.moves.length === 9, `expected baseMoves(6) + correctMove(1) + followUp(2) = 9, got ${withFollowUpPuzzle.moves.length}`);
assert(withFollowUpPuzzle.moves[7] === 'Kxf7' && withFollowUpPuzzle.moves[8] === 'Qh5+', 'follow-up moves should append in order after the corrective move');
assert(puzzle.moves.length === puzzle.baseMoves + 1, 'a puzzle built without followUpSan (the existing call above) must be unaffected -- still just the one corrective move');

console.log('tactics-classifier.test.js: all assertions passed');
