# Pending error_reports audit -- 2026-09-09

Batch audit of the 33 `status='pending'` rows in Supabase `error_reports` (excluding
`keepalive` pings), following CLAUDE.md's Tactical Audit Process. Method: for every row,
parse the CURRENT `index.html` line definitions the same way `test/validate.js` does,
check whether the report's disputed move/position still exists unchanged in the current
script, and where it does, verify with Stockfish 18 (depth 20-22, UCI, using the report's
own `fen` or a chess.js-generated FEN from the current move list -- never hand-built).

**Result: 0 new bugs found and fixed this session.** Two rows were already handled before
this audit (see below). Every other row was either already resolved by an earlier commit
(stale) or checks out as sound (not a bug). `index.html` was not modified; no commit was
made.

## Methodology note (important correction made mid-audit)

An early pass compared `report.expected_move` against `currentLine.moves[move_index]`
directly. That is correct for **non-"(end)" reports** (a specific disputed move), but
wrong for **"(end)" reports** (final-position complaints) whenever the line had been
edited *earlier* in its move sequence since the report was filed -- the report's own
`fen` field then reflects a stale, no-longer-reachable position, and evaluating it tells
you nothing about the current app. Fix: for every "(end)" report, the full
`moves_played` array was checked against the current line's move prefix (exact order for
Ponziani lines; set-equality for Hippo lines, which have `flexible:true` and legitimately
reorder moves at runtime via the `tryMove()` swap logic in `index.html`, lines ~709-720).
Where the prefix diverged, a **fresh** FEN was generated from the current line's own move
list via chess.js and re-evaluated -- never reusing the stale report FEN for a
current-state judgment. This caught three cases (`ponz-beginner-qf6`,
`ponz-deviation-sicilian`, `ponz-passive-be7`) that looked like fresh "+2 claimed but
engine says -1.6" bugs on first pass and turned out to be already-fixed lines whose
current ending matches their result text closely (see below).

## Already handled before this audit (skipped per instructions)

- **id 208** -- `ponz-leonhardt` move_index 17: fixed this session (prior to this audit)
  -- result text overclaim ("up a clean pawn/winning") corrected to the honest
  engine-verified -0.10 dead-equal assessment.
- **id 209** -- `ponz-deviation-sicilian` move_index 12: checked, not a bug -- O-O is
  engine-best; user's Be2 was an unscripted-but-fine alternative move order.

## Stale-but-already-resolved (16 rows)

The line was edited in a later commit than the report, so the specific complaint no
longer applies to the shipped app. Grouped by underlying fix:

| ids | line_id | what changed | evidence |
|---|---|---|---|
| 17, 16 | ponz-leonhardt | old `...e5` push (idx12) replaced by the `d3` consolidation, documented in CLAUDE.md ("The old e5? push loses the edge outright to ...Bxe5!"). Same root cause as already-fixed id 208. | prefix mismatch at idx12: reported `e5`, current `d3` |
| 35, 34 | ponz-bc5-trap | old `Qa4` (idx10) replaced with `dxc6`, and idx12 `Qxe4`→`Be3`; matches CLAUDE.md's documented note "Qa4 lost outright to ...Nxf2! in bc5-trap" | prefix mismatch idx10 (Qa4→dxc6); direct index mismatch idx12 (Qxe4→Be3) |
| 26, 12 | ponz-aggressive-f5 | idx14 `d5`→`Nxf6+`. Stockfish on the report's own FEN confirms `d5` was a real blunder (eval swings +0.79 → **-2.87**), `Nxf6+` is engine-best. | direct index mismatch + Stockfish eval swing |
| 20, 21 | ponz-passive-be7 | idx14 `Nbd2`→`c4`. Engine confirms `c4` is engine-best (matches exactly) where `Nbd2` dropped the eval from +0.70 to -0.01. Fresh eval of the current line's actual final position: **+0.80**, matching the result text's "~+0.8" almost exactly. | direct index mismatch (id20) + fresh re-eval of current final FEN (id21) |
| 29 | ponz-beginner-qf6 | idx14 `Bd3`→`Be2`. The in-file wrong-move explanation at that index (`ponz-beginner-qf6\|14\|Bd3`) already documents why: `...Bxc3+ bxc3 Qxc3+` wins material against the old line. Fresh eval of the current (`Be2`) final position: **+2.02**, matching "White is winning (+2)" closely. | prefix mismatch idx14 + fresh re-eval |
| 27 | ponz-deviation-sicilian | idx16 (final move) `Nbd2`→`dxc5`. Fresh eval of the current final position: **+0.53**, matching "+0.5" almost exactly. | prefix mismatch idx16 + fresh re-eval |
| 18 | ponz-fraser | idx16 `Rg1`→`cxb7`. Fresh eval of the current final position: **-0.54** (Black slightly better) -- consistent with the result text's own hedge ("Roughly balanced: consolidate carefully rather than expecting a win"), not an overclaim. | prefix mismatch idx16 + fresh re-eval |
| 28, 25, 24 | ponz-qh4-trap | line retired 2026-07-16 per CLAUDE.md ("all premised on 7.Bd3, which ...Nxe5! refutes") | line_id absent from current `PONZIANI_LINES` |
| 23, 22 | ponz-main-positional | line retired 2026-07-16, same reason | line_id absent from current `PONZIANI_LINES` |

## Confirmed not-a-bug (15 rows)

Line unchanged since the report (or, for Hippo, reordered via the documented flexible
swap logic) and Stockfish confirms the app's script is sound or the drop is immaterial
(CLAUDE.md's own threshold: a ~0.5 "drop" isn't automatically a bug).

- **211** `hippo-c5-break` (end, idx22): eval -0.24, matches result text's "-0.3". Fine.
- **210** `hippo-c5-break` (idx19, expected `Nd7`): user played `Ne7` instead. Engine's
  best move at that FEN is **`Nd7`** exactly (app was right), eval difference negligible
  (-0.26 vs -0.29). Not a bug -- app correctly flagged a suboptimal user move.
- **177** `ponz-d6-trap` (end, idx17): eval +3.94, strongly supports "TRAP! wins decisive
  material."
- **39, 38, 37, 36** `ponz-countergambit-deep` (idx8/14/15/19, all unchanged since
  filing -- this line drew 4 separate reports):
  - idx8 `Bb5`: engine prefers `d3` but the eval gap is only 0.24 -- normal book move,
    not a blunder.
  - idx14 `O-O`: engine's exact top choice.
  - idx15 `e4` (Black's auto-played move): swings eval from -0.32 to +0.60 for White.
    This is Black voluntarily overextending in a line literally named "countergambit" --
    the pedagogical point is showing White's consolidation (`Nfd2`/`f5`/`Re1`) after
    Black's aggressive-but-imperfect try, consistent with CLAUDE.md's "in TRAP/gambit
    lines, the opponent's imperfect try is intentional" principle. Final eval (+0.31,
    "roughly targets... pressure") doesn't overclaim.
  - idx19 (end): eval +0.31, text is deliberately non-numeric/non-overclaiming.
- **35→** already listed as stale; **34→** stale.
- **33, 32** `ponz-gotham-qb3`: idx16 `O-O` is 0.04 off engine-best (`Bxc6+`) --
  immaterial, and castling for king safety is the pedagogically correct choice anyway.
  idx17 (end): eval +0.41, text already says "roughly balanced... not crushing" -- honest.
- **31, 14** `ponz-countergambit-f6` (duplicate reports, same line/idx14, end): eval
  -0.38 (Black actually slightly better), text says "not an advantage" for White --
  accurate, doesn't overclaim.
- **30** `ponz-aggressive-f5` (end, idx23): eval +0.90, text says "clear advantage" --
  defensible for a ~1-pawn edge with structural damage to Black's kingside.
- **19** `ponz-passive-be7` (idx12, `O-O`): 0.10 off engine-best (`c4`, which the line
  plays two moves later anyway) -- immaterial, castling is sound.
- **15** `ponz-leonhardt` (idx8, `Nxe5`): engine's exact top choice, 0.11 eval gap after.
- **13** `ponz-countergambit-bd7` (end, idx17): eval -0.32. Text: "White is up a pawn but
  Black has some activity" -- doesn't claim White is better/winning, consistent with the
  activity roughly offsetting the extra pawn.

## Bottom line

No `index.html` changes were needed. The two most alarming-looking rows on first pass
(`ponz-beginner-qf6` id29 and `ponz-deviation-sicilian` id27, both looked like fresh
"+2/+0.5 claimed but engine disagrees" bugs) turned out to be exactly the kind of
already-fixed report the "stale" bucket exists for -- their current, corrected endings
match their result text to within 0.03 of the claimed number. The repo's existing
audit trail (in-file wrong-move explanations, CLAUDE.md's documented fix notes) lined up
with every stale finding here, which is a good cross-check that this audit's stale/
not-a-bug calls are correct rather than a case of two independent methods both missing
the same thing.
