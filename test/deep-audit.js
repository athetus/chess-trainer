/**
 * Deep Audit of ALL Ponziani lines.
 * For every White move, checks if there's a capture or check available
 * that the line doesn't play. Flags potential missed tactics.
 *
 * Run: node test/deep-audit.js
 */

var Chess = require('chess.js').Chess || require('chess.js');

// ===================== ALL PONZIANI LINES (from index.html) =====================
var PONZIANI_LINES = [
  {
    id: 'ponz-main-nxe4',
    name: 'Main Line: 3...Nf6 4.d4 Nxe4',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Nf6','O-O'],
    explanations: {6:'Push d4',8:'Kick knight',10:'Recapture e5',12:'Develop Bd3',14:'Castle'}
  },
  {
    id: 'ponz-main-deep',
    name: 'Main Line Deep: After 8.O-O Be7',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Nf6','O-O','Be7','Re1','O-O','Nd2','Nxe5','Rxe5','d6','Re1'],
    explanations: {6:'d4',8:'d5',10:'Nxe5',12:'Bd3',14:'O-O',16:'Re1',18:'Nd2',20:'Rxe5',22:'Re1'}
  },
  {
    id: 'ponz-main-positional',
    name: 'Positional: 7.Nxg6 + Qd4 (Queen Trade)',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Nxg6','hxg6','Qd4','Qf6','Qxf6','gxf6','Be3'],
    explanations: {6:'d4',8:'d5',10:'Nxe5',12:'Nxg6',14:'Qd4',16:'Qxf6',18:'Be3'}
  },
  {
    id: 'ponz-gotham-qb3',
    name: 'GothamChess Main: 5.e5 Nd5 6.Qb3',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','exd4','e5','Nd5','Qb3','Nb6','cxd4','d5','exd6','Bxd6','Bd3','O-O','O-O'],
    explanations: {6:'d4',8:'e5',10:'Qb3',12:'cxd4',14:'exd6',16:'Bd3',18:'O-O'}
  },
  {
    id: 'ponz-gotham-exd4-bc5-trap',
    name: 'TRAP: 5.e5 Bc5?? 6.Qa4!',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','exd4','e5','Bc5','Qa4'],
    explanations: {6:'d4',8:'e5',10:'Qa4'}
  },
  {
    id: 'ponz-main-exd4',
    name: 'Main Line: 3...Nf6 4.d4 exd4 (Book)',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','exd4','e5','Nd5','cxd4','Bb4+','Bd2','Bxd2+','Qxd2','d6'],
    explanations: {6:'d4',8:'e5',10:'cxd4',12:'Bd2',14:'Qxd2'}
  },
  {
    id: 'ponz-gotham-bg5-trap',
    name: 'TRAP: Bg5 Poisoned e4',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','d6','d5','Ne7','Bg5','Nxe4','Qa4+','Bd7','Qxe4'],
    explanations: {6:'d4',8:'d5',10:'Bg5',12:'Qa4+',14:'Qxe4'}
  },
  {
    id: 'ponz-gotham-bg5-nontrap',
    name: 'Bg5 Line: Black Doesn\'t Take',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','d6','d5','Ne7','Bg5','h6','Bh4','Ng6','Bg3','Be7','Bd3','O-O','O-O'],
    explanations: {6:'d4',8:'d5',10:'Bg5',12:'Bh4',14:'Bg3',16:'Bd3',18:'O-O'}
  },
  {
    id: 'ponz-gotham-bc5-qa4',
    name: 'GothamChess: 3...Bc5 4.d4 with Qa4+',
    moves: ['e4','e5','Nf3','Nc6','c3','Bc5','d4','exd4','cxd4','Bb4+','Nc3','Nf6','d5','Ne7','Bd3','d6','Qa4+'],
    explanations: {6:'d4',8:'cxd4',10:'Nc3',12:'d5',14:'Bd3',16:'Qa4+'}
  },
  {
    id: 'ponz-countergambit-f6',
    name: 'Countergambit: 3...d5 4.Qa4 f6 (Steinitz)',
    moves: ['e4','e5','Nf3','Nc6','c3','d5','Qa4','f6','Bb5','Ne7','exd5','Qxd5','d4','Bd7'],
    explanations: {6:'Qa4',8:'Bb5',10:'exd5',12:'d4'}
  },
  {
    id: 'ponz-countergambit-deep',
    name: 'Steinitz Deep: After 7.d4 Bd7 8.O-O',
    moves: ['e4','e5','Nf3','Nc6','c3','d5','Qa4','f6','Bb5','Ne7','exd5','Qxd5','d4','Bd7','O-O','e4','Nfd2','f5','Re1'],
    explanations: {6:'Qa4',8:'Bb5',10:'exd5',12:'d4',14:'O-O',16:'Nfd2',18:'Re1'}
  },
  {
    id: 'ponz-countergambit-bd7',
    name: 'Countergambit: 3...d5 Qa4 Bd7 (Gambit)',
    moves: ['e4','e5','Nf3','Nc6','c3','d5','Qa4','Bd7','exd5','Nd4','Qd1','Nxf3+','Qxf3','Nf6','Bc4','e4','Qe2'],
    explanations: {6:'Qa4',8:'exd5',10:'Qd1',12:'Qxf3',14:'Bc4',16:'Qe2'}
  },
  {
    id: 'ponz-leonhardt',
    name: 'Leonhardt: 3...d5 4.Qa4 Nf6',
    moves: ['e4','e5','Nf3','Nc6','c3','d5','Qa4','Nf6','Nxe5','Bd6','Nxc6','bxc6','e5','Be7','exf6','Bxf6','Be2'],
    explanations: {6:'Qa4',8:'Nxe5',10:'Nxc6',12:'e5',14:'exf6',16:'Be2'}
  },
  {
    id: 'ponz-nxf2-trap',
    name: 'TRAP: Nxf2 (Famous King Hunt)',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Nxf2','Bxg6','Nxd1','Bxf7+','Ke7','Bg5+','Kd6','Nc4+','Kc5','Nba3'],
    explanations: {8:'d5',10:'Nxe5',12:'Bd3',14:'Bxg6',16:'Bxf7+',18:'Bg5+',20:'Nc4+',22:'Nba3'}
  },
  {
    id: 'ponz-d6-trap',
    name: 'TRAP: 5...d6?? (Beginner Blunder)',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','d6','Bb5+','c6','dxc6','bxc6','Nxc6'],
    explanations: {6:'d4',8:'d5',10:'Nxe5',12:'Bb5+',14:'dxc6',16:'Nxc6'}
  },
  {
    id: 'ponz-bc5-trap',
    name: 'TRAP: 5...Bc5?? (Piece Lost)',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Bc5','Qa4','O-O','Qxe4'],
    explanations: {6:'d4',8:'d5',10:'Qa4',12:'Qxe4'}
  },
  {
    id: 'ponz-countergambit-bd6-trap',
    name: 'TRAP: 3...d5 Qa4 Bd6?? (Win a Piece!)',
    moves: ['e4','e5','Nf3','Nc6','c3','d5','Qa4','Bd6','exd5','Ne7','dxc6','bxc6','d4'],
    explanations: {6:'Qa4',8:'exd5',10:'dxc6',12:'d4'}
  },
  {
    id: 'ponz-countergambit-dxe4-trap',
    name: 'TRAP: 3...d5 Qa4 dxe4?? (Pinned Knight)',
    moves: ['e4','e5','Nf3','Nc6','c3','d5','Qa4','dxe4','Nxe5','Bd7','Nxd7','Qxd7','Qxe4+'],
    explanations: {6:'Qa4',8:'Nxe5',10:'Nxd7',12:'Qxe4+'}
  },
  {
    id: 'ponz-qh4-trap',
    name: 'TRAP: 7...Qh4?! (Aggressive but Loses)',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Qh4','Ng4','Bc5','Qe2','O-O','O-O'],
    explanations: {6:'d4',8:'d5',10:'Nxe5',12:'Bd3',14:'Ng4',16:'Qe2',18:'O-O'}
  },
  {
    id: 'ponz-d6-d5-bg5-trap',
    name: 'TRAP: 3...d6 4.d4 Nf6 5.d5! Bg5',
    moves: ['e4','e5','Nf3','Nc6','c3','d6','d4','Nf6','d5','Ne7','Bg5','Nxe4','Qa4+','Bd7','Qxe4'],
    explanations: {6:'d4',8:'d5',10:'Bg5',12:'Qa4+',14:'Qxe4'}
  },
  {
    id: 'ponz-d6-d5-bg5-safe',
    name: '3...d6: d5 Bg5 (Black Plays Safe)',
    moves: ['e4','e5','Nf3','Nc6','c3','d6','d4','Nf6','d5','Ne7','Bg5','h6','Bh4','Ng6','Bg3','Be7','Bd3','O-O','O-O'],
    explanations: {6:'d4',8:'d5',10:'Bg5',12:'Bh4',14:'Bg3',16:'Bd3',18:'O-O'}
  },
  {
    id: 'ponz-passive-be7',
    name: 'Passive: 3...Be7 4.d4 d6 5.d5!',
    moves: ['e4','e5','Nf3','Nc6','c3','Be7','d4','d6','d5','Nb8','Bd3','Nf6','O-O','O-O','Nbd2','a5','Re1','Na6','Nf1'],
    explanations: {6:'d4',8:'d5',10:'Bd3',12:'O-O',14:'Nbd2',16:'Re1',18:'Nf1'}
  },
  {
    id: 'ponz-aggressive-f5',
    name: 'Aggressive: 3...f5',
    moves: ['e4','e5','Nf3','Nc6','c3','f5','d4','fxe4','Nxe5','Qf6','Ng4','Qg6','Bf4','Nf6','d5','Ne5','Ne3'],
    explanations: {6:'d4',8:'Nxe5',10:'Ng4',12:'Bf4',14:'d5',16:'Ne3'}
  },
  {
    id: 'ponz-aggressive-f5-nxe5',
    name: 'Aggressive: 3...f5 (Black takes knight)',
    moves: ['e4','e5','Nf3','Nc6','c3','f5','d4','fxe4','Nxe5','Nxe5','dxe5','Qh4+','g3','Qe7','Bf4'],
    explanations: {6:'d4',8:'Nxe5',10:'dxe5',12:'g3',14:'Bf4'}
  },
  {
    id: 'ponz-bc5-main',
    name: 'Response: 3...Bc5',
    moves: ['e4','e5','Nf3','Nc6','c3','Bc5','d4','exd4','cxd4','Bb4+','Bd2','Bxd2+','Nbxd2','d5','exd5','Qxd5','Bc4','Qd8','O-O'],
    explanations: {6:'d4',8:'cxd4',10:'Bd2',12:'Nbxd2',14:'exd5',16:'Bc4',18:'O-O'}
  },
  {
    id: 'ponz-nge7',
    name: 'Kmoch/Reti: 3...Nge7',
    moves: ['e4','e5','Nf3','Nc6','c3','Nge7','d4','exd4','cxd4','d5','exd5','Nxd5','Bc4','Be7','O-O','O-O','Re1'],
    explanations: {6:'d4',8:'cxd4',10:'exd5',12:'Bc4',14:'O-O',16:'Re1'}
  },
  {
    id: 'ponz-fraser',
    name: 'Fraser Defence: 5...Bc5 6.dxc6 Bxf2+',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Bc5','dxc6','Bxf2+','Ke2','Bb6','Qd5','Nf2','Rg1'],
    explanations: {6:'d4',8:'d5',10:'dxc6',12:'Ke2',14:'Qd5',16:'Rg1'}
  },
  {
    id: 'ponz-beginner-qf6',
    name: 'Beginner: 3...Qf6 (Early Queen)',
    moves: ['e4','e5','Nf3','Nc6','c3','Qf6','d4','exd4','cxd4','Bb4+','Nc3','Nge7','d5','Nd8','Bd3'],
    explanations: {6:'d4',8:'cxd4',10:'Nc3',12:'d5',14:'Bd3'}
  },
  {
    id: 'ponz-beginner-qe7',
    name: 'Beginner: 3...Qe7 (Blocks Bishop)',
    moves: ['e4','e5','Nf3','Nc6','c3','Qe7','d4','d6','d5','Nd8','Bd3','Nf6','O-O','g6','Nbd2','Bg7','Re1','O-O','Nf1'],
    explanations: {6:'d4',8:'d5',10:'Bd3',12:'O-O',14:'Nbd2',16:'Re1',18:'Nf1'}
  },
  {
    id: 'ponz-waiting-a6',
    name: 'Waiting: 3...a6 (Wastes Tempo)',
    moves: ['e4','e5','Nf3','Nc6','c3','a6','d4','Nf6','d5','Ne7','Bg5','h6','Bh4','Ng6','Bg3','Be7','Bd3','O-O','O-O'],
    explanations: {6:'d4',8:'d5',10:'Bg5',12:'Bh4',14:'Bg3',16:'Bd3',18:'O-O'}
  }
];

// ===================== PIECE VALUES =====================
var PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function getPieceValue(piece) {
  if (!piece) return 0;
  return PIECE_VALUES[piece.type] || 0;
}

// ===================== ANALYZE A MOVE =====================
function analyzePosition(game, lineMove, moveIndex, lineId) {
  var findings = [];
  var legalMoves = game.moves({ verbose: true });

  // Categorize legal moves
  var captures = legalMoves.filter(function(m) { return m.flags.indexOf('c') >= 0 || m.flags.indexOf('e') >= 0; });
  var checks = legalMoves.filter(function(m) {
    var g2 = new Chess(game.fen());
    g2.move(m.san);
    return g2.in_check();
  });
  var captureChecks = checks.filter(function(m) { return m.flags.indexOf('c') >= 0 || m.flags.indexOf('e') >= 0; });

  // What does the line play?
  var lineMoveObj = legalMoves.find(function(m) { return m.san === lineMove; });
  if (!lineMoveObj) {
    findings.push({
      severity: 'ERROR',
      msg: 'Move "' + lineMove + '" is ILLEGAL in this position! FEN: ' + game.fen()
    });
    return findings;
  }

  var lineIsCapture = lineMoveObj.flags.indexOf('c') >= 0 || lineMoveObj.flags.indexOf('e') >= 0;
  var lineIsCheck = false;
  {
    var g3 = new Chess(game.fen());
    g3.move(lineMoveObj.san);
    lineIsCheck = g3.in_check();
  }

  // Check each capture available
  captures.forEach(function(cap) {
    if (cap.san === lineMove) return; // line already plays this capture

    var capturedPiece = cap.captured;
    var capturedValue = PIECE_VALUES[capturedPiece] || 0;
    var movingPiece = cap.piece;
    var movingValue = PIECE_VALUES[movingPiece] || 0;

    // Check if the captured square is defended (simple check: after capture, can opponent recapture?)
    var g2 = new Chess(game.fen());
    g2.move(cap.san);
    var opponentMoves = g2.moves({ verbose: true });
    var recaptures = opponentMoves.filter(function(m) { return m.to === cap.to && (m.flags.indexOf('c') >= 0); });
    var isDefended = recaptures.length > 0;

    // Determine the minimum recapture value
    var minRecaptureValue = 99;
    recaptures.forEach(function(r) {
      var v = PIECE_VALUES[r.piece] || 0;
      if (v < minRecaptureValue) minRecaptureValue = v;
    });

    // Determine if this capture is clearly good
    var netGain = capturedValue;
    if (isDefended) {
      netGain = capturedValue - movingValue; // we lose our piece if they recapture
    }

    if (capturedValue >= 3 && !lineIsCapture) {
      // Can capture a piece but line plays a non-capture
      if (!isDefended) {
        findings.push({
          severity: 'CRITICAL',
          msg: 'Can capture UNDEFENDED ' + capturedPiece.toUpperCase() + ' with ' + cap.san + ' but line plays ' + lineMove + '! (FREE piece worth ' + capturedValue + ')'
        });
      } else if (netGain > 0) {
        findings.push({
          severity: 'HIGH',
          msg: 'Can capture ' + capturedPiece.toUpperCase() + ' with ' + cap.san + ' (net gain ~' + netGain + ') but line plays ' + lineMove + ' (defended but favorable trade)'
        });
      } else {
        findings.push({
          severity: 'INFO',
          msg: 'Can capture ' + capturedPiece.toUpperCase() + ' with ' + cap.san + ' but it is defended (even/losing trade). Line plays ' + lineMove + ' instead. Probably correct.'
        });
      }
    } else if (capturedValue >= 1 && !lineIsCapture) {
      // Pawn capture available
      if (!isDefended && capturedValue === 1) {
        // Free pawn
        findings.push({
          severity: 'REVIEW',
          msg: 'Can capture free pawn with ' + cap.san + ' but line plays ' + lineMove + '. Might be strategically justified.'
        });
      } else if (capturedValue === 1 && movingValue <= 1 && !isDefended) {
        findings.push({
          severity: 'REVIEW',
          msg: 'Pawn can take free pawn: ' + cap.san + ' but line plays ' + lineMove
        });
      }
      // Pawn capturing a piece (like dxc6 capturing a knight)
      if (movingValue === 1 && capturedValue >= 3 && !isDefended) {
        findings.push({
          severity: 'CRITICAL',
          msg: 'PAWN can capture UNDEFENDED ' + capturedPiece.toUpperCase() + ' with ' + cap.san + '! Line plays ' + lineMove + ' instead. This is almost certainly a bug!'
        });
      }
      if (movingValue === 1 && capturedValue >= 3 && isDefended) {
        findings.push({
          severity: 'REVIEW',
          msg: 'Pawn can capture defended piece (' + capturedPiece.toUpperCase() + ') with ' + cap.san + '. Line plays ' + lineMove + '. Trade might be favorable.'
        });
      }
    }
  });

  // Check if there's a check available that the line doesn't play
  if (checks.length > 0 && !lineIsCheck) {
    checks.forEach(function(chk) {
      if (chk.san === lineMove) return;
      // Is this check also a capture?
      var isCapCheck = chk.flags.indexOf('c') >= 0;
      if (isCapCheck) {
        findings.push({
          severity: 'HIGH',
          msg: 'CHECK with capture available: ' + chk.san + ' but line plays ' + lineMove
        });
      } else {
        findings.push({
          severity: 'INFO',
          msg: 'Check available: ' + chk.san + ' but line plays ' + lineMove + '. May be strategically better to develop.'
        });
      }
    });
  }

  // Special: if a capture-check exists and line doesn't play it
  if (captureChecks.length > 0) {
    captureChecks.forEach(function(cc) {
      if (cc.san === lineMove) return;
      findings.push({
        severity: 'CRITICAL',
        msg: 'CAPTURE + CHECK available: ' + cc.san + ' but line plays ' + lineMove + '! This is almost always the best move.'
      });
    });
  }

  return findings;
}

// ===================== SPECIAL POSITION CHECKS =====================
function specialChecks(game, moveIndex, lineId, lineMove) {
  var findings = [];
  var fen = game.fen();

  // Check 1: After any Qa4 pin position - look for dxc6 type captures
  if (fen.indexOf('Q') >= 0) { // Queen is on the board
    var legalMoves = game.moves({ verbose: true });
    // Look for pawn captures on c6 (dxc6 pattern)
    var dxc6moves = legalMoves.filter(function(m) {
      return m.piece === 'p' && m.to === 'c6' && (m.flags.indexOf('c') >= 0);
    });
    if (dxc6moves.length > 0 && lineMove !== dxc6moves[0].san) {
      findings.push({
        severity: 'SPECIAL-CHECK',
        msg: 'dxc6 capture available (' + dxc6moves[0].san + ') but line plays ' + lineMove + '. After Qa4 pin, this often wins material!'
      });
    }
  }

  // Check 2: After Nxe5, look for follow-up tactics
  if (moveIndex >= 2) {
    // Check if we just played Nxe5 or similar
    var legalMoves = game.moves({ verbose: true });
    // Look for discovered attacks, forks
    legalMoves.forEach(function(m) {
      var g2 = new Chess(game.fen());
      g2.move(m.san);
      var oppMoves = g2.moves({ verbose: true });
      // Count how many pieces are attacked
      // Simple: check if queen is attacked
    });
  }

  return findings;
}

// ===================== MANUAL SPOT CHECKS =====================
function manualSpotChecks() {
  var findings = [];
  console.log('\n' + '='.repeat(70));
  console.log('MANUAL SPOT CHECKS ON KNOWN TRICKY POSITIONS');
  console.log('='.repeat(70));

  // 1. Nxf2 trap: verify the full king hunt sequence
  console.log('\n--- Nxf2 King Hunt Verification ---');
  var g = new Chess();
  var nxf2Moves = ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Nxf2','Bxg6','Nxd1','Bxf7+','Ke7','Bg5+','Kd6','Nc4+','Kc5','Nba3'];
  var ok = true;
  for (var i = 0; i < nxf2Moves.length; i++) {
    var result = g.move(nxf2Moves[i]);
    if (!result) {
      console.log('  ILLEGAL at move ' + i + ': ' + nxf2Moves[i] + ' FEN: ' + g.fen());
      ok = false;
      break;
    }
    // At White move 14 (Bxg6), check if this is really best
    if (i === 14) { // After Bxg6 (index 14 = move 8, White's move)
      // Actually index 14 is 0-based, so move 15 in the sequence
    }
  }
  if (ok) {
    console.log('  All moves legal. Final FEN: ' + g.fen());
    console.log('  Final position: White has B+N+N vs Q, but Black king on c5 is in mortal danger.');
    // Check if Nba3 threatens b4 mate or further checks
    var afterNba3 = g.moves({ verbose: true });
    // It's Black's turn - what can Black do?
    console.log('  Black has ' + afterNba3.length + ' legal moves after Nba3.');

    // Check: does White threaten anything unstoppable?
    // Look for b4+ idea
    var g2 = new Chess(g.fen());
    // Simulate Black making any move and see if White has b4+
    afterNba3.forEach(function(bm) {
      var g3 = new Chess(g.fen());
      g3.move(bm.san);
      var whiteMoves = g3.moves({ verbose: true });
      var b4check = whiteMoves.find(function(wm) { return wm.san === 'b4+'; });
      if (b4check) {
        console.log('  After Black plays ' + bm.san + ', White has b4+! Confirms the trap works.');
      }
    });
  }

  // 2. Check the countergambit Bd7 line: after Nd4, is Qd1 really the best retreat?
  console.log('\n--- Countergambit Bd7: Is Qd1 the best queen retreat? ---');
  var g4 = new Chess();
  var bd7Moves = ['e4','e5','Nf3','Nc6','c3','d5','Qa4','Bd7','exd5','Nd4'];
  for (var i = 0; i < bd7Moves.length; i++) {
    g4.move(bd7Moves[i]);
  }
  // Now it's White's turn. The line plays Qd1. What are alternatives?
  var queenMoves = g4.moves({ verbose: true }).filter(function(m) { return m.piece === 'q'; });
  console.log('  Position after 5...Nd4 (threatening Nc2+ fork): ');
  console.log('  FEN: ' + g4.fen());
  console.log('  Queen moves available: ' + queenMoves.map(function(m) { return m.san; }).join(', '));
  queenMoves.forEach(function(qm) {
    var g5 = new Chess(g4.fen());
    g5.move(qm.san);
    // Check if Nc2+ is still possible
    var blackMoves = g5.moves({ verbose: true });
    var nc2fork = blackMoves.find(function(m) { return m.san === 'Nc2+'; });
    var nxf3 = blackMoves.find(function(m) { return m.san === 'Nxf3+'; });
    var issues = [];
    if (nc2fork) issues.push('Nc2+ fork still possible!');
    if (nxf3) issues.push('Nxf3+ check available');
    console.log('  ' + qm.san + ': ' + (issues.length > 0 ? issues.join(', ') : 'Safe from knight forks'));
  });

  // 3. Check Qa4 pin positions: after dxc6 available
  console.log('\n--- Qa4 Pin: Can we capture on c6 in the Bd6 trap? ---');
  var g6 = new Chess();
  var bd6Moves = ['e4','e5','Nf3','Nc6','c3','d5','Qa4','Bd6','exd5','Ne7'];
  for (var i = 0; i < bd6Moves.length; i++) {
    g6.move(bd6Moves[i]);
  }
  console.log('  Position after 5...Ne7:');
  console.log('  FEN: ' + g6.fen());
  var allMoves = g6.moves({ verbose: true });
  var pawnCapC6 = allMoves.filter(function(m) { return m.to === 'c6'; });
  console.log('  Moves targeting c6: ' + pawnCapC6.map(function(m) { return m.san; }).join(', '));
  if (pawnCapC6.length > 0) {
    pawnCapC6.forEach(function(m) {
      var isCapture = m.flags.indexOf('c') >= 0;
      console.log('    ' + m.san + ' - ' + (isCapture ? 'CAPTURE' : 'not a capture') + ' (piece: ' + m.piece + ')');
      // Check what's on c6
      var g7 = new Chess(g6.fen());
      g7.move(m.san);
      console.log('    After ' + m.san + ': ' + g7.fen());
    });
  }

  // 4. Leonhardt line: Verify Nxe5 is safe with Qa4 pin
  console.log('\n--- Leonhardt: Is Nxe5 safe on move 8? ---');
  var g8 = new Chess();
  var leonMoves = ['e4','e5','Nf3','Nc6','c3','d5','Qa4','Nf6'];
  for (var i = 0; i < leonMoves.length; i++) {
    g8.move(leonMoves[i]);
  }
  console.log('  Position before Nxe5:');
  console.log('  FEN: ' + g8.fen());
  // Can Black play Nxe5?
  // White plays Nxe5
  g8.move('Nxe5');
  console.log('  After Nxe5: ' + g8.fen());
  var blackResp = g8.moves({ verbose: true });
  var nxe5resp = blackResp.filter(function(m) { return m.san === 'Nxe5'; });
  console.log('  Can Black recapture Nxe5? ' + (nxe5resp.length > 0 ? 'YES - but Qa4 pins it!' : 'NO'));
  // Check if Bd6 is played
  console.log('  Black responses: ' + blackResp.map(function(m) { return m.san; }).join(', '));

  // 5. GothamChess Bc5 Qa4 line: after d5 Ne7, does Qa4+ actually work?
  console.log('\n--- GothamChess Bc5 line: Verify Qa4+ timing ---');
  var g9 = new Chess();
  var bc5Moves = ['e4','e5','Nf3','Nc6','c3','Bc5','d4','exd4','cxd4','Bb4+','Nc3','Nf6','d5','Ne7','Bd3','d6','Qa4+'];
  for (var i = 0; i < bc5Moves.length; i++) {
    var r = g9.move(bc5Moves[i]);
    if (!r) {
      console.log('  ILLEGAL at move ' + i + ': ' + bc5Moves[i] + ' FEN: ' + g9.fen());
      break;
    }
  }
  if (g9.in_check()) {
    console.log('  Qa4+ is indeed check. Black must respond.');
    // After Qa4+, does White threaten Qxb4?
    console.log('  FEN: ' + g9.fen());
    var blackAfterQa4 = g9.moves({ verbose: true });
    console.log('  Black responses to Qa4+: ' + blackAfterQa4.map(function(m) { return m.san; }).join(', '));
    // For each response, check if Qxb4 is possible
    blackAfterQa4.forEach(function(resp) {
      var g10 = new Chess(g9.fen());
      g10.move(resp.san);
      var whiteFU = g10.moves({ verbose: true });
      var qxb4 = whiteFU.find(function(m) { return m.san === 'Qxb4'; });
      // Also check dxc6 type
      var dxc6type = whiteFU.filter(function(m) { return m.to === 'c6' || m.san.indexOf('xc6') >= 0; });
      console.log('    After ...' + resp.san + ': Qxb4=' + (qxb4 ? 'YES' : 'no') + ', captures on c6=' + dxc6type.map(function(m) { return m.san; }).join(','));
    });
  }

  return findings;
}

// ===================== MAIN AUDIT =====================
function runAudit() {
  var totalFindings = 0;
  var criticalFindings = 0;
  var allFindings = [];

  console.log('='.repeat(70));
  console.log('DEEP AUDIT: All Ponziani Lines');
  console.log('Checking every White move for missed captures, checks, and tactics');
  console.log('='.repeat(70));

  PONZIANI_LINES.forEach(function(line) {
    var game = new Chess();
    var lineFindings = [];

    console.log('\n' + '-'.repeat(60));
    console.log('LINE: ' + line.id + ' (' + line.name + ')');
    console.log('Moves: ' + line.moves.join(' '));
    console.log('-'.repeat(60));

    for (var i = 0; i < line.moves.length; i++) {
      var move = line.moves[i];
      var isWhiteMove = (i % 2 === 0); // Even indices = White moves

      if (isWhiteMove) {
        // Analyze White's position BEFORE making the move
        var moveNum = Math.floor(i / 2) + 1;
        var findings = analyzePosition(game, move, i, line.id);
        var specials = specialChecks(game, i, line.id, move);
        findings = findings.concat(specials);

        if (findings.length > 0) {
          findings.forEach(function(f) {
            // Filter out pure INFO for cleaner output
            if (f.severity !== 'INFO') {
              console.log('  Move ' + moveNum + ' (White plays ' + move + '): [' + f.severity + '] ' + f.msg);
              lineFindings.push(f);
              totalFindings++;
              if (f.severity === 'CRITICAL' || f.severity === 'ERROR') criticalFindings++;
            }
          });
        }
      }

      // Make the move
      var result = game.move(move);
      if (!result) {
        console.log('  *** ILLEGAL MOVE at index ' + i + ': ' + move + ' ***');
        console.log('  FEN: ' + game.fen());
        console.log('  Legal moves: ' + game.moves().join(', '));
        criticalFindings++;
        totalFindings++;
        break;
      }
    }

    if (lineFindings.length === 0) {
      console.log('  No issues found.');
    }

    allFindings.push({ line: line.id, name: line.name, findings: lineFindings });
  });

  // Run manual spot checks
  manualSpotChecks();

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('AUDIT SUMMARY');
  console.log('='.repeat(70));
  console.log('Lines audited: ' + PONZIANI_LINES.length);
  console.log('Total findings (non-INFO): ' + totalFindings);
  console.log('CRITICAL/ERROR findings: ' + criticalFindings);

  console.log('\n--- Lines with findings ---');
  allFindings.forEach(function(lf) {
    if (lf.findings.length > 0) {
      console.log('\n' + lf.line + ' (' + lf.name + '):');
      lf.findings.forEach(function(f) {
        console.log('  [' + f.severity + '] ' + f.msg);
      });
    }
  });

  if (criticalFindings > 0) {
    console.log('\n*** WARNING: ' + criticalFindings + ' CRITICAL issues found! These likely indicate bugs. ***');
  } else {
    console.log('\nNo critical issues found. Lines appear tactically sound.');
  }
}

runAudit();
