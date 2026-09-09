# Training Plan — → 1000 chess.com

Derived from measured data, not general chess advice. Every claim below traces to a
number in the July 2026 baseline (109-game archive).

**This is the analytical/Claude-facing document.** The actionable, user-facing version
is `docs/training-ledger.html` — a local page with concrete drills and in-game triggers
instead of the raw findings below. Update both when re-measuring.

**Re-measurement is triggered by the user, not run on a schedule they track.** When they
say something like "look at my latest games," run this and update the tracking table
myself — they explicitly rejected having a monthly checklist of their own (see
STATUS.md's "Training Ledger" section, 2026-08-02):

```
node test/chesscom-diagnostic.js optimizerprime --months 2
node test/build-tactics-puzzles.js
```

**Use `--months 2`, not `--months 1`.** The flag counts chess.com *archive months*, so
running it early in a calendar month returns only the handful of games played so far —
verified on 1 Aug, where `--months 1` yielded a single game and a meaningless report.
Two months always gives a usable sample. Add `--report-only` to re-print the last
report instantly instead of re-running the 60-90 minute engine scan.

## Read this first: peak touched 940, but you're 34 points off it right now

Measured over the full 221-game archive (Aug-Sep 2026, re-fetched 9 Sep 2026):

| | |
|---|---|
| Rating start of window (1 Aug 2026) | 822 |
| Rating now | **906** |
| Peak | **940**, at game 126 of 221 |
| Quartile averages | 788 → 834 → 905 → **882** |
| Net over the last 25 games | **+28** |
| Slope, last 20 games | +26 per 100 games |
| Slope, last 30 games | +152 per 100 games |

**Same shape as the July window, one level up: a burst, a peak, then a dip that hasn't
fully recovered.** The 4th quartile average (882) is *below* the 3rd (905) — the peak
of 940 was touched mid-window and receded, not held. The most recent game sits at 906,
partway back up from the dip but still 34 below peak. This is exactly why "rating now"
must always be the freshest single number, not the peak — a session that opened with
"I've reached 940" was 34 points stale; re-fetching is what caught it, per the standing
rule below.

**Still net positive and still the right direction.** +84 over the 2-month window,
landing you 94 points from target — the closest this project has measured. But treat
"almost there" as 94 points of harder opponents, not a formality: the whole premise of
this plan (820→1000 is harder than 662→820 because opponents stop handing over material)
still holds, and this window's own dip after the peak is direct evidence of it.

> Methodology note: an earlier version of this file claimed the climb had stalled
> outright. That was an artifact of analysing a stale archive snapshot that ended
> mid-dip. Always re-fetch before drawing trend conclusions — this window's own
> peak-then-dip shape is the same trap in miniature: report the current number, not
> the best number seen so far.

## The diagnosis

108 rapid games, 476 engine-confirmed mistakes, July 2026:

| What | Measured | What it means |
|---|---|---|
| Mistakes per game | **4.7** | ~5 times a game you drop real material |
| Median drop | **2.5 pawns** | That's a hanging minor piece, not a subtle inaccuracy |
| Time on blunder moves | **13.5s** | vs 6.8s on clean moves |
| Blunders made in ≤3s | **12%** | vs 30% of clean moves |
| Allowed forced mate | **47×** | in one month |
| Missed forced mate | **39×** | in one month |
| Errors by phase | 32% moves 1-15, **46% moves 16-30** | worst in the middlegame |
| First mistake of the game | **median move 10** (25th pct move 8) | the moment prep runs out |
| Mistakes involving a capture | **38%** | 21% bad captures made, 17% good captures missed |
| Most common blunder squares | e5, d5, f6, c5, c4 | central contested squares |
| Games ending under 2 min | **30%** (33/109) | real time pressure in a third of games |
| Games ending under 1 min | **22%** (24/109) | |
| Clock after move 40 | **1.1 min** median | long games become scrambles |

**Finding 1 — you are not rushing.** You spend *twice as long* on the moves you get
wrong. You already sense which positions are critical and you already stop to think.
So "slow down" and "blunder-check every move" — the two standard prescriptions — do
not address your actual failure.

**Finding 2 — but low clock does hurt you.** Blunder rate by time remaining:

| Clock left | Blunder rate |
|---|---|
| 4 min+ | **13.0%** |
| 2-4 min | 20.2% |
| 1-2 min | 20.5% |
| under 30s | **24.2%** |

Your error rate roughly **doubles** below 4 minutes. You rarely lose *on* time (4
timeouts) — you lose because the last third of the clock is played at half strength.

**The two connect.** Moves 1-10 cost 1.4 min; **moves 11-20 cost 3.4 min** — and 46%
of errors land in moves 16-30. You spend 13.5s on positions a stronger player resolves
in 3s, because you are calculating what they would recognise. That burns the clock,
which pushes you under 4 minutes, where your blunder rate doubles.

So the target is **tactical pattern recognition** — not as generic advice, but because
in your data it is the one fix that compounds: faster recognition → less clock spent in
moves 11-20 → more clock after move 30 → half the blunder rate in the phase where you
currently collapse.

## The plan

**1. Count the exchange before every capture — the most specific finding here.**
**38% of your mistakes involve a capture**: 21% are captures you played that lost
material, 17% are captures you should have played and didn't. The most common blunder
squares are the contested central ones (e5, d5, f6, c5, c4) — exactly where trades
happen.

This is a narrow discipline rule, and it is *not* the blanket "blunder-check every
move" that your timing data already refuted. It fires only on captures: before taking,
count every attacker and defender on that square and play the sequence out to the end.
Same when a capture is available and you're about to decline it. Roughly two in five of
your errors live in that one habit.

**2. Daily tactics volume — for the other 62%.**
15-30 min/day of Lichess puzzles (free, infinite, difficulty-rated). Reps build the
recognition that makes moves 11-20 cheap in clock instead of expensive. Consistency
beats long sessions. Nothing in this repo replaces this.

**3. Protect the clock through moves 11-20.**
This is where 3.4 of your 10 minutes go, and it is what drops you into the sub-4-minute
zone where your blunder rate doubles. The fix is not "move faster" — it is that puzzle
reps make these positions recognisable instead of calculable. Watch the metric, not the
behaviour: aim to reach move 30 with 4+ minutes rather than 3.2.

**4. Fewer games, more review.**
108 games/month is ~3.5/day. Without review that is repeating the same mistake 108
times. Cut to 1-2/day and actually look at the one you lost. The monthly diagnostic
names your worst games specifically for this.

**5. Keep drilling the openings, but extend the exit — don't add lines.**
Updated 9 Sep 2026, 221-game repertoire-adherence audit (pure move-sequence diff
against the live lines in `index.html`, no engine): Hippo appears in **96%** of Black
games (107/111, 50% win rate). Ponziani appears in **35%** of White games that reach
the actual tabiya (38/110) — opponents decline it the other 65% of the time — and in
**100%** of the games where the opponent allows 1.e4 e5 2.Nf3 Nc6 (38/38). The content
itself is correct: `validate.js` passes 0 issues, and of the 38 reached Ponziani games,
**84% of the divergence from book lines is the opponent going off-script**, not you.

**The repertoire's own content isn't the gap — applying it live is.** Two concrete,
measured patterns:
- **Hippo `...a6`: played prematurely (before White's knight can even reach b5) in
  45% of the 96 times it was played.** This is a discipline gap, not a knowledge gap —
  the line data already marks it conditional correctly; it's the habit under time
  pressure that's off. Highest-volume, most fixable single pattern in this audit.
- **Three specific Ponziani decision points, each missed 100% of the times they came
  up this window** (small samples, 2 occurrences each): the Bg5 poisoned-e4-pawn idea
  (played Ng5/Bb5+ instead), the Qb3 attack after 4.d4 exd4 5.e5 Nd5 (played cxd4/Bc4
  instead), and 4.Qa4 in the 3...d5 Countergambit (played 4.d4 instead). Worth extra
  reps on those three specifically via the app's own spaced repetition, not new content.

Your **first mistake still comes at median move 10** (from the July measurement — worth
re-checking next cycle), right where the book ends. Know the *plan* for each line you
already drill — the pawn breaks, which pieces belong where, what you're aiming at — so
move 10 is a continuation instead of a cliff.

**6. Re-measure monthly (my job, triggered by the user's phrase — not theirs to run).**
Run the diagnostic, update the table below, and check whether mistakes/game is actually
falling. If it isn't after two months, the plan is wrong and we change it — that is the
point of measuring. Judge it on the leading indicators, not on rating: at ~+0.4 rating
per game, a single month of rating movement is mostly noise.

## Tracking

| Month | Rating (end) | Mistakes/game | Clock after move 30 | Games under 2 min | Allowed mates |
|---|---|---|---|---|---|
| Jul 2026 (baseline) | 822 | 4.7 | 3.1 min | 30% | 47 |
| Aug-Sep 2026 (221 games) | 906 (peak 940) | 4.1 | 2.9 min | 31% | 89 |
| | | | | | |

**Read "Allowed mates" per-game, not as a raw count** — the Aug-Sep row covers 221
games (2 months) vs July's 108 (1 month), so 89 vs 47 is actually a slightly *better*
per-game rate (0.40 vs 0.44), not a doubling. The absolute-count target below inherited
the July 1-month basis and needs updating to a per-game or per-month-normalized target
next time this table gets a third row.

**Targets for the next measurement:** mistakes/game under 4.0 (now **4.1** — nearly
there), clock after move 30 above 4 min (now **2.9**, still the biggest gap), games
ending under 2 min below 20% (now **31%**, unmoved from baseline), allowed forced
mates under ~0.35/game (now **0.40/game** — close but not yet). Rating is the lagging
indicator — these are the leading ones and should move first.

Do **not** extrapolate July's +160 forward. It was earned in a single ~26-game burst
(games 51-77); the rate since is roughly +0.4 rating per game, a 15x slowdown. Gains
compress as you climb, so 820 → 1000 should be expected to take several months rather
than repeating July's headline number. The leading indicators above are what to watch
month to month; rating lags them and is noisy over any single month.

## What this plan deliberately does not include

- **GM masterclasses / long-form video courses.** Your bottleneck is not a missing
  strategic framework; it's not seeing a hanging knight on move 22. Advanced content
  feels productive and changes nothing at this level.
- **More opening lines.** Coverage is already good (see above). Adding lines is the
  most tempting and least useful expansion available.
- **A puzzle engine that replaces daily Lichess volume.** Lichess still covers raw
  puzzle *volume* (thousands of positions) at a scale this repo can't match — keep
  doing daily Lichess reps as the primary lever (item 2 above). A first
  auto-generated-puzzle attempt (Aug 2026) was built and dropped for exactly this
  reason, plus a design flaw: ranking by eval-swing severity let mate-sentinel scores
  dominate, so all 15 slots filled with rare forced-mate positions while 195 instances
  of your *most common* error (the 1.5-3 pawn hang) never surfaced.

  It was rebuilt the same day (see STATUS.md) as a **Tactics tab fed by fixed
  category quotas** (~5 mate-related, ~5 catastrophic ≥3 pawns, ~5 of the common
  1.5-3 pawn band) instead of pure severity ranking, and as a *consumer* of the
  diagnostic's own cache rather than a second scan. It's a narrow supplement for
  your own concentrated, repeating mistakes (captures clustered on e5/d5/f6/c5/c4),
  not a substitute for Lichess volume.
