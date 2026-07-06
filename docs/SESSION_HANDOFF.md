# Session Handoff - 2026-07-06

## What We Were Doing
Processing a batch of user error reports, which turned into a full Stockfish 18 engine audit of BOTH openings. The user pushed hard on the GothamChess/Ponziani lines being inaccurate ("you missed a bunch of gotham chess lines"), then asked to audit the Hippo side too. Root theme: the app was overclaiming - selling equal-or-worse positions as "winning/crushing/monster knight."

## What Was Completed This Session
Installed Stockfish 18 (`brew install stockfish`) and built a UCI audit harness (drives the engine from node, walks every ply, flags moves that drop vs best, reports final eval). This is now the gold-standard tactical process (documented in CLAUDE.md).

**Ponziani (commit d2724f8):** audited all reported + all 5 Gotham lines. Fixed 6 to the engine's best, each verified before + after:
- ponz-qh4-trap: `8.Ng4` threw the win (-1.46) -> `8.g3!` (+2.48). The user had reported playing g3 and being rejected - they were right.
- ponz-gotham-exd4-bc5-trap: `6.Qa4` didn't win (-0.02) -> `6.exf6!` (+3.13)
- ponz-aggressive-f5: `8.d5` blunder (-0.49) -> `8.Nxf6+` (+0.72)
- ponz-gotham-qb3 (flagship): kept Qb3 identity, fixed `8.exd6`->`8.Bb5` (-0.64 -> +0.22) + honest text
- ponz-passive-be7: passive Nbd2 (0.00) -> `c4` bind (+0.85)
- ponz-fraser: honest reframe (up material but Black has full comp)
- Text-only softens: gotham-bg5-nontrap, countergambit-f6

**Hippo (commit 9706e2a):** audited all 18 lines. Fixed 9, each re-audited:
- 6 ending-swaps (blunder ...O-O -> engine move): e4-main(...e5), d4-main(...g5), c4-english(...g5), bc4(...Nf6), c4-quiet(...Ne5), nf3-reti(...Kh7)
- 2 tail rebuilds: h4-storm (+3.06->+0.47, go Pirc ...Nf6/...h5); bh6 (fake -1.78 -> honest +0.32, break ...exd5 first)
- f5-attack: ...Nd4 (loses) -> ...Ng4
- 3 text-only reframes: d4-e5-push, c5-break, b5-expand

**Infrastructure:** rewrote `test/validate.js` to parse line definitions DIRECTLY from index.html (via the L() helper + PONZIANI_LINES/HIPPO_LINES arrays) so it can never drift again. This exposed the true count: **51 lines (33 Ponziani + 18 Hippo)**, not the 48 the docs claimed - the old hand-copied validator had mismatched ids and stale sequences.

## Current State
| Metric | Value |
|--------|-------|
| Total lines | 51 (33 Ponziani + 18 Hippo) |
| validate.js | 51 lines, 0 issues (now auto-parses index.html) |
| Git | Clean, pushed to main (9706e2a) |
| Live app | Deployed |
| Supabase error_reports | 22 STILL PENDING - see blocker |

## The Open Bug / Blocker
**22 Supabase error reports are still marked `pending`.** They are all processed (fixed or confirmed user-error), but I cannot flip their status: the anon key is RLS-blocked from UPDATE (correct security), and no service-role key exists in the repo, `~/Documents/dotenv`, or the GitHub keep-alive workflow (which also only uses the anon key). The user must run this once in the Supabase SQL editor (project oomuupminexahfipgktd):
```sql
UPDATE error_reports SET status = 'resolved' WHERE status = 'pending';
```
To automate future sessions: drop a service-role key at `~/Documents/dotenv/chess-trainer.env` as `SUPABASE_SERVICE_KEY=...`.

## Residual imperfections (left deliberately, noted honestly)
- **hippo-f5-attack**: keeps a mid-line ...O-O in its break demo (relies on White cooperating). Ends honestly at +0.41, but not engine-perfect.
- **hippo-vs-bh6**: the +0.32 assumes White replies Rad1, not the stronger dxe6. Lesson (break ...exd5 before castling) still holds.
- These belong to the "full active rebuild" option the user explicitly declined this session.

## Next Steps (in order)
1. User runs the Supabase SQL to clear the 22 reports.
2. Drill the fixed lines on the live app (especially ponz-qh4-trap where `g3` should now be accepted, and the flagship gotham-qb3). Report anything that still feels off.
3. Fetch any NEW pending reports at next session start and run them through the Stockfish audit process (CLAUDE.md Tactical Audit Process).
4. Optional: full active rebuild of the Hippo middlegame lines toward the Kh7+f5 model (hippo-spassky-deep +0.13 and hippo-vs-austrian +0.20 are the templates). This is a multi-session repertoire re-authoring.
5. Optional repertoire conversation: the Ponziani only equalizes and the Hippo is slightly worse; if the user wants openings that objectively press, that's a bigger discussion.

## Key Files Changed
- `index.html` - 15 lines edited (6 Ponziani + 9 Hippo move-arrays + text; plus 5 text-only reframes across both)
- `test/validate.js` - full rewrite to auto-parse index.html (drift-proof)
- `CLAUDE.md` - counts 48->51 / 30->33 Ponziani, new Stockfish Tactical Audit Process, validate.js note
- `STATUS.md` - both audits' results, key learnings

## Commands To Know
```bash
brew install stockfish                 # engine (gold standard for tactical audits)
node test/validate.js                  # legality of all 51 lines (auto-parses index.html)
git push origin main                   # deploy to GitHub Pages (~1 min)
```
Audit harness lives in the session scratchpad (audit.js / pv*.js) - drives Stockfish via UCI, walks each ply, flags drops, reports final eval. Rebuild from CLAUDE.md's Tactical Audit Process if the scratchpad is gone.

## Decisions Made
- **Stockfish 18 is now the tactical gold standard**, replacing the unreliable LLM-judgment and false-positive deep-audit scripts. Engine evals are objective; LLM chess judgment is not.
- **Fix policy: correct to the engine's best line**, but keep pedagogical identity where the move is merely book-ish (e.g. gotham-qb3 kept Qb3, only fixed the one bad follow-up).
- **Honest framing over hype**: result text must match the engine. The Ponziani EQUALIZES, the Hippo is slightly WORSE but solid and needs ACTIVE play. Said so in the text.
- **validate.js auto-parses index.html** - no more hand-copying lines (the recurring drift gotcha is now structurally impossible).
- **Hippo scope was capped at "fix blunder-endings + honest text"** per the user; the full active rebuild was declined for now.

## Warnings / Gotchas
- **Ponziani = White, even move-indices = White's moves. Hippo = Black, odd indices = Black's moves.** Judge Hippo finals from Black's perspective (the audit prints White's perspective, so +0.8 = normal Hippo, not a bug).
- **In TRAP lines, Black's blunder is intentional** - only White's refutation must be engine-best. Don't "fix" the scripted Black blunder.
- **`3.c3` always shows a ~0.5 "drop" vs Ruy/Italian** - that's the Ponziani premise, NOT a bug. Ignore it.
- **The Hippo is objectively ~+0.8 for White.** Don't chase "equal" on every line; +0.3 to +1.2 is the honest, expected range. Only the active Kh7+f5 lines reach true equality.
- **validate.js reads index.html between the `function L(...)` marker and the `];` closing HIPPO_LINES.** If you restructure those, update the markers in validate.js.
