# Diagnostic Report Snapshot — optimizerprime, 2026-09-09

Full corrected output of `node test/chesscom-diagnostic.js optimizerprime --report-only`
for the record. `METRICS.md`/`docs/TRAINING_PLAN.md` carry the always-current numbers;
this file is the dated, never-overwritten snapshot for this specific measurement cycle.

**Corrected after a real bug fix this session:** `mateAllowed` was mis-gated
(`cat === 'blunder'` only), so 6 of 917 flagged plies — each "was winning big, then
walked into a forced mate" — fell into the generic material-drop bucket carrying a fake
~1000-"pawn" drop (the internal mate-ranking sentinel from `scoreToPawns()`). That
alone inflated the reported mean severity 3.5x (10.7 vs the true 3.0 pawns below). See
`context/insights.md` and the commit that fixed `test/chesscom-diagnostic.js` for the
full story. The numbers below are the corrected ones.

Live rating as of this date (re-fetched, not from this report): **906**, peak 940 at
game 126/221 of this window — see `docs/TRAINING_PLAN.md`'s "Read this first" section.

```
======================================================================
CHESS.COM DIAGNOSTIC REPORT -- optimizerprime
2 month(s) | 2026-08-01 to 2026-09-09 | generated 2026-09-09T14:10:59.716Z
======================================================================

1. HEADLINE
   Games scanned: 221
   Total real mistakes: 917
   Mistakes per game: 4.1 (Aug 2026 baseline: 4.7)

2. TIME VS BLUNDERS  [does slowing down actually help?]
   Clean moves   (n=5482): median 7.0s, mean 12.1s (Aug 2026 baseline: 6.8s median)
   Blunder moves (n=566): median 12.5s, mean 17.7s (Aug 2026 baseline: 13.5s median)
   Blunders made in <=3s: 13.6% (Aug 2026 baseline: 12%)
   Clean moves made in <=3s: 27.9% (Aug 2026 baseline: 30%)
   >> You blunder on moves you think LONGER about, not shorter. "Slow down" is not the fix.

3. UNUSED CLOCK  [games not won]
   Median minutes left on the clock: 2.2 (Aug 2026 baseline: 2.8 min)
   Games with 4+ min left unused: 30/108 (Aug 2026 baseline: 19/46)

4. WHEN MISTAKES HAPPEN
   Opening   (moves 1-15) : 302 (32.9%) (Aug 2026 baseline: 32.1%)
   Middlegame(moves 16-30): 392 (42.7%) (Aug 2026 baseline: 45.8%)
   Late-mg   (moves 31-45): 175 (19.1%) (Aug 2026 baseline: 15.1%)
   Endgame   (moves 46+)  : 48 (5.2%) (Aug 2026 baseline: 6.9%)

5. SEVERITY
   Allowed a forced mate against you: 89 (Aug 2026 baseline: 47)
   Missed a forced mate: 54 (Aug 2026 baseline: 39)
   Material drop 1.5-3 pawns: 436 (Aug 2026 baseline: 227)
   Material drop 3-6 pawns: 209 (Aug 2026 baseline: 132)
   Material drop 6+ pawns: 50 (Aug 2026 baseline: 31)
   Median drop: 2.3 pawns, mean: 3.0 pawns (Aug 2026 baseline: median 2.5, mean 3.2)

6. REPERTOIRE COVERAGE  [is the daily drilling actually showing up?]
   Ponziani reached: 38/110 White games (Aug 2026 baseline: 17/49)
   ...of games where the opponent allowed it (1.e4 e5 2.Nf3 Nc6): 38/38 (Aug 2026 baseline: 17/17)
   Hippo (early ...g6) played: 107/111 Black games (Aug 2026 baseline: 51/51)

7. WORST GAMES  [go review these]
   14 mistake(s) vs mahdiko069 on 2026-08-17 -- https://www.chess.com/game/live/173112665300
   13 mistake(s) vs Cavino_bw on 2026-08-14 -- https://www.chess.com/game/live/172981213532
   13 mistake(s) vs mahadisafarzad on 2026-09-07 -- https://www.chess.com/game/live/174129743318
   11 mistake(s) vs KsS43 on 2026-08-14 -- https://www.chess.com/game/live/172972980160
   11 mistake(s) vs cCRYPT1Cc on 2026-08-30 -- https://www.chess.com/game/live/173757251266

======================================================================
```

Note on "Allowed a forced mate" (47 → 89): this window is 221 games (2 months) vs the
July baseline's 108 (1 month) — read per-game (0.40 vs 0.44), not as a raw count. See
`METRICS.md`.
