// Move-legality validator. Parses the line definitions DIRECTLY from index.html
// so it can never drift out of sync (previous hand-copied version had mismatched
// ids and stale sequences -- see SESSION_HANDOFF notes on the "validate.js doesn't
// auto-sync" gotcha). This extracts the real L() helper + PONZIANI_LINES + HIPPO_LINES
// from index.html and checks every move sequence with chess.js.
var fs = require('fs');
var path = require('path');
var Chess = require('chess.js').Chess || require('chess.js');

var html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extract from the L() definition through the close of HIPPO_LINES.
var startMarker = 'function L(id,name,desc,result,trap,cat,moves,explanations,bm)';
var startIdx = html.indexOf(startMarker);
if (startIdx < 0) { console.error('Could not find L() definition in index.html'); process.exit(1); }

var hippoIdx = html.indexOf('var HIPPO_LINES=[', startIdx);
if (hippoIdx < 0) { console.error('Could not find HIPPO_LINES in index.html'); process.exit(1); }
// first line that is exactly "];" after HIPPO_LINES closes the array
var afterHippo = html.indexOf('\n];', hippoIdx);
if (afterHippo < 0) { console.error('Could not find end of HIPPO_LINES'); process.exit(1); }
var block = html.slice(startIdx, afterHippo + 3); // include the "];"

var extract = new Function(block + '\nreturn {P: PONZIANI_LINES, H: HIPPO_LINES};');
var data = extract();
var ALL = data.P.concat(data.H);

console.log('Validating ' + ALL.length + ' lines (' + data.P.length + ' Ponziani + ' + data.H.length + ' Hippo) parsed from index.html\n');

var issues = 0;
ALL.forEach(function (line) {
  var c = new Chess();
  for (var i = 0; i < line.moves.length; i++) {
    var mv = c.move(line.moves[i], { sloppy: true });
    if (!mv) {
      issues++;
      console.log('  ILLEGAL: ' + line.id + ' move #' + (i + 1) + ' "' + line.moves[i] + '"');
      console.log('           FEN before: ' + c.fen());
      break;
    }
  }
});

console.log('\n' + (issues === 0
  ? 'ALL LINES VALID -- 0 issues'
  : (issues + ' ISSUE(S) FOUND')));
process.exit(issues === 0 ? 0 : 1);
