# Current State

## Phase
Post-launch maintenance + monthly measurement cycle. No active feature build — the
project's own conclusion (see `docs/TRAINING_PLAN.md`) is that the largest remaining
lever is off-repo (Lichess tactics volume), so this repo's job is: keep the repertoire
content correct, keep the diagnostic/Tactics pipeline trustworthy, and report real
findings from the user's actual games when asked.

## Immediate Next Action
None queued. Next trigger is the user saying something like "look at my latest games"
again — run `node test/chesscom-diagnostic.js optimizerprime --months 2`, rebuild
`tactics-puzzles.js`, update `docs/TRAINING_PLAN.md`'s tracking table and `METRICS.md`,
report.

## Recent Changes (2026-09-09 session)
- Fixed a real bug in `test/chesscom-diagnostic.js`: `mateAllowed` was gated on
  `cat === 'blunder'`, missing the case where a `missed-win` classification (was
  winning big, then walked into a forced mate) should also count as `mateAllowed`.
  Uncaught, this let `scoreToPawns()`'s ~1000-point mate sentinel leak into the
  "material drop" mean, inflating it 3.5x (10.7 vs the true 3.0). Regression test added
  in `test/chesscom-diagnostic.test.js`. Fixed cache in place (backed up first as
  `.chesscom-diagnostic-cache.pre-fix-backup.json`, gitignored) rather than re-running
  the 60-90 min Stockfish scan.
- Full 221-game diagnostic scan (Aug-Sep 2026), report corrected and folded into
  `docs/TRAINING_PLAN.md` and `METRICS.md`.
- Tactics tab (`tactics-puzzles.js`) rebuilt from the corrected cache.
- Independent 221-game repertoire-adherence audit (pure move-sequence diff against the
  live lines in `index.html`, no engine) — found the content itself is correct
  (validate.js passes, 84% of Ponziani divergence is the opponent going off-book), but
  two concrete real-game application gaps: Hippo `...a6` played prematurely 45% of the
  time, and three specific Ponziani decision points (Bg5 poisoned-pawn, Qb3 attack,
  Countergambit 4.Qa4) missed 100% of the times they came up this window (small sample,
  2 occurrences each).
- Created `ROADMAP.md`, `METRICS.md`, `context/` (this directory) — the project-docs
  skill was overdue; `STATUS.md` existed without them.

## Blockers
None active. See STATUS.md's "Open" section for the pre-existing minor watch items
(stuck `pending` Supabase rows, one intermittent Stockfish scan timeout — neither is
blocking).
