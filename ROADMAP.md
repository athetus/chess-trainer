# Roadmap

## End Goal
Get the user to 1000+ chess.com rapid ELO (906 now, peak touched 940, started at 662 on 1 Jul 2026) — this repo is a supporting supplement to that, not the deliverable itself.

## Now
- Repertoire content stays correct and validated (`test/validate.js`, 0 issues) as real-game reports come in.
- Monthly diagnostic + Tactics-tab refresh runs automatically when the user says "look at my latest games" — no checklist handed back to them.
- Training advice stays tied to what the measured data actually shows, and to concrete drills/visible in-game triggers the user can act on (never a mid-game mental habit, never raw notation given how the user processes chess).

## Next
- Confirm whether the two concrete, measured leaks from the 9 Sep 2026 audit are closing: Hippo's premature `...a6` (played too early 45% of the time it appears) and the three specific Ponziani decision points missed 100% of the times they came up (Bg5 poisoned-pawn, Qb3 attack, Countergambit 4.Qa4) — via spaced-repetition reps on those specific lines, not new content.
- **Check whether the Mix tab and multi-move Tactics puzzles (both shipped 9 Sep 2026) actually get used before building on them further** — a same-day ROI review flagged that neither has a usage measurement, and the project has already deleted one feature once for being built on an unmeasured assumption. No localStorage/analytics hook currently exists to answer this; the honest answer next session is "ask the user directly," not infer it.
- Address the user's still-unresolved suspicion that the Ponziani/Hippo lines are too Stockfish-safe/sterile rather than true to Gotham's/Ruddell's actual aggressive, trappy style — a same-day UX review confirmed this is untouched by anything shipped so far and is the single biggest remaining gap for this user specifically.

## Later
- Optional deeper Hippo rebuild toward the active Kh7+f5 model on remaining passive lines (see STATUS.md "Hippo Engine Audit").
- Optional Lichess API token for human master/club-game stats in future repertoire audits.
- Service-role Supabase key so future sessions can clear stuck `pending` error_reports rows without asking the user to run SQL by hand.

## Completed
- 50 opening lines (32 Ponziani + 18 Hippo) + 15 real-mistake Tactics puzzles, all validated, cross-checked against chessdb.cn and the named source repertoires (GothamChess, The Chess Giant).
- `test/chesscom-diagnostic.js` — Stockfish-audited monthly diagnostic pulling the real chess.com archive.
- Tactics tab: consumes the diagnostic's own cache, fixed-quota category selection (not pure severity ranking) after the first eval-swing-severity design was built, found flawed, and deleted.
- `docs/training-ledger.html` — user-facing actionable version of the training plan (concrete drills + visible in-game triggers only).
- 9 Sep 2026: fixed a real diagnostic bug (`mateAllowed` misclassification let a mate-sentinel value of ~1000 leak into the "material drop" mean, inflating it 3.5x) with a regression test; corrected the cache and rebuilt the Tactics tab from it; ran a full 221-game repertoire-adherence audit (line-diff, not just engine severity) and folded the findings into `docs/TRAINING_PLAN.md`.
- 9 Sep 2026: new default "Mix" tab pooling Ponziani+Hippo+Tactics by the existing per-line weighted-mistake mechanism, fixing the user's "I forget the Tactics tab exists" problem.
- 9 Sep 2026: Tactics puzzles extended past their single corrective move into a Stockfish-PV-based resolved sequence (mate in full, or forcing moves until the first quiet move), so the "why" of the fix is visible instead of the drill ending instantly.
- 9 Sep 2026: same-day 4-agent multi-angle review (correctness/UX/ROI/doc-consistency) of all of the above — found and fixed a real UX regression (board orientation flips unpredictably in Mix mode), a factual error in a code comment/commit message, and several doc inconsistencies from the day's own edits; see STATUS.md's "Multi-Angle Review" session entry for the full account.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Rating plateaus/dips after a peak and gets misread as "almost done" | 3 | 3 | Always re-fetch the live archive before any trend claim; report the current number, never the peak, as "where you are" (see TRAINING_PLAN.md's peak-vs-current section). |
| A future eval-swing/severity classifier bug silently distorts the report or puzzle selection again | 2 | 4 | Any change to `test/lib/tactics-classifier.js` or the `mateAllowed`/`mateMissed`/`dropPawns` fields in `chesscom-diagnostic.js` needs a regression test before it ships — see the 9 Sep 2026 fix for the pattern. |
| Opening-line content edits ship without the Stockfish/chessdb audit the project's Tactical Audit Process requires | 2 | 4 | Never skip `test/validate.js` + the engine audit steps in CLAUDE.md, even when the user has pre-authorized proceeding without reconfirmation — that authorization covers not asking, not skipping correctness checks. |
| Time spent on this repo's own content crowds out daily Lichess volume, the actual primary lever | 2 | 3 | Every proposed feature gets judged against the end goal explicitly (see CLAUDE.md); this repo is a supplement, not a replacement for Lichess reps. |
