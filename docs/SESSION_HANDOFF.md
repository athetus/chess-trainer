# Session Handoff - 2026-09-09

## The Actual Goal (repeat this to yourself before proposing work)
**Reach 1000+ chess.com rapid ELO.** Currently **906**, peak touched **940** (was 822 on
1 Aug 2026, 662 on 1 Jul 2026). Always re-fetch the live chess.com archive before citing
this number — a peak is not "current," and this session caught the user's own
self-reported peak being treated as current state. This repo is a supporting supplement;
the project's own evidence says the biggest remaining lever (daily Lichess tactics
volume) needs no code. See `docs/TRAINING_PLAN.md` and `METRICS.md`.

## What We Were Doing
User opened asking for a thorough audit of recent games ("not following the Gotham
lines... be thorough"). That single request grew into one long session covering: a
full diagnostic re-scan, a real bug fix in the diagnostic itself, a repertoire-adherence
audit, two live chess questions that turned into real content fixes, a UX redesign the
user proposed mid-conversation, a new puzzle feature, and finally a 4-agent multi-angle
review of everything shipped that day — which found and fixed several real problems in
this session's own earlier work. Nothing here is theoretical; every claim below traces
to a verified check (Stockfish, live Supabase query, or the live deployed site).

## What Was Completed This Session

### 1. Diagnostic bug fix (commit `758d8b5`)
`mateAllowed` in `test/chesscom-diagnostic.js` was gated on `cat === 'blunder'`, missing
the case where a position was winning big and then walked into forced mate (classifies
as `'missed-win'`, not `'blunder'`). This let `scoreToPawns()`'s ~1000-point internal
mate-ranking sentinel leak into the "material drop" severity mean, inflating it 3.5x
(10.7 vs the true 3.0). Fixed with a regression test; patched the existing 221-game
cache in place (recomputed the pure function from already-cached raw evals, no re-scan
needed).

### 2. Full 221-game diagnostic + repertoire-adherence audit (`758d8b5`, `19f7ab1`)
Fresh scan, Aug-Sep 2026. Corrected numbers: 4.1 mistakes/game, median drop 2.3 pawns,
89 allowed / 54 missed forced mates, blunder rate still roughly doubles below 4 min on
the clock (11.6% → ~20%). Separately, an independent move-sequence-diff audit (not
engine severity) found the repertoire *content* is correct — `test/validate.js` passes,
84% of Ponziani-line divergence is the opponent going off-book — but two real
application gaps: Hippo `...a6` played prematurely 45% of the time it appears, and three
specific Ponziani decision points (Bg5 poisoned-pawn, Qb3 attack, Countergambit 4.Qa4)
missed 100% of the times they came up this window (small samples, n=2 each). Both are
practice gaps, not content gaps — no line edits were needed there. Archived permanently
to `docs/research/` (was originally scratchpad-only — real risk of loss, since flagged
by the user directly: "make sure my games are saved properly").

### 3. Two live content bugs found and fixed via direct user reports
- **`ponz-leonhardt`**: result text claimed "White is up a clean pawn... win the
  endgame." Stockfish at the exact final position: **-0.10, dead equal**. Fixed the
  text; moves were already sound.
- Queried Supabase directly rather than trusting this file's own past claims — found
  **33 rows still `pending`** (not "35, all processed" as previously stated). Batch-
  audited all 33 (2 live + 31 via an isolated-worktree subagent): **0 further bugs**,
  16 already fixed by earlier commits (stale DB status only), 15 confirmed sound.
  Content is verified clean; the DB rows themselves stay `pending` (RLS blocks UPDATE
  on the anon key — see Open Bugs).

### 4. Mix tab (commit `fbfe50a`) — user's own proposal, better than what was offered
User reported never opening the Tactics tab ("I forget it exists"). Rather than a
bigger redesign, they proposed: pool Ponziani+Hippo+Tactics into one default tab,
weighted by mistakes, keep the single-category tabs for focused practice. Shipped as
`#tab-mix` (now default): `getLines()` returns `ALL_LINES` unfiltered when
`currentOpening==='mix'`, reusing the existing per-line weighted-random selection with
zero new weighting logic.

### 5. Multi-move Tactics puzzles (commit `4265210`)
User: puzzles ending the instant you find the fix show no payoff — "I have no idea
why I played it." Extended puzzles to continue "until the tactic resolves" (user's own
choice over a fixed ply count) via a new `StockfishEngine.principalVariationSan()` +
`resolveFollowUp()`: a PV ending in mate is kept in full, otherwise the opponent's
immediate reply is always kept and the sequence extends through further forcing
(capture/check) moves only, capped at 8 plies. Zero changes needed to the drill-playing
code in `index.html` — it already walks any line's moves generically.

### 6. Same-day 4-agent multi-angle review (commits `19dea0c`, `dc54868`, `da224b2`)
User asked to double-check everything "from multiple angles... user experience...
end goal." Dispatched 4 parallel read-only subagents: code-verifier, UX (architect),
ROI/end-goal alignment (architect), doc consistency (general-purpose). Real findings,
all fixed same session:
- **Real UX regression**: Mix mode flips board orientation between reps with no
  warning (Ponziani=white, Hippo=black, tactics=either, drawn randomly) — real friction
  for a user who's explicitly said visualizing the board is hard. **Fixed**: new
  `#color-badge` ("You are playing White/Black") shown above the board on every drill.
- **A factual error I made and wrote into a commit message**: claimed the Mix-tab fix
  also fixed a pre-existing Tactics-tab bug. False — `CATEGORIES.tactics` already
  existed; I'd read the object but stopped one line before that entry and asserted its
  absence without checking. Corrected the code comment, this file, and logged the
  lesson in `context/insights.md`.
- **Doc staleness I'd claimed was fixed but wasn't**: `docs/training-ledger.html` still
  had the old 822/109-games baseline, mismatched mate counts, and the old blunder-square
  cluster after I'd said it was fully refreshed. Fixed thoroughly this time, verified
  with an exhaustive grep sweep.
- **A missing STATUS.md entry** for the multi-move-puzzle feature (a real, substantial
  change) — added retroactively.
- **A duplicate-header bug in `context/state.md`** from an earlier same-day edit
  (stacked "Immediate Next Action" sections instead of consolidated) — rewritten clean.
- **ROI review's verdict** (not acted on unilaterally, logged as an open decision): the
  diagnostic fix and repertoire audit were justified; the Mix tab and especially the
  multi-move Tactics feature are unverified investment into a tab whose usage is
  unmeasured, echoing a pattern the project already deleted a feature over once.
- **UX review's verdict** (also not acted on): the user's suspicion that the repertoire
  is too Stockfish-safe/sterile rather than genuinely Gotham-aggressive is confirmed
  real and untouched by anything shipped this session.

### 7. Docs reconciled in depth (this pass, `update-github`)
`CLAUDE.md` itself had drifted — still cited 822/109-games/the old square cluster, and
never mentioned the Mix tab or multi-move puzzles despite Mix being the actual default
experience. Updated "The Actual Goal," "Features," and "Tactics Puzzles" sections.

## Current State
| Metric | Value |
|---|---|
| Git | main @ `a6c2d82`, clean, pushed — verified local/remote match, not assumed |
| Live app | https://athetus.github.io/chess-trainer/ — verified live (fetched directly, confirmed Mix tab + color badge present, GitHub Pages deploy for the latest commit shown `success` via `gh run view`) |
| Tests | Full suite green — `node test/validate.js` (65 lines, 0 issues) + all non-engine and engine test files |
| Rating | 906 (peak 940 at game 126/221 of the current window) |
| Repertoire content | Verified sound — all 33 originally-pending Supabase reports check out; no line edits made this session |
| Docs | STATUS.md, ROADMAP.md, METRICS.md, `docs/TRAINING_PLAN.md`, `docs/training-ledger.html`, `context/*.md`, `CLAUDE.md`, `docs/research/*` all current as of this session |

## Open Bugs / Issues
- **33 Supabase `error_reports` rows stuck `pending`** — content-verified sound this
  session, purely a DB-status problem (anon key RLS-blocked from UPDATE). Named across
  multiple sessions now; actually worth fixing next time rather than re-noting. Either
  a service-role key at `~/Documents/dotenv/chess-trainer.env`
  (`SUPABASE_SERVICE_KEY=...`) or a manual SQL one-liner in the Supabase editor
  (project `oomuupminexahfipgktd`): `UPDATE error_reports SET status = 'resolved' WHERE status = 'pending';`
- **Multi-move Tactics puzzles have no alternate-solution tolerance.** Matching the
  engine's exact PV move at every step (up to 8 plies now, not 1) means a legitimately-
  equal alternate move could get marked wrong. Known, not yet fixed — low severity per
  the code-verifier review, watch for a user report before building a fix.
- **No usage measurement exists for the Mix or Tactics tabs.** The ROI review's core
  finding: don't invest further engineering in either without first checking if they
  actually get used.
- **Claude still hasn't personally driven the app in a live browser** — no browser
  automation tool available this session either. Verification was: Stockfish checks
  against real reported positions, JS syntax/logic checks, a faithful port-and-simulate
  of the flexible-move-order algorithm, the full test suite, and direct fetches of the
  live deployed site (confirmed content + deploy success, not just "should be live").

## Next Steps (in order)
1. **When the user says "look at my latest games"**: run
   `node test/chesscom-diagnostic.js optimizerprime --months 2`, then
   `node test/build-tactics-puzzles.js`, update `docs/TRAINING_PLAN.md`'s tracking
   table and `METRICS.md`, report in plain terms.
2. **Ask the user directly whether Mix/Tactics are actually getting used** before
   shipping any further engineering on either — per the ROI review, don't infer it.
3. **If the user wants to pursue it**: a real content review of whether the Ponziani/
   Hippo lines are aggressive/trappy enough to win at ~1000 rated, vs. objectively
   "fine" but practically passive — confirmed as a real, unaddressed gap this session.
4. Clear the 33 Supabase `pending` rows whenever convenient (see Open Bugs).
5. Any new training content for this user: concrete drill (named Lichess theme + link)
   or a board-visible in-game trigger — never a mental habit, never notation-heavy
   prose (this user has said reading SAN is genuinely hard for them — route
   explanations through the app's own interactive board where possible).

## Decisions Made
- **Mix tab is now the default landing experience.** Not up for re-litigation without
  new evidence; the ROI review's ask is to *measure* it, not revert it.
- **Multi-move Tactics puzzles resolve "until the tactic resolves," not a fixed ply
  count** — the user's own explicit choice over a simpler fixed-length alternative.
- **North star is still 1000 ELO**, and the project's own conclusion that Lichess
  volume is the primary lever, this repo a supplement, still stands — reaffirmed by
  the ROI review, not revisited.
- **Repertoire content needs no further edits right now** — all 33 pending reports
  verified sound; the real gap is application under pressure, not the lines themselves.

## Warnings / Gotchas

### New this session
- **A "was winning, then walked into forced mate" position classifies as `missed-win`,
  not `blunder`** (`classifyPly()`'s `wasWinningBig` branch fires first) — any code
  gating on `cat` for mate-related logic must handle both categories, not just
  `'blunder'`. This exact gap caused the `mateAllowed` bug.
- **`scoreToPawns()`'s mate sentinel (`±(1000-|mate|)`) must never reach a human-facing
  number or a bucketing decision without a mate-aware gate** — second time this project
  has hit this failure class (first: the original deleted puzzle-severity design).
- **Verify a "pre-existing bug" claim by reading the relevant object in full before
  asserting it** — a truncated read led to a false claim that made it into a commit
  message and this file before a same-day review caught it.
- **A doc-refresh claimed complete should be spot-checked with an exhaustive grep
  sweep, not just the specific numbers a targeted search happened to catch** —
  `docs/training-ledger.html` was claimed fully refreshed twice before it actually was.
- **A same-day append-only editing pattern on a "current state" doc (`context/state.md`)
  can leave duplicate/stale sections** — periodically rewrite as one coherent snapshot
  instead of stacking "Recent Changes" sections.
- **Pooling multiple `playerColor` values into one weighted-random draw needs an
  explicit orientation signal** — the mechanism working exactly as designed (re-setting
  board orientation per line) is not the same as it being good UX for a user who
  struggles to visualize; adversarial UX review, not just functional correctness,
  caught this.
- **Absolute counts across measurement windows of different lengths mislead without
  per-game normalization** — "47 → 89 allowed mates" reads as worse; per-game it's
  actually a slightly better rate once the window length (108→221 games) is accounted
  for.
- **A CDN-fronted static site (GitHub Pages) can show a stale fetch in the same instant
  as a successful deploy** — a `curl` right at the deploy boundary came back empty;
  re-fetching seconds later showed the real content. Don't conclude "not live" from one
  fast check; confirm the deploy's own status (`gh run view`) too.

### Still true from prior sessions
- **`--months 2`, never `--months 1`** for the diagnostic — counts archive months.
- **Always re-fetch the chess.com archive before any trend analysis.**
- **Never extrapolate a rating rate forward** — ELO is exponential.
- **A tactics puzzle's `baseMoves` is the real ply number the mistake happened at**
  (up to 100+), not 4-5 like an opening line — `playBaseMoves()` has two paths.
- **An eval-swing classifier can flag a ply even when the played move WAS the engine's
  best** — always check `playedMove !== correctMoveSan`.
- **Never hand-build FEN strings** — generate from move lists via chess.js, or use a
  report's own stored `fen` field directly.
- Tests must `throw` in `assert()`, never `process.exit()` (found and fixed two more
  violations this session in files being directly extended).
- **Never use the Artifact tool for this user unless explicitly asked** — global rule.
- `validate.js` reads `index.html` between the `L(...)` marker and `HIPPO_LINES`'
  closing `];`, and reads `tactics-puzzles.js` if present — keep markers in sync.
