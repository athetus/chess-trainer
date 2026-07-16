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

## Full Repertoire Cross-Check (2026-07-16, same session)
User asked for verification against DBs and the actual source repertoires (not engine-only). Method: chessdb.cn sweep of all 51 lines (engine-consensus DB, no auth; Lichess explorer now needs a token) + researched GothamChess's actual Ponziani video/study and The Chess Giant's actual Hippo videos + Stockfish 18 depth-24 checks of every flag. 5 more real bugs found and fixed (all tails engine-verified before + after):
- **ponz-waiting-a6**: `6.Bg5?` (-0.80) → `6.Nxe5!` (+0.97) — with ...a6 instead of ...d6, e5 simply hangs
- **ponz-leonhardt**: `7.e5?` refuted by ...Bxe5! (-1.04) → `7.d3` (+0.16, clean pawn up); "QUEEN RAID wins a rook" claim removed (needed Black's ...Be7?? blunder)
- **ponz-gotham-bg5-nontrap + ponz-d6-d5-bg5-safe**: `7.Bh4?` (-0.99, ...g5/...h5 buries the bishop) → `7.Bxf6!` (-0.35, honest "balanced" text)
- **hippo-vs-bh6**: moves contradicted the line's own lesson — ...Ne7 before ...exd5 allows dxe6! (+1.80) → ...exd5 immediately (+0.35)
Confirmed CORRECT vs sources/DB: gotham-qb3 8.Bb5 (engine-best; Gotham's own Bd3 is slightly worse), hippo-vs-austrian + h4-storm (diverge from Ruddell stylistically but chessdb ranks every move #1-4).
Open architecture decisions (user to decide): (1) main-line complex 7.Bd3 → 7.Nxg6! hxg6 8.Qf3 rebuild (engine + DB + Gotham all agree; affects main-nxe4/main-deep and would orphan the Bd3-premised nxf2/qh4 traps); (2) hippo e5-push family ...d5 lock → ...dxe5 capture (engine +1.73 vs +0.08; Ruddell + DB agree; affects 3-4 lines); (3) missing Gotham lines: 5...Qe7 6.cxd4! d6 7.Bb5! (+0.48 verified) and the 4...Bd7 ...Bg4 9.Bb5+!! queen-sac trap (+0.85 verified).

## Session Fixes (report batch #2 + Supabase keep-alive hardening, 2026-07-16)
Processed 13 new user reports (ids 27-39) via the Stockfish 18 audit process. 3 real bugs found and fixed (each verified before + after editing):
- **ponz-bc5-trap**: `6.Qa4` was itself a blunder (-3.03; refuted by `...Nxf2!` forking queen and rook) → rebuilt as `6.dxc6! bxc6 7.Be3` (+1.85, all engine-best). 5...Bc5 is NOT "piece lost" objectively — 6...Bxf2+ is the Fraser with comp; the text now says so.
- **ponz-beginner-qf6**: `8.Bd3??` (-3.67 drop; `...Bxc3+ bxc3 Qxc3+` hits d3 and wins the a1-rook) → `8.Be2` (+2.15)
- **ponz-deviation-sicilian**: final `9.Nbd2` let Black equalize (0.06) → `9.dxc5` keeps a real pull (+0.55) + honest text
User's rejected moves engine-checked — the app was RIGHT each time (d4 -1.41 / c4 -1.14 / Be3 +0.79 vs the app's moves); added local wrong-move explanations in index.html (anon key can't write move_explanations, so they're seeded client-side and cloud rows merge on top).
Supabase keep-alive hardened: every-3-days read wasn't "sufficient activity" for Supabase's new scan (warning email Jul 15 despite green runs) → now daily + reads both tables + does a real DB write (keepalive row into error_reports, status resolved).

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

## Hippo Engine Audit (2026-07-06, same session)
Ran the Stockfish audit across all 18 Hippo lines. Found a systemic problem worse than the Ponziani: many lines ended on a Black blunder (usually ...O-O walking into d5+Bxh6/Bc4), and result text wildly overclaimed ("monster knight", "safely handled") while Black was -2 or -3. Fixed 9 lines (verified before+after); all now reach the honest Hippo range (+0.3 to +1.2 White = solid but slightly cramped, the true assessment):
- 6 ending-swaps (replace blunder ...O-O / premature ...f5 with the engine move): e4-main (...e5), d4-main (...g5), c4-english (...g5), bc4 (...Nf6), c4-quiet (...Ne5), nf3-reti (...Kh7)
- 2 tail rebuilds: h4-storm (+3.06 -> +0.47, go Pirc ...Nf6/...h5 not slow Hippo); bh6 (fake -1.78 -> honest +0.32, break ...exd5 before castling)
- f5-attack: ...Nd4 (loses) -> ...Ng4; honest text
- 3 text-only honest reframes: d4-e5-push, c5-break, b5-expand
Residuals (left for a future deeper rebuild): f5-attack keeps a mid-line ...O-O in its break demo; bh6 depends on White's move order. Both end honestly.
The 2 model lines that were already correct: hippo-spassky-deep (+0.13), hippo-vs-austrian (+0.20) — active ...Kh7+...f5 play, the template for the rest.

## Key Learning
- The Ponziani mostly EQUALIZES and the Hippo is slightly WORSE for Black (~+0.8 White) but solid. Result text must match the engine, not hype. The Hippo works when Black plays ACTIVELY (Kh7+f5 breaks), not passively (castle-and-wait).
- Stockfish 18 (`brew install stockfish`) via UCI is the reliable tactical oracle — see CLAUDE.md Tactical Audit Process. Ponziani = White (even indices); Hippo = Black (odd indices), judge finals from Black's side.

## Next Steps
- Continue drilling and report any suspect positions via the Report button
- Re-drill the 3 rebuilt lines: bc5-trap (now dxc6/Be3), beginner-qf6 (now Be2), deviation-sicilian (now dxc5)

## Blockers / Decisions
- **35 error_reports rows stuck `pending`** (22 old + 13 from Jul 16, all processed) — anon key is RLS-blocked from UPDATE. User must run once in Supabase SQL editor: `UPDATE error_reports SET status = 'resolved' WHERE status = 'pending';` To automate future sessions, drop a service-role key at `~/Documents/dotenv/chess-trainer.env` as `SUPABASE_SERVICE_KEY=...`
- Keep-alive now daily + real write (Jul 16). If Supabase still sends a pause warning, next escalation is a service key or moving error sync off Supabase
