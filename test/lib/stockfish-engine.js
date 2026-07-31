const { spawn } = require('child_process');

const STOCKFISH_PATH = '/opt/homebrew/bin/stockfish';

class StockfishEngine {
  constructor() {
    this.proc = null;
    this.buffer = '';
    this.gameStarted = false;
  }

  async start() {
    this.proc = spawn(STOCKFISH_PATH);
    this.proc.stdout.on('data', d => { this.buffer += d.toString(); });
    await this._send('uci', 'uciok');
  }

  // Send a command, resolve once a line starting with `waitFor` has been seen.
  _send(cmd, waitFor) {
    return new Promise((resolve) => {
      const check = () => {
        if (this.buffer.includes(waitFor)) {
          resolve();
        } else {
          setTimeout(check, 20);
        }
      };
      this.proc.stdin.write(cmd + '\n');
      check();
    });
  }

  // Evaluate a FEN at the given depth. Returns {cp, mate} normalized to WHITE's
  // perspective, regardless of whose move the FEN says it is (UCI's own score
  // is relative to the side to move -- this function flips it to White's view
  // so callers never have to think about whose turn it was).
  async evalFen(fen, depth) {
    if (!this.gameStarted) {
      this.proc.stdin.write('ucinewgame\n');
      this.gameStarted = true;
    }
    const startLen = this.buffer.length;
    this.proc.stdin.write(`position fen ${fen}\n`);
    this.proc.stdin.write(`go depth ${depth}\n`);
    await this._waitForBestmove(startLen);

    const sideToMove = fen.split(' ')[1]; // 'w' or 'b'
    const relevant = this.buffer.slice(startLen);
    const infoLines = relevant.split('\n').filter(l => l.startsWith(`info depth`) && l.includes('score'));
    let cp = null, mate = null;
    if (infoLines.length > 0) {
      const last = infoLines[infoLines.length - 1];
      const cpMatch = last.match(/score cp (-?\d+)/);
      const mateMatch = last.match(/score mate (-?\d+)/);
      if (mateMatch) mate = parseInt(mateMatch[1], 10);
      else if (cpMatch) cp = parseInt(cpMatch[1], 10);
    }
    // Flip to White's perspective if it was Black to move.
    if (sideToMove === 'b') {
      if (cp !== null) cp = -cp;
      if (mate !== null) mate = -mate;
    }
    return { cp, mate };
  }

  _waitForBestmove(fromIndex) {
    return new Promise((resolve) => {
      const check = () => {
        if (this.buffer.indexOf('bestmove', fromIndex) >= 0) resolve();
        else setTimeout(check, 20);
      };
      check();
    });
  }

  // Returns the engine's best move for the position, as SAN (using chess.js to
  // convert from the UCI long-algebraic move Stockfish reports).
  async bestMoveSan(fen, depth) {
    const startLen = this.buffer.length;
    this.proc.stdin.write(`position fen ${fen}\n`);
    this.proc.stdin.write(`go depth ${depth}\n`);
    await this._waitForBestmove(startLen);
    const relevant = this.buffer.slice(startLen);
    const bestMoveMatch = relevant.match(/bestmove (\S+)/);
    if (!bestMoveMatch) throw new Error(`no bestmove found for fen ${fen}`);
    const uciMove = bestMoveMatch[1];
    const { Chess } = require('chess.js');
    const g = new Chess(fen);
    const from = uciMove.slice(0, 2), to = uciMove.slice(2, 4), promotion = uciMove.slice(4) || undefined;
    const move = g.move({ from, to, promotion });
    if (!move) throw new Error(`engine's best move ${uciMove} was illegal in fen ${fen}`);
    return move.san;
  }

  async quit() {
    this.proc.stdin.write('quit\n');
    this.proc.kill();
  }
}

module.exports = { StockfishEngine };
