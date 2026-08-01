# Chess.com Coach — Design Spec

> ## ⚠️ NEVER BUILT — SHELVED 2026-08-01
>
> This opening-discipline coach was designed, audited, then deprioritized and never
> implemented. It still has two unresolved blocking design gaps (see "Known open issues"
> at the end of this doc).
>
> **Do not build it without re-checking the premise.** The evidence collected since
> says opening discipline is not where the rating is leaking: the Hippo appears in
> **55/55** Black games and the Ponziani in **19/19** White games where opponents allowed
> it, with the Jaenisch line scoring 89%. Coverage is already excellent.
>
> The real gap this spec was reaching for turned out to be different and simpler: the
> user's **first mistake lands at median move 10**, right where the book ends. That is a
> middlegame-*planning* gap, not an opening-*discipline* gap, and the cheap fix is plan
> notes on the 50 existing lines — not this pipeline. See `docs/TRAINING_PLAN.md` item 5.

Date: 2026-07-30

## Goal

Close the loop between the drilled repertoire (Ponziani/Hippo, `index.html`) and how
the user (chess.com username `optimizerprime`) actually plays in real games. Detect
where real games deviate from the repertoire — including failing to play the taught
middlegame breaks in Hippo "plans" lines — and boost spaced-repetition weight for the
lines/moves that show up as real weaknesses.

Explicitly out of scope for this iteration (deferred to a possible later phase):
- All-game tactics/blunder review (any opening, any mistake type) — needs a Stockfish
  pass over the user's actual middlegame/endgame moves, not just move-matching against
  scripted lines.
- Judging whether an attack that was launched was *tactically sound* — same reason.
- Auto-generating brand-new repertoire lines from uncovered opponent tries.
- A live in-app "Coach" dashboard fetching chess.com data client-side.
- Any scheduled/automated run (cron). This is a Claude-Code-session tool, run on request.

## Why this is possible (verified 2026-07-30)

- `api.chess.com/pub/player/{username}/games/{YYYY}/{MM}` requires no auth, returns
  full PGN + rated/time_class per game, plus a top-level `eco` field (a chess.com
  openings-page URL slug, e.g. `.../Ponziani-Opening-...` — not a short code like
  `B06`; short codes only exist inside the PGN's own `[ECO "..."]` tag). Verified
  with a live pull against `hikaru` (100+ games, valid PGN) and against
  `optimizerprime` directly. Classification never depends on this field either way —
  it's move-based (see step 2/3) — so the slug-vs-code distinction doesn't affect
  the design, only background framing.
- `optimizerprime`'s July 2026 games contain real Ponziani-tagged White games
  (`Ponziani-Opening-Jaenisch-Counterattack-...`) and Hippo-shaped Black games
  (chess.com buckets these under `Modern-Defense-with-1-e4...` ECO tags since Hippo
  has no ECO code of its own).
- The app's spaced-repetition weight lives entirely in browser `localStorage`, per
  device: `getLineStats(id)` (`index.html:452`) reads the stored value,
  `updateLineStats(id, ...)` (`index.html:453-464`) computes and persists it, and
  `selectWeightedLine(lines)` (`index.html:465-469`, specifically the
  `weights=lines.map(function(l){return getLineStats(l.id).weight})` on line 466)
  consumes it in a weighted random draw. A Node script run in a Claude Code session
  cannot write into that localStorage directly — there is no server in this
  architecture. There is no existing precedent in `index.html` for loading a local
  static JSON asset (its only two `fetch()` calls, lines 867/899, go to the remote
  Supabase API; the app's other static data — the repertoire lines themselves — is
  hardcoded inline JS, not fetched). Given that, and that `selectWeightedLine` is
  called synchronously during `init()` before any fetch could resolve (so a fetched
  JSON would race and likely lose on the very first line selection), the bridge
  commits to **inline-const**: the coach script writes/updates a small
  `<script>`-embedded `COACH_BOOSTS` object directly in `index.html` (or a
  synchronously-loaded sibling `<script src="coach-weights.js">` defining the global
  before the main bundle runs), not a runtime `fetch()`. See "Weight bridge" below.

## Architecture

New script: `test/chesscom-coach.js` (same location/style convention as
`test/validate.js` and the Stockfish audit scripts referenced in `CLAUDE.md`).

Run manually from a Claude Code session, e.g.:
```
node test/chesscom-coach.js optimizerprime --months 1
```

### 1. Fetch
- `GET /pub/player/optimizerprime/games/archives` → list of month URLs.
- Take the last N months (`--months`, default 1) from that list.
- `GET` each month's games JSON. Single sequential fetches — chess.com's public API
  has no documented auth or strict rate limit for this volume, but stay polite (no
  parallel hammering, small delay between requests).

### 2. Parse & classify per game
For each game in the pulled month(s):
- Determine the user's color (`white.username` / `black.username` vs `optimizerprime`,
  case-insensitive).
- Load the PGN into chess.js and replay move by move.
- **White games**: check if the game reaches `1.e4 e5 2.Nf3 Nc6 3.c3` (the Ponziani
  trigger). If the opponent never allows this (e.g. plays Petrov, Caro-Kann, French),
  skip the game entirely — not a Ponziani game, not a gap.
- **Black games**: check for the Hippo setup signature (`...g6`, `...Bg7`, conditional
  `...a6` / `...h6`). The app's own `tryMove()` flexible-reorder logic
  (`index.html:684-696`) is tightly coupled to live drill-UI state (`currentLine`,
  `moveIndex`) and is not portable to a standalone script — do not attempt to port it.
  Instead, reuse `test/validate.js`'s existing pattern (regex-extracting the
  `PONZIANI_LINES`/`HIPPO_LINES` block from `index.html` and `new Function`-evaluating
  it) to pull the same line data into the coach script without drift, then implement
  the setup-signature check as a fresh, standalone matcher against that extracted
  data. The full flexible/conditional-move matching algorithm for step 3 below is a
  known open design gap — see "Known open issues" at the end of this doc.

### 3. Match against repertoire lines
- Among all Ponziani (or Hippo) lines in `index.html`, find the one(s) sharing the
  longest common move prefix with this game. **Known gap**: some lines share an
  identical prefix and diverge only on a later *user* move (e.g. `ponz-main-exd4` vs
  `ponz-gotham-qb3`, identical through 10 plies, then `cxd4` vs `Qb3`) — see "Known
  open issues" for the unresolved tie-break rule this requires.
- Walk forward ply by ply, comparing the user's actual move to the line's scripted
  move at that index, **through the full scripted line depth** — not capped at
  `baseMoves` — so that break moves in "plans" category lines (`...e5` after `d5`,
  `...d5` after `e5`, `...f5` for the kingside attack) are included, not just the
  setup phase.
- Classify each of the user's moves at a scripted index as:
  - `MATCH` — played the drilled move.
  - `DEVIATION` — a scripted answer exists at this position and the user played
    something else (includes playing passively instead of a taught break).
  - Once the opponent's move takes the game outside every line's scripted path,
    stop walking that game and mark the remainder `UNCOVERED` (a repertoire gap, not
    a user mistake — don't count these toward weighting).

### 4. Report
Printed summary, grouped by line id:
- Real-game match count / deviation count / games seen.
- Concrete deviation examples: move number, FEN (generated via chess.js from the
  move list — never hand-built, per `tasks/lessons.md`), expected move, move played,
  and the game's `time_class` (e.g. "move 8, expected Qf3, played Qe2 (rapid, 600s)")
  so a human can sanity-check signal vs. noise — moot for this user today (July data
  is ~100% `rapid`, no bullet/blitz to filter) but free to include and cheap insurance
  if that ever changes.
- Uncovered-opponent-try examples, reported separately, informational only (no
  weighting action — that's the deferred "auto-propose new lines" feature).

### 5. Weight bridge
- For line ids with a recurring deviation (**≥2 occurrences in the pulled window,
  uniformly** — the earlier "or one unambiguous deviation" single-occurrence trigger
  is dropped: "unambiguous" had no operational definition and would have effectively
  let a single fluky/mis-clicked game boost a line, undercutting the whole point of
  requiring recurrence), write/update a small committed JSON file,
  `coach-weights.json`, at the repo root:
  ```json
  {
    "ponz-main-nxe4": { "boost": 1.5, "reason": "deviated at move 8 (Qf3) in 2 real games", "lastRun": "<ISO date, passed in, not computed by the script>" },
    "hippo-vs-e4-e5-push":  { "boost": 1.5, "reason": "played passively instead of ...dxe5 in 2 real games", "lastRun": "..." }
  }
  ```
- **Overwrite semantics**: each run fully recomputes `coach-weights.json` from that
  run's pulled window (e.g. last N months) and overwrites the file — it does not
  accumulate counts across separate invocations. This is a deliberate simplicity
  tradeoff: a deviation older than the current window silently drops out of the
  boost list on the next run, rather than persisting forever or requiring a
  processed-game-id ledger to dedupe overlapping windows across runs. Re-running the
  script with the same window is idempotent by construction (full recompute, not
  incremental).
- **Stale/orphaned ids**: on every run, before writing, diff the line ids already in
  `coach-weights.json` against the current line ids extracted from `index.html`
  (reusing `test/validate.js`'s extraction pattern). Drop and print a warning for any
  entry whose id no longer exists (e.g. a retired line — this repertoire has already
  retired/renamed lines once, 2026-07-16) rather than leaving permanent dead weight
  in a committed file. No automatic carryover to a renamed successor line is
  attempted — the printed warning lets the user notice and manually re-flag if
  needed.
- Wiring: `index.html`'s existing weight-selection code (`index.html:466`,
  `weights=lines.map(...)`) multiplies in `COACH_BOOSTS[l.id]?.boost || 1`, where
  `COACH_BOOSTS` is the inline-const object described above (see "Why this is
  possible"), not a runtime fetch.
- The boost is **multiplicative**, combining with rather than replacing the existing
  local attempts/perfect-based weight (`weight * boost`) — e.g. a heavily-mastered
  line sitting at its local weight floor of `0.2` (`index.html:458`) only rises to
  `0.3` under a `1.5x` boost, while an under-practiced line at weight `1.4` rises to
  `2.1`. Both a locally-struggling line and a coach-flagged line increase draw
  probability; they don't fight each other, but the effect on an already-mastered
  line is intentionally small.

### Error handling
- Missing/empty month archive → skip, report "no games this period," not a crash.
- PGN fails to parse in chess.js → log the game URL and skip it, don't abort the run.
- Game's `rules` field is not `"chess"` (chess960/bughouse/kingofthehill/etc.) →
  skip before matching. chess.js's `load_pgn` will parse a Chess960 game via its
  `FEN`/`SetUp` header without erroring, but a shuffled start position makes
  ply-index comparison against a standard-start repertoire line meaningless — this
  is a silent-wrong-data risk distinct from an outright parse failure, so it needs
  its own filter, not just the parse-failure handler above.
- No ECO tag on a game → fall back to pure move-based detection (the Ponziani
  trigger / Hippo signature check don't depend on ECO, ECO is not required).
- Network failure on a single month fetch → report and continue with any months that
  did succeed, don't abort the whole run.

### Testing
- A fixture test (small canned PGNs, one per classification: MATCH-only, a real
  DEVIATION, an UNCOVERED opponent try, a non-Ponziani/non-Hippo game to confirm it's
  correctly skipped) verifying the matcher's classification logic, mirroring
  `test/validate.js`'s existing style.
- First real run against `optimizerprime`'s actual last-month games serves as the
  manual end-to-end check.

## Known open issues (unresolved before implementation)

This spec was audited by 4 independent agents plus an adversarial verification pass
(2026-07-30/31). Two findings are genuine design gaps, not wording issues, and are
deliberately left unresolved here rather than rushed — this feature is currently
deprioritized behind the tactics/blunder scanner (see project decision below), so
solving them now would be spending real design effort on the lower-priority item.
Resolve both before implementation actually starts:

1. **Ambiguous line attribution on shared prefixes.** When two or more repertoire
   lines share an identical move prefix and prescribe *different* moves at the same
   index for the *user's own* color (not a divergence triggered by the opponent's
   reply — e.g. `ponz-main-exd4` vs `ponz-gotham-qb3`, identical through 10 plies,
   then `cxd4` vs `Qb3`), step 3's "find the longest common prefix" needs a ply-by-ply
   narrowing candidate set (a trie), not a one-time pick, plus an explicit tie-break
   rule — e.g. only classify as `DEVIATION` if *all* currently-tied candidates agree
   on the expected move; otherwise treat as `UNCOVERED`/ambiguous (no weight boost),
   never attribute to an arbitrary first-in-array line id.
2. **Standalone flexible/conditional-move matcher.** The app's own flexible-order
   logic (`tryMove()`, `index.html:684-696`) is coupled to live drill-UI state and
   cannot be ported as-is. Step 3's real-game matcher needs its own from-scratch
   algorithm that tolerates legitimate move reordering (e.g. `...a6` before `...b6`)
   and legitimate omission of a conditional move (`...a6`/`...h6` skipped per the
   CONDITIONAL rules in `CLAUDE.md`) without misaligning every subsequent ply into
   false-positive `DEVIATION`s.

## Explicitly deferred / not built now
- Full-game Stockfish blunder/tactics scan (all openings).
- Judging soundness of launched attacks (needs engine eval of live middlegame moves).
- Auto-drafting new repertoire lines for uncovered opponent tries.
- Live in-browser chess.com fetching / in-app Coach dashboard.
- Scheduled/cron automation.
