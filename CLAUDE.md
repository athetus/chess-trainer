# Chess Opening Trainer

## Project Overview
Interactive chess opening trainer web app for drilling the **Ponziani Opening** (as White) and **Hippopotamus Defense** (as Black). Built for a ~700 rated chess.com player focused on repetition-based memorization.

**Live:** https://athetus.github.io/chess-trainer/

## Tech Stack
- Single `index.html` file — no build step, no backend
- **chess.js** 0.10.3 (CDN) — move validation and game logic
- **chessboard.js** 1.0.0 (CDN) — board rendering
- Piece images from `chessboardjs.com` (unpkg was 404ing)
- Web Audio API for move sounds (oscillator-based, no audio files)
- SVG overlay for board arrows (opponent last move, correct move hints)
- localStorage for spaced repetition, XP, streaks, error reports

## Architecture
Everything is inline in `index.html`:
- CSS at top
- HTML structure
- Opening data as JS objects using `L()` helper function
- Sound engine (Web Audio API oscillators — move, capture, correct, wrong, complete)
- Arrow system (SVG polygon overlay — orange for opponent moves, green for corrections)
- Gamification (XP, 10 levels Pawn→World Champion, daily streak, line mastery stars)
- Spaced repetition (weighted random selection — errors increase weight, perfects decrease)
- Drill engine (move validation, auto-play, flexible ordering for Hippo)
- UI controller (tap-to-move, undo, error reporting)

## Features
- **Tap-to-move** — tap piece to select (yellow highlight + grey dots), tap destination. No drag.
- **OK / Report after completion** — after last move, user sees OK (next line) or Report & Next (log error + advance). No auto-advance — user always gets a chance to evaluate the final position.
- **Undo** — step back to retry your last move
- **Report Error** — log suspect positions to localStorage AND cloud (jsonblob). View in-app via "Errors" button. Share via native share sheet.
- **Cloud error sync** — errors auto-sync to cloud endpoint so Claude Code can fetch and process them at the start of each session. Zero friction for the user.
- **Flexible move order** — Hippo lines accept setup moves in any order
- **Speed tracking** — avg seconds per move shown in stats and result screen
- **Chess.com green board** — #EEEED2 / #769656 square colors with yellow highlights

## Opening Lines
- **33 Ponziani lines** — main lines, GothamChess Qb3 attack, traps, countergambit, beginner punishments, 3 deviation lines (Petrov, Alekhine, Sicilian Alapin)
- **18 Hippo lines** — vs 1.e4/d4/c4/Nf3, handling threats, middlegame plans
- All lines validated with chess.js (`test/validate.js`) — **51 lines total, 0 issues**
- `test/validate.js` now parses line definitions DIRECTLY from index.html (cannot drift out of sync)
- Stockfish 18 engine audit is the gold standard for tactical correctness (`brew install stockfish`) — objective evals beat LLM chess judgment; harness pattern in session scratchpad drives it via UCI
- Opus subagent tactical audit also available — two independent audits cross-confirmed bugs
- Deep audit scripts (`test/deep-audit*.js`) produce false positives; Stockfish/Opus audits are more reliable

## Key Principles Enforced
### Ponziani (GothamChess style)
- "If Black doesn't play ...d5, we play d4"
- After d4, push d5 whenever possible to kick the Nc6
- After d5 Ne7, play Bg5 to poison the e4 pawn (Qa4+ fork trap)
- If e7 is blocked (by Be7 or Qe7), d5 forces knight to b8/d8 — even worse
- Always look for material-winning captures before quiet moves (dxc6, Qxe4+, etc.)
- GothamChess Qb3 line is the primary recommendation after 4.d4 exd4 5.e5 Nd5 -- drill ends at O-O (Greek Gift Bxh7+ was removed: unsound because Bxh3 wins White's queen)
- After O-O in the main Nxe4 line, play Re1 immediately -- the Ne5 hangs to Nxe5 without it

### Hippo (The Chess Giant / Solomon Ruddell style)
- Flexible move order — setup moves can be played in any order
- Always start with ...g6, then ...Bg7 (auto-played, baseMoves=4)
- **...a6 is CONDITIONAL** — only play when Nc3 can reach b5. Skip if no knight threat.
- **...h6 is CONDITIONAL** — only play when Ng5 or Bg5 is a real threat. Skip if not needed.
- **Castling is FLEXIBLE** — delay or skip in closed positions. 5 lines show delayed/no castling.
- **Be OPPORTUNISTIC** — if White overextends, exploit it instead of blindly completing the setup
- Against Austrian Attack (f4): transpose to Pirc with ...Nf6, NOT pure Hippo
- Break timing: ...e5 after d5, ...d5 after e5, ...f5 for kingside attack
- Don't put knight on f5 if exf5 captures it

## Error Reporting
Users report suspect moves via the "Report" button. Reports are stored in localStorage AND synced to a cloud endpoint automatically.

**Cloud endpoint (Supabase):**
- Project: `oomuupminexahfipgktd` (chess-trainer, ap-southeast-1)
- Table: `error_reports` (line_id, line_name, move_index, fen, expected_move, user_played, moves_played, status)
- Table: `move_explanations` (line_id, move_index, wrong_move, explanation) — personalized wrong-move feedback
- Anon key used in frontend (safe, designed for client-side use with RLS)

**Workflow:**
1. User taps Report on phone → saved locally + sent to Supabase
2. Claude Code session starts → fetches pending errors from Supabase
3. Claude processes errors, pushes fixes, marks as resolved

Each report contains:
- `lineId`, `lineName` — which line
- `moveIndex` — which move in the sequence
- `fen` — board position at time of report
- `expectedMove` — what the app wanted
- `movesPlayed` — moves up to that point
- `timestamp`

## Testing
```bash
# Validate all move sequences are legal
node test/validate.js

# Deep audit for missed tactics (captures, checks, forks)
node test/deep-audit.js

# Hippo-specific audit for hanging material
node test/deep-audit-hippo.js
```

## Deployment
Hosted on GitHub Pages (public repo). Push to `main` triggers automatic deploy.
```bash
git push origin main
# Live at https://athetus.github.io/chess-trainer/ within ~1 minute
```

## Adding New Lines
Use the `L()` helper function:
```js
L(id, name, description, result, isTrap, category, moves, explanations, baseMoves)
```
- `moves`: array of SAN strings from move 1
- `explanations`: object mapping move index to explanation string
  - Ponziani: even indices (White's moves)
  - Hippo: odd indices (Black's moves)
- `baseMoves` (optional 9th param): override auto-play count. Ponziani default=5, Hippo default=4. Use for deviation lines where the user must respond to an unexpected Black move (e.g., baseMoves=1 so user sees 1...Nf6 and must play e5!)
- `test/validate.js` now auto-parses index.html — no need to hand-copy lines anymore. Just run it.
- Run `node test/validate.js` to verify legality (must show 0 issues)
- Categories: main, counter, trap, other, beginner (Ponziani) / vs-e4, vs-d4, vs-cf, threats, plans (Hippo)
- Hippo lines: `flexible:true` is set automatically via ALL_LINES mapping

## Tactical Audit Process
When adding or modifying lines, or after a batch of user error reports:
1. Run `node test/validate.js` — confirms move legality only (auto-parses index.html)
2. **Run a Stockfish 18 engine audit (gold standard).** `brew install stockfish`. Drive it via UCI from node: for each line, walk every ply, eval the position before each move, flag any WHITE move that drops significantly vs the engine's best, and record the final eval from White's perspective. Compare the final eval to the line's result text. (Harness pattern: scratchpad `audit.js` in the session that built this process.)
3. Interpretation rules:
   - `3.c3` always looks like a ~0.5 "drop" vs Ruy/Italian — that's the Ponziani premise, NOT a bug. Ignore it.
   - In TRAP lines, Black's blunder is intentional — only White's refutation must match engine best.
   - Fix a move only when it's a real inaccuracy/blunder (meaningful drop) with a better move that keeps the line's pedagogical intent.
   - Result text must match the engine eval — no "winning/crushing/up a piece" when the eval is equal or worse.
4. Re-run the engine on the corrected sequences BEFORE editing index.html, then `node test/validate.js` after.

**Common bugs to watch for:**
- Knight on f5 when e-pawn can capture (exf5 with no recapture available)
- Castling after queen controls the castling path
- Result descriptions claiming "up a piece" / "winning" / "excellent attack" when the engine says equal-or-worse (esp. the Ponziani, which mostly equalizes rather than crushes)
- Trap lines whose refutation isn't actually the engine's best (e.g. Qa4 vs exf6, Ng4 vs g3)
- Lines ending mid-trade (position looks wrong cosmetically)
