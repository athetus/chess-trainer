# Metrics

How we measure whether this project is working. Judged against the end goal in `ROADMAP.md` — 1000+ chess.com rapid ELO. Full detail and methodology: `docs/TRAINING_PLAN.md`.

| Metric | Baseline (Jul 2026, 108 games) | Target | Current (9 Sep 2026, 221 games) | Last Updated |
|---|---|---|---|---|
| Rating | 822 (started 662 on 1 Jul) | 1000+ | **906** (peak 940, receded 34) | 2026-09-09 |
| Mistakes/game (Stockfish-confirmed) | 4.7 | < 4.0 | 4.1 | 2026-09-09 |
| Clock remaining after move 30 | 3.1 min | > 4 min | 2.9 min | 2026-09-09 |
| Games ending under 2 min on the clock | 30% | < 20% | 31% | 2026-09-09 |
| Allowed forced mates | 47 (1 month) | ~0.35/game | 89 / 221 games = 0.40/game | 2026-09-09 |
| Ponziani reached when opponent allows it | 17/17 (100%) | maintain 100% | 38/38 (100%) | 2026-09-09 |
| Hippo setup played | 51/51 (100%) | maintain ~100% | 107/111 (96%) | 2026-09-09 |
| Hippo `...a6` played on-rule (not premature) | not measured | 100% | 53/96 (55%) | 2026-09-09 |
| First mistake of the game (median move) | move 10 | later than 10 | not re-measured this cycle | 2026-07 |

**Note on the "Allowed forced mates" target:** the July baseline row is 1 month of games (108); the Sep row is a 2-month window (221 games). Read it per-game (0.40 vs 0.44), not as a raw count — comparing raw counts across windows of different length is misleading. The absolute-count target inherited from the July 1-month basis should be replaced with a per-game target the next time this table gets a third data column.

**Note on rating:** always re-fetch the live chess.com archive before updating this row — a stale snapshot or a peak value reported as "current" has produced a wrong trend conclusion twice in this project's history (see `docs/TRAINING_PLAN.md`'s methodology notes). Report the most recent game's rating, not the window's peak.
