# Session Handoff - 2026-08-01

## What We Were Doing
Started as "read handoff + can you analyse my chess.com profile and make me practice
where I go wrong — be my chess coach?" Became: design and build a tactics scanner, point
it at the user's real games, and then **delete half of what was built** because the
measurements said it wouldn't serve the goal.

**The goal was restated and now leads CLAUDE.md and STATUS.md: reach 1000+ chess.com
rapid ELO. Currently 822 (was 662 on 1 Jul).** The app is a means, not the end. The user
explicitly instructed "remember the end goal always" after work drifted into building
for its own sake, and separately corrected me with "remember elo is exponential."

## What Was Completed (28 commits, pushed to origin/main @ 6e47b15)

### Built and kept
`test/chesscom-diagnostic.js` — pulls the real chess.com archive, runs Stockfish over
every user move, reports what is actually costing rating (time-vs-blunder correlation,
blunder rate by clock, error phases, severity, repertoire coverage, worst games).
Libs in `test/lib/`: `chesscom-fetch.js`, `stockfish-engine.js`, `tactics-classifier.js`,
`diagnostic-analysis.js`. Findings cache to a gitignored JSON; `--report-only` replays instantly.

### Built and deliberately deleted
A full puzzle generator (selection, store, orchestrator, index.html Tactics tab,
validate.js integration). Ranking by eval-swing severity filled all 15 slots with rare
forced-mate positions while 195 instances of the most common error never surfaced — and
more fundamentally, chess skill is thousands of stored patterns (Chase/Simon chunking),
so ~15-50 positions/month can't compete with Lichess's millions. Recoverable:
`git show 45eeea4:test/chesscom-tactics.js`. Backup branch also pushed:
`worktree-chesscom-tactics-scanner`.

### Docs
`docs/TRAINING_PLAN.md` (new — measured plan + monthly tracking table), CLAUDE.md,
STATUS.md, `tasks/lessons.md` (+6 rules), status banners on all three superpowers docs.

## The Measurements (109 real games, 476 engine-confirmed mistakes)
- **4.7 mistakes/game**, median drop 2.5 pawns (a hanging piece)
- **Blunder moves take 2x LONGER than clean ones** (13.5s vs 6.8s) — "slow down" is the
  wrong prescription for this player
- **Blunder rate doubles below 4 min** on the clock (13% → 20-24%); 30% of games end
  under 2 min; moves 11-20 alone burn 3.4 of the 10 minutes
- **38% of mistakes involve a capture** (21% bad ones played, 17% good ones declined),
  clustered on e5/d5/f6/c5/c4 — exchange counting
- **First mistake lands at median move 10**, exactly where prep ends
- Repertoire coverage excellent: Hippo 55/55 Black games, Ponziani 19/19 when allowed,
  Jaenisch line 89% over 9
- Rating 662 → 822, but rate collapsed from ~+6/game (one 26-game burst) to ~+0.4/game.
  **ELO is exponential — never extrapolate a rate forward.**

## Current State
| Metric | Value |
|--------|-------|
| Git | main @ 6e47b15, clean, pushed |
| Backup branch on GitHub | worktree-chesscom-tactics-scanner |
| Tests | 5 files all passing; validate.js still 50 lines / 0 issues |
| Live app | **Unchanged** — index.html byte-identical to pre-session |
| Rating | 822, 178 from goal |
| Supabase pending reports | 35 STILL PENDING (pre-existing) |

## Open Bugs / Issues
- **One game failed the scan** on a 30s Stockfish timeout (1 of 108). Fault isolation
  skipped it without marking it processed, so it retries. Raise the timeout in
  `test/lib/stockfish-engine.js` if failures grow.
- 35 Supabase `error_reports` rows still `pending`; anon key is RLS-blocked from UPDATE.
  One-liner in STATUS.md Blockers.
- Parked minor: `stockfish-engine.js` polling recursion isn't cancelled when its own
  timeout rejects (harmless today — callers exit on error).

## Next Steps (in order)
**Most are not code. That is the finding, not an omission.**
1. **Count the exchange before every capture** — 38% of mistakes live there. Narrow and
   specific; distinct from blanket blunder-checking, which the timing data rules out.
2. **Daily Lichess puzzle reps**, theme-filtered to forks/pins/exchanges. The chunking
   mechanism; nothing in this repo substitutes.
3. **Fewer games, more review** — 108/month without review repeats the same mistake.
4. **Monthly:** `node test/chesscom-diagnostic.js optimizerprime --months 2`, then fill
   the tracking table in `docs/TRAINING_PLAN.md`. Judge on leading indicators
   (mistakes/game, clock at move 30), not rating — at ~+0.4/game a month is noise.
5. **Optional build:** middlegame plan notes on the 50 existing lines (pawn breaks, piece
   placement, target). The one build item the research supports, since the first mistake
   lands where the book ends. A day of chess thinking, not a software project.
6. Pre-existing: clear the 35 Supabase reports; optional Lichess API token for
   human-game stats in future repertoire audits.

## Decisions Made
- **Puzzle generation deleted, diagnostic kept.** Do not rebuild without re-reading why.
- **North star is 1000 ELO, not "a better app."** Be willing to tell the user a feature
  doesn't serve the goal — including one just built.
- **No GM masterclass/video content** (wrong altitude for hanging-piece errors);
  **no new opening lines** (coverage already excellent — add *plans* instead).
- Puzzle-selection's wrapper return shape was kept deliberately (it matched the real
  caller); the spec's interface line was what was wrong.

## Warnings / Gotchas

### New this session
- **Use `--months 2`, never `--months 1`.** The flag counts chess.com *archive months*;
  early in a calendar month `--months 1` returns a near-empty report (verified on 1 Aug —
  one game). Green unit tests did not catch this; running the command did.
- **Always re-fetch the archive before any trend analysis.** A two-day-old snapshot was
  missing 8 games, ended mid-dip, and produced a confidently wrong "the climb has stalled"
  conclusion that reversed on re-fetch.
- **Stockfish reports `score mate 0` for any zero-legal-move position** — ambiguous
  between checkmate and stalemate. This made every checkmate the user *delivered* score as
  a "missed win." Fixed via chess.js `in_checkmate()` on the true final move; don't regress.
- **Never let ranking sentinels reach display text** — the mate encoding
  (`1000 - distance`) once surfaced as "drops 988.3 pawns."
- Installed npm `chess.js` is **snake_case** (`load_pgn`, `in_checkmate`); the CDN build in
  index.html is a different version.
- Tests must `throw` in `assert()`, never `process.exit()` — the latter skips `finally`
  and leaks temp files. Shipped once; took two fix rounds.
- A full scan is **60-90 min** and prints nothing until the end. Background it with a log.
- **Four confident claims were wrong this session**, each corrected only by measuring:
  "openings don't matter," "you're rushing," "you're not in time trouble," "the climb has
  stalled." Measure before asserting.

### Still true from prior sessions
- **Ponziani = White, even move-indices = White's moves. Hippo = Black, odd indices.**
  Audits print White's perspective, so a +0.8 Hippo final is normal, not a bug.
- **`3.c3` always shows a ~0.5 "drop"** vs Ruy/Italian — that's the Ponziani premise. In
  trap lines Black's blunder is intentional; only White's refutation must be engine-best.
- **Lichess opening explorer returns 401 without a personal API token.** Use chessdb.cn
  (`cdb.php?action=queryall&board=<FEN>&json=1`, no auth) for auth-free DB checks.
- **validate.js reads index.html between the `function L(...)` marker and the `];`
  closing HIPPO_LINES.** Restructuring those means updating validate.js's markers.
- **Never hand-build FEN strings** — generate from move lists via chess.js.
- **Cross-check lines against external DBs and the named source**, not just engine walks
  of the scripted moves.
