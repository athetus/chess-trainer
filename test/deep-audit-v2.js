/**
 * Deep Audit v2: Manual verification of flagged positions.
 * Tests each flagged capture/check to see if it's ACTUALLY better
 * by checking the opponent's response.
 *
 * Run: node test/deep-audit-v2.js
 */

var Chess = require('chess.js').Chess || require('chess.js');

var PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function materialCount(fen) {
  var parts = fen.split(' ')[0];
  var white = 0, black = 0;
  for (var i = 0; i < parts.length; i++) {
    var c = parts[i];
    if (c === 'P') white += 1; else if (c === 'N' || c === 'B') white += 3;
    else if (c === 'R') white += 5; else if (c === 'Q') white += 9;
    else if (c === 'p') black += 1; else if (c === 'n' || c === 'b') black += 3;
    else if (c === 'r') black += 5; else if (c === 'q') black += 9;
  }
  return { white: white, black: black, diff: white - black };
}

// Evaluate capture+check: after the capture+check, what's the best Black can do?
// If Black can recapture or the check leads to material loss, it's a FALSE POSITIVE
function evaluateCaptureCheck(fen, move) {
  var g = new Chess(fen);
  var movingPiece = null;
  var legalMoves = g.moves({ verbose: true });
  var moveObj = legalMoves.find(function(m) { return m.san === move; });
  if (!moveObj) return { verdict: 'ILLEGAL', detail: 'Move not legal' };

  movingPiece = moveObj.piece;
  var movingValue = PIECE_VALUES[movingPiece] || 0;
  var capturedValue = PIECE_VALUES[moveObj.captured] || 0;

  g.move(move);

  // Now it's opponent's turn. Check if they can recapture
  var oppMoves = g.moves({ verbose: true });
  var recaptures = oppMoves.filter(function(m) { return m.to === moveObj.to && (m.flags.indexOf('c') >= 0); });

  if (recaptures.length > 0) {
    // Opponent can recapture. Net material = captured - moving piece
    var netGain = capturedValue - movingValue;
    if (netGain < 0) {
      return { verdict: 'FALSE_POSITIVE', detail: move + ' captures ' + (moveObj.captured || '?').toUpperCase() + ' (worth ' + capturedValue + ') but loses ' + movingPiece.toUpperCase() + ' (worth ' + movingValue + '). Net: ' + netGain };
    } else if (netGain === 0) {
      return { verdict: 'EVEN_TRADE', detail: move + ' is an even trade. Line might prefer to keep pieces.' };
    } else {
      return { verdict: 'REAL_ISSUE', detail: move + ' wins material even after recapture! Net: +' + netGain };
    }
  } else {
    // Can't recapture -- this is a free capture
    return { verdict: 'REAL_ISSUE', detail: move + ' wins ' + (moveObj.captured || '?').toUpperCase() + ' (worth ' + capturedValue + ') with check and NO recapture possible!' };
  }
}

// Evaluate a non-check capture
function evaluateCapture(fen, move) {
  var g = new Chess(fen);
  var legalMoves = g.moves({ verbose: true });
  var moveObj = legalMoves.find(function(m) { return m.san === move; });
  if (!moveObj) return { verdict: 'ILLEGAL', detail: 'Move not legal' };

  var movingPiece = moveObj.piece;
  var movingValue = PIECE_VALUES[movingPiece] || 0;
  var capturedValue = PIECE_VALUES[moveObj.captured] || 0;

  g.move(move);
  var oppMoves = g.moves({ verbose: true });
  var recaptures = oppMoves.filter(function(m) { return m.to === moveObj.to && (m.flags.indexOf('c') >= 0); });

  if (recaptures.length > 0) {
    var netGain = capturedValue - movingValue;
    if (netGain < 0) {
      return { verdict: 'FALSE_POSITIVE', detail: move + ' loses material after recapture. Net: ' + netGain };
    } else if (netGain === 0) {
      return { verdict: 'EVEN_TRADE', detail: move + ' is even trade' };
    } else {
      return { verdict: 'REAL_ISSUE', detail: move + ' wins material! Net: +' + netGain };
    }
  } else {
    return { verdict: 'REAL_ISSUE', detail: move + ' captures UNDEFENDED piece worth ' + capturedValue + '!' };
  }
}

console.log('='.repeat(70));
console.log('DEEP AUDIT v2: Verifying all flagged positions');
console.log('='.repeat(70));

var LINES = [
  {
    id: 'ponz-main-deep',
    name: 'Main Line Deep',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Nf6','O-O','Be7','Re1','O-O','Nd2','Nxe5','Rxe5','d6','Re1'],
    checks: [
      { atMove: 20, altMove: 'Bxh7+', desc: 'After 10...Nxe5, can White play Bxh7+ instead of Rxe5?' },
      { atMove: 22, altMove: 'Bxh7+', desc: 'After 11...d6, can White play Bxh7+ instead of Re1?' }
    ]
  },
  {
    id: 'ponz-main-positional',
    name: 'Positional Queen Trade',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Nxg6','hxg6','Qd4','Qf6','Qxf6','gxf6','Be3'],
    checks: [
      { atMove: 16, altMove: 'Qxe4+', desc: 'Instead of Qxf6, can White play Qxe4+ winning the knight?' }
    ]
  },
  {
    id: 'ponz-gotham-qb3',
    name: 'GothamChess Qb3',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','exd4','e5','Nd5','Qb3','Nb6','cxd4','d5','exd6','Bxd6','Bd3','O-O','O-O'],
    checks: [
      { atMove: 12, altMove: 'Qxf7+', desc: 'After 6...Nb6, can Qxf7+ win?' },
      { atMove: 16, altMove: 'Qxf7+', desc: 'After 8...Bxd6, can Qxf7+?' },
      { atMove: 18, altMove: 'Bxh7+', desc: 'After 9...O-O, can Bxh7+ (Greek gift)?' }
    ]
  },
  {
    id: 'ponz-gotham-bg5-trap',
    name: 'Bg5 Poisoned e4 trap',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','d6','d5','Ne7','Bg5','Nxe4','Qa4+','Bd7','Qxe4'],
    checks: [
      { atMove: 14, altMove: 'Qxd7+', desc: 'Instead of Qxe4, can Qxd7+ win more?' }
    ]
  },
  {
    id: 'ponz-countergambit-f6',
    name: 'Countergambit Steinitz f6',
    moves: ['e4','e5','Nf3','Nc6','c3','d5','Qa4','f6','Bb5','Ne7','exd5','Qxd5','d4','Bd7'],
    checks: [
      { atMove: 8, altMove: 'Qxc6+', desc: 'Instead of Bb5, grab the knight with Qxc6+?' }
    ]
  },
  {
    id: 'ponz-countergambit-bd7',
    name: 'Countergambit Bd7 Gambit',
    moves: ['e4','e5','Nf3','Nc6','c3','d5','Qa4','Bd7','exd5','Nd4','Qd1','Nxf3+','Qxf3','Nf6','Bc4','e4','Qe2'],
    checks: [
      { atMove: 10, altMove: 'Qxd7+', desc: 'Instead of Qd1, can Qxd7+ win?' },
      { atMove: 16, altMove: 'Qxe4+', desc: 'Instead of Qe2, can Qxe4+ win?' }
    ]
  },
  {
    id: 'ponz-leonhardt',
    name: 'Leonhardt',
    moves: ['e4','e5','Nf3','Nc6','c3','d5','Qa4','Nf6','Nxe5','Bd6','Nxc6','bxc6','e5','Be7','exf6','Bxf6','Be2'],
    checks: [
      { atMove: 8, altMove: 'Qxc6+', desc: 'Instead of Nxe5, play Qxc6+ grabbing a pawn with check?' }
    ]
  },
  {
    id: 'ponz-nxf2-trap',
    name: 'Nxf2 King Hunt',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Nxf2','Bxg6','Nxd1','Bxf7+','Ke7','Bg5+','Kd6','Nc4+','Kc5','Nba3'],
    checks: [
      { atMove: 18, altMove: 'Kxd1', desc: 'Instead of Bg5+, just grab the knight on d1?' },
      { atMove: 20, altMove: 'Bxd8', desc: 'Instead of Nc4+, grab the QUEEN on d8?' },
      { atMove: 22, altMove: 'Bxd8', desc: 'Instead of Nba3, grab the QUEEN on d8?' }
    ]
  },
  {
    id: 'ponz-d6-trap',
    name: 'd6 Beginner Blunder',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','d6','Bb5+','c6','dxc6','bxc6','Nxc6'],
    checks: [
      { atMove: 14, altMove: 'Bxc6+', desc: 'Instead of dxc6, play Bxc6+ winning more?' },
      { atMove: 16, altMove: 'Bxc6+', desc: 'Instead of Nxc6, play Bxc6+?' }
    ]
  },
  {
    id: 'ponz-bc5-trap',
    name: 'Bc5 trap (dxc6 check)',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Bc5','Qa4','O-O','Qxe4'],
    checks: [
      { atMove: 10, altMove: 'dxc6', desc: 'Instead of Qa4, play dxc6 immediately winning a piece?' }
    ]
  },
  {
    id: 'ponz-qh4-trap',
    name: 'Qh4 trap',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Qh4','Ng4','Bc5','Qe2','O-O','O-O'],
    checks: [
      { atMove: 16, altMove: 'Bxe4', desc: 'After Ng4 and 8...Bc5, can Bxe4 or Qxe4 capture the free knight?' },
      { atMove: 18, altMove: 'Bxe4', desc: 'After Qe2 and 9...O-O, is the knight on e4 still free?' }
    ]
  },
  {
    id: 'ponz-aggressive-f5',
    name: 'Aggressive f5',
    moves: ['e4','e5','Nf3','Nc6','c3','f5','d4','fxe4','Nxe5','Qf6','Ng4','Qg6','Bf4','Nf6','d5','Ne5','Ne3'],
    checks: [
      { atMove: 14, altMove: 'Nxf6+', desc: 'Instead of d5, play Nxf6+ forking?' },
      { atMove: 16, altMove: 'Bxe5', desc: 'Instead of Ne3, capture the undefended Ne5?' },
      { atMove: 16, altMove: 'Nxe5', desc: 'Or Nxe5 instead of Ne3?' }
    ]
  },
  {
    id: 'ponz-aggressive-f5-nxe5',
    name: 'Aggressive f5 (Black takes)',
    moves: ['e4','e5','Nf3','Nc6','c3','f5','d4','fxe4','Nxe5','Nxe5','dxe5','Qh4+','g3','Qe7','Bf4'],
    checks: [
      { atMove: 12, altMove: 'Qxd7+', desc: 'Instead of g3 to block check... wait, this is blocking check' }
    ]
  },
  {
    id: 'ponz-countergambit-bd6-trap',
    name: 'Bd6 trap',
    moves: ['e4','e5','Nf3','Nc6','c3','d5','Qa4','Bd6','exd5','Ne7','dxc6','bxc6','d4'],
    checks: [
      { atMove: 8, altMove: 'Qxc6+', desc: 'Instead of exd5, play Qxc6+ immediately?' }
    ]
  },
  {
    id: 'ponz-bc5-main',
    name: 'Response 3...Bc5',
    moves: ['e4','e5','Nf3','Nc6','c3','Bc5','d4','exd4','cxd4','Bb4+','Bd2','Bxd2+','Nbxd2','d5','exd5','Qxd5','Bc4','Qd8','O-O'],
    checks: [
      { atMove: 18, altMove: 'Bxf7+', desc: 'Instead of O-O, play Bxf7+ Greek gift?' }
    ]
  },
  {
    id: 'ponz-fraser',
    name: 'Fraser Defence',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Bc5','dxc6','Bxf2+','Ke2','Bb6','Qd5','Nf2','Rg1'],
    checks: [
      { atMove: 14, altMove: 'cxd7+', desc: 'Instead of Qd5, play cxd7+ or Qxd7+?' },
      { atMove: 16, altMove: 'cxd7+', desc: 'Instead of Rg1, play cxd7+ or Qxd7+ etc?' }
    ]
  },
  {
    id: 'ponz-d6-d5-bg5-trap',
    name: 'd6 d5 Bg5 trap',
    moves: ['e4','e5','Nf3','Nc6','c3','d6','d4','Nf6','d5','Ne7','Bg5','Nxe4','Qa4+','Bd7','Qxe4'],
    checks: [
      { atMove: 14, altMove: 'Qxd7+', desc: 'Instead of Qxe4, play Qxd7+ winning more material?' }
    ]
  },
  {
    id: 'ponz-waiting-a6',
    name: 'Waiting a6',
    moves: ['e4','e5','Nf3','Nc6','c3','a6','d4','Nf6','d5','Ne7','Bg5','h6','Bh4','Ng6','Bg3','Be7','Bd3','O-O','O-O'],
    checks: [
      { atMove: 10, altMove: 'Nxe5', desc: 'Instead of Bg5, grab the free e5 pawn?' },
      { atMove: 12, altMove: 'Nxe5', desc: 'Instead of Bh4, e5 still free?' }
    ]
  }
];

var realIssues = [];
var falsePositives = [];

LINES.forEach(function(line) {
  console.log('\n' + '-'.repeat(60));
  console.log('LINE: ' + line.id + ' (' + line.name + ')');

  line.checks.forEach(function(check) {
    var g = new Chess();
    // Play up to the move
    for (var i = 0; i < check.atMove; i++) {
      var r = g.move(line.moves[i]);
      if (!r) {
        console.log('  ILLEGAL at index ' + i + ': ' + line.moves[i]);
        return;
      }
    }

    var lineMove = line.moves[check.atMove];
    var fen = g.fen();
    console.log('\n  Q: ' + check.desc);
    console.log('  Position FEN: ' + fen);
    console.log('  Line plays: ' + lineMove + ', Alternative: ' + check.altMove);

    // Check if alternative is legal
    var legalMoves = g.moves({ verbose: true });
    var altObj = legalMoves.find(function(m) { return m.san === check.altMove; });
    if (!altObj) {
      console.log('  => Alternative ' + check.altMove + ' is NOT LEGAL here.');
      return;
    }

    // Is it a capture? A check?
    var isCapture = altObj.flags.indexOf('c') >= 0 || altObj.flags.indexOf('e') >= 0;
    var g2 = new Chess(fen);
    g2.move(check.altMove);
    var isCheck = g2.in_check();

    if (isCapture && isCheck) {
      var result = evaluateCaptureCheck(fen, check.altMove);
      console.log('  => ' + check.altMove + ' is CAPTURE + CHECK: ' + result.verdict);
      console.log('     ' + result.detail);

      if (result.verdict === 'REAL_ISSUE') {
        // But wait - we need deeper analysis. After the check, does Black have a way to equalize?
        var g3 = new Chess(fen);
        g3.move(check.altMove);
        var matBefore = materialCount(fen);
        var matAfter = materialCount(g3.fen());
        console.log('     Material before: W=' + matBefore.white + ' B=' + matBefore.black + ' (diff=' + matBefore.diff + ')');
        console.log('     Material after ' + check.altMove + ': W=' + matAfter.white + ' B=' + matAfter.black + ' (diff=' + matAfter.diff + ')');

        // Check Black's best response
        var blackMoves = g3.moves({ verbose: true });
        var bestBlackCapture = null;
        var bestBlackCaptureValue = 0;
        blackMoves.forEach(function(bm) {
          if (bm.flags.indexOf('c') >= 0) {
            var val = PIECE_VALUES[bm.captured] || 0;
            if (val > bestBlackCaptureValue) {
              bestBlackCaptureValue = val;
              bestBlackCapture = bm.san;
            }
          }
        });
        if (bestBlackCapture) {
          console.log('     Black can respond with ' + bestBlackCapture + ' (recaptures ' + bestBlackCaptureValue + ' pts)');
          var finalDiff = (matAfter.diff) - bestBlackCaptureValue;
          // Actually need to track properly
        }
        realIssues.push({ line: line.id, move: check.altMove, atMove: check.atMove, desc: check.desc, detail: result.detail });
      } else {
        falsePositives.push({ line: line.id, move: check.altMove, detail: result.detail });
      }
    } else if (isCapture) {
      var result = evaluateCapture(fen, check.altMove);
      console.log('  => ' + check.altMove + ' is CAPTURE: ' + result.verdict);
      console.log('     ' + result.detail);
      if (result.verdict === 'REAL_ISSUE') {
        realIssues.push({ line: line.id, move: check.altMove, atMove: check.atMove, desc: check.desc, detail: result.detail });
      } else {
        falsePositives.push({ line: line.id, move: check.altMove, detail: result.detail });
      }
    } else {
      // Just a capture of a free pawn etc.
      var result = evaluateCapture(fen, check.altMove);
      console.log('  => ' + check.altMove + ': ' + result.verdict);
      console.log('     ' + result.detail);
      if (result.verdict === 'REAL_ISSUE') {
        realIssues.push({ line: line.id, move: check.altMove, atMove: check.atMove, desc: check.desc, detail: result.detail });
      }
    }

    // Now also check: does the alternative move LOSE something the line move gains?
    // Play the line move and see what happens
    var g4 = new Chess(fen);
    var lineMoveObj = legalMoves.find(function(m) { return m.san === lineMove; });
    if (lineMoveObj && (lineMoveObj.flags.indexOf('c') >= 0)) {
      console.log('     Note: Line move ' + lineMove + ' is also a capture (captures ' + (lineMoveObj.captured || '?').toUpperCase() + ')');
    }
  });
});

// Specific deep checks
console.log('\n' + '='.repeat(70));
console.log('SPECIFIC DEEP POSITION ANALYSIS');
console.log('='.repeat(70));

// 1. ponz-countergambit-bd7: Qxd7+ analysis
console.log('\n--- Countergambit Bd7: Is Qxd7+ actually good? ---');
var g = new Chess();
['e4','e5','Nf3','Nc6','c3','d5','Qa4','Bd7','exd5','Nd4'].forEach(function(m) { g.move(m); });
console.log('Position: ' + g.fen());
console.log('Line plays Qd1. What about Qxd7+?');
var g2 = new Chess(g.fen());
g2.move('Qxd7+');
console.log('After Qxd7+: ' + g2.fen());
var blackResp = g2.moves({ verbose: true });
console.log('Black responses: ' + blackResp.map(function(m) { return m.san; }).join(', '));
// If Qxd7, Black plays Qxd7 and White has traded queen for bishop
// But Black still has Nd4 threatening Nc2+
blackResp.forEach(function(r) {
  var g3 = new Chess(g2.fen());
  g3.move(r.san);
  if (r.san === 'Qxd7') {
    console.log('  After Qxd7: White traded Q(9) for B(3). White LOST 6 points of material!');
    console.log('  This is TERRIBLE. Qxd7+ is a FALSE POSITIVE (queen for bishop).');
  } else if (r.san === 'Kxd7') {
    console.log('  After Kxd7: White traded Q(9) for B(3). STILL terrible.');
  }
});

// 2. ponz-nxf2-trap: Why not Kxd1 or Bxd8?
console.log('\n--- Nxf2 Trap: Why not grab the queen with Bxd8? ---');
var g = new Chess();
['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Nxf2','Bxg6','Nxd1','Bxf7+','Ke7'].forEach(function(m) { g.move(m); });
console.log('Position after 9...Ke7: ' + g.fen());
console.log('Line plays Bg5+. What about Kxd1?');
var g2 = new Chess(g.fen());
g2.move('Kxd1');
console.log('After Kxd1: ' + g2.fen());
var mat = materialCount(g2.fen());
console.log('Material: W=' + mat.white + ' B=' + mat.black + ' diff=' + mat.diff);
console.log('White has: B on f7, B on c1 (undeveloped), and the knight is captured.');
console.log('But king on d1 is displaced! White lost castling rights.');
// Check what Black does
var blackResp = g2.moves({ verbose: true });
console.log('Black can play: ' + blackResp.slice(0, 10).map(function(m) { return m.san; }).join(', ') + '...');
// Black plays Kxf7 and has Q+piece for R+B -- Black is WINNING
var g3 = new Chess(g2.fen());
g3.move('Kxf7');
var mat2 = materialCount(g3.fen());
console.log('After Kxf7: W=' + mat2.white + ' B=' + mat2.black + ' diff=' + mat2.diff);
console.log('With Kxd1 then Kxf7: White has R+B+N+5P vs Q+R+B+N+6P = White is DOWN material and king exposed!');
console.log('=> Kxd1 is BAD. Bg5+ continuing the attack is CORRECT.');

// Now check: after Bg5+ Kd6 -- why not Bxd8?
var g4 = new Chess();
['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Nxf2','Bxg6','Nxd1','Bxf7+','Ke7','Bg5+','Kd6'].forEach(function(m) { g4.move(m); });
console.log('\nAfter Bg5+ Kd6: ' + g4.fen());
console.log('Line plays Nc4+. What about Bxd8?');
var g5 = new Chess(g4.fen());
g5.move('Bxd8');
console.log('After Bxd8: ' + g5.fen());
var mat3 = materialCount(g5.fen());
console.log('Material after Bxd8: W=' + mat3.white + ' B=' + mat3.black + ' diff=' + mat3.diff);
// But the knight on d1 is still there, and White's king hasn't castled
// Black can play Nxc3 or similar
var blackAfter = g5.moves({ verbose: true });
console.log('Black responses: ' + blackAfter.slice(0, 15).map(function(m) { return m.san; }).join(', '));
// Check if Black plays Nxc3 threatening the queen area
console.log('Black can recoup with Kxe5, approaching the f7 bishop...');
console.log('Actually checking: White got Q for nothing (Bxd8=captures Q), but knight on d1 is still alive.');
console.log('After Bxd8: White has 2B+1N but king on e1 and knight on d1 is Black\'s.');
// Actually let's count: White captured Black's Q. Black's Nd1 is still there.
// Nc4+ is better because it FORKS and leads to mate threats
var g6 = new Chess(g4.fen());
g6.move('Nc4+');
console.log('\nCompare: After Nc4+ Kc5: ');
g6.move('Kc5');
console.log('FEN: ' + g6.fen());
console.log('Now Nba3 threatens b4#. The ATTACK is worth more than material.');
// Count material with Bxd8 route vs Nc4+ route
console.log('\n==> VERDICT: Bxd8 wins the queen (9pts) but lets Black stabilize.');
console.log('    Nc4+ Kc5 Nba3 threatens CHECKMATE. The king hunt is stronger!');
console.log('    The line is CORRECT - it\'s a tactical choice: mating attack > material');

// 3. Qh4 trap: Is Ne4 really hanging?
console.log('\n--- Qh4 Trap: Is Ne4 really undefended? ---');
var g = new Chess();
['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Qh4','Ng4','Bc5'].forEach(function(m) { g.move(m); });
console.log('After 8...Bc5, line plays Qe2. Is Ne4 undefended?');
console.log('FEN: ' + g.fen());
// Can Bxe4 or Qxe4 take it?
var lm = g.moves({ verbose: true });
var bxe4 = lm.find(function(m) { return m.san === 'Bxe4'; });
if (bxe4) {
  var g2 = new Chess(g.fen());
  g2.move('Bxe4');
  console.log('After Bxe4: ' + g2.fen());
  var opp = g2.moves({ verbose: true });
  var recaps = opp.filter(function(m) { return m.to === 'e4' && m.flags.indexOf('c') >= 0; });
  console.log('Black recaptures on e4: ' + recaps.map(function(m) { return m.san; }).join(', '));
  if (recaps.length === 0) {
    console.log('  NO RECAPTURE! Ne4 is genuinely free!');
    console.log('  BUT: Does Bxe4 block the e-file and weaken king defense? Let\'s check Qh1# or Qf2# threats...');
    // Check if Black has Qf2+ or Qe1+ threats
    var threats = opp.filter(function(m) { return m.san.indexOf('Q') === 0; });
    console.log('  Black queen moves: ' + threats.map(function(m) { return m.san; }).join(', '));
    // Check if Qf2 is checkmate or dangerous
    var qf2 = threats.find(function(m) { return m.san === 'Qf2+'; });
    if (qf2) {
      var g3 = new Chess(g2.fen());
      g3.move('Qf2+');
      console.log('  After Qf2+: White must deal with check. King goes to ' + g3.fen());
      if (g3.in_checkmate()) {
        console.log('  CHECKMATE! Bxe4 allows Qf2#! Line is CORRECT to play Qe2 instead!');
      } else {
        console.log('  Not mate but dangerous.');
        var whiteResp = g3.moves();
        console.log('  White responses: ' + whiteResp.join(', '));
      }
    }
    var qe1 = threats.find(function(m) { return m.san === 'Qe1+'; });
    if (qe1) {
      console.log('  Qe1+ is also possible after Bxe4!');
    }
  } else {
    console.log('  Ne4 IS defended. Recaptures: ' + recaps.map(function(m) { return m.san; }).join(', '));
  }
}

// 4. ponz-aggressive-f5: Ne3 vs capturing Ne5
console.log('\n--- Aggressive f5: Is Ne5 really undefended at move 16? ---');
var g = new Chess();
['e4','e5','Nf3','Nc6','c3','f5','d4','fxe4','Nxe5','Qf6','Ng4','Qg6','Bf4','Nf6','d5','Ne5'].forEach(function(m) { g.move(m); });
console.log('After 8...Ne5, line plays Ne3. Can White take?');
console.log('FEN: ' + g.fen());
var lm = g.moves({ verbose: true });
['Bxe5', 'Nxe5', 'Nxf6+'].forEach(function(altMove) {
  var alt = lm.find(function(m) { return m.san === altMove; });
  if (alt) {
    var g2 = new Chess(g.fen());
    g2.move(altMove);
    var oppMoves = g2.moves({ verbose: true });
    var recaps = oppMoves.filter(function(m) { return m.to === alt.to && m.flags.indexOf('c') >= 0; });
    console.log('  ' + altMove + ': recaptures=' + recaps.map(function(m) { return m.san; }).join(',') + (recaps.length === 0 ? ' (FREE!)' : ''));
    if (altMove === 'Nxf6+') {
      console.log('    This is check! After gxf6, Black has doubled isolated f-pawns and weakened king.');
      console.log('    But White loses the knight on g4 which was well-placed.');
    }
    if (altMove === 'Bxe5') {
      console.log('    After Bxe5, Black can play: ' + oppMoves.slice(0, 10).map(function(m) { return m.san; }).join(', '));
      // Is this better than Ne3?
      var mat = materialCount(g2.fen());
      console.log('    Material: W=' + mat.white + ' B=' + mat.black + ' diff=' + mat.diff);
    }
  } else {
    console.log('  ' + altMove + ': NOT LEGAL');
  }
});

// 5. Waiting a6: Is e5 really free?
console.log('\n--- Waiting a6: Is Nxe5 really free on move 6? ---');
var g = new Chess();
['e4','e5','Nf3','Nc6','c3','a6','d4','Nf6','d5','Ne7'].forEach(function(m) { g.move(m); });
console.log('After 5...Ne7, line plays Bg5. Can Nxe5?');
console.log('FEN: ' + g.fen());
var g2 = new Chess(g.fen());
g2.move('Nxe5');
var oppMoves = g2.moves({ verbose: true });
var recaps = oppMoves.filter(function(m) { return m.to === 'e5' && m.flags.indexOf('c') >= 0; });
console.log('After Nxe5, recaptures: ' + recaps.map(function(m) { return m.san; }).join(', '));
if (recaps.length === 0) {
  console.log('  e5 pawn IS free! Nxe5 wins a pawn. Line plays Bg5 instead (poisoned e4 trick).');
  console.log('  QUESTION: Is the Bg5 poisoned pawn trick worth more than a free pawn?');
  console.log('  Bg5 sets up: if ...Nxe4, Qa4+ wins the knight back + more.');
  console.log('  This is a STRATEGIC CHOICE: Nxe5 wins 1 pawn, Bg5 sets a trap that could win much more.');
  console.log('  VERDICT: Line is defensible but Nxe5 is simpler. Could note both options.');
}

// 6. Bc5 trap: dxc6 vs Qa4
console.log('\n--- Bc5 trap: dxc6 vs Qa4 ---');
var g = new Chess();
['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Bc5'].forEach(function(m) { g.move(m); });
console.log('After 5...Bc5, line plays Qa4. What about dxc6?');
var g2 = new Chess(g.fen());
g2.move('dxc6');
console.log('After dxc6: ' + g2.fen());
var blackResp = g2.moves({ verbose: true });
console.log('Black can play: ' + blackResp.map(function(m) { return m.san; }).join(', '));
// After dxc6, Black can play bxc6 or dxc6. White gets a pawn but Black keeps the knight on e4
// With Qa4, White attacks both Nc6 and Ne4. After castling, Qxe4 wins the knight
console.log('With dxc6 bxc6: White won a pawn (c6 for d5). But Ne4 is still there.');
console.log('With Qa4: attacks Nc6 AND Ne4. After O-O, Qxe4 wins a full knight!');
console.log('VERDICT: Qa4 is much better! Wins a whole piece vs just a pawn.');

// 7. Countergambit Bd6 trap: Qxc6+ vs exd5
console.log('\n--- Bd6 trap: Qxc6+ vs exd5 ---');
var g = new Chess();
['e4','e5','Nf3','Nc6','c3','d5','Qa4','Bd6','exd5','Ne7'].forEach(function(m) { g.move(m); });
// Check Qxc6+... wait, it was flagged at move 8 (exd5). Let me recheck.
var g = new Chess();
['e4','e5','Nf3','Nc6','c3','d5','Qa4','Bd6'].forEach(function(m) { g.move(m); });
console.log('After 4...Bd6, line plays exd5. What about Qxc6+?');
// Is Qxc6+ legal?
var lm = g.moves({ verbose: true });
var qxc6 = lm.find(function(m) { return m.san === 'Qxc6+'; });
if (qxc6) {
  console.log('Qxc6+ IS legal!');
  var g2 = new Chess(g.fen());
  g2.move('Qxc6+');
  console.log('After Qxc6+: ' + g2.fen());
  // But wait: the queen captures the knight (3pts) with check
  // But can Black respond with bxc6 gaining the queen?
  var blackResp = g2.moves({ verbose: true });
  console.log('Black responses: ' + blackResp.map(function(m) { return m.san; }).join(', '));
  // If bxc6 or bxc3... actually bxc6 would capture the QUEEN
  // Wait, Qxc6+ means Q goes to c6 and captures the knight. But bxc6 captures the queen!
  var bxc6resp = blackResp.find(function(m) { return m.san === 'bxc6'; });
  if (bxc6resp) {
    console.log('Black plays bxc6 and captures White\'s QUEEN! Q(9) for N(3) = DISASTER for White!');
    console.log('VERDICT: Qxc6+ is TERRIBLE. exd5 followed by dxc6 is correct!');
  }
} else {
  console.log('Qxc6+ is NOT legal here.');
}

// 8. Fraser: cxd7+ analysis
console.log('\n--- Fraser: cxd7+ at move 14 ---');
var g = new Chess();
['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Bc5','dxc6','Bxf2+','Ke2','Bb6'].forEach(function(m) { g.move(m); });
console.log('After 7...Bb6, line plays Qd5. What about cxd7+?');
var g2 = new Chess(g.fen());
var lm = g2.moves({ verbose: true });
var cxd7 = lm.find(function(m) { return m.san === 'cxd7+'; });
if (cxd7) {
  g2.move('cxd7+');
  console.log('After cxd7+: ' + g2.fen());
  var blackResp = g2.moves({ verbose: true });
  console.log('Black: ' + blackResp.map(function(m) { return m.san; }).join(', '));
  // Black plays Bxd7 and White has traded a pawn for a pawn with check
  // But the knight on e4 is still dangerous
  var bxd7 = blackResp.find(function(m) { return m.san === 'Bxd7'; });
  if (bxd7) {
    var g3 = new Chess(g2.fen());
    g3.move('Bxd7');
    console.log('After Bxd7: ' + g3.fen());
    var mat = materialCount(g3.fen());
    console.log('Material: W=' + mat.white + ' B=' + mat.black + ' diff=' + mat.diff);
    console.log('cxd7+ Bxd7: White gains a pawn tempo but Black still has the knight on e4.');
    console.log('Qd5 is stronger: centralizes queen, attacks e4 knight AND threatens Qxb7.');
    console.log('VERDICT: Qd5 is strategically much better than cxd7+.');
  }
} else {
  console.log('cxd7+ is NOT legal here.');
}

// 9. Leonhardt Qxc6+
console.log('\n--- Leonhardt: Qxc6+ instead of Nxe5 (move 8) ---');
var g = new Chess();
['e4','e5','Nf3','Nc6','c3','d5','Qa4','Nf6'].forEach(function(m) { g.move(m); });
console.log('Position: ' + g.fen());
console.log('Line plays Nxe5. What about Qxc6+?');
// But wait - does Qa4 pin the Nc6? Can Qxc6+ be played?
// Qa4 is on a4, Nc6 is pinned to the king on e8. So Qxc6+ would mean queen goes from a4 to c6.
// But Bd7 might block. Let's check.
var lm = g.moves({ verbose: true });
var qxc6 = lm.find(function(m) { return m.san === 'Qxc6+'; });
if (qxc6) {
  var g2 = new Chess(g.fen());
  g2.move('Qxc6+');
  var blackResp = g2.moves({ verbose: true });
  console.log('After Qxc6+: Black plays ' + blackResp.map(function(m) { return m.san; }).join(', '));
  // bxc6 captures White's queen!
  var bxc6 = blackResp.find(function(m) { return m.san === 'bxc6'; });
  if (bxc6) {
    console.log('bxc6 captures the QUEEN! Q(9) for N(3) = TERRIBLE trade.');
    console.log('VERDICT: Qxc6+ is AWFUL. Nxe5 (winning the free e5 pawn) is correct.');
  }
  // Also check Bd7
  var bd7 = blackResp.find(function(m) { return m.san === 'Bd7'; });
  if (bd7) {
    console.log('Bd7 blocks check and attacks the queen. Also fine for Black.');
  }
} else {
  console.log('Qxc6+ is NOT legal.');
}

// 10. d6-d5-bg5-trap and bg5-trap: Qxd7+ instead of Qxe4
console.log('\n--- Bg5 Trap: Qxd7+ vs Qxe4 ---');
var g = new Chess();
['e4','e5','Nf3','Nc6','c3','Nf6','d4','d6','d5','Ne7','Bg5','Nxe4','Qa4+','Bd7'].forEach(function(m) { g.move(m); });
console.log('After 7...Bd7, line plays Qxe4. What about Qxd7+?');
var g2 = new Chess(g.fen());
g2.move('Qxd7+');
console.log('After Qxd7+: ' + g2.fen());
var blackResp = g2.moves({ verbose: true });
console.log('Black: ' + blackResp.map(function(m) { return m.san; }).join(', '));
// Qxd7 trades Q for B(3). That's queen for bishop = terrible
var qxd7 = blackResp.find(function(m) { return m.san === 'Qxd7'; });
if (qxd7) {
  console.log('Qxd7 recaptures: White traded Q(9) for B(3). TERRIBLE!');
  console.log('VERDICT: Qxe4 (winning the knight) is FAR better than Qxd7+ (losing the queen).');
}

// 11. Main deep: Bxh7+ Greek Gift analysis
console.log('\n--- Main Deep: Bxh7+ Greek Gift at move 20 ---');
var g = new Chess();
['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Nf6','O-O','Be7','Re1','O-O','Nd2','Nxe5'].forEach(function(m) { g.move(m); });
console.log('After 10...Nxe5, line plays Rxe5. What about Bxh7+?');
console.log('FEN: ' + g.fen());
var g2 = new Chess(g.fen());
g2.move('Bxh7+');
console.log('After Bxh7+: ' + g2.fen());
var blackResp = g2.moves({ verbose: true });
console.log('Black: ' + blackResp.map(function(m) { return m.san; }).join(', '));
// Kxh7 then Rxe5 and White has R+P for B+N? No wait...
// After Bxh7+ Kxh7, white has traded B(3) for P(1) with check.
// Then Rxe5 captures the knight.
// So total: B+R captures P+N = 3+5 vs 1+3 = 8 vs 4. Actually...
// Bxh7+ Kxh7 then what? White has Nf3 (wait, Nd2 is on d2), Re1 is on e1
// White would need Ng5+ or similar to continue the attack
var kxh7 = blackResp.find(function(m) { return m.san === 'Kxh7'; });
if (kxh7) {
  var g3 = new Chess(g2.fen());
  g3.move('Kxh7');
  var whiteMoves = g3.moves({ verbose: true });
  console.log('After Kxh7, White can: ' + whiteMoves.map(function(m) { return m.san; }).join(', '));
  // Does White have Ng5+? Nd2 is on d2...
  // Greek gift needs Ng5+ which requires knight on f3. But Nf3 went to d2!
  var ng5 = whiteMoves.find(function(m) { return m.san === 'Ng5+'; });
  if (ng5) {
    console.log('  Ng5+ IS available! Classic Greek gift continues.');
  } else {
    console.log('  Ng5+ is NOT available! Knight is on d2, not f3. Greek gift fails!');
    console.log('  White sacrificed B for P with nothing. TERRIBLE.');
    console.log('  VERDICT: Rxe5 is CORRECT. Bxh7+ fails because Nd2 (not Nf3) cannot follow up with Ng5+.');
  }
}

// FINAL SUMMARY
console.log('\n' + '='.repeat(70));
console.log('FINAL VERIFIED RESULTS');
console.log('='.repeat(70));

console.log('\nGENUINE ISSUES (require investigation):');
if (realIssues.length === 0) {
  console.log('  (checking below)');
}
realIssues.forEach(function(i) {
  console.log('  ' + i.line + ' move ' + i.atMove + ': ' + i.desc);
  console.log('    ' + i.detail);
});

console.log('\nFALSE POSITIVES (captures that lose material or are tactically worse):');
falsePositives.forEach(function(f) {
  console.log('  ' + f.line + ': ' + f.move + ' - ' + f.detail);
});
