// test/chesscom-tactics.fault-isolation.test.js
//
// Verifies runScan isolates a single flaky game from the rest of a run:
// - a game whose engine throws mid-scan does not abort the whole run
// - that failing game is NOT marked processed (so it's retried next run)
// - the successfully-scanned game IS marked processed
// - the failure count shows up in the returned report
const os = require('os');
const path = require('path');
const fs = require('fs');
const { runScan } = require('./chesscom-tactics');
const { readStore, writeStore } = require('./lib/puzzle-store');

function assert(cond, msg) {
  if (!cond) { throw new Error(msg); }
}

async function main() {
  const tmpStorePath = path.join(os.tmpdir(), `tactics-fault-store-${Date.now()}.js`);
  writeStore(tmpStorePath, { puzzles: [], processedGameIds: [] });

  try {
    // First game: engine throws partway through the scan (simulated timeout /
    // bad eval). Second game: normal, quiet engine that completes cleanly.
    const failingGame = {
      uuid: 'game-fails',
      pgn: '1. e4 e5',
      rules: 'chess',
      time_class: 'rapid',
      end_time: 1783257898,
      white: { username: 'FakeUser', result: 'resigned' },
      black: { username: 'opponent1', result: 'win' },
    };
    const okGame = {
      uuid: 'game-ok',
      pgn: '1. Nf3 Nf6',
      rules: 'chess',
      time_class: 'rapid',
      end_time: 1783257899,
      white: { username: 'FakeUser', result: 'win' },
      black: { username: 'opponent2', result: 'resigned' },
    };

    let engineCallCount = 0;
    const fakeDeps = {
      getRecentGames: async () => [failingGame, okGame],
      makeEngine: () => {
        engineCallCount++;
        const isFailingGame = engineCallCount === 1;
        return {
          start: async () => {},
          evalFen: async () => {
            if (isFailingGame) throw new Error('simulated engine timeout');
            return { cp: 10, mate: null }; // quiet -- no flagged mistakes needed
          },
          bestMoveSan: async () => 'Nc3',
          quit: () => {},
        };
      },
      storePath: tmpStorePath,
    };

    const result = await runScan('FakeUser', { months: 1, limitGames: null, deps: fakeDeps });

    assert(Array.isArray(result.puzzles), 'runScan must not throw when one game fails -- puzzles array expected');
    assert(typeof result.report === 'string' && /1 failed/.test(result.report),
      `report should mention the failure count, got: ${JSON.stringify(result.report)}`);

    const finalStore = readStore(tmpStorePath);
    assert(finalStore.processedGameIds.includes('game-ok'),
      'the successfully-scanned game must be marked processed');
    assert(!finalStore.processedGameIds.includes('game-fails'),
      'the failing game must NOT be marked processed, so it is retried next run');

    console.log('chesscom-tactics.fault-isolation.test.js: all assertions passed');
  } finally {
    if (fs.existsSync(tmpStorePath)) fs.unlinkSync(tmpStorePath);
  }
}

main().catch(e => { console.error('FAIL:', e); process.exit(1); });
