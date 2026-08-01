// test/chesscom-diagnostic.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  computeUserMoveTimings,
  bucketPhase,
  checkRepertoire,
} = require('./lib/diagnostic-analysis');
const { runDiagnostic, scanGameForDiagnostic } = require('./chesscom-diagnostic');

function assert(cond, msg) {
  if (!cond) { throw new Error('FAIL: ' + msg); }
}

async function main() {
  // --- 1. Clock-parsing math: known PGN with %clk tags -> correct per-move seconds ---
  {
    // No increment. White's own clock readings: 0:10:00 -> 0:09:50 -> 0:09:40.
    // Move 1 has no prior reading, so it's excluded. Move 2 spent 10s, move 3 spent 10s.
    const pgnNoInc =
      '1. e4 {[%clk 0:10:00]} 1... e5 {[%clk 0:10:00]} ' +
      '2. Nf3 {[%clk 0:09:50]} 2... Nc6 {[%clk 0:09:55]} ' +
      '3. Bb5 {[%clk 0:09:40]} 3... a6 {[%clk 0:09:45]}';
    const timings = computeUserMoveTimings({ pgn: pgnNoInc, timeControl: '600', userIsWhite: true });
    assert(timings.length === 2, `expected 2 timed moves (move 1 has no prior reading), got ${timings.length}`);
    assert(timings[0].moveNumber === 2 && timings[0].secondsSpent === 10, `expected move 2 to take 10s, got ${JSON.stringify(timings[0])}`);
    assert(timings[1].moveNumber === 3 && timings[1].secondsSpent === 10, `expected move 3 to take 10s, got ${JSON.stringify(timings[1])}`);

    // With a 5s increment: White readings 0:10:00 -> 0:09:45 -> 0:09:40.
    // Move 2 spent (600-585)+5 = 20s. Move 3 spent (585-580)+5 = 10s.
    const pgnWithInc =
      '1. e4 {[%clk 0:10:00]} 1... e5 {[%clk 0:10:00]} ' +
      '2. Nf3 {[%clk 0:09:45]} 2... Nc6 {[%clk 0:09:55]} ' +
      '3. Bb5 {[%clk 0:09:40]} 3... a6 {[%clk 0:09:45]}';
    const timingsInc = computeUserMoveTimings({ pgn: pgnWithInc, timeControl: '600+5', userIsWhite: true });
    assert(timingsInc[0].secondsSpent === 20, `expected 20s with increment, got ${timingsInc[0].secondsSpent}`);
    assert(timingsInc[1].secondsSpent === 10, `expected 10s with increment, got ${timingsInc[1].secondsSpent}`);

    // Black's own readings are the odd-indexed clock entries.
    const timingsBlack = computeUserMoveTimings({ pgn: pgnNoInc, timeControl: '600', userIsWhite: false });
    assert(timingsBlack.length === 2, `expected 2 timed black moves, got ${timingsBlack.length}`);
    assert(timingsBlack[0].moveNumber === 2 && timingsBlack[0].secondsSpent === 5, `expected black move 2 to take 5s, got ${JSON.stringify(timingsBlack[0])}`);

    // Absurd / negative values are discarded as parse noise.
    const pgnNoisy =
      '1. e4 {[%clk 0:10:00]} 1... e5 {[%clk 0:10:00]} ' +
      '2. Nf3 {[%clk 0:15:00]} 2... Nc6 {[%clk 0:09:55]}'; // white's clock went UP -- noise
    const timingsNoisy = computeUserMoveTimings({ pgn: pgnNoisy, timeControl: '600', userIsWhite: true });
    assert(timingsNoisy.length === 0, `expected the negative-time noise entry to be discarded, got ${JSON.stringify(timingsNoisy)}`);
  }

  // --- 2. Phase bucketing: a move-20 mistake lands in "middlegame" ---
  {
    assert(bucketPhase(20) === 'middlegame', `expected move 20 to bucket as middlegame, got ${bucketPhase(20)}`);
    assert(bucketPhase(1) === 'opening', 'move 1 should be opening');
    assert(bucketPhase(15) === 'opening', 'move 15 should still be opening');
    assert(bucketPhase(16) === 'middlegame', 'move 16 should be middlegame');
    assert(bucketPhase(31) === 'late-middlegame', 'move 31 should be late-middlegame');
    assert(bucketPhase(46) === 'endgame', 'move 46 should be endgame');
  }

  // --- 2b. End-to-end: scanGameForDiagnostic assigns the right phase to a real ply ---
  {
    // White's 20th move is ply 38 (0-indexed: (20-1)*2). Build 19 legal full
    // moves by shuffling both knights back and forth (Nb1-c3-b1... /
    // Nb8-c6-b8...), which stays legal indefinitely, then a move 20 for both
    // sides. Exact moves don't matter to the classifier since evalFen is
    // stubbed -- only ply/move-number bookkeeping is tested here.
    const trimmed = [];
    for (let i = 0; i < 19; i++) {
      const whiteMove = i % 2 === 0 ? 'Nc3' : 'Nb1';
      const blackMove = i % 2 === 0 ? 'Nc6' : 'Nb8';
      trimmed.push(whiteMove, blackMove);
    }
    trimmed.push('a3', 'a6'); // White's move 20 (ply 38), Black's move 20 (ply 39) -- plain pawn moves, always legal

    const fakeGame = {
      uuid: 'phase-fixture',
      pgn: '[placeholder]',
      time_control: '600',
      time_class: 'rapid',
      end_time: 1783257898,
      url: 'https://example.com/game/phase-fixture',
      white: { username: 'FakeUser', result: 'resigned' },
      black: { username: 'opponent1', result: 'win' },
    };

    // Build a real, legal PGN via chess.js so g.load_pgn/history works, since
    // scanGameForDiagnostic re-parses game.pgn itself.
    const { Chess } = require('chess.js');
    const g = new Chess();
    for (const san of trimmed) {
      const move = g.move(san);
      assert(move, `fixture move ${san} must be legal at this point`);
    }
    fakeGame.pgn = g.pgn();

    let evalCallCount = 0;
    const fakeDeps = {
      makeEngine: () => ({
        start: async () => {},
        evalFen: async () => {
          evalCallCount++;
          // White's move 20 (the 20th evalFen "before" call among White's 20 plies)
          // is scripted as a blunder; everything else is quiet.
          const isMove20Before = evalCallCount === 39; // 20 white plies x 2 calls - 1
          const isMove20After = evalCallCount === 40;
          if (isMove20Before) return { cp: 20, mate: null };
          if (isMove20After) return { cp: -300, mate: null };
          return { cp: 10, mate: null };
        },
        bestMoveSan: async () => 'Nc3',
        quit: () => {},
      }),
    };

    const { moveRecords } = await scanGameForDiagnostic(fakeGame, 'FakeUser', fakeDeps);
    const move20 = moveRecords.find(r => r.moveNumber === 20);
    assert(move20, 'expected a moveRecord for move 20');
    assert(move20.phase === 'middlegame', `expected move 20 to be bucketed as middlegame, got ${move20.phase}`);
    assert(move20.cat === 'blunder', `expected the scripted move 20 to classify as a blunder, got ${move20.cat}`);
    assert(move20.plyIndex === 38, `expected plyIndex 38 for white's move 20, got ${move20.plyIndex}`);
    assert(move20.correctMoveSan === 'Nc3', `expected correctMoveSan from the engine mock, got ${move20.correctMoveSan}`);
    assert(move20.evalBefore && move20.evalAfter, 'flagged plies should carry raw evalBefore/evalAfter for puzzle text');

    const move19 = moveRecords.find(r => r.moveNumber === 19 && r.cat === null);
    assert(move19 && !('correctMoveSan' in move19), 'clean plies must not carry correctMoveSan (keeps the cache lean and avoids extra engine calls)');
  }

  // --- 3. --report-only reads the cache without touching the engine or network ---
  {
    const tmpCachePath = path.join(os.tmpdir(), `chesscom-diagnostic-test-${Date.now()}.json`);
    const fixtureCache = {
      username: 'FakeUser',
      months: 1,
      dateRangeLabel: '2026-07-01 to 2026-07-31',
      generatedAt: '2026-08-01T00:00:00.000Z',
      gamesScanned: 2,
      failedCount: 0,
      moveRecords: [
        { gameId: 'g1', moveNumber: 5, phase: 'opening', cat: 'blunder', dropPawns: 2.0, mateMissed: false, mateAllowed: false, secondsSpent: 12 },
        { gameId: 'g1', moveNumber: 6, phase: 'opening', cat: null, dropPawns: 0, mateMissed: false, mateAllowed: false, secondsSpent: 5 },
      ],
      gameSummaries: [
        { gameId: 'g1', opponent: 'opp1', endTime: 1783257898, url: 'https://example.com/g1', userWon: false, mistakeCount: 1, clockLeftMinutes: 3.5 },
        { gameId: 'g2', opponent: 'opp2', endTime: 1783257899, url: 'https://example.com/g2', userWon: true, mistakeCount: 0, clockLeftMinutes: 1.2 },
      ],
      repertoire: { whiteGames: 1, ponzianiReached: 1, ponzianiOpponentAllowed: 1, blackGames: 1, hippoPlayed: 1 },
    };
    fs.writeFileSync(tmpCachePath, JSON.stringify(fixtureCache));

    let engineOrNetworkTouched = false;
    const fakeDeps = {
      getRecentGames: async () => { engineOrNetworkTouched = true; return []; },
      makeEngine: () => { engineOrNetworkTouched = true; throw new Error('engine must not be constructed in --report-only mode'); },
      cachePath: tmpCachePath,
    };

    const report = await runDiagnostic('FakeUser', { reportOnly: true, deps: fakeDeps });
    assert(!engineOrNetworkTouched, '--report-only must never touch getRecentGames or makeEngine');
    assert(typeof report === 'string' && report.includes('FakeUser'), 'report should mention the username');
    assert(report.includes('Games scanned: 2'), 'report should reflect the cached game count');
    assert(report.includes('opp1'), 'worst-games section should mention the opponent from the cache');

    fs.unlinkSync(tmpCachePath);
  }

  // --- regression: delivering checkmate on the user's own final ply must never
  // be classified as a mistake. Stockfish reports "score mate 0" for ANY
  // zero-legal-move position, ambiguous between checkmate and stalemate --
  // without the in_checkmate() bypass this ply looks like "went from mate-in-1
  // to mate 0", which classifyPly would score as a missed win. ---
  {
    const { Chess } = require('chess.js');
    const g = new Chess();
    g.move('f3'); g.move('e5'); g.move('g4'); g.move('Qh4'); // Fool's Mate -- Black delivers mate on ply 3
    assert(g.in_checkmate(), 'fixture setup: this must actually be checkmate');
    const fakeGame = {
      uuid: 'foolsmate-fixture',
      pgn: g.pgn(),
      time_control: '600',
      time_class: 'rapid',
      end_time: 1783257898,
      url: 'https://example.com/game/foolsmate-fixture',
      white: { username: 'opponent1', result: 'checkmated' },
      black: { username: 'FakeUser', result: 'win' },
    };
    let engineCalled = false;
    const fakeDeps = {
      makeEngine: () => ({
        start: async () => {},
        evalFen: async () => { engineCalled = true; return { cp: 0, mate: null }; },
        bestMoveSan: async () => { throw new Error('bestMoveSan should never be reached for the mating ply'); },
        quit: () => {},
      }),
    };
    const { moveRecords } = await scanGameForDiagnostic(fakeGame, 'FakeUser', fakeDeps);
    assert(moveRecords.length === 1, `expected only Black's move 1 (...e5) to be recorded -- the mating move 2 (...Qh4#) must be skipped entirely, got ${moveRecords.length} records`);
    assert(!moveRecords.some(r => r.moveNumber === 2), 'the checkmating move itself must never appear as a moveRecord (would misclassify as a missed win via the mate-0 ambiguity)');
  }

  // --- repertoire check sanity (used by section 6, worth a direct unit test too) ---
  {
    const ponzianiPgn = '[Event "?"]\n\n1. e4 e5 2. Nf3 Nc6 3. c3 Nf6 4. d4 *';
    const rep = checkRepertoire({ pgn: ponzianiPgn, userIsWhite: true });
    assert(rep.opponentAllowedPonziani === true, 'opponent should be marked as having allowed the Ponziani');
    assert(rep.reachedPonziani === true, 'White should be marked as having reached the Ponziani');

    const hippoPgn = '[Event "?"]\n\n1. e4 g6 2. d4 Bg7 *';
    const repHippo = checkRepertoire({ pgn: hippoPgn, userIsWhite: false });
    assert(repHippo.playedHippo === true, 'Black should be marked as having played an early ...g6');
  }

  console.log('chesscom-diagnostic.test.js: all assertions passed');
}

main().catch(e => { console.error(e); process.exit(1); });
