# Repertoire Adherence Audit — optimizerprime, 2026-08-01 to 2026-09-09

Whether real games actually followed the Ponziani/Hippo lines in `index.html` (a pure
move-sequence diff, not the engine-severity question the monthly diagnostic answers).
Summary folded into `docs/TRAINING_PLAN.md`; this file is the durable, full-detail
record. Full per-game data (all 110 Ponziani + 107 Hippo entries — matched line, match
depth, divergence ply, full SAN move list): `docs/research/data/2026-09-09-ponzi-results.json`
and `docs/research/data/2026-09-09-hippo-results.json`.

Source: chess.com archives for the last 2 months (via `getRecentGames`), 221 rapid games
total (110 as White, 111 as Black), all `rules: chess`. Lines parsed directly from
`index.html` (32 Ponziani, 18 Hippo) using the same extraction pattern as
`test/validate.js`. No engine was run — pure move-sequence comparison, as instructed.

Method note: for Ponziani, "divergence ply" is computed by longest-prefix match against
every book line, then classified as **White's own deviation** (even ply index) or
**Black/opponent's deviation** (odd ply index) — most divergences are the opponent going
off-book, which is not a user error and is noted separately from genuine White mistakes.

---

## Ponziani (White) — reach and follow tally

- **110/110** White games opened 1.e4 (100% — confirms Ponziani is the entire White
  repertoire in practice).
- **38/110 (35%)** reached the actual Ponziani tabiya (1.e4 e5 2.Nf3 Nc6 3.c3) — the
  other 72 the opponent declined: 49 avoided 1...e5 entirely, 23 avoided 2...Nf3/3...Nc6.
- Of the 38 reached games, **0 followed a book line to its documented end** (expected —
  opponents aren't cooperating past White's first few moves). Divergence was:
  - **32/38 (84%)**: opponent deviated from the book Black reply — not a White error.
  - **6/38 (16%)**: White itself deviated from the documented critical move.
- Win rate: reached games 20/38 (53%); games where opponent avoided the line 37/72 (51%)
  — no meaningful difference, so book knowledge isn't yet the constraint on outcome.

### White's own deviations (the 6 real misses)

| Date | Game | Structure | Book says | Played instead |
|---|---|---|---|---|
| 2026-08-11 | [172846845046](https://www.chess.com/game/live/172846845046) | Countergambit 3...d5 | 4.Qa4 | 4.d4 |
| 2026-08-20 | [173265658216](https://www.chess.com/game/live/173265658216) | Countergambit 3...d5 | 4.Qa4 | 4.d4 |
| 2026-09-03 | [173951858034](https://www.chess.com/game/live/173951858034) | Bg5 poisoned-e4 structure | 6.Bg5 | 6.Ng5 |
| 2026-09-04 | [173998262638](https://www.chess.com/game/live/173998262638) | 5...d6?? beginner-blunder trap | 7.Bb5+ | 7.Nf3 |
| 2026-09-05 | [174043322682](https://www.chess.com/game/live/174043322682) | Bg5 poisoned-e4 structure | 6.Bg5 | 6.Bb5+ |
| 2026-09-08 | [174186492660](https://www.chess.com/game/live/174186492660) | Qb3 attack structure | 6.Qb3 | 6.Bc4 |

### Targeted checks against the CLAUDE.md-named Gotham moves

- **7.Nxg6! in the Nxe4 main line (structural test after 6...Ng6):** the exact 12-ply
  prefix `e4 e5 Nf3 Nc6 c3 Nf6 d4 Nxe4 d5 Ne7 Nxe5 Ng6` was reached **0 times**. In 3 of
  the games that entered this structure, Black played 5...Na5 instead of the book's
  5...Ne7, so the Nxg6/Bd3 decision point never actually arose. **No evidence either way**
  on whether the retired Bd3 habit has resurfaced — the position simply hasn't come up
  in this window.
- **Qb3 after 4.d4 exd4 5.e5 Nd5 (the "primary recommendation"):** reached exactly
  **2 times**, played correctly **0/2** — once cxd4 (a different documented book line, not
  wrong, but not the primary recommendation) and once Bc4 (not documented at all).
- **Bg5 poisoned-pawn vs Bh4:** `Bh4` was never played (0 occurrences) — the retired bug
  has not resurfaced. But the Bg5 *decision point itself* was reached 2 times and Bg5 was
  played **0/2** (Ng5 once, Bb5+ once) — the poisoned-pawn idea isn't being found live.
  `Bxf6` (the correct follow-up after ...h6) appeared 4 times elsewhere in the sample.

---

## Hippo (Black) — reach and follow tally

- **107/111 (96%)** Black games showed the early ...g6+...Bg7 Hippo setup (79 vs 1.e4,
  26 vs 1.d4, 2 vs 1.c4).
- Hippo has no fixed move order, so line-diffing tops out low by design (65 games matched
  only 2 plies, 26 matched 4) — that's expected, not a problem, and CLAUDE.md's own
  principles were checked directly instead:
- Win rate: 54/107 (50%).

### Conditional ...a6 (should only be played when White's Nc3 can reach b5)

- **96 total ...a6 plays**, of which **43 (45%)** happened while White's queenside knight
  was still on b1 (not even developed to c3 yet, let alone threatening b5) — a clear,
  repeated violation of the documented conditional rule. This is the single largest
  Hippo deviation pattern found.

### Conditional ...h6 (should only be played against a real Ng5/Bg5 threat)

- **99 total ...h6 plays**, only **4 (4%)** had no White knight/bishop able to reach g5 —
  this principle is being followed well.

### Bh4/other retired-bug regressions

- No occurrences of the retired Bd3-in-Nxe4-main or Bh4-retreat bugs in this window.

---

## Top recurring deviation patterns (ranked)

1. **Premature ...a6 in Hippo (45% of all ...a6 plays)** — by far the highest-volume,
   most concrete pattern. Playing ...a6 before White's knight is even on c3 wastes a
   tempo the Hippo repertoire explicitly says to save.
2. **Bg5 poisoned-pawn idea not found live (0/2)** — small sample, but both real
   occurrences were missed (Ng5, Bb5+ instead of Bg5).
3. **Qb3 attack not found live (0/2)** — same story; the documented "primary
   recommendation" hasn't actually been played when the position arose.
4. **3...d5 Countergambit: 4.d4 instead of 4.Qa4 (2/2 misses)** — small but 100% miss
   rate whenever this structure appeared.
5. The Nxe4-main-line Nxg6/Bd3 decision point (the historically bug-prone spot) simply
   hasn't recurred in live play this window — nothing to confirm or refute there yet.

Full per-game data: `ponzi_results.json` and `hippo_results.json` in this scratchpad
directory (110 and 107 entries respectively, with full SAN move lists, best-matching
line, match depth, and divergence ply for every game).
