# Chess Opening Trainer

## Project Overview
Interactive chess opening trainer web app for drilling the **Ponziani Opening** (as White) and **Hippopotamus Defense** (as Black). Built for a ~700 rated chess.com player focused on repetition-based memorization.

**Live:** https://athetus.github.io/chess-trainer/

## Tech Stack
- Single `index.html` file — no build step, no backend
- **chess.js** 0.10.3 (CDN) — move validation and game logic
- **chessboard.js** 1.0.0 (CDN) — board rendering
- Piece images from `chessboardjs.com` (unpkg was 404ing)
- Web Audio API for move sounds
- SVG overlay for board arrows
- localStorage for spaced repetition, XP, streaks

## Architecture
Everything is inline in `index.html`:
- CSS at top (~80 lines)
- HTML structure (~40 lines)
- Opening data as JS objects using `L()` helper function
- Sound engine (Web Audio API oscillators)
- Arrow system (SVG overlay)
- Gamification (XP, levels, streaks, mastery)
- Spaced repetition (weighted random selection)
- Drill engine (move validation, auto-play, flexible ordering)
- UI controller

## Opening Lines
- **30 Ponziani lines** — main lines, GothamChess tricks, traps, countergambit, beginner punishments
- **18 Hippo lines** — vs 1.e4/d4/c4/Nf3, handling threats, middlegame plans
- All lines validated with chess.js (test/validate.js)
- Deep tactical audit performed (test/deep-audit*.js) — no missed captures/forks/pins

## Key Principles Enforced
### Ponziani (GothamChess style)
- "If Black doesn't play ...d5, we play d4"
- After d4, push d5 whenever possible to kick the Nc6
- After d5 Ne7, play Bg5 to poison the e4 pawn (Qa4+ fork trap)
- Always look for material-winning captures before quiet moves

### Hippo
- Flexible move order — setup moves can be played in any order
- Always start with ...g6, then ...Bg7
- Against Austrian Attack (f4): transpose to Pirc with ...Nf6, NOT pure Hippo
- Break timing: ...e5 after d5, ...d5 after e5, ...f5 for kingside attack

## Testing
```bash
# Validate all move sequences are legal
node test/validate.js

# Deep audit for missed tactics (captures, checks, forks)
node test/deep-audit.js
```

## Deployment
Hosted on GitHub Pages. Push to `main` triggers automatic deploy.
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
- Categories: main, counter, trap, other, beginner (Ponziani) / vs-e4, vs-d4, vs-cf, threats, plans (Hippo)
