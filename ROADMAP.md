# Roadmap

## End Goal
Get the user to 1000+ chess.com rapid ELO (906 now, peak touched 940, started at 662 on 1 Jul 2026) — this repo is a supporting supplement to that, not the deliverable itself.

## Now
- Repertoire content stays correct and validated (`test/validate.js`, 0 issues) as real-game reports come in.
- Monthly diagnostic + Tactics-tab refresh runs automatically when the user says "look at my latest games" — no checklist handed back to them.
- Training advice stays tied to what the measured data actually shows, and to concrete drills/visible in-game triggers the user can act on (never a mid-game mental habit, never raw notation given how the user processes chess).

## Next
- Confirm whether the two concrete, measured leaks from the 9 Sep 2026 audit are closing: Hippo's premature `...a6` (played too early 45% of the time it appears) and the three specific Ponziani decision points missed 100% of the times they came up (Bg5 poisoned-pawn, Qb3 attack, Countergambit 4.Qa4) — via spaced-repetition reps on those specific lines, not new content.
- Re-verify "first mistake at median move 10" against the fresh 221-game archive (last computed on the 109-game July baseline).

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

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Rating plateaus/dips after a peak and gets misread as "almost done" | 3 | 3 | Always re-fetch the live archive before any trend claim; report the current number, never the peak, as "where you are" (see TRAINING_PLAN.md's peak-vs-current section). |
| A future eval-swing/severity classifier bug silently distorts the report or puzzle selection again | 2 | 4 | Any change to `test/lib/tactics-classifier.js` or the `mateAllowed`/`mateMissed`/`dropPawns` fields in `chesscom-diagnostic.js` needs a regression test before it ships — see the 9 Sep 2026 fix for the pattern. |
| Opening-line content edits ship without the Stockfish/chessdb audit the project's Tactical Audit Process requires | 2 | 4 | Never skip `test/validate.js` + the engine audit steps in CLAUDE.md, even when the user has pre-authorized proceeding without reconfirmation — that authorization covers not asking, not skipping correctness checks. |
| Time spent on this repo's own content crowds out daily Lichess volume, the actual primary lever | 2 | 3 | Every proposed feature gets judged against the end goal explicitly (see CLAUDE.md); this repo is a supplement, not a replacement for Lichess reps. |
