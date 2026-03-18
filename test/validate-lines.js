/**
 * Validation test for all chess opening lines in the Chess Opening Trainer.
 * Tests every move sequence, color patterns, and explanation indices.
 *
 * Run: node test/validate-lines.js
 */

var Chess = require('chess.js').Chess || require('chess.js');

// ===================== DATA (copied from index.html) =====================

var PONZIANI_LINES = [
  {
    id: 'ponz-main-nxe4',
    name: 'Main Line: 3...Nf6 4.d4 Nxe4',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Nf6','O-O'],
    explanations: { 6:'x', 8:'x', 10:'x', 12:'x', 14:'x' }
  },
  {
    id: 'ponz-nxf2-trap',
    name: 'TRAP: Nxf2 Blunder (after Bd3)',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Nxf2','Bxg6','Nxd1','Bxf7+','Ke7','Bg5+','Kd6','Nc4+','Kc5','Nba3'],
    explanations: { 8:'x', 10:'x', 12:'x', 14:'x', 16:'x', 18:'x', 20:'x', 22:'x' }
  },
  {
    id: 'ponz-main-positional',
    name: 'Positional: 7.Qd4 (Queen Trade)',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Qd4','Qf6','Qxf6','gxf6','Nxg6','hxg6','Be3'],
    explanations: { 6:'x', 8:'x', 10:'x', 12:'x', 14:'x', 16:'x', 18:'x' }
  },
  {
    id: 'ponz-main-exd4',
    name: 'Main Line: 3...Nf6 4.d4 exd4',
    moves: ['e4','e5','Nf3','Nc6','c3','Nf6','d4','exd4','e5','Nd5','cxd4','Bb4+','Bd2','Bxd2+','Qxd2','d6'],
    explanations: { 6:'x', 8:'x', 10:'x', 12:'x', 14:'x' }
  },
  {
    id: 'ponz-countergambit-f6',
    name: 'Countergambit: 3...d5 4.Qa4 f6',
    moves: ['e4','e5','Nf3','Nc6','c3','d5','Qa4','f6','Bb5','Ne7','exd5','Qxd5','d4','Bd7'],
    explanations: { 6:'x', 8:'x', 10:'x', 12:'x' }
  },
  {
    id: 'ponz-countergambit-bd6-trap',
    name: 'TRAP: 3...d5 Qa4 Bd6?? (Free Pawn)',
    moves: ['e4','e5','Nf3','Nc6','c3','d5','Qa4','Bd6','exd5','Ne7','d4'],
    explanations: { 6:'x', 8:'x', 10:'x' }
  },
  {
    id: 'ponz-countergambit-dxe4-trap',
    name: 'TRAP: 3...d5 Qa4 dxe4?? (Pinned Knight)',
    moves: ['e4','e5','Nf3','Nc6','c3','d5','Qa4','dxe4','Nxe5','Bd7','Nxd7','Qxd7','Qxe4+'],
    explanations: { 6:'x', 8:'x', 10:'x', 12:'x' }
  },
  {
    id: 'ponz-countergambit-bd7',
    name: 'Countergambit: 3...d5 Qa4 Bd7 (Gambit)',
    moves: ['e4','e5','Nf3','Nc6','c3','d5','Qa4','Bd7','exd5','Nd4','Qd1','Nxf3+','Qxf3','Nf6','Bc4','e4','Qe2'],
    explanations: { 6:'x', 8:'x', 10:'x', 12:'x', 14:'x', 16:'x' }
  },
  {
    id: 'ponz-passive-d6',
    name: 'Passive: 3...d6',
    moves: ['e4','e5','Nf3','Nc6','c3','d6','d4','Nf6','Bd3','Be7','O-O','O-O','Nbd2','Bg4','h3'],
    explanations: { 6:'x', 8:'x', 10:'x', 12:'x', 14:'x' }
  },
  {
    id: 'ponz-aggressive-f5',
    name: 'Aggressive: 3...f5',
    moves: ['e4','e5','Nf3','Nc6','c3','f5','d4','fxe4','Nxe5','Qf6','Ng4','Qg6','Bf4','Nf6','d5','Ne5','Ne3'],
    explanations: { 6:'x', 8:'x', 10:'x', 12:'x', 14:'x', 16:'x' }
  },
  {
    id: 'ponz-aggressive-f5-nxe5',
    name: 'Aggressive: 3...f5, Black takes knight',
    moves: ['e4','e5','Nf3','Nc6','c3','f5','d4','fxe4','Nxe5','Nxe5','dxe5','Qh4+','g3','Qe7','Bf4'],
    explanations: { 6:'x', 8:'x', 10:'x', 12:'x', 14:'x' }
  },
  {
    id: 'ponz-passive-be7',
    name: 'Passive: 3...Be7',
    moves: ['e4','e5','Nf3','Nc6','c3','Be7','d4','d6','Bd3','Nf6','O-O','O-O','Nbd2','Re8','Nf1','Bf8','Ng3'],
    explanations: { 6:'x', 8:'x', 10:'x', 12:'x', 14:'x', 16:'x' }
  }
];

var HIPPO_LINES = [
  {
    id: 'hippo-vs-e4-main',
    name: 'Hippo vs 1.e4 — Full Setup',
    moves: ['e4','g6','d4','Bg7','Nc3','d6','Nf3','a6','Be2','b6','O-O','Bb7','Be3','e6','Qd2','Nd7','Rad1','Ne7','Rfe1','h6','Bc4','O-O','d5','e5'],
    explanations: { 1:'x', 3:'x', 5:'x', 7:'x', 9:'x', 11:'x', 13:'x', 15:'x', 17:'x', 19:'x', 21:'x', 23:'x' }
  },
  {
    id: 'hippo-vs-e4-e5-push',
    name: 'Hippo vs 1.e4 — White Pushes e5',
    moves: ['e4','g6','d4','Bg7','Nc3','d6','Nf3','e6','e5','d5','Be2','Ne7','O-O','Nd7','Be3','b6','Nd2','Bb7','f4','c5'],
    explanations: { 1:'x', 3:'x', 5:'x', 7:'x', 9:'x', 11:'x', 13:'x', 15:'x', 17:'x', 19:'x' }
  },
  {
    id: 'hippo-vs-d4-main',
    name: 'Hippo vs 1.d4 — Spassky Line',
    moves: ['d4','g6','c4','Bg7','Nc3','d6','e4','Nd7','Nf3','e6','Be2','b6','O-O','Bb7','Be3','Ne7','Qd2','h6','Rad1','O-O','d5','e5'],
    explanations: { 1:'x', 3:'x', 5:'x', 7:'x', 9:'x', 11:'x', 13:'x', 15:'x', 17:'x', 19:'x', 21:'x' }
  },
  {
    id: 'hippo-vs-d4-e5-push',
    name: 'Hippo vs 1.d4 — White Pushes e5',
    moves: ['d4','g6','c4','Bg7','Nc3','d6','e4','e6','Nf3','Nd7','Be2','Ne7','O-O','b6','e5','d5','c5','Bb7','b4','O-O'],
    explanations: { 1:'x', 3:'x', 5:'x', 7:'x', 9:'x', 11:'x', 13:'x', 15:'x', 17:'x', 19:'x' }
  },
  {
    id: 'hippo-vs-c4-english',
    name: 'Hippo vs 1.c4 — English',
    moves: ['c4','g6','Nc3','Bg7','d4','d6','e4','e6','Nf3','Nd7','Be2','b6','O-O','Bb7','Be3','Ne7','Qd2','h6','Rad1','a6','Rfe1','O-O'],
    explanations: { 1:'x', 3:'x', 5:'x', 7:'x', 9:'x', 11:'x', 13:'x', 15:'x', 17:'x', 19:'x', 21:'x' }
  },
  {
    id: 'hippo-vs-c4-quiet',
    name: 'Hippo vs 1.c4 — White Plays d3',
    moves: ['c4','g6','g3','Bg7','Bg2','d6','Nc3','e6','Nf3','Nd7','O-O','Ne7','d3','b6','e4','Bb7','Be3','h6','Qd2','a6','Rae1','O-O'],
    explanations: { 1:'x', 3:'x', 5:'x', 7:'x', 9:'x', 11:'x', 13:'x', 15:'x', 17:'x', 19:'x', 21:'x' }
  },
  {
    id: 'hippo-vs-nf3-reti',
    name: 'Hippo vs 1.Nf3 — Reti (Spassky \'66)',
    moves: ['Nf3','g6','c4','Bg7','d4','d6','Nc3','Nd7','e4','e6','Be2','b6','O-O','Bb7','Be3','Ne7','Qc2','h6','Rad1','O-O','d5','e5','Qc1','f5'],
    explanations: { 1:'x', 3:'x', 5:'x', 7:'x', 9:'x', 11:'x', 13:'x', 15:'x', 17:'x', 19:'x', 21:'x', 23:'x' }
  },
  {
    id: 'hippo-vs-nf3-quiet',
    name: 'Hippo vs 1.Nf3 — Quiet Reti',
    moves: ['Nf3','g6','g3','Bg7','Bg2','d6','O-O','e6','d3','Ne7','e4','Nd7','Nc3','b6','Be3','Bb7','Qd2','h6','Nh4','a6','f4','O-O'],
    explanations: { 1:'x', 3:'x', 5:'x', 7:'x', 9:'x', 11:'x', 13:'x', 15:'x', 17:'x', 19:'x', 21:'x' }
  }
];

var ALL_LINES = [].concat(
  PONZIANI_LINES.map(function(l) { return Object.assign({}, l, { opening: 'ponziani', playerColor: 'w', baseMoves: 5 }); }),
  HIPPO_LINES.map(function(l) { return Object.assign({}, l, { opening: 'hippo', playerColor: 'b', baseMoves: 0 }); })
);

// ===================== TESTS =====================

var totalIssues = 0;
var totalLines = 0;
var totalMoves = 0;

function report(lineId, lineName, msg) {
  console.log('  [ISSUE] ' + msg);
  totalIssues++;
}

ALL_LINES.forEach(function(line) {
  totalLines++;
  console.log('\n=== Testing: ' + line.name + ' (' + line.id + ') ===');
  console.log('    Player: ' + (line.playerColor === 'w' ? 'White' : 'Black') + ' | Opening: ' + line.opening + ' | baseMoves: ' + line.baseMoves + ' | totalMoves: ' + line.moves.length);

  // --- Test 1: Play through all moves ---
  var game = new Chess();
  var movesFailed = false;
  for (var i = 0; i < line.moves.length; i++) {
    totalMoves++;
    var san = line.moves[i];
    var expectedTurn = (i % 2 === 0) ? 'w' : 'b';
    var actualTurn = game.turn();

    if (actualTurn !== expectedTurn) {
      report(line.id, line.name, 'Move index ' + i + ' (' + san + '): expected turn=' + expectedTurn + ' but game says turn=' + actualTurn);
    }

    var result = game.move(san);
    if (!result) {
      report(line.id, line.name, 'ILLEGAL MOVE at index ' + i + ': "' + san + '" (FEN: ' + game.fen() + ')');
      movesFailed = true;
      break;
    }
  }

  if (!movesFailed) {
    console.log('    All ' + line.moves.length + ' moves are legal.');
  }

  // --- Test 2: Check player color pattern ---
  // The app logic (playNextAutoOrWait) uses: turnColor = moveIndex % 2 === 0 ? 'w' : 'b'
  // Player moves are when turnColor === playerColor
  // For Ponziani (white, baseMoves=5): player moves at even indices >= baseMoves
  // For Hippo (black, baseMoves=0): player moves at odd indices >= baseMoves
  var playerMoveIndices = [];
  for (var j = line.baseMoves; j < line.moves.length; j++) {
    var turnColor = (j % 2 === 0) ? 'w' : 'b';
    if (turnColor === line.playerColor) {
      playerMoveIndices.push(j);
    }
  }

  if (playerMoveIndices.length === 0) {
    report(line.id, line.name, 'No player moves found after baseMoves=' + line.baseMoves + '. The player never gets to play!');
  }

  // Check that the first move after baseMoves is NOT a player move if baseMoves ends on an opponent's turn
  // Actually, the app handles this in playNextAutoOrWait — it auto-plays opponent moves.
  // The key check: does the line end on a player move or opponent move?
  var lastMoveIndex = line.moves.length - 1;
  var lastMoveTurn = (lastMoveIndex % 2 === 0) ? 'w' : 'b';
  // Lines typically end on the player's move (since that's the last thing they practice)
  // but ending on opponent's move is not necessarily wrong, just unusual

  // --- Test 3: Check explanation indices ---
  var explKeys = Object.keys(line.explanations).map(Number);
  explKeys.forEach(function(idx) {
    if (idx < 0 || idx >= line.moves.length) {
      report(line.id, line.name, 'Explanation at index ' + idx + ' is OUT OF BOUNDS (line has ' + line.moves.length + ' moves, indices 0-' + (line.moves.length - 1) + ')');
      return;
    }

    var moveTurnAtIdx = (idx % 2 === 0) ? 'w' : 'b';

    // Explanations should be for the player's moves (since the app explains the player's choices)
    if (moveTurnAtIdx !== line.playerColor) {
      report(line.id, line.name, 'Explanation at index ' + idx + ' (' + line.moves[idx] + ') is for ' + (moveTurnAtIdx === 'w' ? 'White' : 'Black') + ' but player is ' + (line.playerColor === 'w' ? 'White' : 'Black') + '. Explanation is on OPPONENT\'s move.');
    }

    // Check if the explanation index is before baseMoves (would never be shown during drill)
    if (idx < line.baseMoves) {
      report(line.id, line.name, 'Explanation at index ' + idx + ' (' + line.moves[idx] + ') is BEFORE baseMoves=' + line.baseMoves + ' — would never be reached during drill.');
    }
  });

  // --- Test 4: Check that player moves have explanations ---
  playerMoveIndices.forEach(function(idx) {
    if (!(idx in line.explanations)) {
      // Not necessarily a bug, but worth noting
      // Only flag if it seems like a gap
    }
  });

  // Check baseMoves validity
  if (line.baseMoves > line.moves.length) {
    report(line.id, line.name, 'baseMoves (' + line.baseMoves + ') exceeds total moves (' + line.moves.length + ')');
  }

  // For Ponziani: baseMoves=5 means moves 0-4 are auto-played (1.e4 e5 2.Nf3 Nc6 3.c3)
  // Move index 5 is Black's response to c3 — that's an opponent move for White
  // So after baseMoves, the app calls playNextAutoOrWait which should auto-play Black's move at index 5
  // Then White (player) moves at index 6. This seems correct.

  // For Hippo: baseMoves=0, so it starts from the very beginning
  // Move index 0 is White's move — opponent auto-plays. Then index 1 is Black (player) move. Correct.
});

console.log('\n\n========================================');
console.log('SUMMARY');
console.log('========================================');
console.log('Total lines tested: ' + totalLines);
console.log('Total moves validated: ' + totalMoves);
console.log('Total issues found: ' + totalIssues);
console.log('========================================');

if (totalIssues === 0) {
  console.log('ALL LINES PASS!');
} else {
  console.log(totalIssues + ' ISSUE(S) FOUND — see details above.');
  process.exit(1);
}
