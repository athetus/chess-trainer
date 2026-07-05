# Project Status

## End Goal
Stay sharp on chess openings (Ponziani as White, Hippopotamus Defense as Black) through daily spaced-repetition drilling. App lives at https://athetus.github.io/chess-trainer/

## Done
- Single-file HTML app hosted on GitHub Pages (no build step, no backend)
- **51 lines total: 33 Ponziani + 18 Hippo, all move-legal and Stockfish 18 engine-audited**
- Gamification (XP, levels, streaks), spaced repetition via localStorage
- Error reporting synced to Supabase (project: oomuupminexahfipgktd, ap-southeast-1)
- `move_explanations` table for personalized wrong-move feedback
- GitHub Actions keep-alive workflow to prevent Supabase free-tier pause
- `test/validate.js` rewritten to parse index.html directly — can no longer drift out of sync

## Session Fixes (Stockfish 18 engine audit, 2026-07-06)
Processed 22 pending Supabase reports; engine-audited all reported lines + all 5 Gotham lines.
Broken lines fixed to the engine's best (verified before + after editing):
- **ponz-qh4-trap**: `8.Ng4` threw the win (ended -1.46) → `8.g3!` refutation (+2.48). User had reported playing g3 — they were right.
- **ponz-gotham-exd4-bc5-trap**: `6.Qa4` didn't win (-0.02) → `6.exf6!` wins a clean piece (+3.13)
- **ponz-aggressive-f5**: `8.d5` blunder (-0.49) → `8.Nxf6+!` wrecks Black's kingside, regains pawn (+0.72)
- **ponz-gotham-qb3** (flagship): kept the Qb3 identity, fixed `8.exd6`→`8.Bb5` (−0.64 → +0.22) + honest text (no more "crushing attack, Black cramped")
- **ponz-passive-be7**: passive `Nbd2` frittered the edge (0.00) → `c4` keeps the space bind (+0.85)
- **ponz-fraser**: honest reframe — White grabs material but Black has full comp (~-0.4); no false "winning" claim
Text-only softens (position is equal, not "White advantage"): ponz-gotham-bg5-nontrap, ponz-countergambit-f6

## Key Learning
- The Ponziani mostly EQUALIZES rather than crushes. Result text must match the engine, not hype.
- Stockfish 18 (`brew install stockfish`) via UCI is the reliable tactical oracle — see CLAUDE.md Tactical Audit Process.

## Next Steps
- Continue drilling and report any suspect positions via the Report button

## Blockers / Decisions
- GitHub Actions keep-alive is in place; Supabase should stay active
