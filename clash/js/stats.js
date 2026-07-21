import { loadJson, playerName } from './common.js';
import { scoreGame } from './scoring.js';

const root = document.querySelector('#fun-stats');
const format = (value, digits = 1) => Number(value || 0).toFixed(digits);

try {
  const [roster, manifest] = await Promise.all([
    loadJson('./data/players.json'),
    loadJson('./data/index.json')
  ]);
  const tournaments = await Promise.all(manifest.tournaments.map(path => loadJson(`./data/${path}`)));
  const players = new Map(roster.players.map(player => [player.id, {
    playerId: player.id,
    games: 0,
    score: 0,
    kda: 0,
    cs: 0,
    kp: 0,
    gold: 0,
    deaths: 0
  }]));
  const bans = new Map();

  tournaments.forEach(tournament => tournament.games.forEach(game => {
    (game.enemyBans || []).filter(Boolean).forEach(champion => bans.set(champion, (bans.get(champion) || 0) + 1));
    scoreGame(game).forEach(row => {
      if (!players.has(row.playerId)) players.set(row.playerId, { playerId: row.playerId, games: 0, score: 0, kda: 0, cs: 0, kp: 0, gold: 0, deaths: 0 });
      const item = players.get(row.playerId);
      item.games += 1;
      item.score += row.score;
      item.kda += row.kda;
      item.cs += Number(row.cs || 0);
      item.kp += row.kp;
      item.gold += Number(row.gold || 0);
      item.deaths += Number(row.deaths || 0);
    });
  }));

  const ranked = [...players.values()].filter(player => player.games > 0).map(player => ({
    ...player,
    averageScore: player.score / player.games,
    averageKda: player.kda / player.games,
    averageCs: player.cs / player.games,
    averageKp: player.kp / player.games,
    averageGold: player.gold / player.games,
    averageDeaths: player.deaths / player.games
  }));

  const highest = key => [...ranked].sort((a, b) => b[key] - a[key])[0];
  const lowest = key => [...ranked].sort((a, b) => a[key] - b[key])[0];
  const mostBanned = [...bans.entries()].sort((a, b) => b[1] - a[1])[0];

  const cards = [
    { icon: '🏆', title: 'Overall MVP', winner: highest('averageScore'), value: player => `${format(player.averageScore)} average rating` },
    { icon: '💀', title: 'Overall Inter', winner: lowest('averageScore'), value: player => `${format(player.averageScore)} average rating` },
    { icon: '⚔️', title: 'KDA Leader', winner: highest('averageKda'), value: player => `${format(player.averageKda, 2)} average KDA` },
    { icon: '🌾', title: 'CS Leader', winner: highest('averageCs'), value: player => `${format(player.averageCs)} average CS` },
    { icon: '🤝', title: 'Contribute King', winner: highest('averageKp'), value: player => `${Math.round(player.averageKp * 100)}% average KP` },
    { icon: '🪙', title: 'Gold Goblin', winner: highest('averageGold'), value: player => `${Math.round(player.averageGold).toLocaleString()} average gold` },
    { icon: '🩶', title: 'Gray Screen Farmer', winner: highest('averageDeaths'), value: player => `${format(player.averageDeaths, 2)} average deaths` }
  ];

  root.innerHTML = `
    <div class="fun-grid">
      ${cards.map(card => `<article class="card fun-card"><span class="fun-icon">${card.icon}</span><p class="eyebrow">${card.title}</p><h2>${card.winner ? playerName(roster.players, card.winner.playerId) : '—'}</h2><p>${card.winner ? card.value(card.winner) : 'No games recorded'}</p><small>${card.winner ? `${card.winner.games} game${card.winner.games === 1 ? '' : 's'}` : ''}</small></article>`).join('')}
      <article class="card fun-card"><span class="fun-icon">🚫</span><p class="eyebrow">Most Banned Champion</p><h2>${mostBanned?.[0] || '—'}</h2><p>${mostBanned ? `${mostBanned[1]} enemy ban${mostBanned[1] === 1 ? '' : 's'}` : 'No enemy bans recorded'}</p><small>Banned against Knoller</small></article>
    </div>`;
} catch (error) {
  root.innerHTML = `<p class="error">${error.message}</p>`;
}
