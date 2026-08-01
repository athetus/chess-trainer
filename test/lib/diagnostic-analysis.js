// test/lib/diagnostic-analysis.js
//
// Pure, engine-free analysis helpers for the chess.com diagnostic report.
// Ported from a throwaway Python script the controller ran against 108 real
// games (optimizerprime, July 2026) to prove this logic out before shipping
// it. See test/chesscom-diagnostic.js for how these are wired together.

const MAX_PLAUSIBLE_MOVE_SECONDS = 300; // discard clock-parse noise above this

// chess.com embeds clock time as "H:MM:SS" or "H:MM:SS.s" after every move,
// e.g. "0:02:58.8". Always exactly three colon-separated fields.
function parseClockSeconds(clockStr) {
  const [h, m, s] = clockStr.split(':');
  return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseFloat(s);
}

// time_control is "600" (10 min, no increment) or "600+5" (10 min + 5s/move).
function parseIncrementSeconds(timeControl) {
  const tc = String(timeControl);
  return tc.includes('+') ? parseInt(tc.split('+')[1], 10) : 0;
}

// Returns the clock reading (in seconds) recorded after each of the given
// color's own moves, in game order. Clocks in the PGN alternate White,
// Black, White, Black... so White's own readings are the even-indexed
// entries and Black's are the odd-indexed ones.
function extractColorClockSeconds(pgn, isWhite) {
  const matches = [...pgn.matchAll(/\[%clk ([\d:.]+)\]/g)];
  const all = matches.map(m => parseClockSeconds(m[1]));
  return isWhite ? all.filter((_, i) => i % 2 === 0) : all.filter((_, i) => i % 2 === 1);
}

// Time spent on the user's own move at (0-based) index i in their own clock
// readings is (reading at i-1) - (reading at i) + increment. There is no
// reading before the user's very first move, so it's never included. Negative
// or absurdly large values are discarded as clock-parse noise.
//
// The user's i-th own move (0-based) is chess move number i+1 (this holds for
// both colors: White's k-th own move and Black's k-th own move are both move
// number k in standard PGN numbering).
function computeUserMoveTimings({ pgn, timeControl, userIsWhite }) {
  const mine = extractColorClockSeconds(pgn, userIsWhite);
  const inc = parseIncrementSeconds(timeControl);
  const timings = [];
  for (let i = 1; i < mine.length; i++) {
    const secondsSpent = mine[i - 1] - mine[i] + inc;
    if (secondsSpent < 0 || secondsSpent > MAX_PLAUSIBLE_MOVE_SECONDS) continue;
    timings.push({ moveNumber: i + 1, secondsSpent });
  }
  return timings;
}

// The user's remaining clock time (seconds) at the moment the game ended --
// i.e. their last own-clock reading. Null if the PGN has no clock data at all.
function lastUserClockSeconds(pgn, userIsWhite) {
  const mine = extractColorClockSeconds(pgn, userIsWhite);
  return mine.length > 0 ? mine[mine.length - 1] : null;
}

function bucketPhase(moveNumber) {
  if (moveNumber <= 15) return 'opening';
  if (moveNumber <= 30) return 'middlegame';
  if (moveNumber <= 45) return 'late-middlegame';
  return 'endgame';
}

// Strips PGN comments, then pulls out bare SAN move tokens (no move numbers,
// no result codes) directly from the movetext. Used only for the repertoire
// check below -- doesn't need chess.js/legality, just the literal token
// sequence a human would read off the scoresheet.
function extractMovetextSan(pgn) {
  const movetext = pgn.split('\n\n').slice(1).join('\n\n');
  const stripped = movetext.replace(/\{[^}]*\}/g, '');
  const matches = stripped.match(/\b([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|O-O(?:-O)?)/g);
  return matches || [];
}

// Repertoire coverage: for White games, did the opponent's first two moves
// even allow the Ponziani (1.e4 e5 2.Nf3 Nc6), and if so did White actually
// play into it (3.c3)? For Black games, was an early ...g6 (Hippo setup)
// played in the first 6 plies?
function checkRepertoire({ pgn, userIsWhite }) {
  const mv = extractMovetextSan(pgn);
  if (userIsWhite) {
    const opponentAllowedPonziani = mv[0] === 'e4' && mv[1] === 'e5' && mv[2] === 'Nf3' && mv[3] === 'Nc6';
    const reachedPonziani = opponentAllowedPonziani && mv[4] === 'c3';
    return { isWhiteGame: true, opponentAllowedPonziani, reachedPonziani };
  }
  const playedHippo = mv.slice(0, 6).includes('g6');
  return { isWhiteGame: false, playedHippo };
}

function median(nums) {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(nums) {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pctAtMost(nums, threshold) {
  if (nums.length === 0) return null;
  return (nums.filter(n => n <= threshold).length / nums.length) * 100;
}

module.exports = {
  parseClockSeconds,
  parseIncrementSeconds,
  extractColorClockSeconds,
  computeUserMoveTimings,
  lastUserClockSeconds,
  bucketPhase,
  extractMovetextSan,
  checkRepertoire,
  median,
  mean,
  pctAtMost,
};
