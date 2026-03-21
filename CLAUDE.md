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
- **29 Ponziani lines** — main lines, GothamChess tricks, traps, countergambit, beginner punishments
- **18 Hippo lines** — vs 1.e4/d4/c4/Nf3, handling threats, middlegame plans
- All lines validated with chess.js (`test/validate.js`)
- Deep tactical audit performed (`test/deep-audit*.js`) — every position checked for missed captures/forks/pins

## Key Principles Enforced
### Ponziani (GothamChess style)
- "If Black doesn't play ...d5, we play d4"
- After d4, push d5 whenever possible to kick the Nc6
- After d5 Ne7, play Bg5 to poison the e4 pawn (Qa4+ fork trap)
- If e7 is blocked (by Be7 or Qe7), d5 forces knight to b8/d8 — even worse
- Always look for material-winning captures before quiet moves (dxc6, Qxe4+, etc.)
- GothamChess Qb3 line is the primary recommendation after 4.d4 exd4 5.e5 Nd5

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
L(id, name, description, result, isTrap, category, moves, explanations)
```
- `moves`: array of SAN strings from move 1
- `explanations`: object mapping move index to explanation string
  - Ponziani: even indices (White's moves)
  - Hippo: odd indices (Black's moves)
- After adding, run `node test/validate.js` to verify legality
- Then run `node test/deep-audit.js` to check for missed tactics
- Categories: main, counter, trap, other, beginner (Ponziani) / vs-e4, vs-d4, vs-cf, threats, plans (Hippo)
- Hippo lines: add `flexible:true` (set automatically via ALL_LINES mapping)
