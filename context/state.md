# Current State

## Phase
Post-launch maintenance + monthly measurement cycle. The project's own conclusion
(`docs/TRAINING_PLAN.md`) is that the largest remaining lever is off-repo (Lichess
tactics volume); this repo's job is keeping the repertoire content correct, the
diagnostic/Tactics pipeline trustworthy, and reporting real findings from the user's
actual games when asked. A same-day multi-angle review (2026-09-09) added one more
explicit constraint: don't invest further engineering in the Tactics/Mix tab without
an actual usage check first (see "Immediate Next Action").

## Immediate Next Action
Two things are genuinely open, both deliberately left for the user rather than acted
on unilaterally:
1. **Check whether the Mix tab / Tactics tab actually get used** before building on
   either further — no usage metric currently exists to answer this, and the project
   has already deleted one feature once for being built on this exact kind of
   unmeasured assumption.
2. **The user's suspicion that the repertoire is too Stockfish-safe/sterile rather
   than genuinely Gotham-aggressive is confirmed real and untouched** by anything
   shipped so far (see `ROADMAP.md`'s Next section). Worth a dedicated session if the
   user wants to pursue it.

Otherwise: next trigger is the user saying "look at my latest games" — run
`node test/chesscom-diagnostic.js optimizerprime --months 2`, rebuild
`tactics-puzzles.js`, update `docs/TRAINING_PLAN.md`'s tracking table and `METRICS.md`.

## Recent Changes (2026-09-09, one long session)
- Fixed a real diagnostic bug (`mateAllowed` misclassification let a mate-sentinel
  value leak into the "material drop" mean, inflating it 3.5x) with a regression test.
- Full 221-game diagnostic scan; fresh rating trend (906, peak 940) re-fetched live
  rather than trusting a self-reported peak.
- Independent repertoire-adherence audit (move-sequence diff, not engine severity):
  content is correct, but Hippo `...a6` is played prematurely 45% of the time and
  three specific Ponziani decision points were missed 100% of the times they came up
  (small samples). Archived permanently to `docs/research/` (was scratchpad-only).
- Batch-audited the remaining 31 pending Supabase `error_reports` rows (isolated
  worktree subagent): 0 new bugs. Combined with 2 live-investigated fresh reports (1
  real fix — `ponz-leonhardt`'s result-text overclaim — 1 non-bug), all 33
  originally-pending rows are now verified sound. DB rows themselves stay `pending`
  (anon key is RLS-blocked from UPDATE — unresolved, see Blockers).
- Shipped a "Mix" tab (default) pooling Ponziani+Hippo+Tactics by the existing
  per-line weighted-mistake mechanism, fixing "I forget the Tactics tab exists."
- Extended Tactics puzzles past their single corrective move into a Stockfish-PV-based
  resolved sequence (mate in full, or forcing moves until the first quiet move).
- Created `ROADMAP.md`, `METRICS.md`, this `context/` directory (were missing).
- **Same-day 4-agent multi-angle review** (code-verifier, 2x architect, general-purpose)
  of all of the above. Found and fixed: a real UX regression (Mix mode flipped board
  orientation between reps with no warning — added a "You are playing White/Black"
  badge); a factual error in my own commit message/STATUS.md (falsely claimed a
  pre-existing Tactics-tab bug that never existed — I'd misread `CATEGORIES`, stopping
  one line before its `tactics` entry); a `docs/training-ledger.html` refresh that had
  been claimed complete but was actually partial (fixed thoroughly this time, verified
  by an exhaustive grep sweep); a missing STATUS.md entry for the multi-move-puzzle
  feature. Also surfaced but deliberately not acted on: multi-move puzzles now require
  exact-PV-move matching across up to 8 plies with no alternate-solution tolerance
  (code-verifier's design note, low severity, not a regression — worth watching if
  users report a legitimate alternate move being marked wrong).

## Blockers
- **Supabase `error_reports`: 33 rows stuck `pending`**, content-verified sound, purely
  a DB-status problem (anon key is RLS-blocked from UPDATE). Named across multiple
  sessions now; the fix is a five-minute service-role key drop
  (`~/Documents/dotenv/chess-trainer.env`, `SUPABASE_SERVICE_KEY=...`) or a manual SQL
  one-liner the user can run — actually worth doing next time instead of re-noting.
- One intermittent Stockfish scan timeout (1 game of 108, Jul 16) — a watch item, not
  blocking, hasn't recurred since.
