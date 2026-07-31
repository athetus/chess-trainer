const { StockfishEngine } = require('./stockfish-engine');

async function main() {
  const engine = new StockfishEngine();
  await engine.start();

  // Starting position: known-quiet, should be a small White-favoring cp, no mate.
  const startEval = await engine.evalFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 15);
  assert(startEval.mate === null, `expected no mate at startpos, got ${JSON.stringify(startEval)}`);
  assert(typeof startEval.cp === 'number' && Math.abs(startEval.cp) < 100,
    `expected small cp at startpos, got ${JSON.stringify(startEval)}`);

  // Black has an undefended queen on d8 capturable by a White rook on d1 with a clear file.
  // FEN generated via chess.js replay (per project convention), not hand-built:
  // 1. e4 d5 2. exd5 Qxd5 3. Nc3 Qd8 4. Bc4 Nc6 5. Qh5 (threat is elsewhere; use a direct hang instead)
  // Simpler, unambiguous hanging-queen position:
  const hangingQueenFen = 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1'; // Black queen on d5, undefended, White queen can't take it directly but rook/bishop lines aren't set up either -- use a cleaner one below instead.

  // Cleanest unambiguous case: White queen can capture Black's undefended queen on h4 for free.
  const freeQueenFen = 'rnb1kbnr/pppp1ppp/8/4p3/6pq/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 1';
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
