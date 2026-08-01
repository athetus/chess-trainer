// test/chesscom-diagnostic.js
//
// Monthly diagnostic: scans a user's real chess.com games and reports what is
// actually costing them rating (not puzzles -- that feature was dropped in
// favor of this report, which proved far more useful). Findings are cached so
// `--report-only` can re-print the report instantly without re-running
// Stockfish (a full scan takes 60-90 minutes).
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');
const { getRecentGames: realGetRecentGames } = require('./lib/chesscom-fetch');
const { StockfishEngine } = require('./lib/stockfish-engine');
const { classifyPly, scoreToPawns, toUserPerspective } = require('./lib/tactics-classifier');
const {
  computeUserMoveTimings,
  lastUserClockSeconds,
  bucketPhase,
  checkRepertoire,
  median,
  mean,
  pctAtMost,
} = require('./lib/diagnostic-analysis');

const DEFAULT_CACHE_PATH = path.join(__dirname, '..', '.chesscom-diagnostic-cache.json');
const STOCKFISH_DEPTH = 15;
const WORST_GAMES_SHOWN = 5;

// Numbers from the controller's proven Python run against optimizerprime's
// July 2026 games (108 games, 476 real mistakes). Printed alongside each
// month's current numbers so month-over-month change is visible at a glance.
const BASELINE = {
  label: 'Aug 2026 baseline',
  mistakesPerGame: 4.7,
  blunderMedianSeconds: 13.5,
  cleanMedianSeconds: 6.8,
  blunderPctUnder3s: 12,
  cleanPctUnder3s: 30,
  unusedClockMedianMinutes: 2.8,
  unusedClockRatio: '19/46',
  phaseOpeningPct: 32.1,
  phaseMiddlegamePct: 45.8,
  phaseLateMiddlegamePct: 15.1,
  phaseEndgamePct: 6.9,
  severityMedianDrop: 2.5,
  severityMeanDrop: 3.2,
  severity1_5to3: 227,
  severity3to6: 132,
  severity6plus: 31,
  mateAllowed: 47,
  mateMissed: 39,
  ponzianiReached: 17,
  ponzianiAvailable: 49,
  ponzianiOpponentAllowed: 17,
  hippoPlayed: 51,
  hippoGames: 51,
};

// Walks every one of the user's own plies in a single game, evaluating before
// and after with Stockfish and classifying each as blunder/missed-win/clean.
// Mirrors scanGame() in chesscom-tactics.js (same checkmate-bypass guard,
// same per-game engine lifecycle via try/finally) but records a diagnostic
// moveRecord for EVERY user ply -- not just flagged ones -- because the
// time-vs-blunders comparison needs the full population of clean moves too.
// Unlike the puzzle scanner, this never asks the engine for a best move: the
// report only needs eval swings and counts, not a "correct move" to display.
async function scanGameForDiagnostic(game, username, deps) {
  const g = new Chess();
  g.load_pgn(game.pgn);
  const sanMoves = g.history();

  const userIsWhite = game.white.username.toLowerCase() === username.toLowerCase();
  const userColor = userIsWhite ? 'w' : 'b';

  const replay = new Chess();
  const fensBeforePly = [];
  for (let i = 0; i < sanMoves.length; i++) {
    fensBeforePly.push(replay.fen());
    replay.move(sanMoves[i]);
  }
  const fenAfterLast = replay.fen();
  const gameEndedInCheckmate = replay.in_checkmate();

  const timings = computeUserMoveTimings({ pgn: game.pgn, timeControl: game.time_control, userIsWhite });
  const timingByMoveNumber = new Map(timings.map(t => [t.moveNumber, t.secondsSpent]));

  const engine = deps.makeEngine();
  const moveRecords = [];
  try {
    await engine.start();
    for (let ply = 0; ply < sanMoves.length; ply++) {
      const turnColor = ply % 2 === 0 ? 'w' : 'b';
      if (turnColor !== userColor) continue;

      // Delivering checkmate on the literal final ply is never a mistake --
      // see the identical guard (and its rationale) in chesscom-tactics.js.
      const isFinalPly = ply === sanMoves.length - 1;
      if (isFinalPly && gameEndedInCheckmate) continue;

      const fenBefore = fensBeforePly[ply];
      const fenAfter = ply + 1 < fensBeforePly.length ? fensBeforePly[ply + 1] : fenAfterLast;
      const evalBefore = await engine.evalFen(fenBefore, STOCKFISH_DEPTH);
      const evalAfter = await engine.evalFen(fenAfter, STOCKFISH_DEPTH);

      const cat = classifyPly({ evalBefore, evalAfter, userColor });
      const beforeUser = toUserPerspective(evalBefore, userColor);
      const afterUser = toUserPerspective(evalAfter, userColor);
      const dropPawns = cat ? scoreToPawns(beforeUser) - scoreToPawns(afterUser) : 0;
      const mateMissed = cat === 'missed-win' &&
        beforeUser.mate != null && beforeUser.mate > 0 &&
        !(afterUser.mate != null && afterUser.mate > 0);
      const mateAllowed = cat === 'blunder' && afterUser.mate != null && afterUser.mate < 0;
      const moveNumber = Math.floor(ply / 2) + 1;

      moveRecords.push({
        gameId: game.uuid,
        moveNumber,
        phase: bucketPhase(moveNumber),
        cat: cat || null,
        dropPawns,
        mateMissed,
        mateAllowed,
        secondsSpent: timingByMoveNumber.has(moveNumber) ? timingByMoveNumber.get(moveNumber) : null,
      });
    }
  } finally {
    engine.quit();
  }

  const repertoire = checkRepertoire({ pgn: game.pgn, userIsWhite });
  const userResult = userIsWhite ? game.white.result : game.black.result;
  const userWon = userResult === 'win';
  const clockLeftSeconds = lastUserClockSeconds(game.pgn, userIsWhite);

  const gameSummary = {
    gameId: game.uuid,
    opponent: userIsWhite ? game.black.username : game.white.username,
    endTime: game.end_time,
    url: game.url,
    userWon,
    mistakeCount: moveRecords.filter(r => r.cat).length,
    clockLeftMinutes: clockLeftSeconds !== null ? clockLeftSeconds / 60 : null,
  };

  return { moveRecords, gameSummary, repertoire };
}

async function runDiagnostic(username, { months = 1, limitGames = null, reportOnly = false, deps = null } = {}) {
  const effectiveDeps = deps || {
    getRecentGames: realGetRecentGames,
    makeEngine: () => new StockfishEngine(),
    cachePath: DEFAULT_CACHE_PATH,
  };
  const cachePath = effectiveDeps.cachePath || DEFAULT_CACHE_PATH;

  if (reportOnly) {
    if (!fs.existsSync(cachePath)) {
      throw new Error(`No cached findings at ${cachePath} -- run without --report-only first (this takes 60-90 minutes).`);
    }
    const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    return buildReport(cache);
  }

  let games = await effectiveDeps.getRecentGames(username, months);
  if (limitGames) games = games.slice(0, limitGames);

  const moveRecords = [];
  const gameSummaries = [];
  let failedCount = 0;
  let whiteGames = 0, ponzianiReached = 0, ponzianiOpponentAllowed = 0;
  let blackGames = 0, hippoPlayed = 0;

  for (const game of games) {
    try {
      const { moveRecords: recs, gameSummary, repertoire } = await scanGameForDiagnostic(game, username, effectiveDeps);
      moveRecords.push(...recs);
      gameSummaries.push(gameSummary);
      if (repertoire.isWhiteGame) {
        whiteGames++;
        if (repertoire.opponentAllowedPonziani) ponzianiOpponentAllowed++;
        if (repertoire.reachedPonziani) ponzianiReached++;
      } else {
        blackGames++;
        if (repertoire.playedHippo) hippoPlayed++;
      }
    } catch (err) {
      // Isolate one flaky game from the rest of a ~100-game run, same
      // rationale as chesscom-tactics.js's fault isolation.
      failedCount++;
      console.error(`Warning: failed to scan game ${game.url || game.uuid}: ${err && err.message ? err.message : err}`);
    }
  }

  const endTimes = gameSummaries.map(gs => gs.endTime).filter(t => typeof t === 'number');
  const dateRangeLabel = endTimes.length > 0
    ? `${new Date(Math.min(...endTimes) * 1000).toISOString().slice(0, 10)} to ${new Date(Math.max(...endTimes) * 1000).toISOString().slice(0, 10)}`
    : 'unknown';

  const cache = {
    username,
    months,
    dateRangeLabel,
    generatedAt: new Date().toISOString(),
    gamesScanned: games.length,
    failedCount,
    moveRecords,
    gameSummaries,
    repertoire: { whiteGames, ponzianiReached, ponzianiOpponentAllowed, blackGames, hippoPlayed },
  };
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

  return buildReport(cache);
}

function fmtPct(n) {
  return n === null ? 'n/a' : `${n.toFixed(1)}%`;
}

function fmt1(n) {
  return n === null ? 'n/a' : n.toFixed(1);
}

function baseline(value) {
  return `(${BASELINE.label}: ${value})`;
}

// Pure formatting over an already-computed cache -- no engine, no fetch.
// Shared by the default (post-scan) path and --report-only.
function buildReport(cache) {
  const { moveRecords, gameSummaries, repertoire } = cache;
  const lines = [];

  const gamesScanned = cache.gamesScanned;
  const totalMistakes = moveRecords.filter(r => r.cat).length;
  const mistakesPerGame = gamesScanned > 0 ? totalMistakes / gamesScanned : null;

  lines.push('='.repeat(70));
  lines.push(`CHESS.COM DIAGNOSTIC REPORT -- ${cache.username}`);
  lines.push(`${cache.months} month(s) | ${cache.dateRangeLabel} | generated ${cache.generatedAt}`);
  if (cache.failedCount > 0) lines.push(`(${cache.failedCount} game(s) failed to scan and were skipped)`);
  lines.push('='.repeat(70));

  // 1. Headline
  lines.push('');
  lines.push('1. HEADLINE');
  lines.push(`   Games scanned: ${gamesScanned}`);
  lines.push(`   Total real mistakes: ${totalMistakes}`);
  lines.push(`   Mistakes per game: ${fmt1(mistakesPerGame)} ${baseline(BASELINE.mistakesPerGame)}`);

  // 2. Time vs blunders -- the headline finding.
  const blunderSeconds = moveRecords.filter(r => r.cat === 'blunder' && r.secondsSpent !== null).map(r => r.secondsSpent);
  const cleanSeconds = moveRecords.filter(r => r.cat === null && r.secondsSpent !== null).map(r => r.secondsSpent);
  const blunderMedian = median(blunderSeconds);
  const cleanMedian = median(cleanSeconds);
  const blunderMean = mean(blunderSeconds);
  const cleanMean = mean(cleanSeconds);
  const blunderPctUnder3s = pctAtMost(blunderSeconds, 3);
  const cleanPctUnder3s = pctAtMost(cleanSeconds, 3);

  lines.push('');
  lines.push('2. TIME VS BLUNDERS  [does slowing down actually help?]');
  lines.push(`   Clean moves   (n=${cleanSeconds.length}): median ${fmt1(cleanMedian)}s, mean ${fmt1(cleanMean)}s ${baseline(`${BASELINE.cleanMedianSeconds}s median`)}`);
  lines.push(`   Blunder moves (n=${blunderSeconds.length}): median ${fmt1(blunderMedian)}s, mean ${fmt1(blunderMean)}s ${baseline(`${BASELINE.blunderMedianSeconds}s median`)}`);
  lines.push(`   Blunders made in <=3s: ${fmtPct(blunderPctUnder3s)} ${baseline(`${BASELINE.blunderPctUnder3s}%`)}`);
  lines.push(`   Clean moves made in <=3s: ${fmtPct(cleanPctUnder3s)} ${baseline(`${BASELINE.cleanPctUnder3s}%`)}`);
  if (blunderMedian !== null && cleanMedian !== null && blunderMedian > cleanMedian) {
    lines.push(`   >> You blunder on moves you think LONGER about, not shorter. "Slow down" is not the fix.`);
  } else if (blunderMedian !== null && cleanMedian !== null) {
    lines.push(`   >> Blunders are now the faster moves -- this month, rushing looks like a real factor.`);
  }

  // 3. Unused clock
  const nonWinGames = gameSummaries.filter(gs => !gs.userWon && gs.clockLeftMinutes !== null);
  const clockLeftValues = nonWinGames.map(gs => gs.clockLeftMinutes);
  const unusedClockMedian = median(clockLeftValues);
  const unusedOver4 = nonWinGames.filter(gs => gs.clockLeftMinutes >= 4).length;

  lines.push('');
  lines.push('3. UNUSED CLOCK  [games not won]');
  lines.push(`   Median minutes left on the clock: ${fmt1(unusedClockMedian)} ${baseline(`${BASELINE.unusedClockMedianMinutes} min`)}`);
  lines.push(`   Games with 4+ min left unused: ${unusedOver4}/${nonWinGames.length} ${baseline(BASELINE.unusedClockRatio)}`);

  // 4. When mistakes happen
  const phaseOrder = ['opening', 'middlegame', 'late-middlegame', 'endgame'];
  const phaseBaseline = {
    opening: BASELINE.phaseOpeningPct,
    middlegame: BASELINE.phaseMiddlegamePct,
    'late-middlegame': BASELINE.phaseLateMiddlegamePct,
    endgame: BASELINE.phaseEndgamePct,
  };
  const phaseLabel = {
    opening: 'Opening   (moves 1-15) ',
    middlegame: 'Middlegame(moves 16-30)',
    'late-middlegame': 'Late-mg   (moves 31-45)',
    endgame: 'Endgame   (moves 46+)  ',
  };
  const flagged = moveRecords.filter(r => r.cat);
  lines.push('');
  lines.push('4. WHEN MISTAKES HAPPEN');
  for (const phase of phaseOrder) {
    const count = flagged.filter(r => r.phase === phase).length;
    const pct = flagged.length > 0 ? (count / flagged.length) * 100 : null;
    lines.push(`   ${phaseLabel[phase]}: ${count} (${fmtPct(pct)}) ${baseline(`${phaseBaseline[phase]}%`)}`);
  }

  // 5. Severity
  const mateAllowedCount = moveRecords.filter(r => r.mateAllowed).length;
  const mateMissedCount = moveRecords.filter(r => r.mateMissed).length;
  const materialDropRecords = flagged.filter(r => !r.mateAllowed && !r.mateMissed);
  const dropValues = materialDropRecords.map(r => Math.abs(r.dropPawns));
  const bucket1_5to3 = dropValues.filter(d => d >= 1.5 && d < 3).length;
  const bucket3to6 = dropValues.filter(d => d >= 3 && d < 6).length;
  const bucket6plus = dropValues.filter(d => d >= 6).length;
  const medianDrop = median(dropValues);
  const meanDrop = mean(dropValues);

  lines.push('');
  lines.push('5. SEVERITY');
  lines.push(`   Allowed a forced mate against you: ${mateAllowedCount} ${baseline(BASELINE.mateAllowed)}`);
  lines.push(`   Missed a forced mate: ${mateMissedCount} ${baseline(BASELINE.mateMissed)}`);
  lines.push(`   Material drop 1.5-3 pawns: ${bucket1_5to3} ${baseline(BASELINE.severity1_5to3)}`);
  lines.push(`   Material drop 3-6 pawns: ${bucket3to6} ${baseline(BASELINE.severity3to6)}`);
  lines.push(`   Material drop 6+ pawns: ${bucket6plus} ${baseline(BASELINE.severity6plus)}`);
  lines.push(`   Median drop: ${fmt1(medianDrop)} pawns, mean: ${fmt1(meanDrop)} pawns ${baseline(`median ${BASELINE.severityMedianDrop}, mean ${BASELINE.severityMeanDrop}`)}`);

  // 6. Repertoire coverage
  lines.push('');
  lines.push('6. REPERTOIRE COVERAGE  [is the daily drilling actually showing up?]');
  lines.push(`   Ponziani reached: ${repertoire.ponzianiReached}/${repertoire.whiteGames} White games ${baseline(`${BASELINE.ponzianiReached}/${BASELINE.ponzianiAvailable}`)}`);
  lines.push(`   ...of games where the opponent allowed it (1.e4 e5 2.Nf3 Nc6): ${repertoire.ponzianiReached}/${repertoire.ponzianiOpponentAllowed} ${baseline(`${BASELINE.ponzianiReached}/${BASELINE.ponzianiOpponentAllowed}`)}`);
  lines.push(`   Hippo (early ...g6) played: ${repertoire.hippoPlayed}/${repertoire.blackGames} Black games ${baseline(`${BASELINE.hippoPlayed}/${BASELINE.hippoGames}`)}`);

  // 7. Worst games
  const worst = [...gameSummaries]
    .filter(gs => gs.mistakeCount > 0)
    .sort((a, b) => b.mistakeCount - a.mistakeCount)
    .slice(0, WORST_GAMES_SHOWN);
  lines.push('');
  lines.push('7. WORST GAMES  [go review these]');
  if (worst.length === 0) {
    lines.push('   None -- no flagged mistakes this period.');
  } else {
    for (const gs of worst) {
      const date = typeof gs.endTime === 'number' ? new Date(gs.endTime * 1000).toISOString().slice(0, 10) : 'unknown date';
      lines.push(`   ${gs.mistakeCount} mistake(s) vs ${gs.opponent} on ${date}${gs.url ? ` -- ${gs.url}` : ''}`);
    }
  }

  lines.push('');
  lines.push('='.repeat(70));

  return lines.join('\n');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const username = args[0];
  if (!username) {
    console.error('Usage: node test/chesscom-diagnostic.js <username> [--months N] [--report-only] [--limit-games N]');
    process.exit(1);
  }
  const monthsIdx = args.indexOf('--months');
  const months = monthsIdx >= 0 ? parseInt(args[monthsIdx + 1], 10) : 1;
  const limitIdx = args.indexOf('--limit-games');
  const limitGames = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null;
  const reportOnly = args.includes('--report-only');

  runDiagnostic(username, { months, limitGames, reportOnly })
    .then(report => console.log(report))
    .catch(e => { console.error('Diagnostic failed:', e); process.exit(1); });
}

module.exports = { runDiagnostic, buildReport, scanGameForDiagnostic, BASELINE };
