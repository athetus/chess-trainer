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

  await engine.quit();
  console.log('stockfish-engine.test.js: all assertions passed');
}

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

main().catch(e => { console.error('FAIL:', e); process.exit(1); });
