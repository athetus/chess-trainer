const { fetchArchives, fetchMonthGames, getRecentGames } = require('./chesscom-fetch');

async function main() {
  // Live smoke test against a real, stable public account (not optimizerprime --
  // hikaru always has games and isn't the user's own account, avoiding any
  // coupling between this library test and the user's changing game history).
  const archives = await fetchArchives('hikaru');
  assert(Array.isArray(archives) && archives.length > 10, `expected many archive months, got ${archives.length}`);
  assert(archives[0].startsWith('https://api.chess.com/pub/player/hikaru/games/'), 'archive URL shape unexpected');

  const games = await fetchMonthGames(archives[archives.length - 1]);
  assert(Array.isArray(games) && games.length > 0, 'expected at least one game in the most recent month');
  const g = games[0];
  ['pgn', 'rules', 'time_class', 'white', 'black', 'uuid'].forEach(key => {
    assert(key in g, `expected game object to have "${key}"`);
  });

  const recent = await getRecentGames('hikaru', 1);
  assert(Array.isArray(recent) && recent.length > 0, 'expected getRecentGames to return games');
  assert(recent.every(g => g.rules === 'chess'), 'getRecentGames must filter out non-chess variants');

  console.log('chesscom-fetch.test.js: all assertions passed');
}

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

main().catch(e => { console.error('FAIL:', e); process.exit(1); });
