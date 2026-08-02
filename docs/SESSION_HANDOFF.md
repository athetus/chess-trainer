# Session Handoff - 2026-08-02

## The Actual Goal (repeat this to yourself before proposing work)
**Reach 1000+ chess.com rapid ELO.** Currently 822 (was 662 on 1 Jul 2026). This repo is
a means to that end. See `docs/TRAINING_PLAN.md` for the measured plan — daily Lichess
tactics volume + exchange-counting on captures + clock management through moves 11-20
are the actual levers; this repo's job is a supporting supplement, not the main event.

## What We Were Doing
Prior session (2026-08-01) ended with the user re-approving a custom Tactics puzzle
feature after it had been built and deliberately deleted earlier that same day (ranking
by eval-swing severity let mate-sentinel scores dominate; see git history / the plan doc
banners for the full story). This session (2026-08-02, continuing in AFK mode per the
user's request) built it for real, shipped it, then fixed a real bug the user found on
first actual use.

## What Was Completed This Session

### 1. Rebuilt the Tactics tab (AFK mode, no check-ins requested)
- Extended `test/chesscom-diagnostic.js`'s cached `moveRecords`/`gameSummaries` with
  `plyIndex`, raw `evalBefore`/`evalAfter`, `correctMoveSan` (engine best move, fetched
  only for flagged plies — ~476 of ~3263 this run, +~8 min not 2x) and
  `sanMoves`/`userColor`/`timeClass` per game. Backward compatible with the existing
  diagnostic report.
- New `test/lib/puzzle-selection.js`: fixed category quotas (`mate` /
  `catastrophic` ≥3 pawns / `common` 1.5-3 pawns, ~5 each) instead of pure severity
  ranking, so the common band (38%-of-mistakes leak) can't be crowded out again. Both
  `blunder` and `missed-win` eligible in every bucket. Per-game cap 2. Overflow reported,
  never silently dropped.
- New `test/build-tactics-puzzles.js`: reads the diagnostic cache (no second Stockfish
  scan), joins `moveRecords`+`gameSummaries`, runs selection, writes
  `tactics-puzzles.js`. **Found and fixed a real data bug against the actual 109-game
  archive**: ~2% of flagged plies (10/483) had the engine's own best move identical to
  the move actually played (eval-swing classifier artifact in already-decided endgame
  races — a fixed-depth search sees further into a bad continuation than the "before"
  eval did). One such case ("you played Ke4, correct was Ke4") was in the first
  real-data build; now filtered out before selection runs. Recorded in
  `tasks/lessons.md`.
- New `test/lib/puzzle-store.js` (simplified vs. the deleted original — full
  regeneration each run, no incremental merge bookkeeping, since building from an
  already-scanned cache is cheap and pure). Puzzle ids are stable
  (`tactics-<gameId>-ply<plyIndex>`) so localStorage spaced-repetition progress survives
  regeneration for anything that stays selected.
- `index.html`: restored the 6-edit Tactics tab wiring (tab button, `switchOpening`,
  `CATEGORIES.tactics`, `ALL_LINES` merge, display-text ternary, empty-pool guard in
  `startDrill`), plus a `typeof TACTICS_PUZZLES!=='undefined'` guard so a
  missing/stale `tactics-puzzles.js` degrades to an empty tab instead of crashing
  Ponziani/Hippo too.
- `test/validate.js`: includes `tactics-puzzles.js` in the legality check when present,
  tolerates its absence otherwise.
- Full 2-month re-scan run in background (109 games, 0 failures, 483 flagged
  instances), 15 real puzzles generated and shipped, committed to `main`, pushed,
  deployment confirmed live via `gh run watch` + cache-busted `curl` (a plain fetch
  right after push showed the OLD content due to GitHub Pages' CDN cache —
  don't trust a push-then-immediate-curl check; wait for the Action or cache-bust).

### 2. User-reported bug found on first real use, fixed same session
User: "for each puzzle, it plays every move and then finally gets to the move i need to
make. it take too long." Root cause: `playBaseMoves()` animates every setup move at
150ms each. Fine for opening lines (`baseMoves` 4-5, ≤750ms). Broken for tactics puzzles
— `baseMoves` there is the actual ply number the mistake happened at in a real game (up
to 105 in this set), so setup alone took 15+ seconds on the deepest puzzles.

Fix: `playBaseMoves()` now takes a fast path when `currentLine.opening==='tactics'` —
replays all setup moves synchronously with no delay/redraw, updates the board once at
the final position, then hands off to `playNextAutoOrWait()` exactly as before. Opening
lines are untouched (that branch is intentionally different — don't merge them back
into one "simplified" path, see CLAUDE.md's Tactics Puzzles section).

Verified with a standalone Node simulation (chess.js standing in for the real game
object, no DOM/browser needed) against all 15 real puzzles: each reaches the correction
ply instantly with the correct FEN, landing exactly on the user's turn. Committed,
pushed, deployment confirmed live. **User confirmed "looks ok now."**

### 3. Docs reconciled (this pass)
STATUS.md, CLAUDE.md, and the two `docs/superpowers/{plans,specs}/2026-07-31-*`
status banners all updated so none of them still describe the Tactics tab as deleted
or unverified — see the `docs:` commit for the full list.

## Current State
| Metric | Value |
|---|---|
| Git | main @ 82d0a5f, clean, pushed, deployment confirmed live |
| Live app | https://athetus.github.io/chess-trainer/ — 65 lines total (50 openings + 15 Tactics) |
| Tests | `node test/validate.js` — 65 lines, 0 issues. All 6 non-engine test files pass (`chesscom-diagnostic.test.js`, `tactics-classifier.test.js`, `chesscom-fetch.test.js`, `puzzle-selection.test.js`, `build-tactics-puzzles.test.js`, plus `stockfish-engine.test.js` which spawns real Stockfish) |
| Rating | 822 (unchanged this session — no games played during this work) |
| Supabase pending reports | 35 STILL PENDING (pre-existing, untouched — see Open below) |

## Open Bugs / Issues
- **35 Supabase `error_reports` rows stuck `pending`** — anon key is RLS-blocked from
  UPDATE. One-liner in Supabase SQL editor (project `oomuupminexahfipgktd`):
  `UPDATE error_reports SET status = 'resolved' WHERE status = 'pending';` To automate
  future sessions, drop a service-role key at `~/Documents/dotenv/chess-trainer.env` as
  `SUPABASE_SERVICE_KEY=...`.
- **Claude still hasn't personally driven the Tactics tab UI** — no browser automation
  tool was available in either the build session or this one. Verification has been
  static checks + logic simulations + the user's own live use, which is solid but not
  identical to Claude having used it directly. If something subtle surfaces later
  (visual glitch, a specific puzzle that feels wrong), that's the gap to remember.
- One game failed the diagnostic scan on a 30s Stockfish timeout once (Jul 16, 1 of
  108). Did not recur on the Aug 1 re-scan (109/109, 0 failures) — still just a watch
  item, not worth fixing preemptively.

## Next Steps (in order)
**Still mostly not code — this is the finding, not an omission.**
1. **Keep using the Tactics tab and report anything that looks wrong** via the existing
   Report button — it flows into the same Supabase pipeline already read each session.
2. **Daily Lichess puzzle volume remains the primary lever**, not this repo's 15
   puzzles. Count the exchange before every capture (38% of measured mistakes are
   capture-related, clustered e5/d5/f6/c5/c4).
3. **Fewer games, more review** — the diagnostic already names your worst games each
   run.
4. **Monthly:** `node test/chesscom-diagnostic.js optimizerprime --months 2`, fill
   `docs/TRAINING_PLAN.md`'s tracking table, then `node test/build-tactics-puzzles.js`
   to refresh the Tactics tab with the latest mistakes. Judge on mistakes/game and
   clock-at-move-30, not rating (still ~+0.4/game, noisy over a single month).
5. Clear the 35 Supabase reports whenever convenient (not urgent, not blocking
   anything).
6. If a future session touches `playBaseMoves()`, keep the two-path split
   (`opening==='tactics'` fast path vs. animated opening-line path) — see CLAUDE.md.

## Decisions Made
- **Tactics tab: rebuilt, shipped, bug-fixed, user-confirmed working.** Do not
  re-litigate whether it should exist — it was asked for three times, built, deleted,
  asked for again, rebuilt with the design flaw actually fixed, and now verified via
  real use. It remains a supplement to Lichess puzzle volume, not a replacement.
- **North star is still 1000 ELO, not "a better app."** Willing to say a feature
  doesn't serve the goal — but this one, done properly, does (concentrated, repeating
  mistakes on the user's own five most common squares).
- **No GM masterclass/video content, no new opening lines** — unchanged from prior
  sessions, still not worth building for a player whose errors are hanging pieces on
  move 22 with excellent existing repertoire coverage.

## Warnings / Gotchas

### New this session
- **A tactics puzzle's `baseMoves` is NOT like an opening line's.** Opening lines use
  4-5 (quick to animate). Tactics puzzles use the puzzle's real ply index (up to 105
  here). `playBaseMoves()` in `index.html` has two paths for exactly this reason —
  don't unify them.
- **An eval-swing classifier can flag a ply as a mistake even when the played move WAS
  the engine's own best move** — always filter `playedMove !== correctMoveSan` before
  presenting something as correctable. Found on ~2% of the real flagged plies, mostly
  wild endgames where deeper search sees further into an already-bad continuation.
- **GitHub Pages' CDN caches `index.html` for up to 10 minutes** — a plain `curl` right
  after a push can show stale content and look like a failed deploy when it isn't. Use
  `gh run watch <run-id>` to confirm the Action finished, then cache-bust the fetch
  (`?cb=$(date +%s)`) before concluding anything about what's actually live.
- **No browser automation tool is available in this environment.** UI changes were
  verified via: chess.js legality checks of full move sequences, DOM-id existence
  checks, inline-script syntax checks, and standalone logic simulations reusing chess.js
  as a stand-in for the real game object. That combination catches a lot but not
  everything — the setup-speed bug this session only surfaced once the user actually
  used it.

### Still true from prior sessions
- **`--months 2`, never `--months 1`** for the diagnostic — the flag counts chess.com
  archive months, and `--months 1` early in a calendar month returns a near-empty
  report.
- **Always re-fetch the chess.com archive before any trend analysis** — a stale
  snapshot once produced a confidently wrong "climb has stalled" conclusion.
- **Never extrapolate a rating rate forward** — ELO is exponential; +160 in July was
  one 26-game burst, not a repeatable monthly rate (~+0.4/game since).
- **Stockfish reports `score mate 0` for any zero-legal-move position** — ambiguous
  between checkmate/stalemate. Fixed via chess.js `in_checkmate()` on the game's true
  final ply; don't regress (there's now a dedicated regression test for this in
  `test/chesscom-diagnostic.test.js`).
- **Never let a ranking sentinel (`1000 - mateDistance`) reach display text** — it once
  printed "drops 988.3 pawns."
- Installed `chess.js` (npm) is snake_case (`load_pgn`, `in_checkmate`); the CDN build
  in `index.html` is different. Don't mix them up in Node code.
- **Never hand-build FEN strings** — generate from move lists via chess.js.
- Tests must `throw` in `assert()`, never `process.exit()` — the latter skips `finally`
  blocks and leaks temp files.
- `validate.js` reads `index.html` between the `function L(...)` marker and the closing
  `];` of `HIPPO_LINES`, and now also reads `tactics-puzzles.js` if present — keep both
  markers in sync with any restructuring.
