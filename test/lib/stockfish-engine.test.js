const { StockfishEngine } = require('./stockfish-engine');

async function main() {
  const engine = new StockfishEngine();
  await engine.start();

  // Starting position: known-quiet, should be a small White-favoring cp, no mate.
  const startEval = await engine.evalFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 15);
  assert(startEval.mate === null, `expected no mate at startpos, got ${JSON.stringify(startEval)}`);
  assert(typeof startEval.cp === 'number' && Math.abs(startEval.cp) < 100,
    `expected small cp at startpos, got ${JSON.stringify(startEval)}`);

  // Generate FEN with hanging queen via chess.js replay (per project convention, never hand-typed).
  // Sequence: 1. e4 e5 2. Nf3 Qh4 — leaves Black queen hanging on h4.
  const { Chess } = require('chess.js');
  const board = new Chess();
  board.move('e4');
  board.move('e5');
  board.move('Nf3');
  board.move('Qh4');
  const freeQueenFen = board.fen();

  const freeQueenEval = await engine.evalFen(freeQueenFen, 15);
  assert(freeQueenEval.cp > 500, `expected White to be winning big (free queen), got ${JSON.stringify(freeQueenEval)}`);

  const bestSan = await engine.bestMoveSan(freeQueenFen, 15);
  assert(bestSan.includes('x'), `expected the engine to find the free queen capture, got ${bestSan}`);

  // principalVariationSan: a hanging queen's PV should start with the capture
  // itself (matching bestMoveSan above), and not end in mate -- it's a plain
  // material grab, not forced mate.
  const pv = await engine.principalVariationSan(freeQueenFen, 15);
  assert(pv.sanMoves.length > 0, `expected a non-empty PV, got ${JSON.stringify(pv)}`);
  assert(pv.sanMoves[0] === bestSan, `PV's first move should agree with bestMoveSan at the same depth, got ${pv.sanMoves[0]} vs ${bestSan}`);
  assert(pv.endsInMate === false, `a plain material grab should not be reported as ending in mate, got ${JSON.stringify(pv)}`);

  // A genuine forced mate: 1. f3 e5 2. g4 Qh4# -- Fool's Mate, one move early
  // (position right before ...Qh4#) should report endsInMate.
  const foolsMateBoard = new Chess();
  foolsMateBoard.move('f3'); foolsMateBoard.move('e5'); foolsMateBoard.move('g4');
  const mateInOneFen = foolsMateBoard.fen();
  const matePv = await engine.principalVariationSan(mateInOneFen, 15);
  assert(matePv.endsInMate === true, `expected a mate-in-1 PV to report endsInMate, got ${JSON.stringify(matePv)}`);
  assert(matePv.sanMoves[matePv.sanMoves.length - 1].includes('#'), `the PV's last move should be the actual mating move, got ${JSON.stringify(matePv.sanMoves)}`);

  await engine.quit();
  console.log('stockfish-engine.test.js: all assertions passed');
}

function assert(cond, msg) {
  // Must throw, never process.exit() -- exit skips finally blocks and leaks
  // temp files (see CLAUDE.md's Testing section). Fixed while touching this
  // file; pre-existing violation.
  if (!cond) { throw new Error('FAIL: ' + msg); }
}

main().catch(e => { console.error('FAIL:', e); process.exit(1); });
