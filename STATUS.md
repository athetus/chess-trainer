# Project Status

## End Goal
Stay sharp on chess openings (Ponziani as White, Hippopotamus Defense as Black) through daily spaced-repetition drilling. App lives at https://athetus.github.io/chess-trainer/

## Done
- Single-file HTML app hosted on GitHub Pages (no build step, no backend)
- **50 lines total: 32 Ponziani + 18 Hippo, all move-legal, Stockfish 18 engine-audited AND cross-checked vs chessdb.cn + the actual GothamChess/Ruddell source repertoires**
- Ponziani mains follow GothamChess's real line (7.Nxg6! 8.Qf3! with the Qxf7# threat); Hippo captures ...dxe5 against every e5 push (never the old ...d5 lock)
- Gamification (XP, levels, streaks), spaced repetition via localStorage
- Error reporting synced to Supabase (project: oomuupminexahfipgktd, ap-southeast-1)
- `move_explanations` table for personalized wrong-move feedback — plus a client-side seed map in index.html (anon key can't write the table; cloud rows merge on top)
- GitHub Actions keep-alive: 3 runs/day, reads both tables + real DB write, self-re-enables to survive GitHub's 60-day cron auto-disable
- `test/validate.js` parses index.html directly — can no longer drift out of sync

## Full Repertoire Cross-Check (2026-07-16, same session)
User asked for verification against DBs and the actual source repertoires (not engine-only). Method: chessdb.cn sweep of all 51 lines (engine-consensus DB, no auth; Lichess explorer now needs a token) + researched GothamChess's actual Ponziani video/study and The Chess Giant's actual Hippo videos + Stockfish 18 depth-24 checks of every flag. 5 more real bugs found and fixed (all tails engine-verified before + after):
- **ponz-waiting-a6**: `6.Bg5?` (-0.80) → `6.Nxe5!` (+0.97) — with ...a6 instead of ...d6, e5 simply hangs
- **ponz-leonhardt**: `7.e5?` refuted by ...Bxe5! (-1.04) → `7.d3` (+0.16, clean pawn up); "QUEEN RAID wins a rook" claim removed (needed Black's ...Be7?? blunder)
- **ponz-gotham-bg5-nontrap + ponz-d6-d5-bg5-safe**: `7.Bh4?` (-0.99, ...g5/...h5 buries the bishop) → `7.Bxf6!` (-0.35, honest "balanced" text)
- **hippo-vs-bh6**: moves contradicted the line's own lesson — ...Ne7 before ...exd5 allows dxe6! (+1.80) → ...exd5 immediately (+0.35)
Confirmed CORRECT vs sources/DB: gotham-qb3 8.Bb5 (engine-best; Gotham's own Bd3 is slightly worse), hippo-vs-austrian + h4-storm (diverge from Ruddell stylistically but chessdb ranks every move #1-4).
All three architecture decisions were approved and executed same session (see next section).

## Approved Restructure (2026-07-16, same session) — 50 lines now (32 Ponziani + 18 Hippo)
- **Main-line complex rebuilt to Gotham's actual line**: main-nxe4 + main-deep now play 7.Nxg6! hxg6 8.Qf3! (threatens Qxf7# MATE + hits e4; final audit +0.15/0.00) instead of the refutable 7.Bd3 (...Nxe5! -0.25). Retired the 3 Bd3/Qd4-premised lines whose positions can no longer occur: ponz-nxf2-trap, ponz-qh4-trap, ponz-main-positional.
- **Hippo e5-push family rebuilt to ...dxe5 capture** (Ruddell + DB + engine all agree; the ...d5 lock gave White +1.7): e5-push (0.00, queens trade), e5-deep-c5 → "Queenless Middlegame" with ...Bd7-c6 regroup (-0.03), d4-e5-push (-0.45, Black better!), c5-break → "Meet e5 with ...dxe5" (-0.32, Black better). Every tail depth-24 verified, full audit clean.
- **2 new Gotham lines added**: ponz-gotham-qe7 (5...Qe7 6.cxd4! d6 7.Bb5! "must be memorized", 6.Qe2? loses e5 to ...d3!; final audit +0.42) and ponz-bd7-queensac-trap (the famous Bb5+!! c6 dxc6 Bxf3 c7+! queen-sac; honest +0.78, two pawns up minus c7).
- 8 more muscle-memory wrong-move explanations seeded (old Bd3/Qd4/...d5 moves).

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
- **An engine walk of the scripted moves is NOT enough.** It only tests our moves against the scripted opponent replies; it misses (a) stronger opponent replies that refute the whole line and (b) divergence from the named source's actual repertoire. The 2026-07-16 DB+source cross-check found 5 bugs that three prior pure-engine audits had passed. Always cross-check vs chessdb.cn AND the real source (Gotham video/study, Ruddell videos).
- The Ponziani mostly EQUALIZES but gives easy, aggressive club-level play (the Qf3 mate threat wins games at 700-1000). The Hippo is solid and, in the rebuilt e5-push lines, even slightly BETTER for Black after ...dxe5 — it works when Black plays ACTIVELY, not passively.
- Stockfish 18 (`brew install stockfish`) via UCI is the tactical oracle — see CLAUDE.md Tactical Audit Process. Ponziani = White (even indices); Hippo = Black (odd indices), judge finals from Black's side. NEVER hand-build FENs — generate from move lists via chess.js (hand-built FENs produced phantom-piece garbage twice this session).

## Next Steps
- Continue drilling and report any suspect positions via the Report button
- Re-drill the many changed answers: bc5-trap (dxc6/Be3), beginner-qf6 (Be2), deviation-sicilian (dxc5), waiting-a6 (Nxe5), leonhardt (d3), bg5 lines (Bxf6), mains (Nxg6/Qf3), all hippo e5-push lines (dxe5). App now rejects old habits and explains why.
- Optional: get a free Lichess API token (lichess.org/account/oauth/token) to add human masters/club-games stats to future audits (chessdb covered this session; the Lichess explorer now requires auth).
- Optional: deeper Hippo rebuild toward the active Kh7+f5 model on the remaining passive lines (spassky-deep +0.13 and vs-austrian are the templates).

## Blockers / Decisions
- **35 error_reports rows stuck `pending`** (22 old + 13 from Jul 16, all processed) — anon key is RLS-blocked from UPDATE. User said they'll run it next time. One-liner in Supabase SQL editor (project oomuupminexahfipgktd): `UPDATE error_reports SET status = 'resolved' WHERE status = 'pending';` To automate future sessions, drop a service-role key at `~/Documents/dotenv/chess-trainer.env` as `SUPABASE_SERVICE_KEY=...`
- Keep-alive hardened Jul 16 (3x/day + real write + self-re-enable). If Supabase still sends a pause warning, next escalation is a service key, an Edge Function heartbeat, or moving error sync off Supabase.
- Decision (Jul 16): retired ponz-nxf2-trap, ponz-qh4-trap, ponz-main-positional — all premised on 7.Bd3, which ...Nxe5! refutes. Their positions can't occur once the mains play Nxg6. This is intentional, not a regression.
