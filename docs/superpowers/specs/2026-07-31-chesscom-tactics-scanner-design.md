# Chess.com Tactics/Blunder Scanner — Design Spec

Date: 2026-07-31

## Goal

Turn the user's (chess.com username `optimizerprime`) own real-game blunders and
missed wins — across ANY opening, not just Ponziani/Hippo — into drillable puzzles
inside the existing app, using the same tap-to-move + spaced-repetition mechanics
already used for the opening repertoire.

## Why this feature exists (prioritization context)

This was originally going to be the opening-discipline coach (see the
2026-07-30 spec, `docs/superpowers/specs/2026-07-30-chesscom-coach-design.md`).
Before building that, a data check was run against the user's actual July 2026
chess.com games (100 games: 54 wins / 41 losses / 5 draws). Result: 91% of
non-win games (42/46) last past move 15, and every single checkmate happens at
move 14 or later — losses are decided deep in the middlegame/endgame, not in the
opening. This matches the general chess-coaching consensus at ~700 rating: below
~1200-1500, games are overwhelmingly decided by tactics/blunders, not opening
theory. The user chose to build both features, tactics scanner first, given this
data. The opening-discipline coach spec still stands for later.

## Why this is possible (verified 2026-07-30/31)

- Same chess.com Published-Data API used for the opening coach — no auth,
  full PGN per game (see the other spec's feasibility section; reused here via a
  shared fetch helper, not re-verified from scratch).
- `stockfish` is installed and working locally (`/opt/homebrew/bin/stockfish`,
  Stockfish 18) — the same engine already used as the gold-standard tactical
  auditor for repertoire lines per `CLAUDE.md`'s Tactical Audit Process. Verified
  directly (`which stockfish` + version string), not assumed from memory.
- The drill engine (`index.html`) replays any line by walking a SAN move array
  from the standard starting position (`game.reset()` in `startDrill()`,
  `index.html:613`), auto-playing the first `baseMoves` plies
  (`playBaseMoves()`, `index.html:632-646`) before handing control to the user
  at `playNextAutoOrWait()` (`index.html:648-669`). Turn-taking is derived purely
  from ply-index parity (`moveIndex%2===0?'w':'b'`, `index.html:651`), not from
  any FEN-loading mechanism — there is none. This means a real-game blunder
  puzzle needs **no engine changes**: take the real game's own SAN move list up
  through the blunder ply, set `baseMoves` to that ply index (so the engine
  auto-plays the real game exactly as it happened), and put the corrected move
  as the single move the user must find. The puzzle then ends
  (`finishLine()` fires once `moveIndex` reaches `moves.length`) — no synthetic
  continuation moves are needed or attempted.
- The opening-tab switcher is a plain 2-value enum (`app.switchOpening('ponziani'
  |'hippo')`, `index.html:110-111`, `currentOpening` at `index.html:494`) with one
  display-text ternary (`index.html:983`) — adding a third `'tactics'` value is a
  same-pattern extension, not a new mechanism.
- Spaced-repetition weight (`getLineStats`/`updateLineStats`/`selectWeightedLine`,
  `index.html:452-469`) is keyed purely by line `id` string — puzzles work with
  the existing weight system with zero changes there.

## Architecture

New script: `test/chesscom-tactics.js`. Shares a small fetch helper with
`test/chesscom-coach.js` (both scripts pull the same chess.com archives/games
endpoints — factor the fetch-and-parse-into-chess.js-games step into one small
shared module, e.g. `test/lib/chesscom-fetch.js`, rather than duplicating it).

Run manually from a Claude Code session:
```
node test/chesscom-tactics.js optimizerprime --months 1
```

### 1. Fetch & parse
- Same as the coach script's steps 1-2, MINUS the Ponziani-trigger / Hippo-signature
  filter — every game is in scope, any opening, any result.
- Apply the same `rules === 'chess'` variant filter as the coach spec (skip
  chess960/bughouse/etc — same reasoning: chess.js parses them without erroring
  via FEN/SetUp headers, but positions aren't standard-start, so ply-index-based
  puzzle construction from the standard start would be meaningless).

### 2. Per-move Stockfish evaluation
- For each game, replay every ply via chess.js.
- At every ply where it's the user's turn, run Stockfish (~depth 14-16, matching
  the project's existing engine-audit process — see `CLAUDE.md` Tactical Audit
  Process) on the position immediately before the user's move, and on the
  position immediately after.
- Classify:
  - **Blunder**: eval (from the user's perspective) drops 1.5+ pawns as a
    direct result of the user's move, OR the user's move allows a forced mate
    against them.
  - **Missed win**: the position *before* the user's move already had a forced
    mate or a 3+ pawn winning tactic available, and the user's actual move let
    it slip (didn't play a move that kept the winning line).
  - Anything else: no flag, move on.
- No automatic tactical-motif labeling (fork/pin/skewer/back-rank/etc.) in this
  iteration — that requires a separate, unreliable heuristic-classification pass
  and is explicitly out of scope (see below). The puzzle's own text is just the
  objective fact: "you played X (drops N.N pawns), correct was Y."

### 3. Build puzzles from flagged instances
- Per flagged instance: take the real game's actual SAN move list from move 1
  up through (but not including) the flagged move, set `baseMoves` = that ply's
  index (0-based, consistent with `index.html`'s existing convention), and
  append ONE final move — Stockfish's best move at that position — as the move
  the user must find. `playerColor` = whichever color the user had in that real
  game (varies per puzzle, unlike Ponziani=always-White / Hippo=always-Black).
- Rank all of a run's flagged instances worst-first by eval swing (largest drop,
  or missed-win margin, first).
- **Cap: at most 15 new puzzles written per run.** Anything beyond the cap is
  named in the report (opponent, date, move number, eval swing) but not turned
  into a puzzle this run — not silently dropped. Rationale: keeps the drill pool
  from being flooded faster than the user can reasonably work through it; a
  future run can pick up what didn't make the cut if the pattern recurs.
- **De-duplication across runs**: unlike the opening-coach spec's
  recompute-and-overwrite semantics, this data **accumulates** — each puzzle
  represents a specific historical mistake worth remembering, not a live
  weighting signal that should decay with the drilling window. Track processed
  game `uuid`s in `tactics-puzzles.js` itself (or a sibling ledger) so re-running
  the script over an overlapping window doesn't create duplicate puzzles for the
  same game/ply.

### 4. Write puzzle data
- New file `tactics-puzzles.js`, defining a `TACTICS_PUZZLES` array of
  line-shaped objects (same shape the `L()` helper produces: `id, name,
  description, result, isTrap, cat, moves, explanations, baseMoves`, plus
  `playerColor` set per-puzzle instead of fixed like Ponziani/Hippo).
  **Deliberately kept separate from `index.html`'s hand-authored, engine-audited
  Ponziani/Hippo lines** — this file is script-written and machine-generated;
  the repertoire lines are not. Reduces risk of the automation ever touching
  the carefully-maintained repertoire content.
- `index.html` loads it via a small `<script src="tactics-puzzles.js">` tag
  (same loading style as the main line data, just a separate file) and merges
  it into `ALL_LINES` the same way `PONZIANI_LINES`/`HIPPO_LINES` already are
  (`l.opening='tactics'` mapping, mirroring `index.html:385-386`).
- New third tab: `<button onclick="app.switchOpening('tactics')">Tactics</button>`
  alongside the existing Ponziani/Hippo tabs (`index.html:110-111`), and the
  one display-text ternary at `index.html:983` extended to a 3-way switch.

### 5. Report
Printed summary: total games scanned, total flagged instances found, how many
became puzzles (up to the cap) vs. named-but-not-built, and for each puzzle
built: opponent, date, move number, `time_class`, eval swing, move played vs.
correct move.

### Error handling
- Same missing-archive / PGN-parse-failure / network-failure handling as the
  coach spec.
- Stockfish process failure/timeout on a given position → skip that single
  position (log it), don't abort the whole game or run.

### Testing
- A fixture test feeding a small canned PGN + mocked/stubbed Stockfish evals
  through the classifier, verifying blunder/missed-win detection and puzzle
  construction (the `baseMoves` + final-move-substitution logic), mirroring
  `test/validate.js`'s style.
- First real run against `optimizerprime`'s actual last-month games as the
  manual end-to-end check, followed by `node test/validate.js` to confirm the
  newly generated puzzle lines are still move-legal.

## Explicitly out of scope for this iteration
- Automatic tactical-motif classification (naming the pattern as a fork, pin,
  skewer, back-rank mate, etc.) — needs a separate heuristic-classification
  layer beyond raw eval comparison; puzzles report the objective eval swing and
  correct move only.
- Any live in-app chess.com fetching or scheduled/cron automation — same
  Claude-Code-session-on-request delivery model as the opening-discipline coach.
- Puzzle-set long-term pruning/archiving strategy (what happens after many
  months of accumulated puzzles) — flagged as a future concern, not solved now.
- Any change to the opening-discipline coach spec's own open design gaps (line-
  attribution ambiguity, standalone flexible matcher) — unrelated to this
  feature.
