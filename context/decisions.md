# Operational Decisions

(Tactical/process decisions with one-line reasoning. Architecture/framework choices go
in `docs/adr/` instead — none exist yet for this project; it's a single-file HTML app by
deliberate choice, see `docs/adr/` if that ever changes.)

- **2026-09-09 — Patched the diagnostic cache in place rather than re-running the
  60-90 min Stockfish scan after fixing the `mateAllowed` bug.** The raw
  `evalBefore`/`evalAfter` for every flagged ply were already cached; recomputing
  `mateAllowed` from them is a pure function, no engine needed. Backed up the original
  cache first (`.chesscom-diagnostic-cache.pre-fix-backup.json`, gitignored).
- **2026-09-09 — Used `getRecentGames` + a one-off script to compute rating
  trend/clock-at-move-30/games-under-2min directly, rather than reusing hardcoded July
  figures.** Those stats aren't produced by the standard report; recomputing them from
  the fresh archive (reusing existing tested helpers like `extractColorClockSeconds`)
  keeps `docs/TRAINING_PLAN.md` honest rather than stale.
- **2026-08-02 — Puzzle generation rebuilt to consume the diagnostic's own cache
  instead of re-scanning.** Avoids a second full Stockfish pass; the diagnostic already
  walks every user move.
- **2026-08-02 — Fixed quotas (mate/catastrophic/common) instead of pure severity
  ranking for Tactics puzzle selection.** The first attempt let mate-sentinel scores
  dominate all 15 slots; see `docs/TRAINING_PLAN.md`/STATUS.md for the full story.
- **Ongoing — Never use the Artifact tool for this project's reference pages; always a
  local HTML file (`docs/training-ledger.html`).** Standing user preference, now a
  global rule in `~/.claude/CLAUDE.md`.
- **Ongoing — Training advice to this user must be a concrete drill or a visible
  in-game trigger, never a mental habit to remember mid-game, and should route through
  the app's own interactive drills rather than SAN notation/prose where possible** (the
  user has said reading raw notation doesn't help them learn). See Auto Memory:
  `chess-advice-must-be-actionable-not-mental-discipline`,
  `chess-user-cannot-visualize-notation`.
