# Project Status

## End Goal
**Reach 1000+ chess.com rapid ELO.** Currently 822 (was 662 on 1 Jul 2026).

Everything in this repo is a means to that, not the goal itself. The opening trainer
(Ponziani as White, Hippopotamus as Black, https://athetus.github.io/chess-trainer/)
and the diagnostic command are both judged on whether they move that number. See
`docs/TRAINING_PLAN.md` for the measured plan — and note the evidence says the largest
remaining lever requires **no more code**, just tactical reps.

## Done
- Single-file HTML app hosted on GitHub Pages (no build step, no backend)
- **50 opening lines + 15 Tactics puzzles (65 total), all move-legal**: 32 Ponziani + 18
  Hippo, Stockfish 18 engine-audited AND cross-checked vs chessdb.cn + the actual
  GothamChess/Ruddell source repertoires; the 15 Tactics puzzles are the user's own real
  chess.com mistakes, generated from the diagnostic's cache (see "Diagnostic Command"
  section below) — user-tested live on 2026-08-02, one playback-speed bug found and
  fixed same day, confirmed working since
- **`docs/training-ledger.html`** — a local (not hosted-elsewhere) reference page with
  the actual daily/in-game training plan, rebuilt from user feedback into concrete
  drills and clock-visible triggers. See "Training Ledger" section below.
- Ponziani mains follow GothamChess's real line (7.Nxg6! 8.Qf3! with the Qxf7# threat); Hippo captures ...dxe5 against every e5 push (never the old ...d5 lock)
- Gamification (XP, levels, streaks), spaced repetition via localStorage
- Error reporting synced to Supabase (project: oomuupminexahfipgktd, ap-southeast-1)
- `move_explanations` table for personalized wrong-move feedback — plus a client-side seed map in index.html (anon key can't write the table; cloud rows merge on top)
- GitHub Actions keep-alive: 3 runs/day, reads both tables + real DB write, self-re-enables to survive GitHub's 60-day cron auto-disable
- `test/validate.js` parses index.html directly — can no longer drift out of sync

## Training Ledger (2026-08-02)
Built `docs/training-ledger.html` — a local, self-contained HTML reference (not an
Artifact; the user set a standing global rule against those unless explicitly
requested, now in `~/.claude/CLAUDE.md`) turning the training plan into something
actually followable day to day. Went through two real revisions from user feedback,
both instructive:

**First cut rejected — not actionable.** The user's actual words: *"i wont remember
which move i'm on in the middle of a game. give it to me in actionable terms. this is
true for everything on this page."* Specific failures:
- "Watch the clock at move 30" required tracking move count mid-game — reframed
  around the clock reading itself (already visible constantly): *clock shows under
  4:00 → slow down on the next move.*
- "Count the exchange before every capture" was a bare mental-discipline instruction
  with no trainable mechanism — the user asked directly: *"how do i make this a
  trainable thing? Lichess puzzles for a particular theme?"* Reframed as the
  `hangingPiece` + `capturingDefender` Lichess puzzle themes, linked inline in the
  daily checklist item itself.
- The Monthly section (diagnostic + tracking table + Lichess Dashboard comparison) was
  rejected outright: *"I am not going to do this... have it in your memory for what
  all you need to do on your end."* Removed from the page entirely; captured as a
  standing memory (`chess-monthly-review-trigger`) so "look at my latest games" (or
  similar) now triggers the full routine from me, not a checklist for the user.
- The Supabase housekeeping item was flagged as not belonging on a training page at
  all — removed (still tracked below in Blockers/Open).

Both corrections were also saved as memories (`chess-monthly-review-trigger`,
`chess-advice-must-be-actionable-not-mental-discipline`) so future training content in
this project starts from the corrected bar instead of repeating the mistake.

**A real interaction bug found on self-review, not by the user:** the checklist's
click-to-toggle handler only excluded the checkbox `INPUT` from re-toggling on click,
not the inline `<a>` Lichess links added during the actionability rewrite — clicking a
link silently also marked the habit done as a side effect. Fixed (`tagName === "A"` now
returns early).

**Lichess theme slugs were verified, not guessed** — fetched `lichess.org/training/themes`
directly rather than trusting memory for `hangingPiece`, `capturingDefender`,
`middlegame`, `mateIn1`/`mateIn2`, and the puzzle dashboard path
(`training/dashboard/30/dashboard`), since a wrong slug would just 404 on the user.

## Diagnostic Command + Training Plan (2026-08-01)
Built `test/chesscom-diagnostic.js` — one command that pulls the real chess.com archive,
runs Stockfish over every one of the user's moves, and reports what is actually costing
rating. `--report-only` replays instantly from a gitignored cache; `--months N` defaults
to 1. Supporting libs: `test/lib/chesscom-fetch.js`, `stockfish-engine.js`,
`tactics-classifier.js`, `diagnostic-analysis.js`.

**What the first real run found** (109 games, 476 engine-confirmed mistakes):
- 4.7 significant mistakes/game, median drop 2.5 pawns (a hanging piece)
- **Blunder moves take 2x LONGER than clean moves** (13.5s vs 6.8s) — so "slow down /
  blunder-check everything" is the wrong prescription for this player
- **Blunder rate doubles below 4 min on the clock** (13% → 20-24%); 30% of games end
  under 2 min. Moves 11-20 alone burn 3.4 of the 10 minutes.
- **38% of mistakes involve a capture** (21% bad ones played, 17% good ones declined),
  clustered on e5/d5/f6/c5/c4 — i.e. exchange counting
- **First mistake lands at median move 10**, exactly where opening prep ends
- Repertoire coverage is good: Hippo 51/51 Black games, Ponziani 17/17 whenever
  opponents allowed it (Jaenisch line scoring 89% over 9 games)
- Rating 662 → 822, but the rate collapsed from ~+6/game during a mid-month burst to
  ~+0.4/game since. ELO is exponential; do not extrapolate monthly headline numbers.

**Puzzle generation: built, dropped, then rebuilt properly (Aug 2026, AFK session).**
First attempt ranked by eval-swing severity, so all 15 slots filled with rare
forced-mate positions while 195 instances of the most common error never surfaced —
deleted (see git history for the original `chesscom-tactics.js`/`puzzle-selection.js`).
Rebuilt the same day, user-approved after re-examination: their errors are
**concentrated, not diffuse** (38% involve captures, clustered on e5/d5/f6/c5/c4), so a
narrow targeted set is worthwhile *alongside* Lichess volume, not instead of it.

The rebuild fixed the actual design flaw rather than repeating it:
- **Consumes the diagnostic's own cache instead of re-scanning** — the diagnostic
  already walks every user move with Stockfish; puzzle generation is now a cheap, pure
  function over that cache (`test/build-tactics-puzzles.js`). The cache gained
  `plyIndex`/raw evals/`correctMoveSan` (engine best move, fetched only for flagged
  plies — ~476 of ~3263, adding ~8 min to a scan, not 2x).
- **Fixed category quotas, not severity ranking** (`test/lib/puzzle-selection.js`):
  `mate` / `catastrophic` (≥3 pawns) / `common` (1.5-3 pawns), ~5 each, per-game cap 2,
  overflow reported not silently dropped. On the real 109-game archive: 75/161/237
  instances available per bucket respectively — the common band that got crowded out
  last time now has its own guaranteed slots.
- **Both `blunder` and `missed-win` are eligible** in every bucket, per the user's
  explicit ask to cover "mistakes, errors, blunders, missed wins" — not just severe
  material drops.
- **Bug found and fixed during real-data verification**: ~2% of flagged plies (10/483)
  had the engine's own best move identical to the move actually played (eval-swing
  classifier artifact in already-decided endgames — see `tasks/lessons.md`). One such
  case ("you played Ke4, correct was Ke4") was in the first real-data build; filtered
  out before the final 15 were generated.

Shipped: 15 real puzzles from the user's own July-Aug 2026 games, wired into index.html
as a third "Tactics" tab (`test/lib/tactics-classifier.js`'s `buildPuzzle` +
`test/lib/puzzle-store.js` write `tactics-puzzles.js`, committed — GitHub Pages serves
it as a static script like `index.html`). `node test/validate.js` — 65 lines (50 + 15
tactics), 0 issues.

**User-reported bug, fixed same day (2026-08-02):** each puzzle animated through every
setup move at 150ms/move before letting the user play. Fine for opening lines
(`baseMoves` 4-5), broken for tactics puzzles — `baseMoves` there is the real ply number
the mistake happened at in an actual game, up to 105 in this set, so some puzzles took
15+ seconds just to reach the user's turn. Fixed in `playBaseMoves()`
(`index.html`): tactics puzzles (`currentLine.opening==='tactics'`) now replay setup
synchronously with no delay and update the board once at the final position; opening
lines are unchanged. Verified with a standalone chess.js simulation (no DOM needed)
against all 15 real puzzles: each reaches the correction ply instantly with the correct
FEN, landing exactly on the user's turn. User confirmed "looks ok now" after this fix
went live.

**Still not verified end-to-end in a live browser session by Claude** — no browser
automation tool was available. Verification was static (syntax checks, chess.js
legality checks of every puzzle's full move sequence, element-id existence checks, and
the playback-logic simulation above) plus the user's own confirmation after trying it.
That combination is solid but isn't the same as Claude having driven the UI directly —
worth keeping in mind if something subtle surfaces later.

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

**The evidence says the next steps are mostly not code.** Per `docs/TRAINING_PLAN.md`,
suggested split is ~70% tactical reps (Lichess, theme-filtered toward forks/pins/
exchanges), ~20% reviewing your own losses, ~10% opening drills.

Off-keyboard, in priority order:
1. **Count the exchange before every capture.** 38% of measured mistakes involve a
   capture in one direction or the other. Narrow, specific, highest-yield habit —
   and distinct from blanket blunder-checking, which the timing data rules out.
2. **Daily tactics volume.** The chunking mechanism; nothing in this repo substitutes.
3. **Fewer games, more review.** 108 games/month without review repeats the same
   mistake 108 times. The diagnostic names the worst games for exactly this.

In this repo (all optional, none urgent):
- Re-run `node test/chesscom-diagnostic.js optimizerprime --months 1` monthly and fill
  in the tracking table in `docs/TRAINING_PLAN.md`. Judge progress on the leading
  indicators (mistakes/game, clock at move 30) — at ~+0.4 rating/game a single month
  of rating movement is mostly noise.
- **Middlegame plan notes** for the 50 existing lines (pawn breaks, piece placement,
  the target) — the one build item the research supports, because the first mistake
  lands at median move 10 where the book ends, and no generic resource covers "what is
  my plan in a Hippo structure." A day of chess thinking, not a software project.
- Continue drilling and report suspect positions via the Report button.
- Optional: free Lichess API token (lichess.org/account/oauth/token) for human
  masters/club-game stats in future repertoire audits.
- Optional: deeper Hippo rebuild toward the active Kh7+f5 model on remaining passive
  lines (spassky-deep +0.13 and vs-austrian are the templates).

**Explicitly not planned:** a custom puzzle engine, more opening lines, or GM
masterclass content. Reasoning recorded in `docs/TRAINING_PLAN.md`.

## Blockers / Decisions

### Decisions (2026-08-01)
- **Puzzle generation deleted, then RE-APPROVED and rebuilt (same day, AFK follow-up
  session).** Deleted mid-session for the reasons above; the user raised it three times
  and chose to build it properly, then in a later AFK-mode session asked for it to
  actually be built end-to-end without further check-ins ("analyze all my mistakes...
  don't stop"). They were right on a point I under-weighted: their errors are
  **concentrated** (38% captures, five squares), and a narrow weakness is exactly where a
  targeted set beats generic volume — plus nothing off the shelf turns *your own* mistakes
  into a repeatable spaced-repetition drill. **Done — see "Diagnostic Command" section
  above for what shipped.** It is a supplement to Lichess volume, not a replacement. Do
  not re-litigate the decision.
- **The north star is 1000 ELO, not "a better app."** The measured conclusion is that
  the largest remaining lever needs no code — tactical reps, exchange counting, and game
  review. Future sessions should be willing to say "this feature doesn't serve the goal."
- **No GM masterclass / video-course content.** Wrong altitude for a player whose errors
  are hanging pieces on move 22.
- **No new opening lines.** Coverage is already 55/55 (Hippo) and 19/19 (Ponziani when
  allowed). Add middlegame *plans* to existing lines instead if anything.

### Open
- **35 error_reports rows stuck `pending`** (22 old + 13 from Jul 16, all processed) — anon key is RLS-blocked from UPDATE. User said they'll run it next time. One-liner in Supabase SQL editor (project oomuupminexahfipgktd): `UPDATE error_reports SET status = 'resolved' WHERE status = 'pending';` To automate future sessions, drop a service-role key at `~/Documents/dotenv/chess-trainer.env` as `SUPABASE_SERVICE_KEY=...`
- **One game failed the diagnostic scan** on a 30s Stockfish timeout (of 108, Jul 16).
  Fault isolation handled it — the game is skipped and not marked processed, so it
  retries next run. Did not recur on the Aug 1 re-scan (109/109 games, 0 failures), so
  still just a watch item, not something worth fixing preemptively. If failures grow,
  raise the timeout in `test/lib/stockfish-engine.js`.
- **Resolved 2026-08-02:** the Tactics tab's first real-world use surfaced a bug static
  checks couldn't catch — puzzles animated through every setup move at 150ms each
  before letting the user play, taking 15+ seconds on puzzles with a deep `baseMoves`
  (up to 105 plies, vs. 4-5 for opening lines). Fixed in `playBaseMoves()`: tactics
  puzzles now jump straight to the position. User confirmed "looks ok now." Claude still
  has not driven the UI directly (no browser automation tool available this session) —
  verification was static checks + a standalone playback-logic simulation + the user's
  own confirmation. Worth remembering that combination isn't identical to Claude having
  used it directly, if anything subtle surfaces later.
- Keep-alive hardened Jul 16 (3x/day + real write + self-re-enable). If Supabase still sends a pause warning, next escalation is a service key, an Edge Function heartbeat, or moving error sync off Supabase.
- Decision (Jul 16): retired ponz-nxf2-trap, ponz-qh4-trap, ponz-main-positional — all premised on 7.Bd3, which ...Nxe5! refutes. Their positions can't occur once the mains play Nxg6. This is intentional, not a regression.
