# Chess.com Tactics/Blunder Scanner Implementation Plan

> ## ⚠️ SUPERSEDED — deleted, then rebuilt differently (2026-08-01/02)
>
> This plan was executed in full (all 9 tasks), then **the puzzle-generation half was
> deliberately deleted** the same day over a real design flaw (below). The user asked
> for it back three times; it was rebuilt on 2026-08-02 with the flaw fixed rather than
> repeated, and is now **live** on the site's third "Tactics" tab. This document is kept
> for the original design rationale, but the current implementation diverges from it —
> read `CLAUDE.md`'s "Tactics Puzzles" section and STATUS.md for what actually shipped.
>
> **Kept and shipped as originally planned:** Tasks 1-3's libraries
> (`stockfish-engine.js`, `chesscom-fetch.js`, `tactics-classifier.js`), powering
> `test/chesscom-diagnostic.js`.
>
> **Deleted, then rebuilt with a different architecture:** `puzzle-selection.js`,
> `puzzle-store.js`, `tactics-puzzles.js`, the index.html Tactics tab, and the
> validate.js puzzle path all exist again, but `test/build-tactics-puzzles.js`
> replaces `chesscom-tactics.js` — it reads the diagnostic's own cache instead of
> running a second Stockfish scan, and `puzzle-selection.js` uses fixed category
> quotas instead of pure eval-swing ranking.
>
> **Why the original was deleted:** ranking puzzles by eval-swing severity meant
> forced-mate positions (encoded as a ~1000-point sentinel) filled all 15 slots while
> 195 instances of the user's most common error never surfaced.
>
> **Why the rebuild is different:** fixed quotas (~5 mate / ~5 catastrophic ≥3 pawns /
> ~5 common 1.5-3 pawns) guarantee the common band its own slots regardless of how many
> rare mate instances exist. A second real bug was found and fixed during the rebuild:
> ~2% of flagged plies had the engine's own best move identical to the move actually
> played (an eval-swing classifier artifact in decided endgames) — filtered out before
> puzzle selection runs. See `tasks/lessons.md`.
>
> Chess skill is still thousands of stored patterns (Chase/Simon chunking) that 15
> puzzles/month can't build alone — this remains a narrow supplement to daily Lichess
> volume for the user's specific recurring mistakes, not a replacement for it.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude-Code-session-run script that scans the user's real chess.com games for blunders and missed wins (via Stockfish), and turns confirmed findings into puzzles drillable in the existing app under a new "Tactics" tab.

**Architecture:** A pipeline of small, independently-testable Node modules (`test/lib/`) — fetch games, evaluate positions with a persistent Stockfish process, classify mistakes, rank/cap them, and persist puzzles — orchestrated by one CLI script (`test/chesscom-tactics.js`). Puzzle data lives in a new `tactics-puzzles.js` at the repo root, loaded by `index.html` and merged into the existing drill pool exactly like `PONZIANI_LINES`/`HIPPO_LINES`, under a new third tab. No changes to the drill engine itself — puzzles are just lines with `baseMoves` pointing at the mistake ply.

**Tech Stack:** Node.js (built-in `fetch`, `child_process` for Stockfish UCI), `chess.js` (npm, snake_case API — confirmed installed version exposes `load_pgn`/`history`, NOT the camelCase `loadPgn` the CDN frontend build uses), Stockfish 18 (`/opt/homebrew/bin/stockfish`, confirmed installed), plain Node scripts as tests (this repo has no test framework — `package.json`'s `test` script is an unused stub, and every existing "test" in `test/` is a standalone script that prints results and exits non-zero on failure; follow that convention, don't introduce jest/mocha).

## Global Constraints

- Blunder = user's own move drops eval 1.5+ pawns (150cp) from the position before, OR the move allows a forced mate against the user.
- Missed-win = the position before the user's move already had a forced mate for the user or a 3.0+ pawn advantage, AND the position after no longer has either.
- Stockfish search depth: 15 ply per evaluation (within the spec's 14-16 range).
- Cap: at most 2 puzzles kept per single game, at most 15 puzzles written per run overall; ranked worst-first by eval swing; anything beyond the cap is named in the report, not silently dropped.
- Only games where `rules === 'chess'` are analyzed (skip chess960/variants).
- `--months` CLI flag defaults to `1` if omitted.
- Puzzle data accumulates across runs (does not overwrite) — tracked via a `PROCESSED_GAME_IDS` list kept separate from the drillable `TACTICS_PUZZLES` array, both in `tactics-puzzles.js`.
- No automatic tactical-motif labeling (fork/pin/skewer/etc.) — puzzle text states only the objective eval swing and the correct move.
- `tactics-puzzles.js` is a file separate from `index.html` — the automation never edits the hand-authored, engine-audited Ponziani/Hippo repertoire lines.
- Never hand-build FEN strings — always derive them by replaying SAN moves through `chess.js` (project convention, see `tasks/lessons.md`).
- Installed `chess.js` uses the snake_case API (`load_pgn`, `game.move(san)`, `history({verbose:true})`) — do not use camelCase method names anywhere in the Node scripts.

---

## File Structure

New files:
- `test/lib/chesscom-fetch.js` — fetches chess.com archives/games for a username, filters to `rules==='chess'`.
- `test/lib/stockfish-engine.js` — wraps one persistent Stockfish UCI process; evaluates a FEN at a given depth, returns a White-perspective `{cp, mate}`.
- `test/lib/tactics-classifier.js` — pure functions: given a game's move list and per-ply evals, classify each user ply as blunder/missed-win/none, and build a puzzle object for flagged plies.
- `test/lib/puzzle-selection.js` — pure function: rank a run's flagged instances worst-first, apply the per-game cap (2) and overall cap (15), report the overflow.
- `test/lib/puzzle-store.js` — reads/merges/writes `tactics-puzzles.js`'s `TACTICS_PUZZLES` + `PROCESSED_GAME_IDS`.
- `test/chesscom-tactics.js` — CLI orchestrator wiring the above together.
- `tactics-puzzles.js` (repo root) — generated data file; this plan creates the initial empty stub so `index.html` has something to load before the first real run.
- `test/lib/tactics-classifier.test.js`, `test/lib/puzzle-selection.test.js`, `test/lib/puzzle-store.test.js` — plain-node-script tests (no framework), following `test/validate.js`'s style (assert + `console.error` + `process.exit(1)` on failure).

Modified files:
- `test/validate.js` — extended to also extract and validate `TACTICS_PUZZLES` from `tactics-puzzles.js`, not just `index.html`'s repertoire lines.
- `index.html` — add `<script src="tactics-puzzles.js">`, a third tab button (`id="tab-tactics"`), extend `switchOpening()`, add `CATEGORIES.tactics`, extend the display-text ternary, add the `ALL_LINES` merge for `TACTICS_PUZZLES`.

---

### Task 1: Stockfish engine wrapper

**Files:**
- Create: `test/lib/stockfish-engine.js`
- Test: `test/lib/stockfish-engine.test.js`

**Interfaces:**
- Produces: `class StockfishEngine` with `async start()`, `async evalFen(fen, depth) -> {cp: number|null, mate: number|null}` (White's-perspective: positive `cp`/`mate` = good for White), `async bestMoveSan(fen, depth) -> string` (the engine's best move at that position, as SAN), `quit()`.

- [ ] **Step 1: Write the failing test**

```javascript
// test/lib/stockfish-engine.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/lib/stockfish-engine.test.js`
Expected: FAIL with `Cannot find module './stockfish-engine'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// test/lib/stockfish-engine.js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/lib/stockfish-engine.test.js`
Expected: `stockfish-engine.test.js: all assertions passed`

If the `freeQueenFen` position doesn't actually show cp > 500 (double-check the FEN represents a genuinely free queen capture with `node -e` and chess.js before trusting it), replace it with a FEN you've verified the same way: build it by loading a short forced move sequence into `chess.js` and reading `.fen()`, never type one by hand.

- [ ] **Step 5: Commit**

```bash
git add test/lib/stockfish-engine.js test/lib/stockfish-engine.test.js
git commit -m "feat(tactics): add persistent Stockfish UCI engine wrapper"
```

---

### Task 2: chess.com fetch module

**Files:**
- Create: `test/lib/chesscom-fetch.js`
- Test: `test/lib/chesscom-fetch.test.js`

**Interfaces:**
- Produces: `async fetchArchives(username) -> string[]` (month URLs), `async fetchMonthGames(url) -> object[]` (raw chess.com game objects), `async getRecentGames(username, months=1) -> object[]` (combined, filtered to `rules==='chess'`, across the last N archived months).

- [ ] **Step 1: Write the failing test**

```javascript
// test/lib/chesscom-fetch.test.js
const { fetchArchives, fetchMonthGames, getRecentGames } = require('./chesscom-fetch');

async function main() {
  // Live smoke test against a real, stable public account (not optimizerprime --
  // hikaru always has games and isn't the user's own account, avoiding any
  // coupling between this library test and the user's changing game history).
  const archives = await fetchArchives('hikaru');
  assert(Array.isArray(archives) && archives.length > 10, `expected many archive months, got ${archives.length}`);
  assert(archives[0].startsWith('https://api.chess.com/pub/player/hikaru/games/'), 'archive URL shape unexpected');

  const games = await fetchMonthGames(archives[archives.length - 1]);
  assert(Array.isArray(games) && games.length > 0, 'expected at least one game in the most recent month');
  const g = games[0];
  ['pgn', 'rules', 'time_class', 'white', 'black', 'uuid'].forEach(key => {
    assert(key in g, `expected game object to have "${key}"`);
  });

  const recent = await getRecentGames('hikaru', 1);
  assert(Array.isArray(recent) && recent.length > 0, 'expected getRecentGames to return games');
  assert(recent.every(g => g.rules === 'chess'), 'getRecentGames must filter out non-chess variants');

  console.log('chesscom-fetch.test.js: all assertions passed');
}

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

main().catch(e => { console.error('FAIL:', e); process.exit(1); });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/lib/chesscom-fetch.test.js`
Expected: FAIL with `Cannot find module './chesscom-fetch'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// test/lib/chesscom-fetch.js

async function fetchArchives(username) {
  const res = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
  if (!res.ok) throw new Error(`fetchArchives failed: HTTP ${res.status} for ${username}`);
  const data = await res.json();
  return data.archives;
}

async function fetchMonthGames(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchMonthGames failed: HTTP ${res.status} for ${url}`);
  const data = await res.json();
  return data.games || [];
}

async function getRecentGames(username, months = 1) {
  const archives = await fetchArchives(username);
  const targets = archives.slice(-months);
  const allGames = [];
  for (const url of targets) {
    const games = await fetchMonthGames(url);
    allGames.push(...games);
  }
  return allGames.filter(g => g.rules === 'chess');
}

module.exports = { fetchArchives, fetchMonthGames, getRecentGames };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/lib/chesscom-fetch.test.js`
Expected: `chesscom-fetch.test.js: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add test/lib/chesscom-fetch.js test/lib/chesscom-fetch.test.js
git commit -m "feat(tactics): add shared chess.com games fetch module"
```

---

### Task 3: Tactics classifier (blunder/missed-win detection + puzzle construction)

**Files:**
- Create: `test/lib/tactics-classifier.js`
- Test: `test/lib/tactics-classifier.test.js`

**Interfaces:**
- Consumes: nothing from prior tasks (pure logic, no I/O — this is deliberate so it's testable with fixture data and doesn't need a live engine or network).
- Produces: `scoreToPawns({cp, mate}) -> number`, `toUserPerspective({cp, mate}, userColor) -> {cp, mate}`, `classifyPly({ evalBefore, evalAfter, userColor }) -> 'blunder'|'missed-win'|null`, `buildPuzzle({ id, sanMoves, plyIndex, userColor, correctMoveSan, evalBefore, evalAfter, cat, gameMeta }) -> puzzleObject` shaped like the app's `L()` output plus two fields the orchestrator needs for ranking (`id, name, description, result, isTrap, cat, moves, explanations, baseMoves, playerColor, dropPawns`). `cat` must be passed in by the caller (already computed once via `classifyPly` for the build/skip decision) rather than recomputed inside `buildPuzzle` — avoids running the same classification twice.

This task concretizes two points the design spec left slightly informal, in a way consistent with its stated intent (documented here since a future reader of the spec alone wouldn't see this reasoning):
- **Missed-win is evaluated as a before/after threshold crossing, not a raw eval-drop number.** A position that goes from "mate in 2" to "mate in 5" for the user is NOT a missed win (still winning by force) even though naively encoding mate distance as a number would show a "drop." The rule is: missed-win requires the *before* position to be forced-mate-for-user or 3.0+ pawns, AND the *after* position to be **neither**.
- **Blunder and missed-win are mutually exclusive categories on the same trigger.** Both use the same "eval got significantly worse" signal; if the position was already winning big beforehand, the same event is labeled `missed-win` instead of `blunder` (more descriptive of what actually happened).

- [ ] **Step 1: Write the failing test**

```javascript
// test/lib/tactics-classifier.test.js
const {
  scoreToPawns,
  toUserPerspective,
  classifyPly,
  buildPuzzle,
} = require('./tactics-classifier');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

// --- scoreToPawns ---
assert(scoreToPawns({ cp: 150, mate: null }) === 1.5, 'plain cp should convert to pawns directly');
assert(scoreToPawns({ cp: null, mate: 3 }) > 100, 'a mate-for should score far above any realistic cp swing');
assert(scoreToPawns({ cp: null, mate: -3 }) < -100, 'a mate-against should score far below any realistic cp swing');
assert(scoreToPawns({ cp: null, mate: 1 }) > scoreToPawns({ cp: null, mate: 5 }),
  'a faster mate-for should score higher than a slower one');

// --- toUserPerspective ---
assert(toUserPerspective({ cp: 200, mate: null }, 'w').cp === 200, 'White perspective unchanged for White user');
assert(toUserPerspective({ cp: 200, mate: null }, 'b').cp === -200, 'flips sign for Black user');

// --- classifyPly: plain blunder ---
assert(classifyPly({
  evalBefore: { cp: 20, mate: null }, evalAfter: { cp: -200, mate: null }, userColor: 'w',
}) === 'blunder', 'a 2.2 pawn drop should be a blunder');

// --- classifyPly: no flag for a small/normal move ---
assert(classifyPly({
  evalBefore: { cp: 20, mate: null }, evalAfter: { cp: 10, mate: null }, userColor: 'w',
}) === null, 'a small eval change should not be flagged');

// --- classifyPly: mate-against counts as blunder ---
assert(classifyPly({
  evalBefore: { cp: 30, mate: null }, evalAfter: { cp: null, mate: -4 }, userColor: 'w',
}) === 'blunder', 'allowing a forced mate against the user should be a blunder');

// --- classifyPly: missed win via cp ---
assert(classifyPly({
  evalBefore: { cp: 400, mate: null }, evalAfter: { cp: 100, mate: null }, userColor: 'w',
}) === 'missed-win', 'dropping from +4.0 to +1.0 should be a missed win, not a plain blunder');

// --- classifyPly: missed win via mate disappearing ---
assert(classifyPly({
  evalBefore: { cp: null, mate: 3 }, evalAfter: { cp: 150, mate: null }, userColor: 'w',
}) === 'missed-win', 'losing a forced mate but staying up material should be a missed win');

// --- classifyPly: mate-in-2 to mate-in-5 is NOT a missed win (still winning by force) ---
assert(classifyPly({
  evalBefore: { cp: null, mate: 2 }, evalAfter: { cp: null, mate: 5 }, userColor: 'w',
}) === null, 'a slower mate is still a won position, must not be flagged');

// --- classifyPly: works from Black's perspective too ---
assert(classifyPly({
  evalBefore: { cp: 20, mate: null }, evalAfter: { cp: 220, mate: null }, userColor: 'b',
}) === 'blunder', 'a 2 pawn drop for Black (White cp went up) should be a blunder for Black');

// --- buildPuzzle ---
const puzzleEvalBefore = { cp: 20, mate: null };
const puzzleEvalAfter = { cp: -180, mate: null };
const puzzleCat = classifyPly({ evalBefore: puzzleEvalBefore, evalAfter: puzzleEvalAfter, userColor: 'w' });
const puzzle = buildPuzzle({
  id: 'tactics-2026-07-15-abc123-ply22',
  sanMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7'],
  plyIndex: 10, // 0-based index of the user's actual (bad) move -- 'Nxf7' in this example, replaced below
  userColor: 'w',
  correctMoveSan: 'd3',
  evalBefore: puzzleEvalBefore,
  evalAfter: puzzleEvalAfter,
  cat: puzzleCat,
  gameMeta: { opponent: 'someuser', endTime: 1783257898, timeClass: 'rapid', url: 'https://www.chess.com/game/live/123' },
});
assert(puzzle.moves.length === 11, 'puzzle moves should be the prefix (10 real plies) plus 1 corrected move');
assert(puzzle.moves[10] === 'd3', 'the final move must be the corrected move, not the real blunder');
assert(puzzle.moves.slice(0, 10).join(',') === ['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5','d5','exd5','Nxd5'].join(','),
  'the prefix must be the real game moves unchanged');
assert(puzzle.baseMoves === 10, 'baseMoves must equal the ply index so the engine auto-plays exactly up to the mistake');
assert(puzzle.playerColor === 'w', 'playerColor must be set per-puzzle');
assert(puzzle.cat === 'blunder', 'a >1.5 pawn drop from a modest position should be categorized as a blunder');
assert(typeof puzzle.dropPawns === 'number' && Math.abs(puzzle.dropPawns - 2.0) < 0.01,
  `expected dropPawns to be the before/after pawn difference (~2.0), got ${puzzle.dropPawns}`);
assert(typeof puzzle.explanations['10'] === 'string' && puzzle.explanations['10'].length > 0,
  'must have an explanation keyed at the corrected-move index');

console.log('tactics-classifier.test.js: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/lib/tactics-classifier.test.js`
Expected: FAIL with `Cannot find module './tactics-classifier'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// test/lib/tactics-classifier.js

const BLUNDER_THRESHOLD_PAWNS = 1.5;
const MISSED_WIN_CP_THRESHOLD = 3.0;

// Encodes a {cp, mate} eval as one comparable number, in pawn units. Mates are
// encoded far outside any realistic cp range (which rarely exceeds +-20) so they
// always dominate comparisons, while still ordering faster mates as more extreme
// than slower ones (mate in 1 > mate in 5, in absolute value).
function scoreToPawns({ cp, mate }) {
  if (mate !== null && mate !== undefined) {
    const magnitude = 1000 - Math.abs(mate);
    return mate > 0 ? magnitude : -magnitude;
  }
  return cp / 100;
}

// Stockfish evals are produced White-perspective (see stockfish-engine.js).
// Flip to the user's own color so "positive = good for the user" always holds.
function toUserPerspective(evalWhite, userColor) {
  if (userColor === 'w') return evalWhite;
  return {
    cp: evalWhite.cp === null ? null : -evalWhite.cp,
    mate: evalWhite.mate === null || evalWhite.mate === undefined ? null : -evalWhite.mate,
  };
}

function isWinningFor(evalUser) {
  if (evalUser.mate !== null && evalUser.mate !== undefined && evalUser.mate > 0) return true;
  return evalUser.cp !== null && evalUser.cp >= MISSED_WIN_CP_THRESHOLD * 100;
}

// Returns 'blunder', 'missed-win', or null. evalBefore/evalAfter are White-
// perspective {cp, mate} objects (straight from stockfish-engine.js).
function classifyPly({ evalBefore, evalAfter, userColor }) {
  const before = toUserPerspective(evalBefore, userColor);
  const after = toUserPerspective(evalAfter, userColor);

  const wasWinningBig = isWinningFor(before);
  const stillWinningBig = isWinningFor(after);
  if (wasWinningBig && !stillWinningBig) return 'missed-win';
  if (wasWinningBig && stillWinningBig) return null; // still winning by force/margin, not a mistake

  const drop = scoreToPawns(before) - scoreToPawns(after);
  if (drop >= BLUNDER_THRESHOLD_PAWNS) return 'blunder';
  return null;
}

function buildPuzzle({ id, sanMoves, plyIndex, userColor, correctMoveSan, evalBefore, evalAfter, cat, gameMeta }) {
  const prefix = sanMoves.slice(0, plyIndex);
  const moves = prefix.concat([correctMoveSan]);
  const before = toUserPerspective(evalBefore, userColor);
  const after = toUserPerspective(evalAfter, userColor);
  const dropPawns = scoreToPawns(before) - scoreToPawns(after);
  const dropPawnsDisplay = dropPawns.toFixed(1);
  const actualMoveSan = sanMoves[plyIndex];
  const moveNumber = Math.floor(plyIndex / 2) + 1;

  return {
    id,
    name: `Tactics: ${gameMeta.opponent}, ${new Date(gameMeta.endTime * 1000).toISOString().slice(0, 10)}`,
    description: `From a real ${gameMeta.timeClass} game vs ${gameMeta.opponent}.`,
    result: `Move ${moveNumber}: you played ${actualMoveSan} (drops ${dropPawnsDisplay} pawns, ${gameMeta.timeClass}). Correct was ${correctMoveSan}.`,
    isTrap: false,
    cat,
    moves,
    explanations: { [String(plyIndex)]: `You played ${actualMoveSan} here, dropping ${dropPawnsDisplay} pawns. ${correctMoveSan} was correct.` },
    baseMoves: plyIndex,
    playerColor: userColor,
    dropPawns,
  };
}

module.exports = { scoreToPawns, toUserPerspective, classifyPly, buildPuzzle, BLUNDER_THRESHOLD_PAWNS, MISSED_WIN_CP_THRESHOLD };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/lib/tactics-classifier.test.js`
Expected: `tactics-classifier.test.js: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add test/lib/tactics-classifier.js test/lib/tactics-classifier.test.js
git commit -m "feat(tactics): add blunder/missed-win classifier and puzzle builder"
```

---

### Task 4: Puzzle ranking and caps

**Files:**
- Create: `test/lib/puzzle-selection.js`
- Test: `test/lib/puzzle-selection.test.js`

**Interfaces:**
- Consumes: an array of flagged-instance objects, each at least `{ gameId, puzzle, dropPawns }` (where `puzzle` is `buildPuzzle()`'s output from Task 3).
- Produces: `selectPuzzles(flaggedInstances, { perGameCap = 2, overallCap = 15 } = {}) -> { selected: puzzleObject[], overflow: flaggedInstance[] }`.

- [ ] **Step 1: Write the failing test**

```javascript
// test/lib/puzzle-selection.test.js
const { selectPuzzles } = require('./puzzle-selection');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

function fake(gameId, dropPawns) {
  return { gameId, dropPawns, puzzle: { id: `${gameId}-${dropPawns}`, dropPawns } };
}

// 3 instances from the same game, only 2 should survive the per-game cap, worst first.
const sameGame = [fake('g1', 2.0), fake('g1', 5.0), fake('g1', 1.6)];
const { selected: s1, overflow: o1 } = selectPuzzles(sameGame, { perGameCap: 2, overallCap: 15 });
assert(s1.length === 2, `expected 2 survivors from per-game cap, got ${s1.length}`);
assert(s1[0].dropPawns === 5.0 && s1[1].dropPawns === 2.0, 'per-game survivors must be the two worst, worst first');
assert(o1.length === 1 && o1[0].dropPawns === 1.6, 'the mildest of the three should be the overflow');

// Overall cap across many games.
const manyGames = Array.from({ length: 20 }, (_, i) => fake(`g${i}`, i));
const { selected: s2, overflow: o2 } = selectPuzzles(manyGames, { perGameCap: 2, overallCap: 15 });
assert(s2.length === 15, `expected the overall cap of 15, got ${s2.length}`);
assert(s2[0].dropPawns === 19, 'worst instance overall must be first');
assert(o2.length === 5, `expected 5 overflowed beyond the cap of 15, got ${o2.length}`);

console.log('puzzle-selection.test.js: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/lib/puzzle-selection.test.js`
Expected: FAIL with `Cannot find module './puzzle-selection'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// test/lib/puzzle-selection.js

function selectPuzzles(flaggedInstances, { perGameCap = 2, overallCap = 15 } = {}) {
  const byGame = new Map();
  for (const inst of flaggedInstances) {
    if (!byGame.has(inst.gameId)) byGame.set(inst.gameId, []);
    byGame.get(inst.gameId).push(inst);
  }

  const afterPerGameCap = [];
  const perGameOverflow = [];
  for (const instances of byGame.values()) {
    const sorted = instances.slice().sort((a, b) => b.dropPawns - a.dropPawns);
    afterPerGameCap.push(...sorted.slice(0, perGameCap));
    perGameOverflow.push(...sorted.slice(perGameCap));
  }

  afterPerGameCap.sort((a, b) => b.dropPawns - a.dropPawns);
  const selected = afterPerGameCap.slice(0, overallCap);
  const overallOverflow = afterPerGameCap.slice(overallCap);

  return {
    selected,
    overflow: perGameOverflow.concat(overallOverflow),
  };
}

module.exports = { selectPuzzles };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/lib/puzzle-selection.test.js`
Expected: `puzzle-selection.test.js: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add test/lib/puzzle-selection.js test/lib/puzzle-selection.test.js
git commit -m "feat(tactics): add worst-first puzzle ranking with per-game and overall caps"
```

---

### Task 5: Puzzle store (read/merge/write tactics-puzzles.js)

**Files:**
- Create: `test/lib/puzzle-store.js`
- Test: `test/lib/puzzle-store.test.js`
- Create: `tactics-puzzles.js` (repo root — initial empty stub, written by this task so `index.html` has something to load before any real scan has run)

**Interfaces:**
- Consumes: puzzle objects shaped like Task 3's `buildPuzzle()` output; a chess.com game `uuid` for dedup tracking.
- Produces: `readStore(path) -> { puzzles: object[], processedGameIds: string[] }`, `writeStore(path, { puzzles, processedGameIds })`, `mergeNewPuzzles(existing, newPuzzles) -> mergedPuzzles` (accumulates, keyed by puzzle `id`, no duplicates).

- [ ] **Step 1: Write the failing test**

```javascript
// test/lib/puzzle-store.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readStore, writeStore, mergeNewPuzzles } = require('./puzzle-store');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

const tmpFile = path.join(os.tmpdir(), `puzzle-store-test-${Date.now()}.js`);

// Start from nothing.
writeStore(tmpFile, { puzzles: [], processedGameIds: [] });
let store = readStore(tmpFile);
assert(store.puzzles.length === 0 && store.processedGameIds.length === 0, 'fresh store should be empty');

// Write some puzzles + processed ids, read them back.
const puzzleA = { id: 'a', name: 'A', moves: ['e4'], baseMoves: 0, playerColor: 'w', cat: 'blunder', explanations: {} };
writeStore(tmpFile, { puzzles: [puzzleA], processedGameIds: ['game-1'] });
store = readStore(tmpFile);
assert(store.puzzles.length === 1 && store.puzzles[0].id === 'a', 'should read back the written puzzle');
assert(store.processedGameIds[0] === 'game-1', 'should read back the processed game id');

// Merge: adding a puzzle with a new id keeps both; re-adding the same id doesn't duplicate.
const puzzleB = { id: 'b', name: 'B', moves: ['d4'], baseMoves: 0, playerColor: 'b', cat: 'missed-win', explanations: {} };
const merged = mergeNewPuzzles([puzzleA], [puzzleB, puzzleA]);
assert(merged.length === 2, `expected 2 unique puzzles after merge, got ${merged.length}`);

fs.unlinkSync(tmpFile);
console.log('puzzle-store.test.js: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/lib/puzzle-store.test.js`
Expected: FAIL with `Cannot find module './puzzle-store'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// test/lib/puzzle-store.js
const fs = require('fs');

function readStore(filePath) {
  if (!fs.existsSync(filePath)) return { puzzles: [], processedGameIds: [] };
  const src = fs.readFileSync(filePath, 'utf8');
  const extract = new Function(src + '\nreturn { puzzles: TACTICS_PUZZLES, processedGameIds: PROCESSED_GAME_IDS };');
  return extract();
}

function writeStore(filePath, { puzzles, processedGameIds }) {
  const contents = `// Auto-generated by test/chesscom-tactics.js -- do not hand-edit.
// Puzzles built from the user's own real chess.com games. See
// docs/superpowers/specs/2026-07-31-chesscom-tactics-scanner-design.md.
var TACTICS_PUZZLES = ${JSON.stringify(puzzles, null, 2)};
var PROCESSED_GAME_IDS = ${JSON.stringify(processedGameIds, null, 2)};
`;
  fs.writeFileSync(filePath, contents, 'utf8');
}

function mergeNewPuzzles(existing, incoming) {
  const byId = new Map(existing.map(p => [p.id, p]));
  for (const p of incoming) {
    if (!byId.has(p.id)) byId.set(p.id, p);
  }
  return Array.from(byId.values());
}

module.exports = { readStore, writeStore, mergeNewPuzzles };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/lib/puzzle-store.test.js`
Expected: `puzzle-store.test.js: all assertions passed`

- [ ] **Step 5: Create the initial empty stub at the repo root**

```javascript
// tactics-puzzles.js
// Auto-generated by test/chesscom-tactics.js -- do not hand-edit.
// Puzzles built from the user's own real chess.com games. See
// docs/superpowers/specs/2026-07-31-chesscom-tactics-scanner-design.md.
var TACTICS_PUZZLES = [];
var PROCESSED_GAME_IDS = [];
```

- [ ] **Step 6: Commit**

```bash
git add test/lib/puzzle-store.js test/lib/puzzle-store.test.js tactics-puzzles.js
git commit -m "feat(tactics): add puzzle-store read/merge/write + initial empty stub"
```

---

### Task 6: CLI orchestrator

**Files:**
- Create: `test/chesscom-tactics.js`
- Test: `test/chesscom-tactics.smoke.test.js`

**Interfaces:**
- Consumes: `getRecentGames` (Task 2), `StockfishEngine` (Task 1), `classifyPly`/`buildPuzzle` (Task 3), `selectPuzzles` (Task 4), `readStore`/`writeStore`/`mergeNewPuzzles` (Task 5).
- Produces: a runnable CLI: `node test/chesscom-tactics.js <username> [--months N] [--limit-games N]`. `--limit-games` is a debug/probe flag (not in the design spec, added here to support the project's own "probe first with a minimal version before the full run" convention) that caps how many games are processed, for a fast first check before a full run.

- [ ] **Step 1: Write the failing test**

This is an integration smoke test using a hand-built PGN fixture and a stubbed engine (no live network, no live Stockfish process) so it runs in well under a second and doesn't depend on the user's actual, changing game history. It writes to a temp file, never the real `tactics-puzzles.js` — `runScan`'s `storePath` is injected via `deps` specifically so this test has no side effect on real repo data.

```javascript
// test/chesscom-tactics.smoke.test.js
const os = require('os');
const path = require('path');
const fs = require('fs');
const { runScan } = require('./chesscom-tactics');
const { writeStore } = require('./lib/puzzle-store');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

async function main() {
  const tmpStorePath = path.join(os.tmpdir(), `tactics-smoke-store-${Date.now()}.js`);
  writeStore(tmpStorePath, { puzzles: [], processedGameIds: [] });

  // FakeUser plays White: 1.e4 e5 2.Nf3 Nc6 3.Bc4 -- White's plies are 0, 2, 4.
  // The scripted eval sequence below makes ply 4 (Bc4) a blunder; plies 0 and 2 are quiet.
  const fakeGame = {
    uuid: 'fixture-game-1',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    rules: 'chess',
    time_class: 'rapid',
    end_time: 1783257898,
    white: { username: 'FakeUser', result: 'resigned' },
    black: { username: 'opponent1', result: 'win' },
  };

  let evalCallCount = 0;
  // Called twice per user ply (before/after): ply0, ply2, ply4 x 2 = 6 calls, in order.
  const evalSequence = [
    { cp: 20, mate: null }, { cp: 15, mate: null },   // ply 0 (e4): before/after, quiet
    { cp: 15, mate: null }, { cp: 25, mate: null },   // ply 2 (Nf3): before/after, quiet
    { cp: 25, mate: null }, { cp: -200, mate: null }, // ply 4 (Bc4): before/after, scripted blunder
  ];

  const fakeDeps = {
    getRecentGames: async () => [fakeGame],
    makeEngine: () => ({
      start: async () => {},
      evalFen: async () => evalSequence[evalCallCount++],
      bestMoveSan: async () => 'd3',
      quit: () => {},
    }),
    storePath: tmpStorePath,
  };

  const result = await runScan('FakeUser', { months: 1, limitGames: null, deps: fakeDeps });
  assert(Array.isArray(result.puzzles), 'runScan must return a puzzles array');
  assert(result.puzzles.length === 1, `expected exactly one scripted blunder to produce a puzzle, got ${result.puzzles.length}`);
  assert(result.puzzles[0].moves[result.puzzles[0].baseMoves] === 'd3',
    "the puzzle's final move must be the stubbed correct move, not the real Bc4");
  assert(result.puzzles[0].baseMoves === 4, `expected baseMoves to be the blunder's ply index (4), got ${result.puzzles[0].baseMoves}`);
  assert(typeof result.report === 'string' && result.report.includes('Bc4'),
    'report should mention the actual blunder move played');

  fs.unlinkSync(tmpStorePath);
  console.log('chesscom-tactics.smoke.test.js: all assertions passed');
}

main().catch(e => { console.error('FAIL:', e); process.exit(1); });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/chesscom-tactics.smoke.test.js`
Expected: FAIL with `Cannot find module './chesscom-tactics'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// test/chesscom-tactics.js
const path = require('path');
const { Chess } = require('chess.js');
const { getRecentGames: realGetRecentGames } = require('./lib/chesscom-fetch');
const { StockfishEngine } = require('./lib/stockfish-engine');
const { classifyPly, buildPuzzle } = require('./lib/tactics-classifier');
const { selectPuzzles } = require('./lib/puzzle-selection');
const { readStore, writeStore, mergeNewPuzzles } = require('./lib/puzzle-store');

const STORE_PATH = path.join(__dirname, '..', 'tactics-puzzles.js');
const STOCKFISH_DEPTH = 15;

async function scanGame(game, username, deps) {
  const g = new Chess();
  g.load_pgn(game.pgn);
  const sanMoves = g.history();

  const userIsWhite = game.white.username.toLowerCase() === username.toLowerCase();
  const userColor = userIsWhite ? 'w' : 'b';

  const replay = new Chess();
  const fensBeforePly = [];
  for (let i = 0; i < sanMoves.length; i++) {
    fensBeforePly.push(replay.fen());
    replay.move(sanMoves[i]);
  }
  const fenAfterLast = replay.fen();

  const engine = deps.makeEngine();
  await engine.start();
  const flagged = [];
  try {
    for (let ply = 0; ply < sanMoves.length; ply++) {
      const turnColor = ply % 2 === 0 ? 'w' : 'b';
      if (turnColor !== userColor) continue;

      const fenBefore = fensBeforePly[ply];
      const fenAfter = ply + 1 < fensBeforePly.length ? fensBeforePly[ply + 1] : fenAfterLast;
      const evalBefore = await engine.evalFen(fenBefore, STOCKFISH_DEPTH);
      const evalAfter = await engine.evalFen(fenAfter, STOCKFISH_DEPTH);

      const cat = classifyPly({ evalBefore, evalAfter, userColor });
      if (!cat) continue;

      const bestMoveSan = await engine.bestMoveSan(fenBefore, STOCKFISH_DEPTH);

      const puzzle = buildPuzzle({
        id: `tactics-${game.uuid}-ply${ply}`,
        sanMoves,
        plyIndex: ply,
        userColor,
        correctMoveSan: bestMoveSan,
        evalBefore,
        evalAfter,
        cat,
        gameMeta: {
          opponent: userIsWhite ? game.black.username : game.white.username,
          endTime: game.end_time,
          timeClass: game.time_class,
          url: game.url,
        },
      });
      // Reuse buildPuzzle's own dropPawns (computed via scoreToPawns/toUserPerspective)
      // for ranking severity, rather than recomputing it with different logic here --
      // one source of truth for "how bad was this" shared by the puzzle's own text
      // and the cross-game ranking in selectPuzzles (Task 4).
      flagged.push({ gameId: game.uuid, dropPawns: puzzle.dropPawns, puzzle });
    }
  } finally {
    engine.quit();
  }
  return flagged;
}

async function runScan(username, { months = 1, limitGames = null, deps = null } = {}) {
  // storePath defaults to the real repo file, but is overridable via deps so
  // tests never read/write the actual tactics-puzzles.js as a side effect.
  const effectiveDeps = deps || {
    getRecentGames: realGetRecentGames,
    makeEngine: () => new StockfishEngine(),
    storePath: STORE_PATH,
  };
  const storePath = effectiveDeps.storePath || STORE_PATH;

  let games = await effectiveDeps.getRecentGames(username, months);
  const existing = readStore(storePath);
  games = games.filter(g => !existing.processedGameIds.includes(g.uuid));
  if (limitGames) games = games.slice(0, limitGames);

  let allFlagged = [];
  for (const game of games) {
    const flagged = await scanGame(game, username, effectiveDeps);
    allFlagged.push(...flagged);
  }

  const { selected, overflow } = selectPuzzles(allFlagged);
  const newPuzzles = selected.map(s => s.puzzle);
  const mergedPuzzles = mergeNewPuzzles(existing.puzzles, newPuzzles);
  const newProcessedIds = existing.processedGameIds.concat(games.map(g => g.uuid));

  writeStore(storePath, { puzzles: mergedPuzzles, processedGameIds: newProcessedIds });

  const report = [
    `Scanned ${games.length} games for ${username}.`,
    `Flagged ${allFlagged.length} instances, kept ${selected.length} as puzzles, ${overflow.length} named but not built (cap reached).`,
    ...selected.map(s => `  - [${s.puzzle.cat}] ${s.puzzle.name}: ${s.puzzle.result}`),
    ...(overflow.length > 0
      ? ['Named but not built (cap reached):', ...overflow.map(o => `  - ${o.puzzle.name}: ${o.puzzle.result}`)]
      : []),
  ].join('\n');

  return { puzzles: newPuzzles, report };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const username = args[0];
  if (!username) {
    console.error('Usage: node test/chesscom-tactics.js <username> [--months N] [--limit-games N]');
    process.exit(1);
  }
  const monthsIdx = args.indexOf('--months');
  const months = monthsIdx >= 0 ? parseInt(args[monthsIdx + 1], 10) : 1;
  const limitIdx = args.indexOf('--limit-games');
  const limitGames = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null;

  runScan(username, { months, limitGames })
    .then(({ report }) => console.log(report))
    .catch(e => { console.error('Scan failed:', e); process.exit(1); });
}

module.exports = { runScan };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/chesscom-tactics.smoke.test.js`
Expected: `chesscom-tactics.smoke.test.js: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add test/chesscom-tactics.js test/chesscom-tactics.smoke.test.js test/lib/stockfish-engine.js test/lib/stockfish-engine.test.js
git commit -m "feat(tactics): add CLI orchestrator wiring fetch, eval, classify, select, and store"
```

---

### Task 7: Wire the Tactics tab into index.html

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `tactics-puzzles.js`'s `TACTICS_PUZZLES` (Task 5's stub, or real data after Task 6 has run).
- Produces: a working third tab in the running app.

- [ ] **Step 1: Add the script tag, before the existing inline `<script>` block**

Find (around `index.html:158-161`):
```html
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"></script>
<script src="https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js"></script>
<script>
```

Replace with:
```html
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"></script>
<script src="https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js"></script>
<script src="tactics-puzzles.js"></script>
<script>
```

- [ ] **Step 2: Add the third tab button**

Find (around `index.html:110-111`):
```html
<button id="tab-ponziani" class="active" onclick="app.switchOpening('ponziani')">Ponziani (White)</button>
<button id="tab-hippo" onclick="app.switchOpening('hippo')">Hippo (Black)</button>
```

Replace with:
```html
<button id="tab-ponziani" class="active" onclick="app.switchOpening('ponziani')">Ponziani (White)</button>
<button id="tab-hippo" onclick="app.switchOpening('hippo')">Hippo (Black)</button>
<button id="tab-tactics" onclick="app.switchOpening('tactics')">Tactics</button>
```

- [ ] **Step 3: Extend `switchOpening()` to toggle the third tab**

Find (`index.html:601-606`):
```javascript
  function switchOpening(op){
    currentOpening=op;
    $('#tab-ponziani').toggleClass('active',op==='ponziani');
    $('#tab-hippo').toggleClass('active',op==='hippo');
    hideLineSelector();startDrill();
  }
```

Replace with:
```javascript
  function switchOpening(op){
    currentOpening=op;
    $('#tab-ponziani').toggleClass('active',op==='ponziani');
    $('#tab-hippo').toggleClass('active',op==='hippo');
    $('#tab-tactics').toggleClass('active',op==='tactics');
    hideLineSelector();startDrill();
  }
```

- [ ] **Step 4: Add the `CATEGORIES.tactics` entry**

Find (`index.html:390-405`):
```javascript
var CATEGORIES={
  ponziani:[
    {key:'main',label:'Main Lines'},
    {key:'counter',label:'Countergambit (3...d5)'},
    {key:'trap',label:'Traps'},
    {key:'other',label:'Other Responses'},
    {key:'beginner',label:'Punish Beginner Moves'}
  ],
  hippo:[
    {key:'vs-e4',label:'vs 1.e4'},
    {key:'vs-d4',label:'vs 1.d4'},
    {key:'vs-cf',label:'vs 1.c4 / 1.Nf3'},
    {key:'threats',label:'Handling Threats'},
    {key:'plans',label:'Middlegame Plans'}
  ]
};
```

Replace with:
```javascript
var CATEGORIES={
  ponziani:[
    {key:'main',label:'Main Lines'},
    {key:'counter',label:'Countergambit (3...d5)'},
    {key:'trap',label:'Traps'},
    {key:'other',label:'Other Responses'},
    {key:'beginner',label:'Punish Beginner Moves'}
  ],
  hippo:[
    {key:'vs-e4',label:'vs 1.e4'},
    {key:'vs-d4',label:'vs 1.d4'},
    {key:'vs-cf',label:'vs 1.c4 / 1.Nf3'},
    {key:'threats',label:'Handling Threats'},
    {key:'plans',label:'Middlegame Plans'}
  ],
  tactics:[
    {key:'blunder',label:'Blunders'},
    {key:'missed-win',label:'Missed Wins'}
  ]
};
```

- [ ] **Step 5: Extend the display-text ternary and add the `ALL_LINES` merge**

Find (`index.html:983`, inside `showLineSelector()`):
```javascript
var html='<h3>'+(currentOpening==='ponziani'?'Ponziani':'Hippo')+' Lines ('+lines.length+')</h3>';
```

Replace with:
```javascript
var openingLabel=currentOpening==='ponziani'?'Ponziani':(currentOpening==='hippo'?'Hippo':'Tactics');
var html='<h3>'+openingLabel+' Lines ('+lines.length+')</h3>';
```

Find (`index.html:384-387`, the `ALL_LINES` assembly):
```javascript
PONZIANI_LINES.map(function(l){l.opening='ponziani';l.playerColor='w';if(!l.baseMoves)l.baseMoves=5;return l});
HIPPO_LINES.map(function(l){l.opening='hippo';l.playerColor='b';l.baseMoves=4;return l});
var ALL_LINES=PONZIANI_LINES.concat(HIPPO_LINES);
```

(Exact surrounding lines may differ slightly — locate the `ALL_LINES` concat and the two `.map()` calls immediately above it.) Replace with:
```javascript
PONZIANI_LINES.map(function(l){l.opening='ponziani';l.playerColor='w';if(!l.baseMoves)l.baseMoves=5;return l});
HIPPO_LINES.map(function(l){l.opening='hippo';l.playerColor='b';l.baseMoves=4;return l});
TACTICS_PUZZLES.map(function(l){l.opening='tactics';return l});
var ALL_LINES=PONZIANI_LINES.concat(HIPPO_LINES).concat(TACTICS_PUZZLES);
```

Note the tactics mapping does **not** set `playerColor` or `baseMoves` — both are already set per-puzzle by `buildPuzzle()` (Task 3), and overwriting them here would silently break every puzzle's board orientation and auto-play length.

- [ ] **Step 6: Manually verify in a browser**

```bash
cd /Users/ananke/Documents/dev/ap/ap-chess-trainer && python3 -m http.server 8765
```

Open `http://localhost:8765/index.html`. Confirm: three tabs are visible (Ponziani, Hippo, Tactics); clicking Tactics switches the active tab highlight correctly; opening the line browser under Tactics shows a "Tactics Lines (0)" header with "Blunders"/"Missed Wins" category headers and no rows (since `tactics-puzzles.js` is still the empty stub from Task 5) — confirms the wiring renders without errors even with zero puzzles. No console errors in the browser dev tools (Cmd+Option+I).

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat(tactics): wire a third Tactics tab into the drill UI"
```

---

### Task 8: Extend test/validate.js to cover tactics-puzzles.js

**Files:**
- Modify: `test/validate.js`

**Interfaces:**
- Consumes: `tactics-puzzles.js`'s `TACTICS_PUZZLES` export.

- [ ] **Step 1: Read the current extraction logic to confirm the exact insertion point**

Run: `sed -n '1,40p' test/validate.js` and confirm the block that reads `index.html`, extracts `PONZIANI_LINES`/`HIPPO_LINES` via `new Function(...)`, and concatenates them into `ALL` (this matches what was already verified during the design-spec audit: lines 8-26).

- [ ] **Step 2: Add a second extraction path for tactics-puzzles.js and merge it into the validated set**

Find the line that builds the combined line list (`var ALL = data.P.concat(data.H);`) and change it to also include the tactics puzzles:

```javascript
var tacticsPath = path.join(__dirname, '..', 'tactics-puzzles.js');
var tacticsSrc = fs.readFileSync(tacticsPath, 'utf8');
var extractTactics = new Function(tacticsSrc + '\nreturn TACTICS_PUZZLES;');
var tacticsPuzzles = extractTactics();

var ALL = data.P.concat(data.H).concat(tacticsPuzzles);
```

Place this immediately after the existing `data.P.concat(data.H)` line so the rest of the file's move-legality loop (which iterates over `ALL`) picks up tactics puzzles automatically with no further changes.

- [ ] **Step 3: Run it to verify it still passes on the current (empty-puzzle) state**

Run: `node test/validate.js`
Expected: same output as before (e.g. `50 lines, 0 issues`) since `tactics-puzzles.js` is still an empty stub — confirms the new extraction path doesn't break anything when there's nothing to validate yet.

- [ ] **Step 4: Verify it actually catches a broken puzzle (prove the new path is live, not a no-op)**

Temporarily edit `tactics-puzzles.js` to add one puzzle with an illegal move (e.g. `moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Zz9']`), run `node test/validate.js` again, confirm it now reports 1 issue, then revert `tactics-puzzles.js` back to the empty stub (`git checkout tactics-puzzles.js`).

- [ ] **Step 5: Commit**

```bash
git add test/validate.js
git commit -m "feat(tactics): extend validate.js to cover tactics-puzzles.js"
```

---

### Task 9: First real scan

**Files:** none (no code changes — this is the manual verification task that produces real puzzle data for the first time)

- [ ] **Step 1: Probe with a single game first**

Per the project's own long-running-process convention (probe before a full run):

```bash
node test/chesscom-tactics.js optimizerprime --months 1 --limit-games 1
```

Confirm it completes in well under a minute, prints a report line, and either finds 0 or 1 puzzles without erroring. If it errors, fix before proceeding — do not run the full scan on a broken pipeline.

- [ ] **Step 2: Run the full month as a background job with logged output**

```bash
node test/chesscom-tactics.js optimizerprime --months 1 > /tmp/tactics-scan.log 2>&1 &
```

Check the log within the first minute to confirm it's progressing (no immediate crash), then check back periodically (every few minutes) until it completes — this is expected to take up to ~60-90 minutes for a full month per the spec's measured Stockfish timing, not something to babysit continuously.

- [ ] **Step 3: Review the report and validate the output**

```bash
cat /tmp/tactics-scan.log
node test/validate.js
```

Confirm the report lists a sensible number of puzzles (0-15) with plausible eval swings and opponent/date info, and `validate.js` still reports 0 issues across all lines including the new puzzles.

- [ ] **Step 4: Manually drill one real puzzle in the browser**

```bash
python3 -m http.server 8765
```

Open `http://localhost:8765/index.html`, switch to the Tactics tab, pick one of the newly generated puzzles, and confirm: the board auto-plays the real game moves up to the mistake, then waits for your move; playing the corrected move completes the puzzle; playing the original (real) blunder move is rejected.

- [ ] **Step 5: Commit the generated puzzle data**

```bash
git add tactics-puzzles.js
git commit -m "data(tactics): first real puzzle batch from optimizerprime's July 2026 games"
```
