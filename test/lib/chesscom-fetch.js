async function fetchArchives(username) {
  const res = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
  if (!res.ok) throw new Error(`fetchArchives failed: HTTP ${res.status} for ${username}`);
  const data = await res.json();
  return data.archives;
}

async function fetchMonthGames(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchMonthGames failed: HTTP ${res.status} for ${url}`);
  const data = await res.json();
  return data.games || [];
}

async function getRecentGames(username, months = 1) {
  const archives = await fetchArchives(username);
  const targets = archives.slice(-months);
  const allGames = [];
  for (const url of targets) {
    const games = await fetchMonthGames(url);
    allGames.push(...games);
  }
  return allGames.filter(g => g.rules === 'chess');
}

module.exports = { fetchArchives, fetchMonthGames, getRecentGames };
