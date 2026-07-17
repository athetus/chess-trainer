# Session Handoff - 2026-07-16

## What We Were Doing
Started as "read handoff + a Supabase pause-warning email + user feels many lines are wrong." Turned into: (1) diagnosing/hardening the Supabase keep-alive, (2) processing 13 new error reports, and (3) a full user-requested repertoire cross-check ("look at DBs, don't judge for yourself") of all lines against external databases AND the actual GothamChess/Ruddell source repertoires — which surfaced real bugs that prior engine-only audits had passed, then a user-approved structural rewrite of the main lines.

Grand goal unchanged: stay sharp on the Ponziani (White) + Hippo (Black) via daily spaced-repetition drilling. User is ~700 chess.com, aiming for 1000 — so lines are optimized for aggressive, engine-sound, GothamChess-faithful play that wins at club level, not just objective equality.

## What Was Completed This Session (6 commits, all pushed to main)
1. **c927197** — report batch #2 (3 line fixes) + keep-alive daily+write
2. **3948554** — keep-alive to 3 runs/day (Supabase's real criterion: "a few DB requests EACH DAY")
3. **cc83ac2** — keep-alive self-re-enable (survives GitHub's 60-day cron auto-disable)
4. **9377e53** — DB+source cross-check: 5 more line fixes
5. **cc348e4** — approved restructure: Nxg6 mains + Hippo dxe5 family + 2 new Gotham lines, 3 retirements
6. **762dfa1** — STATUS.md doc-depth pass

### Supabase pause warning (the email in the first message)
NOT a failure — keep-alive runs were all green. Supabase tightened its activity scan: an anon read every 3 days no longer counts as "sufficient activity." Their documented criterion is "a few user requests to the database EACH DAY over the previous week." Hardened the workflow to: 3 runs/day (06/13/20 UTC), each doing 2 table reads + 1 real DB write (keepalive row into error_reports, status resolved — ignored by the pending-report fetch), and a self-re-enable API call so GitHub's 60-day inactivity auto-disable can't silently kill the cron. Verified end-to-end (all steps green, anon insert = HTTP 201). Project is NOT paused.

### Line fixes — 8 real bugs total this session (all Stockfish-verified before AND after)
Report batch (3): ponz-bc5-trap (6.Qa4?? -3.03, refuted by ...Nxf2! → 6.dxc6! +1.85), ponz-beginner-qf6 (8.Bd3?? -3.67 → 8.Be2 +2.19), ponz-deviation-sicilian (9.Nbd2 equal → 9.dxc5 +0.63).
Cross-check batch (5): ponz-waiting-a6 (6.Bg5? → 6.Nxe5! +1.13, e5 hangs), ponz-leonhardt (7.e5? refuted by ...Bxe5! → 7.d3, removed false "wins a rook"), ponz-gotham-bg5-nontrap + ponz-d6-d5-bg5-safe (7.Bh4? → 7.Bxf6!), hippo-vs-bh6 (moves contradicted the line's own lesson → ...exd5 immediately).
User's 10 rejected moves were engine-checked — the app was RIGHT each time (they were losing moves). Seeded 14 client-side wrong-move explanations so the app explains WHY, not just rejects.

### Approved structural rewrite (user chose all 3 via AskUserQuestion)
- **Mains → Gotham's actual line**: ponz-main-nxe4 + ponz-main-deep now 7.Nxg6! hxg6 8.Qf3! (threatens Qxf7# MATE + hits e4). Old 7.Bd3 is refuted by ...Nxe5!. Retired 3 Bd3/Qd4-premised lines (ponz-nxf2-trap, ponz-qh4-trap, ponz-main-positional) — their positions can't occur anymore.
- **Hippo e5-push family → ...dxe5 capture** (Ruddell + chessdb + engine unanimous; old ...d5 lock was +1.7 White): e5-push, e5-deep-c5, d4-e5-push, c5-break. Two now have Black objectively BETTER.
- **2 new Gotham lines**: ponz-gotham-qe7 (5...Qe7 6.cxd4! 7.Bb5! "must memorize", 6.Qe2? loses e5 to ...d3!) and ponz-bd7-queensac-trap (Bb5+!! ... c7+! queen-sac, +0.78).

## Current State
| Metric | Value |
|--------|-------|
| Total lines | 50 (32 Ponziani + 18 Hippo) |
| validate.js | 50 lines, 0 issues |
| Git | Clean, pushed to main (762dfa1) |
| Live app | Deployed + verified (new lines present, retired lines gone) |
| Keep-alive | 3x/day + write + self-re-enable, verified green |
| Supabase pending reports | 35 STILL PENDING — user will clear next session |

## The Open Item / Blocker
**35 error_reports rows still `pending`** (all processed — fixed or confirmed user-error). Anon key is RLS-blocked from UPDATE. User explicitly said "I'll do this next time." When they're ready, one line in the Supabase SQL editor (project oomuupminexahfipgktd):
```sql
UPDATE error_reports SET status = 'resolved' WHERE status = 'pending';
```
To automate: drop a service-role key at `~/Documents/dotenv/chess-trainer.env` as `SUPABASE_SERVICE_KEY=...`.

## Next Steps (in order)
1. Fetch any NEW pending reports (id > 39) at next session start; run the full audit process on them.
2. User re-drills the many changed answers (see STATUS.md Next Steps) — the app now rejects old muscle memory and explains why. Report anything that still feels off.
3. Optional: free Lichess API token (lichess.org/account/oauth/token) unlocks human masters/club-game stats for future audits — chessdb.cn covered this session but Lichess explorer now needs auth.
4. Optional: deeper Hippo rebuild toward the active Kh7+f5 model on remaining passive lines (spassky-deep, vs-austrian are templates).
5. Optional: user runs the Supabase SQL to clear the 35 reports.

## Key Files Changed
- `index.html` — 13 line rebuilds/adds + 3 retirements + 14 moveExplanations seed map + honest result texts
- `.github/workflows/supabase-keepalive.yml` — 3x/day cron, dual read + write, self-re-enable, permissions block
- `CLAUDE.md` — counts (50), Nxg6/Qf3 + dxe5 + Qe7 principles, retirements, audit process steps 5-6 (chessdb cross-check, no hand-built FENs), Austrian attribution corrected
- `STATUS.md` — 3 new session sections + refreshed Done/Key Learning/Next Steps/Blockers
- `tasks/lessons.md` — NEW: 2 lessons (cross-check vs DBs+source, never hand-build FENs)

## Decisions Made
- **DB + source cross-check is now mandatory**, not engine-only. An engine walk validates our moves against the SCRIPTED replies but misses better opponent replies (that refute the line) and source divergence. This found 5 bugs three prior engine audits missed. (chessdb.cn: `cdb.php?action=queryall&board=<FEN>&json=1`, no auth.)
- **Optimize for the user's 700→1000 goal**: keep aggressive, practical, GothamChess-faithful lines (the Qf3 mate threat wins club games) even where the objective eval is only equal.
- **Retire lines whose premise is refuted** rather than keep contradictory drilling (the 3 Bd3/Qd4 lines).
- **Never hand-build FEN strings** — generate from move lists via chess.js (two hand-built FENs produced phantom-piece garbage this session; caught and re-run).

## Warnings / Gotchas
- **Ponziani = White, even move-indices = White's moves. Hippo = Black, odd indices = Black's moves.** The audit prints White's perspective, so a +0.8 Hippo final is normal (Black slightly worse), NOT a bug — but the rebuilt e5-push Hippo lines are now genuinely ≤0 (Black equal/better).
- **`3.c3` always shows a ~0.5 "drop" vs Ruy/Italian** — that's the Ponziani premise, NOT a bug. In trap lines, Black's blunder is intentional; only White's refutation must be engine-best.
- **Lichess opening explorer (explorer.lichess.ovh) now returns 401 without a personal API token.** Use chessdb.cn for auth-free DB checks until a token is added.
- **Audit harness lives in the session scratchpad** (audit.js walks plies + flags drops; compare.js / seq.js for candidate positions; chessdb-check.js sweeps the DB; verify*.sh generate FENs via chess.js then drive the engine). Rebuild from CLAUDE.md's Tactical Audit Process if the scratchpad is gone.
- **validate.js reads index.html between the `function L(...)` marker and the `];` closing HIPPO_LINES.** If you restructure those, update the markers in validate.js.
