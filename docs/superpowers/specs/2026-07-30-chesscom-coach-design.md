# Chess.com Coach — Design Spec

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
  full PGN + ECO + rated/time_class per game. Verified with a live pull against
  `hikaru` (100+ games, valid PGN) and against `optimizerprime` directly.
- `optimizerprime`'s July 2026 games contain real Ponziani-tagged White games
  (`Ponziani-Opening-Jaenisch-Counterattack-...`) and Hippo-shaped Black games
  (chess.com buckets these under `Modern-Defense-with-1-e4...` ECO tags since Hippo
  has no ECO code of its own).
- The app's spaced-repetition weight (`index.html:455-469`) is computed and stored
  entirely in browser `localStorage`, per device, inside `getLineStats()`. A Node
  script run in a Claude Code session cannot write into that localStorage directly —
  there is no server in this architecture. The bridge is a small static asset the
  app already trusts and re-fetches on every load (see "Weight bridge" below).

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
- **Black games**: check for the Hippo setup signature using the same flexible-order
  logic the app's drill engine already applies (`...g6`, `...Bg7`, conditional `...a6`
  / `...h6`) — reuse/port that matching logic rather than re-deriving it, to avoid the
  script and the app silently disagreeing on what counts as "Hippo."

### 3. Match against repertoire lines
- Among all Ponziani (or Hippo) lines in `index.html`, find the one(s) sharing the
  longest common move prefix with this game.
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
  move list — never hand-built, per `tasks/lessons.md`), expected move, move played.
- Uncovered-opponent-try examples, reported separately, informational only (no
  weighting action — that's the deferred "auto-propose new lines" feature).

### 5. Weight bridge
- For line ids with a recurring deviation (≥2 occurrences in the pulled window) or
  one unambiguous deviation, write/update a small committed JSON file,
  `coach-weights.json`, at the repo root:
  ```json
  {
    "ponz-main-nxe4": { "boost": 1.5, "reason": "deviated at move 8 (Qf3) in 2 real games", "lastRun": "<ISO date, passed in, not computed by the script>" },
    "hippo-e5-push":  { "boost": 1.5, "reason": "played passively instead of ...dxe5 in 1 real game", "lastRun": "..." }
  }
  ```
- Small addition to `index.html`'s existing weight-selection code
  (`index.html:466`, `weights=lines.map(...)`) to multiply in
  `COACH_BOOSTS[l.id]?.boost || 1` where `COACH_BOOSTS` is `coach-weights.json`
  inlined or fetched the same way other static data is loaded. Exact wiring
  (inline const vs fetch) decided during implementation — should match whatever
  pattern `index.html` already uses for its other static data, not introduce a new
  one.
- The boost is additive to, not a replacement for, the existing local
  attempts/perfect-based weight — a line that's already being drilled heavily
  locally and a line just flagged by the coach script both increase draw
  probability, they don't fight each other.

### Error handling
- Missing/empty month archive → skip, report "no games this period," not a crash.
- PGN fails to parse in chess.js → log the game URL and skip it, don't abort the run.
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

## Explicitly deferred / not built now
- Full-game Stockfish blunder/tactics scan (all openings).
- Judging soundness of launched attacks (needs engine eval of live middlegame moves).
- Auto-drafting new repertoire lines for uncovered opponent tries.
- Live in-browser chess.com fetching / in-app Coach dashboard.
- Scheduled/cron automation.
