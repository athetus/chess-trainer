# Chess.com Tactics/Blunder Scanner — Design Spec

> ## ⚠️ SUPERSEDED — deleted, then rebuilt differently (2026-08-01/02)
>
> Built, then the puzzle half was deleted over a real ranking-design flaw. The user
> asked for it back three times; it was rebuilt on 2026-08-02 as a **consumer of the
> diagnostic's own cache** (no second Stockfish scan) with **fixed category quotas**
> instead of pure eval-swing ranking, and is now live as the site's third "Tactics" tab
> — see `CLAUDE.md`'s "Tactics Puzzles" section and STATUS.md for the current design.
> The *diagnosis* this spec produced also still ships unchanged as
> `test/chesscom-diagnostic.js`.
>
> **Three severe bugs this spec did not anticipate, all found only by running against
> real games — worth knowing if any of this is ever revisited:**
> 1. Stockfish reports `score mate 0` for *any* position with zero legal moves, which is
>    ambiguous between checkmate and stalemate. Every checkmate the user *delivered* was
>    therefore classified as a "missed win." Fixed by disambiguating with chess.js's
>    `in_checkmate()` on the game's true final move.
> 2. The mate-severity sentinel (`1000 - mateDistance`) leaked into human-facing text as
>    nonsense like "drops 988.3 pawns."
> 3. (found during the 2026-08-02 rebuild) An eval-swing classifier flags a ply from its
>    before/after eval delta alone, with no check that the played move differs from the
>    engine's own top choice. ~2% of flagged plies (10/483 on the real archive) had
>    `correctMoveSan` identical to the move actually played — a fixed-depth search
>    artifact in already-decided endgames, not a real mistake. Showing "you played X,
>    correct was X" is nonsensical; now filtered out in `test/build-tactics-puzzles.js`
>    before puzzle selection runs.
>
> All three are fixed (1-2 in the surviving `tactics-classifier.js`, 3 in
> `build-tactics-puzzles.js`). The lesson generalises: an eval number alone cannot
> distinguish game-over states or confirm a move was actually wrong, and internal
> ranking sentinels must never reach display text.

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
  full PGN per game (see the other spec's feasibility section). `test/chesscom-
  coach.js` does not exist yet — the coach feature was deprioritized behind this
  one and is still design-only (per its own spec). So this script is where the
  shared fetch module (`test/lib/chesscom-fetch.js`) gets authored net-new; the
  coach script will reuse it whenever it's eventually built, not the other way
  around.
- `stockfish` is installed and working locally (`/opt/homebrew/bin/stockfish`,
  Stockfish 18) — the same engine already used as the gold-standard tactical
  auditor for repertoire lines per `CLAUDE.md`'s Tactical Audit Process. Verified
  directly (`which stockfish` + version string), not assumed from memory.
  **Measured timing** (real, not assumed): a single depth-15 eval via a fresh
  UCI process is ~0.6-1.0s depending on position complexity, plus ~0.2-0.28s
  process-spawn overhead if a new process is spawned per evaluation. At roughly
  100 games/month x ~25 user plies x 2 evals (before/after), a naive per-eval
  process spawn would cost on the order of 50-90+ minutes of engine time, not
  "a few minutes." Two mitigations, both applied: (a) run this as a genuine
  long-running background job — probe first with a single game end-to-end to
  confirm the pipeline works, then run the full month with output to a log file
  and check on it periodically, per the project's own long-running-process
  convention, rather than expecting it to finish inline in a session turn; (b)
  reuse ONE persistent Stockfish UCI process per game (issue `position moves
  ...` + `go depth 15` repeatedly against the same process instead of spawning a
  new one per ply) to cut spawn overhead roughly 25-30x, down to ~100 spawns
  (one per game) instead of ~5,000 (one per eval).
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
- The opening-tab switcher needs THREE separate edits, not one, to add a third
  value — verified by reading each directly, since the obvious-looking single
  ternary undersells it: (1) a new tab button with `id="tab-tactics"` alongside
  the existing two (`index.html:110-111`); (2) `switchOpening()`
  (`index.html:601-606`) hardcodes exactly two `$('#tab-ponziani')`/
  `$('#tab-hippo')` `.toggleClass('active',...)` calls by literal ID — needs a
  third `$('#tab-tactics').toggleClass('active',op==='tactics')` line, or
  neither existing tab would ever un-highlight and the new one would never
  highlight; (3) `CATEGORIES` (`index.html:390-405`) is a plain object keyed
  only `ponziani`/`hippo`, and `showLineSelector()` (`index.html:982`) does
  `CATEGORIES[currentOpening]||[]` then only renders line rows by iterating
  that array — with no `CATEGORIES.tactics` entry the browse panel would show a
  correct-looking header count over an empty, unclickable list. All three must
  be added; the display-text ternary at `index.html:983` is a fourth, separate,
  genuinely cosmetic-only edit. `CATEGORIES.tactics` uses two category keys
  matching the two `cat` values puzzles are tagged with (see step 4): `blunder`
  and `missed-win`.
- Spaced-repetition weight (`getLineStats` at `index.html:452`,
  `updateLineStats` at `index.html:453-464`, `selectWeightedLine` at
  `index.html:465-471`) is keyed purely by line `id` string — puzzles work with
  the existing weight system with zero changes there.

## Architecture

New script: `test/chesscom-tactics.js`. Authors `test/lib/chesscom-fetch.js` as
a small, standalone fetch/parse-into-chess.js-games module — factored out
cleanly from the start so `test/chesscom-coach.js` (built later, per the
prioritization above) can import it too rather than duplicating the same
chess.com archives/games pull.

Run manually from a Claude Code session:
```
node test/chesscom-tactics.js optimizerprime --months 1
```
`--months` defaults to `1` if omitted (matching the coach script's convention).

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
    mate or a 3+ pawn winning tactic available, AND the position *after* the
    user's actual move no longer does — i.e. the eval after the user's move is
    more than 1.5 pawns worse than the best continuation would have kept (same
    threshold as the blunder trigger, just measured against the pre-move
    winning margin instead of the pre-move eval), or a forced mate that existed
    is no longer forced. A player who had a forced mate and played a different
    move that still wins comfortably (eval barely moves) is NOT a missed win —
    only a move that actually let the advantage slip qualifies.
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
  or missed-win margin, first), **capped at 2 puzzles per single game** before
  applying the overall cap below — otherwise one game with several bad moments,
  or one recurring pattern that happens to hit multiple games hardest, could
  consume most or all of the run's slots and crowd out distinct mistakes. This
  doesn't guarantee thematic diversity (that needs the motif classification
  explicitly out of scope for this iteration) but it does guarantee the puzzle
  set isn't dominated by a single game.
- **Cap: at most 15 new puzzles written per run.** Anything beyond the cap is
  named in the report (opponent, date, move number, eval swing) but not turned
  into a puzzle this run — not silently dropped. Rationale: keeps the drill pool
  from being flooded faster than the user can reasonably work through it; a
  future run can pick up what didn't make the cut if the pattern recurs.
- **De-duplication across runs**: unlike the opening-coach spec's
  recompute-and-overwrite semantics, this data **accumulates** — each puzzle
  represents a specific historical mistake worth remembering, not a live
  weighting signal that should decay with the drilling window. Track processed
  game `uuid`s in a separate `const PROCESSED_GAME_IDS` export inside
  `tactics-puzzles.js` (not mixed into the `TACTICS_PUZZLES` array itself, since
  `index.html`'s `ALL_LINES` concat expects every entry in that array to be a
  drillable line-shaped object) so re-running the script over an overlapping
  window doesn't create duplicate puzzles for the same game/ply.

### 4. Write puzzle data
- New file `tactics-puzzles.js`, defining a `TACTICS_PUZZLES` array of
  line-shaped objects (same shape the `L()` helper produces: `id, name,
  description, result, isTrap, cat, moves, explanations, baseMoves`, plus
  `playerColor` set per-puzzle instead of fixed like Ponziani/Hippo). `cat` is
  one of exactly two values: `'blunder'` or `'missed-win'`, matching the two
  new `CATEGORIES.tactics` entries (see "Why this is possible" above).
  **Deliberately kept separate from `index.html`'s hand-authored, engine-audited
  Ponziani/Hippo lines** — this file is script-written and machine-generated;
  the repertoire lines are not. Reduces risk of the automation ever touching
  the carefully-maintained repertoire content.
- `index.html` loads it via a `<script src="tactics-puzzles.js">` tag placed
  before the existing inline `<script>` block. **This is a genuinely new
  loading pattern for this app, not an existing one** — `index.html`'s only
  current `<script src>` tags are the 3 CDN library loads
  (`index.html:158-160`); `PONZIANI_LINES`/`HIPPO_LINES` are defined inline
  inside the single unsourced script block, not loaded from a separate file.
  Calling it out explicitly here so the implementer isn't misled into thinking
  precedent exists; the tag must come before the inline block so
  `TACTICS_PUZZLES` is defined by the time the `ALL_LINES` concat runs.
- Merge into `ALL_LINES` with a **dedicated mapping that adds only
  `l.opening='tactics'`** — e.g. `TACTICS_PUZZLES.map(function(l)
  {l.opening='tactics';return l})`. Do **not** mirror
  `index.html:385-386`'s literal pattern: those two lines hardcode a single
  constant `playerColor` (`'w'`/`'b'`) across their entire array, and Hippo's
  line additionally overwrites `baseMoves` unconditionally with no guard —
  applying either verbatim would clobber the per-puzzle `playerColor`/
  `baseMoves` this feature depends on (every puzzle needs its own values,
  since they vary per real game, unlike Ponziani/Hippo's fixed single color).
- New third tab, three edits (all required — see "Why this is possible" for
  why a single ternary undersells this): a
  `<button id="tab-tactics" onclick="app.switchOpening('tactics')">Tactics</button>`
  alongside the existing Ponziani/Hippo tabs (`index.html:110-111`); a third
  `$('#tab-tactics').toggleClass('active',op==='tactics')` line added inside
  `switchOpening()` (`index.html:601-606`); and a new `CATEGORIES.tactics: [{key:
  'blunder',label:'Blunders'},{key:'missed-win',label:'Missed Wins'}]` entry
  (`index.html:390-405`) so `showLineSelector()`'s `CATEGORIES[currentOpening]`
  lookup (`index.html:982`) doesn't fall back to an empty array. The
  display-text ternary at `index.html:983` is a fourth, separate, purely
  cosmetic edit.

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
  manual end-to-end check.
- **`test/validate.js` must be extended, not just re-run, to cover this.**
  Verified directly: it currently only reads `index.html` and regex-extracts
  `PONZIANI_LINES`/`HIPPO_LINES` specifically (`test/validate.js:10-24`) — it
  has no knowledge of `tactics-puzzles.js` at all, so running it unmodified
  after a tactics run would validate zero of the new puzzles while silently
  reporting success. Add a small additional extraction path (read
  `tactics-puzzles.js` directly, `require`/eval its `TACTICS_PUZZLES` export)
  alongside the existing `index.html` extraction, so the same move-legality
  check covers both sources. This is a mechanical addition to an existing
  validator, not new validation logic.

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
