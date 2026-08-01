# Training Plan — → 1000 chess.com

Derived from measured data, not general chess advice. Every claim below traces to a
number in the July 2026 baseline (109-game archive). Re-measure monthly and update the
tracking table:

```
node test/chesscom-diagnostic.js optimizerprime --months 2
```

**Use `--months 2`, not `--months 1`.** The flag counts chess.com *archive months*, so
running it early in a calendar month returns only the handful of games played so far —
verified on 1 Aug, where `--months 1` yielded a single game and a meaningless report.
Two months always gives a usable sample. Add `--report-only` to re-print the last
report instantly instead of re-running the 60-90 minute engine scan.

## Read this first: still climbing, but the rate has dropped sharply

Measured over the full 109-game archive (July + 1 Aug 2026):

| | |
|---|---|
| Rating 1 Jul 2026 | 662 |
| Rating now | **822** |
| Peak | 827, at game 77 of 109 |
| Quartile averages | 683 → 695 → 769 → **807** |
| Net over the last 25 games | **+11** |
| Slope, last 20 games | +86 per 100 games |
| Slope, last 30 games | −10 per 100 games |

The shape is: a large burst over games 51-77 (+~130), then a dip to ~788, then a
recovery back to 822. **Not a plateau — but not the burst rate either.**

**Rating is exponential, and the deceleration is already visible.** During the burst
the gain was roughly **+6 rating per game**. Over the last 25 games it is about
**+0.4 per game** — a 15x slowdown. Early points came from the rating settling toward
true strength and from fixing gross leaks; 820 → 1000 is a harder regime because
opponents here stop handing over free material, so you have to stop giving it away
rather than wait to receive it.

**Realistic projection:** at the recent rate, 178 more points is on the order of
**400+ games, i.e. several months** — and it will likely decelerate further. Any plan
that assumes the July headline number repeats is wrong.

> Methodology note: an earlier version of this file claimed the climb had stalled
> outright. That was an artifact of analysing a stale archive snapshot that ended
> mid-dip. Always re-fetch before drawing trend conclusions.

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
The Hippo appears in **100%** of your Black games (55/55, ~55% win rate). The Ponziani
appears in **35%** of White games (19/54) — and in **19 of 19** where the opponent
allowed 1.e4 e5 2.Nf3 Nc6 — with the Jaenisch Counterattack line scoring **89% over 9
games**. This prep works.

The gap is not coverage, it's the exit: your **first mistake comes at median move 10**,
right where the book ends. Rather than adding new openings, know the *plan* for each
line you already drill — the pawn breaks, which pieces belong where, what you're aiming
at — so move 10 is a continuation instead of a cliff.

Only soft spot: French Defense as White, 25% over 4 games. Too small a sample to act
on — revisit if it persists across another month of data.

**6. Re-measure monthly.**
Run the diagnostic, update the table below, and check whether mistakes/game is actually
falling. If it isn't after two months, the plan is wrong and we change it — that is the
point of measuring. Judge it on the leading indicators, not on rating: at ~+0.4 rating
per game, a single month of rating movement is mostly noise.

## Tracking

| Month | Rating (end) | Mistakes/game | Clock after move 30 | Games under 2 min | Allowed mates |
|---|---|---|---|---|---|
| Jul 2026 (baseline) | 822 | 4.7 | 3.1 min | 30% | 47 |
| | | | | | |

**Targets for the next measurement:** mistakes/game under 4.0, clock after move 30
above 4 min, games ending under 2 min below 20%, allowed forced mates under 30.
Rating is the lagging indicator — these are the leading ones and should move first.

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
