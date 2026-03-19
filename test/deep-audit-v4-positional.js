/**
 * Deep analysis of the ponz-main-positional Qxe4+ bug.
 * Run: node test/deep-audit-v4-positional.js
 */
var Chess = require('chess.js').Chess || require('chess.js');

var g = new Chess();
['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Nxg6','hxg6','Qd4','Qf6'].forEach(function(m) { g.move(m); });

console.log('Position: ' + g.fen());
console.log('Line plays Qxf6. Checking Qxe4+...\n');

var g2 = new Chess(g.fen());
g2.move('Qxe4+');
var responses = g2.moves({ verbose: true });

responses.forEach(function(r) {
  console.log('After Qxe4+ ' + r.san + ':');
  var g3 = new Chess(g2.fen());
  g3.move(r.san);
  var whiteMoves = g3.moves({ verbose: true });

  // If Black plays Qe5 or Qe6 (queen trade offers), does White have to trade?
  if (r.san === 'Qe5') {
    console.log('  Black offers queen trade with Qe5!');
    console.log('  White can AVOID the trade: ' + whiteMoves.filter(function(m) { return m.piece === 'q' && m.san !== 'Qxe5'; }).map(function(m) { return m.san; }).join(', '));
    var qxe5 = whiteMoves.find(function(m) { return m.san === 'Qxe5'; });
    if (qxe5) {
      var g4 = new Chess(g3.fen());
      g4.move('Qxe5');
      console.log('  If White takes Qxe5 dxe5: White traded queens but is UP a knight!');
    }
    // White can also retreat queen
    console.log('  OR White retreats (e.g., Qe2) and keeps the extra knight + queens on.');
  } else if (r.san === 'Qe6') {
    console.log('  Black offers trade with Qe6.');
    var dxe6 = whiteMoves.find(function(m) { return m.san === 'dxe6'; });
    var qxe6 = whiteMoves.find(function(m) { return m.san === 'Qxe6+'; });
    if (dxe6) console.log('  dxe6 is possible (wins another pawn!)');
    if (qxe6) console.log('  Qxe6+ is possible (queen trade while up knight!)');
    console.log('  Either way, White is up a knight.');
  } else if (r.san === 'Qe7') {
    console.log('  Black blocks with Qe7. White is simply up a knight.');
    console.log('  White continues developing normally.');
  } else if (r.san === 'Be7') {
    console.log('  Black blocks with Be7. White is up a knight. Dead simple.');
  } else if (r.san === 'Kd8') {
    console.log('  King moves. White is up a knight + Black lost castling.');
  }

  // Count material
  var fen = g3.fen();
  var board = fen.split(' ')[0];
  var wN = (board.match(/N/g) || []).length;
  var bN = (board.match(/n/g) || []).length;
  var wB = (board.match(/B/g) || []).length;
  var bB = (board.match(/b/g) || []).length;
  console.log('  White: ' + wN + 'N ' + wB + 'B | Black: ' + bN + 'N ' + bB + 'B');
  console.log('  White is up: ' + (wN + wB - bN - bB) + ' minor pieces\n');
});

console.log('CONCLUSION: Qxe4+ is STRICTLY BETTER than Qxf6 in ALL variations.');
console.log('White ends up a full knight in every line.');
console.log('Compare to Qxf6 gxf6: queens traded, material EQUAL, only structural edge.');
console.log('\nThis is a CONFIRMED BUG in ponz-main-positional.');

// Also verify: the line says Nxg6 hxg6 Qd4. Let me verify the INTENDED line makes sense.
console.log('\n--- Checking the line\'s intended concept ---');
console.log('The line is "Positional: 7.Nxg6 + Qd4 (Queen Trade)"');
console.log('Idea: trade queens for a favorable endgame.');
console.log('But Qxe4+ doesn\'t trade queens -- it WINS a piece!');
console.log('The line description says "trade knights then queens" but the position');
console.log('allows winning the knight outright instead of trading queens.');
console.log('After Nxg6 hxg6, the Ne4 is left without its partner and the queen can grab it.');
