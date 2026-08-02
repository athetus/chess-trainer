# Chess Opening Trainer

## The Actual Goal (read this before proposing work)
**Get the user to 1000+ chess.com rapid ELO.** Currently 822 (was 662 on 1 Jul 2026).
The app is a means to that end, not the end itself. Judge every proposed feature against
whether it moves that number — and be willing to say "this doesn't," including about
things already built. See `docs/TRAINING_PLAN.md` for the measured plan.

**The evidence says the biggest remaining lever needs no code.** Measured over 109 real
games: 4.7 significant mistakes/game, blunder rate doubling below 4 min on the clock, and
38% of mistakes involving a capture, clustered on five squares (e5/d5/f6/c5/c4). Chess
skill is stored patterns numbering in the thousands (Chase/Simon chunking) — that needs
puzzle *volume*, which Lichess supplies free at a scale this repo never could. **Daily
Lichess puzzle volume remains the primary lever; do not deprioritize it in favor of this
repo's own Tactics tab.**

A first puzzle-engine attempt (Aug 2026) was built and deliberately deleted: ranking by
eval-swing severity let mate-sentinel scores dominate, so all 15 slots filled with rare
forced-mate positions while 195 instances of the common 1.5-3 pawn hang never surfaced —
see STATUS.md. It was rebuilt (same day, user-approved after re-examination) as a
**Tactics tab that consumes the diagnostic's own cache** rather than re-scanning, with
fixed category quotas instead of pure severity ranking — see "Tactics Puzzles" below. It
is a *supplement* to Lichess volume for the user's own concentrated, repeating mistakes,
not a replacement for it.

## Project Overview
Interactive chess opening trainer web app for drilling the **Ponziani Opening** (as White) and **Hippopotamus Defense** (as Black), plus a monthly diagnostic that measures what is actually costing the user rating.

**Live:** https://athetus.github.io/chess-trainer/

## Tech Stack
- Single `index.html` file — no build step, no backend
- **chess.js** 0.10.3 (CDN) — move validation and game logic
- **chessboard.js** 1.0.0 (CDN) — board rendering
- Piece images from `chessboardjs.com` (unpkg was 404ing)
- Web Audio API for move sounds (oscillator-based, no audio files)
- SVG overlay for board arrows (opponent last move, correct move hints)
- localStorage for spaced repetition, XP, streaks, error reports

## Architecture
Everything is inline in `index.html`:
- CSS at top
- HTML structure
- Opening data as JS objects using `L()` helper function
- Sound engine (Web Audio API oscillators — move, capture, correct, wrong, complete)
- Arrow system (SVG polygon overlay — orange for opponent moves, green for corrections)
- Gamification (XP, 10 levels Pawn→World Champion, daily streak, line mastery stars)
- Spaced repetition (weighted random selection — errors increase weight, perfects decrease)
- Drill engine (move validation, auto-play, flexible ordering for Hippo)
- UI controller (tap-to-move, undo, error reporting)

## Features
- **Tap-to-move** — tap piece to select (yellow highlight + grey dots), tap destination. No drag.
- **OK / Report after completion** — after last move, user sees OK (next line) or Report & Next (log error + advance). No auto-advance — user always gets a chance to evaluate the final position.
- **Undo** — step back to retry your last move
- **Report Error** — log suspect positions to localStorage AND cloud (jsonblob). View in-app via "Errors" button. Share via native share sheet.
- **Cloud error sync** — errors auto-sync to cloud endpoint so Claude Code can fetch and process them at the start of each session. Zero friction for the user.
- **Flexible move order** — Hippo lines accept setup moves in any order
- **Speed tracking** — avg seconds per move shown in stats and result screen
- **Chess.com green board** — #EEEED2 / #769656 square colors with yellow highlights

## Opening Lines
- **32 Ponziani lines** — main lines (Nxg6+Qf3 mate threat), GothamChess Qb3 attack, traps (incl. the Bd7/Bg4 queen-sac), countergambit, beginner punishments, 3 deviation lines (Petrov, Alekhine, Sicilian Alapin)
- **18 Hippo lines** — vs 1.e4/d4/c4/Nf3, handling threats, middlegame plans (vs e5 push: CAPTURE dxe5, never lock with ...d5)
- All lines validated with chess.js (`test/validate.js`) — **50 lines total, 0 issues**
- Retired 2026-07-16: ponz-nxf2-trap, ponz-qh4-trap, ponz-main-positional (all premised on 7.Bd3, which ...Nxe5! refutes; mains now play Gotham's 7.Nxg6! hxg6 8.Qf3)
- `test/validate.js` now parses line definitions DIRECTLY from index.html (cannot drift out of sync)
- Stockfish 18 engine audit is the gold standard for tactical correctness (`brew install stockfish`) — objective evals beat LLM chess judgment; harness pattern in session scratchpad drives it via UCI
- Opus subagent tactical audit also available — two independent audits cross-confirmed bugs
- Deep audit scripts (`test/deep-audit*.js`) produce false positives; Stockfish/Opus audits are more reliable

## Key Principles Enforced
### Ponziani (GothamChess style)
- "If Black doesn't play ...d5, we play d4"
- After d4, push d5 whenever possible to kick the Nc6
- After d5 Ne7, play Bg5 to poison the e4 pawn (Qa4+ fork trap); if Black defends ...h6, trade Bxf6! (doubled f-pawns) — NEVER retreat Bh4 (...g5/...h5 buries the bishop)
- In the 3...a6 waiting line, d5 Ne7 leaves e5 HANGING (no ...d6 played) — Nxe5! wins a pawn; Bg5 there is a mistake
- If e7 is blocked (by Be7 or Qe7), d5 forces knight to b8/d8 — even worse
- Always look for material-winning captures before quiet moves (dxc6, Qxe4+, etc.)
- GothamChess Qb3 line is the primary recommendation after 4.d4 exd4 5.e5 Nd5 -- drill ends at O-O (Greek Gift Bxh7+ was removed: unsound because Bxh3 wins White's queen)
- Main Nxe4 line: after 5.d5 Ne7 6.Nxe5 Ng6, play 7.Nxg6! hxg6 8.Qf3! (threatens Qxf7# + hits e4) -- NEVER 7.Bd3? (refuted by ...Nxe5!). This is Gotham's actual line; the old Bd3/O-O/Re1 structure is retired.
- 5...Qe7 (after 4.d4 exd4 5.e5): 6.cxd4! then 7.Bb5! must be memorized -- 6.Qe2? loses e5 to the ...d3! deflection

### Hippo (The Chess Giant / Solomon Ruddell style)
- Flexible move order — setup moves can be played in any order
- Always start with ...g6, then ...Bg7 (auto-played, baseMoves=4)
- **...a6 is CONDITIONAL** — only play when Nc3 can reach b5. Skip if no knight threat.
- **...h6 is CONDITIONAL** — only play when Ng5 or Bg5 is a real threat. Skip if not needed.
- **Castling is FLEXIBLE** — delay or skip in closed positions. 5 lines show delayed/no castling.
- **Be OPPORTUNISTIC** — if White overextends, exploit it instead of blindly completing the setup
- Against Austrian Attack (f4): the app transposes to Pirc with ...Nf6 — NOTE: this diverges from Ruddell (he keeps pure Hippo: delay Nd7/Bb7, keep Bc8+Ne7+e6 covering f5, b6 only to support ...c5) but chessdb ranks every app move #1-3, so it's kept as the engine-approved choice
- Break timing: ...e5 after d5, ...d5 after e5, ...f5 for kingside attack
- Don't put knight on f5 if exf5 captures it

## Error Reporting
Users report suspect moves via the "Report" button. Reports are stored in localStorage AND synced to a cloud endpoint automatically.

**Cloud endpoint (Supabase):**
- Project: `oomuupminexahfipgktd` (chess-trainer, ap-southeast-1)
- Table: `error_reports` (line_id, line_name, move_index, fen, expected_move, user_played, moves_played, status)
- Table: `move_explanations` (line_id, move_index, wrong_move, explanation) — personalized wrong-move feedback
- Anon key used in frontend (safe, designed for client-side use with RLS)

**Workflow:**
1. User taps Report on phone → saved locally + sent to Supabase
2. Claude Code session starts → fetches pending errors from Supabase
3. Claude processes errors, pushes fixes, marks as resolved

Each report contains:
- `lineId`, `lineName` — which line
- `moveIndex` — which move in the sequence
- `fen` — board position at time of report
- `expectedMove` — what the app wanted
- `movesPlayed` — moves up to that point
- `timestamp`

## The Monthly Diagnostic
```bash
node test/chesscom-diagnostic.js optimizerprime --months 2
node test/chesscom-diagnostic.js optimizerprime --report-only   # instant replay from cache
```
Pulls the real chess.com archive, runs Stockfish over every one of the user's moves, and
reports what is actually costing rating: time-vs-blunder correlation, blunder rate by
clock remaining, error phase distribution, severity, repertoire coverage, worst games.
Fill the tracking table in `docs/TRAINING_PLAN.md` after each run.

- **Use `--months 2`, not `--months 1`.** The flag counts chess.com *archive months*, so
  early in a calendar month `--months 1` returns only the few games played so far. Verified
  on 1 Aug: it produced a one-game report.
- A full scan is **60-90 minutes** (~0.6-1.0s per Stockfish eval, 2 evals per user ply).
  Run it in the background with output to a log; it prints nothing until the end.
- Findings cache to `.chesscom-diagnostic-cache.json` (gitignored). Since Aug 2026 this
  cache also feeds the Tactics tab (see below) — flagged plies additionally carry
  `plyIndex`, raw `evalBefore`/`evalAfter`, and `correctMoveSan` (the engine's best move,
  fetched only for flagged plies — adds ~8 min to a full scan, not 2x).
- Modules: `test/lib/chesscom-fetch.js`, `stockfish-engine.js`, `tactics-classifier.js`,
  `diagnostic-analysis.js`.

## Tactics Puzzles (the user's own real mistakes)
```bash
node test/build-tactics-puzzles.js   # instant -- reads the diagnostic cache, no scan
```
Builds `tactics-puzzles.js` (committed, NOT gitignored — GitHub Pages serves it as a
static `<script>` alongside `index.html`, unlike the diagnostic's own cache file) by
selecting from the diagnostic's cached `moveRecords`, not by running its own Stockfish
scan. Requires a
cache produced by the *extended* diagnostic (has `plyIndex`/`correctMoveSan` on flagged
records) — a stale pre-extension cache is skipped record-by-record with a warning, not
crashed on.

**Selection is fixed-quota, not pure severity ranking** (`test/lib/puzzle-selection.js`):
three buckets — `mate` (allowed/missed a forced mate), `catastrophic` (≥3 pawn swing,
non-mate), `common` (1.5-3 pawn swing, non-mate) — each gets its own ~5-slot quota, so the
common band (the actual 38%-of-mistakes leak) can never be crowded out by mate-sentinel
scores the way the first attempt was. Per-game cap of 2. Both `blunder` and `missed-win`
categories are eligible in every bucket — this covers hung material, missed tactics, AND
missed wins, not just blunders. Anything cut by the per-game cap or a full quota is
reported as overflow, never silently dropped.

Puzzle ids are stable (`tactics-<gameId>-ply<plyIndex>`), so re-running the build after a
fresh monthly scan naturally preserves localStorage spaced-repetition progress for any
puzzle that stays selected, and just leaves a harmless unused key for one that falls out.
Every run fully regenerates `tactics-puzzles.js` from the current cache — no incremental
merge bookkeeping, since building from an already-scanned cache is cheap and pure.

`index.html` loads `tactics-puzzles.js` via `<script src="tactics-puzzles.js">` and merges
`TACTICS_PUZZLES` into `ALL_LINES` as the third tab. Guarded with
`typeof TACTICS_PUZZLES!=='undefined'` so a missing/not-yet-generated file degrades to an
empty Tactics tab instead of crashing Ponziani/Hippo too. `test/validate.js` includes
`tactics-puzzles.js` in the legality check when present.

**Gotcha found only by actually using it (2026-08-02):** a tactics puzzle's `baseMoves`
is the real ply number the mistake happened at in an actual game (up to 105 in this set),
NOT the small 4-5 used by opening lines. `playBaseMoves()` in `index.html` therefore
takes a fast path for `currentLine.opening==='tactics'` — it replays all setup moves
synchronously with no per-move delay/redraw, then updates the board once at the final
position. Opening lines keep the original animated walk-through (`baseMoves` is small
there and watching it play out is part of the point) — don't "simplify" that branch away
too, it's intentionally different behavior for a good reason.

## Testing
```bash
# Validate all move sequences are legal (parses index.html directly)
node test/validate.js

# Diagnostic pipeline unit tests (stubbed -- no network, no engine)
node test/chesscom-diagnostic.test.js
node test/lib/tactics-classifier.test.js
node test/lib/stockfish-engine.test.js     # spawns real Stockfish
node test/lib/chesscom-fetch.test.js       # hits the real chess.com API

# Tactics-puzzle build pipeline unit tests (stubbed cache, no network, no engine)
node test/lib/puzzle-selection.test.js
node test/build-tactics-puzzles.test.js

# Deep audit for missed tactics (captures, checks, forks)
node test/deep-audit.js

# Hippo-specific audit for hanging material
node test/deep-audit-hippo.js
```
Tests are plain node scripts (no framework). `assert()` must **throw**, never call
`process.exit()` — `process.exit` skips `finally` blocks and leaks temp files.

Installed `chess.js` (npm) uses the **snake_case** API (`load_pgn`, `in_checkmate`); the
CDN build in `index.html` is a different version. Don't mix them up in Node code.

## Deployment
Hosted on GitHub Pages (public repo). Push to `main` triggers automatic deploy.
```bash
git push origin main
# Live at https://athetus.github.io/chess-trainer/ within ~1 minute
```

## Adding New Lines
Use the `L()` helper function:
```js
L(id, name, description, result, isTrap, category, moves, explanations, baseMoves)
```
- `moves`: array of SAN strings from move 1
- `explanations`: object mapping move index to explanation string
  - Ponziani: even indices (White's moves)
  - Hippo: odd indices (Black's moves)
- `baseMoves` (optional 9th param): override auto-play count. Ponziani default=5, Hippo default=4. Use for deviation lines where the user must respond to an unexpected Black move (e.g., baseMoves=1 so user sees 1...Nf6 and must play e5!)
- `test/validate.js` now auto-parses index.html — no need to hand-copy lines anymore. Just run it.
- Run `node test/validate.js` to verify legality (must show 0 issues)
- Categories: main, counter, trap, other, beginner (Ponziani) / vs-e4, vs-d4, vs-cf, threats, plans (Hippo)
- Hippo lines: `flexible:true` is set automatically via ALL_LINES mapping

## Tactical Audit Process
When adding or modifying lines, or after a batch of user error reports:
1. Run `node test/validate.js` — confirms move legality only (auto-parses index.html)
2. **Run a Stockfish 18 engine audit (gold standard).** `brew install stockfish`. Drive it via UCI from node: for each line, walk every ply, eval the position before each move, flag any WHITE move that drops significantly vs the engine's best, and record the final eval from White's perspective. Compare the final eval to the line's result text. (Harness pattern: scratchpad `audit.js` in the session that built this process.)
3. Interpretation rules:
   - `3.c3` always looks like a ~0.5 "drop" vs Ruy/Italian — that's the Ponziani premise, NOT a bug. Ignore it.
   - In TRAP lines, Black's blunder is intentional — only White's refutation must match engine best.
   - Fix a move only when it's a real inaccuracy/blunder (meaningful drop) with a better move that keeps the line's pedagogical intent.
   - Result text must match the engine eval — no "winning/crushing/up a piece" when the eval is equal or worse.
4. Re-run the engine on the corrected sequences BEFORE editing index.html, then `node test/validate.js` after.
5. Cross-check vs external DBs and sources (added 2026-07-16): chessdb.cn (`cdb.php?action=queryall&board=<FEN>&json=1`, no auth) ranks every candidate move — flags our moves the engine walk missed (an engine walk only tests our moves against the SCRIPTED replies; chessdb catches lines refuted by better opponent replies). Lichess opening explorer (human game stats) now requires a personal API token. Also verify "Gotham says"/"Ruddell says" claims against their actual videos before attributing.
6. NEVER hand-build FEN strings for engine checks — generate them from move lists via chess.js (hand-built FENs produced phantom-piece garbage twice).

**Common bugs to watch for:**
- Knight on f5 when e-pawn can capture (exf5 with no recapture available)
- Castling after queen controls the castling path
- Result descriptions claiming "up a piece" / "winning" / "excellent attack" when the engine says equal-or-worse (esp. the Ponziani, which mostly equalizes rather than crushes)
- Trap lines whose refutation isn't actually the engine's best (e.g. Qa4 vs exf6, Ng4 vs g3, Qa4 vs dxc6 in bc5-trap -- Qa4 lost outright to ...Nxf2!)
- Lines ending mid-trade (position looks wrong cosmetically)
