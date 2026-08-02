# Session Handoff - 2026-08-02

## The Actual Goal (repeat this to yourself before proposing work)
**Reach 1000+ chess.com rapid ELO.** Currently 822 (was 662 on 1 Jul 2026). This repo is
a means to that end. See `docs/TRAINING_PLAN.md` for the measured analysis and
`docs/training-ledger.html` for the actionable, user-facing version of the same plan —
daily Lichess tactics volume + exchange-counting drills + clock-visible in-game triggers
are the actual levers; this repo's job is a supporting supplement, not the main event.

## What We Were Doing
Continuing from the 2026-08-01/02 AFK session that rebuilt the Tactics puzzle tab (see
prior handoff content in git history at commit `fb76f72` if needed — this file has been
rewritten since). This session had two parts:

1. **Verification loop on the shipped Tactics tab.** The user reported it was too slow
   (animated through every setup move at 150ms each — fine for opening lines'
   `baseMoves` of 4-5, broken for a tactics puzzle's `baseMoves` which is the real ply
   number a mistake happened at, up to 105 in this set). Fixed, verified via a
   standalone chess.js simulation (no browser available), deployed, user confirmed
   "looks ok now."
2. **A training reference page, built and then substantially corrected.** User asked
   for an HTML page capturing the training plan and exact Lichess instructions. Built
   it as a Claude Artifact first — user immediately corrected: never use the Artifact
   tool unless explicitly asked, always default to a local file, and made this a
   **global rule** now in `~/.claude/CLAUDE.md`. Rebuilt as `docs/training-ledger.html`,
   a real standalone file in the repo. Then a second, more substantive round of
   feedback: most of the page wasn't actually actionable. See below.

## What Was Completed This Session

### 1. Tactics tab playback-speed fix (see prior commits `8d86747`, `82d0a5f`, `fb76f72`, `0ff1f1f`)
Already shipped and confirmed working before this session's later work began. No new
changes here this session beyond re-verifying it's still live.

### 2. `docs/training-ledger.html` — built, corrected twice, shipped
**Round 1 (structural):** Published as a Claude Artifact. User: *"never create an
artifact unless i explicitly ask for 1, i want a local html page. add this to your
overall claude code settings for me. this is a rule for all projects."* Actions taken:
- Added a new `## Artifacts` section to `~/.claude/CLAUDE.md` (global, all projects):
  never use the Artifact tool unless explicitly asked; default to a local file;
  standalone HTML files need real `<!DOCTYPE html><html><head>...</head><body>` structure
  since there's no publishing wrapper to add it.
- Converted the page to `docs/training-ledger.html` with proper document structure.
- Logged the correction in `tasks/lessons.md` too.

**Round 2 (content — the more important one):** User rejected most of the page's actual
content as impractical:
> *"i am not going to do this [Monthly section]... have it in your memory for what all
> you need to do on your end."*
> *"this is not practically actionable. i wont remember which move i'm on in the middle
> of a game. give it to me in actionable terms. this is true for everything on this
> page."*
> *"how do i make this a trainable thing? Lichess puzzles for a particular theme? Then
> add it there."*

Fixes:
- **Monthly section removed entirely.** Diagnostic re-scan + puzzle refresh + tracking
  table is now triggered by the user saying "look at my latest games" (or similar) and
  run fully on Claude's side. Saved as memory `chess-monthly-review-trigger`.
- **Supabase housekeeping item removed** — wrong page for it (still tracked in
  STATUS.md/Blockers, just not user-facing training content).
- **Clock-management habit reframed** from move-number-based ("watch the clock at move
  30") to clock-visible-trigger-based ("clock shows under 4:00 → slow down on your next
  move"). Moved out of the checkbox daily list into a new non-checkbox "In-game standing
  rules" section, since it's continuous behavior during play, not a discrete task to
  tick off.
- **Exchange-counting habit reframed** from a bare mental-discipline instruction into an
  actual drill: the `hangingPiece` + `capturingDefender` Lichess puzzle themes, linked
  inline in the checklist item itself.
- **Lichess URLs verified, not guessed** — fetched `lichess.org/training/themes`
  directly to confirm exact slugs (`hangingPiece`, `capturingDefender`, `middlegame`,
  `mateIn1`/`mateIn2`, `training/dashboard/30/dashboard`) before using them.
- Saved a second memory, `chess-advice-must-be-actionable-not-mental-discipline`, so
  future training content in this project starts from this bar rather than repeating
  the mistake.
- **Self-caught bug (not user-reported):** the checklist row's click-to-toggle handler
  excluded the checkbox `INPUT` from re-toggling but not the newly-added inline `<a>`
  Lichess links, so clicking a link silently also marked the habit done. Fixed with an
  early return on `tagName === "A"`.

### 3. Full re-verification pass (user asked "double check everything")
Beyond re-running tests and re-checking the live site, read through all six memory
files in the project's memory system and found two stale ones:
- `chess-north-star-elo-1000` still said "~700" in its description — current rating is
  822. Fixed.
- `chess-custom-puzzles-approved-rebuild` pointed at a `SESSION_HANDOFF.md` "START HERE
  NEXT SESSION" section that no longer exists (this file has been rewritten twice
  since). Updated to point at CLAUDE.md's "Tactics Puzzles" section and mark the
  feature as shipped instead of pending.

### 4. Docs reconciled (this pass, `update-github`)
`CLAUDE.md`, `STATUS.md`, `docs/TRAINING_PLAN.md`, `tasks/lessons.md` all updated to
reflect the ledger's existence, the actionability/no-checklist rules, and the
monthly-diagnostic-is-my-job workflow change. See commit `3bc2953` for the full list.

## Current State
| Metric | Value |
|---|---|
| Git | main @ `3bc2953`, clean, pushed |
| Live app | https://athetus.github.io/chess-trainer/ — unchanged this session (playback fix already live from prior session) |
| New file | `docs/training-ledger.html` — local, standalone, not deployed to GitHub Pages (it's a reference doc, not part of the app) |
| Tests | Full suite green — `node test/validate.js` (65 lines, 0 issues) + all 6 non-engine test files |
| Rating | 822 (unchanged — no new games scanned this session) |
| Memory | 6 files in the project's memory system, all current as of this session; MEMORY.md index up to date |
| Supabase pending reports | 35 STILL PENDING (pre-existing, untouched) |

## Open Bugs / Issues
- **35 Supabase `error_reports` rows stuck `pending`** — anon key RLS-blocked from
  UPDATE. One-liner in Supabase SQL editor (project `oomuupminexahfipgktd`):
  `UPDATE error_reports SET status = 'resolved' WHERE status = 'pending';`
- **Claude still hasn't personally driven either the Tactics tab or the training ledger
  in a live browser** — no browser automation tool available. Both have been opened via
  macOS `open` (real rendering, real JS execution) and the Tactics tab has real user
  confirmation ("looks ok now"); the training ledger has been iterated on via detailed
  user feedback (implying real use) but no explicit "looks right" confirmation yet on
  the latest revision.

## Next Steps (in order)
**Still mostly not code.**
1. **When the user says "look at my latest games"** (or similar): run
   `node test/chesscom-diagnostic.js optimizerprime --months 2`, then
   `node test/build-tactics-puzzles.js`, fill `docs/TRAINING_PLAN.md`'s tracking table,
   compare leading indicators to the prior entry, and report back in plain terms — see
   memory `chess-monthly-review-trigger` for the full checklist. Do NOT hand the user a
   checklist to run themselves.
2. Keep using the Tactics tab and the training ledger; report anything that looks or
   feels wrong.
3. Any new training content for this user must pass the actionability bar: a concrete
   drill (named Lichess theme + link) or an in-game trigger tied to something already
   visible during play — never a mental habit to remember mid-game. See memory
   `chess-advice-must-be-actionable-not-mental-discipline`.
4. Never use the Artifact tool for this user (or any project) unless they explicitly
   ask for one — global rule in `~/.claude/CLAUDE.md`.
5. Clear the 35 Supabase reports whenever convenient.

## Decisions Made
- **Tactics tab: shipped, bug-fixed, user-confirmed working.** Not up for
  re-litigation.
- **Training ledger: shipped as a local file, content corrected twice from direct user
  feedback.** The corrected shape (drills + in-game triggers, no monthly checklist, no
  Supabase item) is the standard going forward, not a one-off.
- **Artifacts: never use unless explicitly asked, for any project.** Global rule, not
  project-specific.
- **Monthly diagnostic re-measurement is Claude's job, triggered by a user phrase, not
  a task the user tracks themselves.**
- **North star is still 1000 ELO, not "a better app" or "a better page."**

## Warnings / Gotchas

### New this session
- **A local standalone HTML file needs its own `<!DOCTYPE html><html><head>...</head>
  <body>...</body></html>` structure** — there's no publishing wrapper to add it like
  there is for an Artifact. Forgetting this still often "works" in a browser via
  HTML5 error-recovery parsing, but don't rely on that.
- **A container-level click-to-toggle handler must exclude every interactive child
  element, not just the one you added it for.** Adding inline `<a>` links inside a
  `<label>`/checkbox row without excluding `A` from the toggle logic caused link clicks
  to silently also flip the checkbox.
- **When rewriting user-facing training/habit content, ask "would they actually
  remember to do this at the moment it matters?"** If the answer depends on tracking
  something not naturally visible (move count), it will get rejected. Reframe around a
  signal that's already visible (the clock) or a concrete off-board mechanism (a named
  puzzle theme + link).
- **Verify external URLs/slugs before shipping them**, even well-known ones — fetched
  `lichess.org/training/themes` directly rather than trusting memory for the exact
  theme slugs.
- **Re-read the project's own memory files periodically for staleness**, not just
  project docs — found a stale rating figure and a dead cross-reference this session
  that would have misled a future session if left uncorrected.

### Still true from prior sessions
- **A tactics puzzle's `baseMoves` is NOT like an opening line's** — it's the real ply
  number a mistake happened at (up to 105), not 4-5. `playBaseMoves()` has two paths
  for this reason; don't unify them.
- **An eval-swing classifier can flag a ply as a mistake even when the played move WAS
  the engine's own best move** — always check `playedMove !== correctMoveSan` before
  presenting something as correctable. ~2% of flagged plies on the real archive.
- **GitHub Pages' CDN caches `index.html` for up to 10 minutes** — a plain `curl` right
  after a push can show stale content. Use `gh run watch <run-id>` then cache-bust
  (`?cb=$(date +%s)`) before concluding anything about what's actually live.
- **No browser automation tool is available in this environment** — verify UI changes
  via legality/logic simulations, DOM-id checks, syntax checks, and real user
  confirmation, in that order of reliability.
- **`--months 2`, never `--months 1`** for the diagnostic — counts archive months, and
  `--months 1` early in a calendar month returns a near-empty report.
- **Always re-fetch the chess.com archive before any trend analysis.**
- **Never extrapolate a rating rate forward** — ELO is exponential.
- **Stockfish reports `score mate 0` for any zero-legal-move position** — ambiguous
  between checkmate/stalemate. Fixed via chess.js `in_checkmate()`; regression-tested.
- **Never let a ranking sentinel (`1000 - mateDistance`) reach display text.**
- Installed `chess.js` (npm) is snake_case; the CDN build in `index.html` differs.
- **Never hand-build FEN strings** — generate from move lists via chess.js.
- Tests must `throw` in `assert()`, never `process.exit()`.
- `validate.js` reads `index.html` between the `L(...)` marker and `HIPPO_LINES`'
  closing `];`, and reads `tactics-puzzles.js` if present — keep markers in sync.
