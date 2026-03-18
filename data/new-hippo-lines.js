/**
 * New Hippopotamus Defense lines to add to the trainer.
 * Run: node data/new-hippo-lines.js
 * This will validate all lines and output JSON.
 */

var Chess = require('chess.js').Chess || require('chess.js');

var NEW_LINES = [
  // ============================================================
  // 1. DEEPER EXISTING LINES — Extensions to 14-16 moves
  // ============================================================

  {
    id: 'hippo-vs-e4-main-deep-f5',
    name: 'Hippo vs 1.e4 — Setup + d5 e5 f5 Kingside Attack',
    description: 'After White pushes d5 and Black locks with ...e5, Black launches the thematic ...f5 kingside attack. The Bb7 supports the center while Black opens the f-file for the rook.',
    result: 'Black has active kingside play with the f-file open and pieces aimed at White\'s king. A classic King\'s Indian-style attack from the Hippo.',
    isTrap: false,
    moves: [
      'e4','g6',      // 1
      'd4','Bg7',     // 2
      'Nc3','d6',     // 3
      'Nf3','a6',     // 4
      'Be2','b6',     // 5
      'O-O','Bb7',    // 6
      'Be3','e6',     // 7
      'Qd2','Nd7',    // 8
      'Rad1','Ne7',   // 9
      'Rfe1','h6',    // 10
      'Bc4','O-O',    // 11
      'd5','e5',      // 12 - lock center
      'Qc1','f5',     // 13 - thematic break!
      'exf5','Nxf5',  // 14 - recapture with knight
      'Bd3','Nf6',    // 15 - bring knight to active square
      'Ne4','Nxe4'    // 16 - trade to open the position
    ],
    explanations: {
      1: 'Start the Hippo with ...g6, preparing the kingside fianchetto.',
      3: 'Fianchetto the dark-squared bishop to its best diagonal.',
      5: 'Establish the d6 pawn pillar controlling e5 and c5.',
      7: 'Prophylactic ...a6 prevents Nb5/Bb5 and prepares ...b6.',
      9: 'Prepare the queenside fianchetto with ...b6.',
      11: 'Complete the queenside fianchetto. Bb7 targets e4.',
      13: 'Second pawn pillar on e6 — the Hippo center is formed.',
      15: 'Develop the knight to d7, supporting both ...e5 and ...c5.',
      17: 'Develop the second knight to e7 for ...d5, ...f5, or rerouting.',
      19: 'Complete the pawn wall with ...h6, preventing Ng5/Bg5.',
      21: 'Castle to safety — the full Hippo is now deployed.',
      23: 'Lock the center with ...e5! Now plan ...f5 for a kingside attack.',
      25: 'Launch the thematic ...f5 break! Opens the f-file and attacks e4.',
      27: 'Recapture with the knight on f5 — it\'s beautifully placed here.',
      29: 'Bring the other knight to f6, adding to the kingside pressure.',
      31: 'Trade knights to open lines. Black has active piece play.'
    }
  },

  {
    id: 'hippo-vs-e4-e5-deep-c5',
    name: 'Hippo vs 1.e4 — White Pushes e5, Deep ...c5 Break',
    description: 'When White pushes e5, Black locks with ...d5 creating a French-like structure. Black then plays ...c5 to undermine White\'s center, followed by ...O-O and ...Nf5 targeting d4.',
    result: 'Black has achieved a favorable French structure with the dark-squared bishop actively placed on g7. The ...c5 break has undermined White\'s center and Black has excellent queenside play.',
    isTrap: false,
    moves: [
      'e4','g6',       // 1
      'd4','Bg7',      // 2
      'Nc3','d6',      // 3
      'Nf3','e6',      // 4
      'e5','d5',       // 5 - lock with d5
      'Be2','Ne7',     // 6
      'O-O','Nd7',     // 7
      'Be3','b6',      // 8
      'Nd2','Bb7',     // 9
      'f4','c5',       // 10 - thematic c5 break
      'dxc5','bxc5',   // 11 - open the position
      'Nb3','O-O',     // 12
      'Bf2','Nf5',     // 13 - knight to f5 targeting d4
      'Qd2','a5'       // 14 - queenside expansion
    ],
    explanations: {
      1: 'Start the Hippo with ...g6.',
      3: 'Fianchetto the dark-squared bishop.',
      5: 'Set up the d6 pawn controlling e5.',
      7: 'Place e6 early — ready to react to White\'s advance.',
      9: 'Lock the center with ...d5 when White pushes e5! French-like structure with active Bg7.',
      11: 'Develop to e7 — the knight can reroute to f5 or g6.',
      13: 'Develop the second knight supporting ...c5.',
      15: 'Prepare the fianchetto and the ...c5 break.',
      17: 'Complete the fianchetto. The bishop supports d5.',
      19: 'Strike with ...c5! The thematic break in this structure — undermines d4.',
      21: 'Recapture with ...bxc5 to keep the pawn structure flexible and open the b-file.',
      23: 'Castle to safety.',
      25: 'Move the knight to f5 — a powerful outpost targeting d4.',
      27: 'Expand with ...a5, gaining queenside space and preparing ...a4.'
    }
  },

  {
    id: 'hippo-spassky-1966-deep',
    name: 'Spassky 1966 — Full Game to Move 16',
    description: 'The actual Petrosian-Spassky 1966 World Championship Game 12. After ...f5, Black recaptures with ...Nxf5 and continues with ...Bc8 (rerouting the bishop), ...Nf6 for a kingside attack.',
    result: 'Black has active kingside counterplay. The Nf5 is powerfully placed, and Black can continue with ...Nf6, ...Nh5, ...g5 for a devastating kingside attack. The game ended in a draw after wild complications.',
    isTrap: false,
    moves: [
      'Nf3','g6',       // 1
      'c4','Bg7',       // 2
      'd4','d6',        // 3
      'Nc3','Nd7',      // 4
      'e4','e6',        // 5
      'Be2','b6',       // 6
      'O-O','Bb7',      // 7
      'Be3','Ne7',      // 8
      'Qc2','h6',       // 9
      'Rad1','O-O',     // 10
      'd5','e5',        // 11 - lock center
      'Qc1','Kh7',      // 12 - prophylactic king move
      'g3','f5',        // 13 - the break!
      'exf5','Nxf5',    // 14 - recapture with knight
      'Bd3','Bc8',      // 15 - reroute the bishop for kingside action
      'Kg2','Nf6'       // 16 - bring the other knight into the attack
    ],
    explanations: {
      1: 'Universal Hippo first move: ...g6.',
      3: 'Fianchetto the dark-squared bishop.',
      5: 'Establish the d6 pawn pillar.',
      7: 'Develop the knight to d7 early — avoids Bg5 pins.',
      9: 'Place the second pawn pillar on e6.',
      11: 'Prepare the queenside fianchetto.',
      13: 'Complete the fianchetto — bishop targets e4.',
      15: 'Develop the second knight to e7.',
      17: 'Add ...h6 to the pawn wall, preventing Bg5/Bh6.',
      19: 'Castle to safety — the Hippo is fully deployed.',
      21: 'Lock the center with ...e5! Now plan ...f5.',
      23: 'Move the king to h7 for safety before launching ...f5. This prophylactic move avoids any checks on the a2-g8 diagonal.',
      25: 'Launch ...f5! The thematic kingside break. Opens the f-file and attacks White\'s center.',
      27: 'Recapture with the knight — beautifully placed on f5, pressuring d4 and e3.',
      29: 'Reroute the bishop to c8! From here it can go to d7, e6, or even g4 to join the kingside attack.',
      31: 'Bring the other knight to f6, preparing ...Nh5 or ...g5 for a full kingside assault.'
    }
  },

  // ============================================================
  // 2. MISSING CRITICAL VARIATIONS
  // ============================================================

  {
    id: 'hippo-vs-austrian-attack',
    name: 'Hippo vs Austrian Attack (1.e4 g6 2.d4 Bg7 3.Nc3 d6 4.f4)',
    description: 'DANGER: The Austrian Attack with f4 is the most dangerous line against the Hippo. Black should NOT play the pure Hippo here. Instead, play ...Nf6 to transpose into a Pirc Defense, which handles the f4 push much better.',
    result: 'Black has transposed into a Pirc Defense Austrian Attack. The position is sharp but playable. Black has ...e5 as a key break to challenge White\'s center. This is much safer than trying a pure Hippo against f4.',
    isTrap: false,
    moves: [
      'e4','g6',       // 1
      'd4','Bg7',      // 2
      'Nc3','d6',      // 3
      'f4','Nf6',      // 4 - KEY: play Nf6, NOT the Hippo setup
      'Nf3','O-O',     // 5
      'Bd3','Na6',     // 6 - knight to a6, heading for c7
      'O-O','c5',      // 7 - immediate queenside strike
      'e5','Nd7'       // 8 - retreat the knight, preparing to undermine e5
    ],
    explanations: {
      1: 'Start with ...g6 as usual.',
      3: 'Fianchetto the bishop.',
      5: 'Establish d6. So far, normal Hippo moves.',
      7: 'CRITICAL: Play ...Nf6, NOT ...e6 or ...Nd7! Against the Austrian Attack (f4), you must transpose to the Pirc. The pure Hippo gets crushed by the f4-e5 push.',
      9: 'Castle early. The king is safer here before the center opens.',
      11: 'Knight to a6 — an unusual but strong square. It heads for c7 to support ...b5 or ...e5.',
      13: 'Strike immediately with ...c5! Challenge White\'s d4 pawn before the f4-e5 steamroller gets going.',
      15: 'Retreat the knight. Black will undermine e5 with ...f6 or play ...Nb6 and ...Bg4.'
    }
  },

  {
    id: 'hippo-vs-early-bc4',
    name: 'Hippo vs Early Bc4 (Targeting f7)',
    description: 'White develops the bishop to c4 early, targeting the f7 square. Black must be careful but can handle this by completing the setup and keeping e6 solid. The Bc4 is actually less effective against the Hippo because ...e6 blocks the diagonal.',
    result: 'Black has safely neutralized the Bc4 threat. The bishop on c4 is hitting a wall on e6, and Black can continue with normal Hippo development. White\'s bishop may need to retreat later.',
    isTrap: false,
    moves: [
      'e4','g6',        // 1
      'd4','Bg7',       // 2
      'Bc4','d6',       // 3 - White develops Bc4 early
      'Nf3','e6',       // 4 - IMPORTANT: e6 blocks the diagonal immediately
      'O-O','Ne7',      // 5
      'Nc3','Nd7',      // 6
      'Be3','b6',       // 7
      'Qd2','Bb7',      // 8
      'Rad1','a6',      // 9
      'Bb3','h6',       // 10
      'Rfe1','O-O'      // 11
    ],
    explanations: {
      1: 'Start with ...g6 as usual.',
      3: 'Fianchetto the bishop.',
      5: 'Play ...d6 calmly. The Bc4 doesn\'t threaten anything yet.',
      7: 'KEY RESPONSE: Play ...e6 immediately! This blocks the Bc4\'s diagonal and takes away the f7 threat. The bishop on c4 is now staring at a wall.',
      9: 'Develop the knight to e7. Normal Hippo development.',
      11: 'Develop the second knight. Continue building the fortress.',
      13: 'Prepare the queenside fianchetto.',
      15: 'Complete the fianchetto. Bb7 pressures e4.',
      17: 'Prophylactic ...a6 — prevents Nb5 and prepares ...b5 expansion.',
      19: 'Add ...h6 to the pawn wall.',
      21: 'Castle to safety. The Hippo is fully built and the Bc4 is harmless because of e6.'
    }
  },

  {
    id: 'hippo-vs-h4-pawn-storm',
    name: 'Hippo vs Early h4 Pawn Storm',
    description: 'White launches an aggressive h4-h5 pawn storm against the kingside fianchetto. Black should NOT panic — delay castling, complete the setup, and consider castling queenside or keeping the king in the center temporarily.',
    result: 'Black has safely handled the h4 storm by delaying castling and completing development. With the center closed, Black can castle queenside or keep the king in the center while launching counterplay with ...c5 or ...f5.',
    isTrap: false,
    moves: [
      'e4','g6',        // 1
      'd4','Bg7',       // 2
      'Nc3','d6',       // 3
      'h4','a6',        // 4 - Don't panic, continue setup
      'h5','b6',        // 5
      'hxg6','fxg6',    // 6 - Recapture to keep pawn structure OK
      'Nf3','Bb7',      // 7
      'Bc4','e6',       // 8 - Block the diagonal
      'Be3','Nd7',      // 9
      'Qd2','Ne7',      // 10
      'O-O-O','d5'      // 11 - White castled QS, Black strikes center
    ],
    explanations: {
      1: 'Start with ...g6 as usual.',
      3: 'Fianchetto the dark-squared bishop.',
      5: 'Play ...d6. Don\'t panic about h4.',
      7: 'Continue development with ...a6. The h4 push doesn\'t threaten anything concrete yet.',
      9: 'Keep building with ...b6. Let White waste tempi on the h-pawn.',
      11: 'Recapture with ...fxg6! This keeps a pawn on g6 protecting the diagonal and opens the f-file for your rook.',
      13: 'Complete the fianchetto. The bishop pressures e4.',
      15: 'Play ...e6 to block the Bc4 diagonal and solidify the center.',
      17: 'Continue developing. The knight goes to d7 as usual.',
      19: 'Develop the second knight to e7.',
      21: 'White has castled queenside — now strike with ...d5! Challenge the center and prepare queenside counterplay with ...c5.'
    }
  },

  {
    id: 'hippo-vs-bh6-bishop-trade',
    name: 'Hippo vs Bh6 (White Trades Dark Bishop)',
    description: 'White plays Qd2 + Bh6 to exchange Black\'s fianchettoed dark-squared bishop. This is a common anti-Hippo idea. Black should allow the trade but compensate by using the half-open g-file and keeping a solid center.',
    result: 'After the bishop trade, Black has the half-open g-file for the rook and a solid pawn center. The loss of the dark bishop is compensated by active rook play and the strong light-squared bishop on b7.',
    isTrap: false,
    moves: [
      'e4','g6',       // 1
      'd4','Bg7',      // 2
      'Nc3','d6',      // 3
      'Nf3','a6',      // 4
      'Be2','b6',      // 5
      'O-O','Bb7',     // 6
      'Be3','e6',      // 7
      'Qd2','Nd7',     // 8
      'Bh6','Bxh6',    // 9 - Allow the trade
      'Qxh6','Ne7',    // 10
      'Qd2','h6',      // 11 - Prevent any further incursion
      'Rad1','O-O',    // 12
      'Rfe1','Nf5'     // 13 - Knight to f5 pressures d4
    ],
    explanations: {
      1: 'Start with ...g6.',
      3: 'Fianchetto the dark-squared bishop.',
      5: 'Establish d6.',
      7: 'Prophylactic ...a6.',
      9: 'Prepare the queenside fianchetto.',
      11: 'Complete the fianchetto — Bb7 targets e4.',
      13: 'Second pawn pillar on e6.',
      15: 'Develop knight to d7.',
      17: 'Allow the trade with ...Bxh6. Don\'t try to avoid it — the compensation (solid center, strong Bb7) is good enough.',
      19: 'Develop the knight to e7. Now plan to reroute it to f5 or c6.',
      21: 'Play ...h6 to prevent the queen from returning to h6 and to solidify.',
      23: 'Castle kingside. Black has a solid position even without the dark-squared bishop.',
      25: 'Reroute the knight to f5! A dream outpost — it pressures d4 and e3, and can\'t be easily dislodged.'
    }
  },

  // ============================================================
  // 3. KEY MIDDLEGAME PLANS AFTER SETUP
  // ============================================================

  {
    id: 'hippo-f5-kingside-attack-plan',
    name: 'Hippo Middlegame: The ...f5 Kingside Attack',
    description: 'After d5/e5 locks the center, Black launches ...f5 followed by ...Nf6, ...g5, and ...Ng6-f4 for a devastating kingside attack. This is the most important attacking plan in the Hippo.',
    result: 'Black has a powerful kingside attack. The knight on f4 is a monster, the g5 pawn cramps White, and Black can continue with ...Rf7-g7, ...Qe7-h4, or ...h5 to break through.',
    isTrap: false,
    moves: [
      'd4','g6',        // 1
      'c4','Bg7',       // 2
      'Nc3','d6',       // 3
      'e4','Nd7',       // 4
      'Nf3','e6',       // 5
      'Be2','b6',       // 6
      'O-O','Bb7',      // 7
      'Be3','Ne7',      // 8
      'Qd2','h6',       // 9
      'Rad1','O-O',     // 10
      'd5','e5',        // 11 - lock center
      'Na4','f5',       // 12 - the break!
      'exf5','Nxf5',    // 13 - recapture with knight
      'Bd3','Nf6',      // 14 - bring knight into the attack
      'Nc3','g5'        // 15 - gain space on the kingside!
    ],
    explanations: {
      1: 'Start with ...g6.',
      3: 'Fianchetto the bishop.',
      5: 'Establish the d6 pawn.',
      7: 'Develop knight to d7 early.',
      9: 'Place the e6 pawn pillar.',
      11: 'Prepare the queenside fianchetto.',
      13: 'Complete the fianchetto. Bb7 targets e4.',
      15: 'Develop the second knight to e7.',
      17: 'Add ...h6 to the pawn wall.',
      19: 'Castle to safety. Setup complete.',
      21: 'Lock the center with ...e5 after d5.',
      23: 'Launch the ...f5 break! This is the key moment — attack White\'s e4 pawn and open the f-file.',
      25: 'Recapture with the knight on f5 — beautifully centralized.',
      27: 'Bring the other knight to f6, adding kingside pressure.',
      29: 'Push ...g5! Gain space on the kingside and prepare ...g4 to drive away White\'s knight, or ...Ng6-f4.'
    }
  },

  {
    id: 'hippo-c5-queenside-break-plan',
    name: 'Hippo Middlegame: The ...c5 Queenside Break',
    description: 'When White pushes e5 and Black responds with ...d5 (French-like structure), the key plan is ...c5 to undermine White\'s d4 pawn. Follow up with ...Nf5, ...a5, and pressure on the c-file.',
    result: 'Black has successfully undermined White\'s center with ...c5. The d4 pawn is under pressure, the knight on f5 is excellent, and Black has open lines on the queenside.',
    isTrap: false,
    moves: [
      'e4','g6',        // 1
      'd4','Bg7',       // 2
      'Nc3','d6',       // 3
      'Nf3','e6',       // 4
      'Be2','Nd7',      // 5
      'O-O','Ne7',      // 6
      'Be3','b6',       // 7
      'e5','d5',        // 8 - lock with d5
      'Nd2','Bb7',      // 9
      'f4','c5',        // 10 - the queenside break!
      'dxc5','bxc5',    // 11 - recapture
      'Nb3','O-O',      // 12
      'Bf2','Nf5',      // 13 - knight to powerful outpost
      'Qe1','Rc8'       // 14 - rook to the c-file
    ],
    explanations: {
      1: 'Start with ...g6.',
      3: 'Fianchetto the bishop.',
      5: 'Establish d6.',
      7: 'Place e6 early — ready for ...d5 if White pushes e5.',
      9: 'Develop knight to d7.',
      11: 'Develop the second knight to e7.',
      13: 'Prepare the queenside fianchetto.',
      15: 'Lock the center with ...d5! This creates a French-like structure with the huge advantage of having Bg7 active.',
      17: 'Complete the fianchetto. The bishop supports d5.',
      19: 'Strike with ...c5! The thematic break — undermine d4 and open the c-file.',
      21: 'Recapture with ...bxc5 to keep pawns flexible and maintain pressure on d4.',
      23: 'Castle to safety.',
      25: 'Move the knight to f5 — a dream outpost pressuring d4!',
      27: 'Put the rook on the c-file for queenside pressure.'
    }
  },

  {
    id: 'hippo-b5-expansion-plan',
    name: 'Hippo Middlegame: The ...b5 Queenside Expansion',
    description: 'When the center is locked and White castles kingside, Black can expand on the queenside with ...b5. This is especially effective when White has a pawn on c4, as ...b5 attacks it directly.',
    result: 'Black has expanded on the queenside with ...b5, putting pressure on White\'s c4 pawn. The Bb7 is very active and Black has queenside initiative.',
    isTrap: false,
    moves: [
      'd4','g6',        // 1
      'c4','Bg7',       // 2
      'Nc3','d6',       // 3
      'e4','Nd7',       // 4
      'Nf3','e6',       // 5
      'Be2','b6',       // 6
      'O-O','Bb7',      // 7
      'Be3','Ne7',      // 8
      'Qd2','a6',       // 9
      'd5','e5',        // 10 - lock center
      'Na4','h6',       // 11
      'Qc2','O-O',      // 12
      'a3','b5',        // 13 - the expansion!
      'cxb5','axb5',    // 14 - open the a-file
      'Nc3','b4'        // 15 - push further!
    ],
    explanations: {
      1: 'Start with ...g6.',
      3: 'Fianchetto the bishop.',
      5: 'Establish d6.',
      7: 'Develop knight to d7.',
      9: 'Place e6.',
      11: 'Prepare the fianchetto.',
      13: 'Complete the fianchetto.',
      15: 'Develop knight to e7.',
      17: 'Play ...a6 — essential preparation for ...b5.',
      19: 'Lock the center with ...e5.',
      21: 'Complete the pawn wall with ...h6.',
      23: 'Castle to safety.',
      25: 'Push ...b5! Attack White\'s c4 pawn and gain queenside space. The a6 pawn supports this advance.',
      27: 'Recapture with ...axb5, opening the a-file for your rook.',
      29: 'Push ...b4! Drive the knight away and gain more queenside space. Black has strong queenside initiative.'
    }
  }
];

// ===================== VALIDATION =====================

var issues = 0;
var passed = 0;

NEW_LINES.forEach(function(line) {
  console.log('\n=== Validating: ' + line.name + ' (' + line.id + ') ===');
  console.log('    Total moves: ' + line.moves.length);

  var game = new Chess();
  var failed = false;

  for (var i = 0; i < line.moves.length; i++) {
    var san = line.moves[i];
    var result = game.move(san);
    if (!result) {
      console.log('  [ILLEGAL] Move index ' + i + ': "' + san + '" (FEN: ' + game.fen() + ')');
      issues++;
      failed = true;
      break;
    }
  }

  if (!failed) {
    console.log('    All moves legal.');
    passed++;
  }

  // Check explanations are on odd indices (Black's moves)
  var explKeys = Object.keys(line.explanations).map(Number);
  explKeys.forEach(function(idx) {
    if (idx % 2 !== 1) {
      console.log('  [WARN] Explanation at index ' + idx + ' is for WHITE (even index), expected BLACK (odd).');
    }
    if (idx >= line.moves.length) {
      console.log('  [ERROR] Explanation index ' + idx + ' is out of bounds (line has ' + line.moves.length + ' moves).');
      issues++;
    }
  });

  // Check all Black moves have explanations
  for (var j = 1; j < line.moves.length; j += 2) {
    if (!(j in line.explanations)) {
      console.log('  [WARN] Black move at index ' + j + ' (' + line.moves[j] + ') has no explanation.');
    }
  }
});

console.log('\n========================================');
console.log('RESULTS: ' + passed + '/' + NEW_LINES.length + ' lines passed');
console.log('Issues: ' + issues);
console.log('========================================');

if (issues > 0) {
  process.exit(1);
} else {
  // Output the JSON
  console.log('\n\n// ===== VALIDATED JSON OUTPUT =====\n');
  console.log(JSON.stringify(NEW_LINES, null, 2));
}
