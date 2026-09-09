# Insights / Gotchas / Non-Obvious Learnings

- **A "was winning, then walked into a forced mate" position classifies as `missed-win`,
  not `blunder`** (`classifyPly()` in `test/lib/tactics-classifier.js` — the
  `wasWinningBig && !stillWinningBig` branch fires before the generic blunder-threshold
  check). Any code that gates `mateAllowed`/`mateMissed` on a specific `cat` value must
  account for **both** categories, not just `'blunder'` — found 2026-09-09 as a real bug
  (`mateAllowed` required `cat === 'blunder'`, so this exact case fell through to the
  generic material-drop bucket carrying a fake ~1005-"pawn" drop from the mate sentinel).
  6 of 917 flagged records in the Sep 2026 scan hit this. Fixed with a regression test.
- **`scoreToPawns()`'s mate sentinel (`±(1000 - |mate|)`) is for internal ranking only
  and must never reach a human-facing number or a bucketing decision without a
  mate-aware gate.** This is the second time this project has hit this exact failure
  mode (first: the original puzzle-severity-ranking design, deleted Aug 2026) — any new
  code touching `dropPawns`/`mateAllowed`/`mateMissed` should treat this as a known trap.
- **`--months N` on the diagnostic counts chess.com archive months, not calendar days.**
  `--months 1` early in a calendar month returns a near-empty archive (verified: a
  single-game report on 1 Aug 2026). Always use `--months 2`.
- **Rating peak ≠ rating now, and this project has been burned by conflating them
  twice** — once via a stale archive snapshot (Aug 2026) that happened to end mid-dip,
  once via the user's own self-report of a peak (940) treated as current (Sep 2026,
  actual current was 906). Always re-fetch the live archive and report the most recent
  game's rating specifically, never the window's max.
- **Absolute counts across measurement windows of different lengths (1 month vs 2
  months) are misleading without per-game normalization** — e.g. "allowed forced mates:
  47 → 89" looks like a near-doubling but is actually a slightly better per-game rate
  (0.44 → 0.40) once the window length (108 games → 221 games) is accounted for.
- **The user cannot easily visualize chess from algebraic notation** — explanations
  should route through the app's own interactive board/drills rather than SAN move
  lists or prose describing squares. See Auto Memory:
  `chess-user-cannot-visualize-notation`.
- **`test/validate.js` auto-parses line definitions directly from `index.html`** — it
  can't drift out of sync with a hand-maintained copy. Always the first check after any
  line edit.
- **Repertoire *content* correctness and repertoire *adherence in real games* are
  different questions** — `test/validate.js` + the Stockfish/chessdb audit process
  verify the former; they say nothing about whether the user actually plays the
  documented moves under real conditions. The 9 Sep 2026 audit
  (`test/lib/chesscom-fetch.js` + a pure move-sequence diff against the parsed
  `PONZIANI_LINES`/`HIPPO_LINES`, no engine) is the tool for the latter and found the
  content is correct but application under pressure is the actual gap (see
  `docs/TRAINING_PLAN.md`).
