// test/build-tactics-puzzles.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildPuzzles } = require('./build-tactics-puzzles');

function assert(cond, msg) {
  if (!cond) { throw new Error('FAIL: ' + msg); }
}

function tmpPath(name) {
  return path.join(os.tmpdir(), `build-tactics-puzzles-test-${Date.now()}-${name}`);
}

function fixtureGame(overrides) {
  return Object.assign({
    gameId: 'g1',
    opponent: 'opp1',
    endTime: 1783257898,
    timeClass: 'rapid',
    url: 'https://example.com/g1',
    userColor: 'w',
    sanMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4'],
  }, overrides);
}

function fixtureRecord(overrides) {
  return Object.assign({
    gameId: 'g1',
    moveNumber: 5,
    phase: 'opening',
    cat: 'blunder',
    dropPawns: 2.0,
    mateMissed: false,
    mateAllowed: false,
    secondsSpent: 10,
    plyIndex: 8,
    evalBefore: { cp: 50, mate: null },
    evalAfter: { cp: -150, mate: null },
    correctMoveSan: 'Nxe5',
  }, overrides);
}

function main() {
  // --- happy path: a flagged record with all fields becomes a real puzzle file ---
  {
    const cachePath = tmpPath('cache.json');
    const storePath = tmpPath('store.js');
    const cache = {
      moveRecords: [fixtureRecord({}), fixtureRecord({ moveNumber: 6, plyIndex: 10, cat: null, correctMoveSan: null, evalBefore: undefined, evalAfter: undefined })],
      gameSummaries: [fixtureGame({})],
    };
    fs.writeFileSync(cachePath, JSON.stringify(cache));

    const { puzzles, report } = buildPuzzles({ cachePath, storePath });
    assert(puzzles.length === 1, `expected exactly the 1 flagged record to become a puzzle, got ${puzzles.length}`);
    assert(puzzles[0].id === 'tactics-g1-ply8', `expected a stable id from gameId+plyIndex, got ${puzzles[0].id}`);
    assert(puzzles[0].playerColor === 'w', 'puzzle should carry its own playerColor from the game, not a hardcoded default');
    assert(puzzles[0].baseMoves === 8, 'puzzle baseMoves should equal plyIndex');
    assert(fs.existsSync(storePath), 'store file should have been written');
    const written = fs.readFileSync(storePath, 'utf8');
    assert(written.includes('TACTICS_PUZZLES'), 'store file should define TACTICS_PUZZLES');
    assert(report.includes('tactics-g1-ply8') || report.length > 0, 'report should be non-empty');

    fs.unlinkSync(cachePath);
    fs.unlinkSync(storePath);
  }

  // --- a record from a stale part of the cache (pre-extension, missing plyIndex/correctMoveSan) is skipped, not crashed on ---
  {
    const cachePath = tmpPath('cache-stale.json');
    const storePath = tmpPath('store-stale.js');
    const staleRecord = { gameId: 'g1', moveNumber: 5, phase: 'opening', cat: 'blunder', dropPawns: 2.0, mateMissed: false, mateAllowed: false, secondsSpent: 10 };
    const cache = { moveRecords: [staleRecord], gameSummaries: [fixtureGame({})] };
    fs.writeFileSync(cachePath, JSON.stringify(cache));

    const { puzzles } = buildPuzzles({ cachePath, storePath });
    assert(puzzles.length === 0, `expected the stale record to be skipped, not built, got ${puzzles.length} puzzles`);

    fs.unlinkSync(cachePath);
    if (fs.existsSync(storePath)) fs.unlinkSync(storePath);
  }

  // --- regression: a flagged record whose "correct" move equals the move the
  // user actually played must never become a puzzle. Found in the real 109-
  // game scan (~2% of flagged plies): the eval-swing classifier flags a ply
  // from before/after eval delta alone, so a fixed-depth search can still
  // show a big swing on the engine's own best move in an already-decided
  // position. "You played Ke4, correct was Ke4" is nonsensical to a user. ---
  {
    const cachePath = tmpPath('cache-samemove.json');
    const storePath = tmpPath('store-samemove.js');
    const cache = {
      moveRecords: [
        fixtureRecord({ moveNumber: 5, plyIndex: 8, correctMoveSan: 'Nxe5' }), // real: differs from sanMoves[8]
        fixtureRecord({ moveNumber: 6, plyIndex: 9, correctMoveSan: 'exd4', dropPawns: 40 }), // sanMoves[9] === 'exd4' -- same move
      ],
      gameSummaries: [fixtureGame({})],
    };
    fs.writeFileSync(cachePath, JSON.stringify(cache));

    const { puzzles, report } = buildPuzzles({ cachePath, storePath });
    assert(puzzles.length === 1, `expected only the genuine mistake to become a puzzle, got ${puzzles.length}`);
    assert(puzzles[0].id === 'tactics-g1-ply8', `expected the ply8 record (correctMoveSan differs from the played move), got ${puzzles[0].id}`);
    assert(report.includes('played move was already the engine\'s best'), 'report should surface the same-move skip count');

    fs.unlinkSync(cachePath);
    fs.unlinkSync(storePath);
  }

  // --- missing cache file throws a clear, actionable error rather than a cryptic ENOENT ---
  {
    let threw = null;
    try {
      buildPuzzles({ cachePath: tmpPath('does-not-exist.json'), storePath: tmpPath('unused.js') });
    } catch (e) {
      threw = e;
    }
    assert(threw && /run test\/chesscom-diagnostic\.js/.test(threw.message), 'missing cache should throw a message pointing at the diagnostic scan');
  }

  // --- both blunders and missed-wins (not just mate-related severity) are eligible puzzle material ---
  {
    const cachePath = tmpPath('cache-missedwin.json');
    const storePath = tmpPath('store-missedwin.js');
    const cache = {
      moveRecords: [fixtureRecord({ cat: 'missed-win', moveNumber: 5, plyIndex: 8 })],
      gameSummaries: [fixtureGame({})],
    };
    fs.writeFileSync(cachePath, JSON.stringify(cache));
    const { puzzles } = buildPuzzles({ cachePath, storePath });
    assert(puzzles.length === 1 && puzzles[0].cat === 'missed-win', 'missed-win records must be eligible for puzzle selection, same as blunders');
    fs.unlinkSync(cachePath);
    fs.unlinkSync(storePath);
  }

  console.log('build-tactics-puzzles.test.js: all assertions passed');
}

main();
