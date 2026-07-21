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
    totalMinutes: 0,
    cs: 0,
    kp: 0,
    gold: 0,
    deaths: 0,
    vision: 0,
    damage: 0
  }]));
  const champions = new Map();
  const bans = new Map();

  tournaments.forEach(tournament => tournament.games.forEach(game => {
    (game.enemyBans || []).filter(Boolean).forEach(champion => {
      bans.set(champion, (bans.get(champion) || 0) + 1);
    });

    scoreGame(game).forEach(row => {
      if (!players.has(row.playerId)) {
        players.set(row.playerId, {
          playerId: row.playerId,
          games: 0,
          score: 0,
          kda: 0,
          totalMinutes: 0,
          cs: 0,
          kp: 0,
          gold: 0,
          deaths: 0,
          vision: 0,
          damage: 0
        });
      }

      const player = players.get(row.playerId);
      player.games += 1;
      player.score += row.score;
      player.kda += row.kda;
      player.totalMinutes += Math.max(0, Number(game.durationSeconds || 0)) / 60;
      player.cs += Number(row.cs || 0);
      player.kp += row.kp;
      player.gold += Number(row.gold || 0);
      player.deaths += Number(row.deaths || 0);
      player.vision += Number(row.visionScore || 0);
      player.damage += Number(row.damage || 0);

      const championName = row.champion || 'Unknown';
      const champion = champions.get(championName) || {
        champion: championName,
        games: 0,
        score: 0
      };
      champion.games += 1;
      champion.score += row.score;
      champions.set(championName, champion);
    });
  }));

  const rankedPlayers = [...players.values()]
    .filter(player => player.games > 0)
    .map(player => ({
      ...player,
      averageScore: player.score / player.games,
      averageKda: player.kda / player.games,
      csPerMinute: player.totalMinutes > 0 ? player.cs / player.totalMinutes : 0,
      averageKp: player.kp / player.games,
      goldPerMinute: player.totalMinutes > 0 ? player.gold / player.totalMinutes : 0,
      averageDeaths: player.deaths / player.games,
      visionPerMinute: player.totalMinutes > 0 ? player.vision / player.totalMinutes : 0,
      damagePerMinute: player.totalMinutes > 0 ? player.damage / player.totalMinutes : 0
    }));

  const rankedChampions = [...champions.values()]
    .filter(champion => champion.games > 0)
    .map(champion => ({
      ...champion,
      averageScore: champion.score / champion.games
    }));

  const topPlayers = (key, ascending = false) => [...rankedPlayers]
    .sort((a, b) => (ascending ? a[key] - b[key] : b[key] - a[key]) || b.games - a.games)
    .slice(0, 3);

  const topChampions = ascending => [...rankedChampions]
    .sort((a, b) => (ascending ? a.averageScore - b.averageScore : b.averageScore - a.averageScore) || b.games - a.games)
    .slice(0, 3);

  const topBans = [...bans.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([champion, count]) => ({ champion, count }));

  const legends = [
    { icon: '🏆', title: 'Overall MVP', ranking: topPlayers('averageScore'), value: player => `${format(player.averageScore)} rating` },
    { icon: '💀', title: 'Overall Inter', ranking: topPlayers('averageScore', true), value: player => `${format(player.averageScore)} rating` }
  ];

  const playerAwards = [
    { icon: '⚔️', title: 'KDA Leader', ranking: topPlayers('averageKda'), value: player => `${format(player.averageKda, 2)} KDA` },
    { icon: '🤝', title: 'Contribute King', ranking: topPlayers('averageKp'), value: player => `${Math.round(player.averageKp * 100)}% KP` },
    { icon: '🌾', title: 'CS Leader', ranking: topPlayers('csPerMinute'), value: player => `${format(player.csPerMinute, 2)} CS/min` },
    { icon: '🪙', title: 'Gold Goblin', ranking: topPlayers('goldPerMinute'), value: player => `${Math.round(player.goldPerMinute).toLocaleString()} gold/min` },
    { icon: '👁️', title: 'Visionair', ranking: topPlayers('visionPerMinute'), value: player => `${format(player.visionPerMinute, 2)} vision/min` },
    { icon: '💥', title: 'Health Bar Eraser', ranking: topPlayers('damagePerMinute'), value: player => `${Math.round(player.damagePerMinute).toLocaleString()} damage/min` },
    { icon: '🩶', title: 'Gray Screen Farmer', ranking: topPlayers('averageDeaths'), value: player => `${format(player.averageDeaths, 2)} deaths` }
  ];

  const medalForPlace = place => ({ 1: '🥇', 2: '🥈', 3: '🥉' }[place] || '');

  const runnerUp = (entry, place, name, value) => `
    <div class="fun-runner">
      <span class="fun-medal-icon" aria-label="${place === 2 ? 'Second place' : 'Third place'}">${medalForPlace(place)}</span>
      <strong>${entry ? name(entry) : '—'}</strong>
      <small>${entry ? value(entry) : ''}</small>
    </div>`;

  const rankingCard = ({ icon, title, ranking, name, value }) => {
    const [winner, second, third] = ranking;
    return `
      <article class="card fun-card">
        <div class="fun-card-head">
          <span class="fun-icon">${icon}</span>
          <p class="eyebrow">${title}</p>
        </div>
        <div class="fun-winner">
          <span class="fun-medal-icon fun-medal-winner" aria-label="First place">🥇</span>
          <h2>${winner ? name(winner) : '—'}</h2>
          <p>${winner ? value(winner) : 'No data recorded'}</p>
        </div>
        <div class="fun-runners">
          ${runnerUp(second, '2', name, value)}
          ${runnerUp(third, '3', name, value)}
        </div>
      </article>`;
  };

  const playerCard = card => rankingCard({
    ...card,
    name: player => playerName(roster.players, player.playerId)
  });

  const championCard = (icon, title, ranking) => rankingCard({
    icon,
    title,
    ranking,
    name: champion => champion.champion,
    value: champion => `${format(champion.averageScore)} rating`
  });

  const bannedCard = rankingCard({
    icon: '🚫',
    title: 'Most Banned Champion',
    ranking: topBans,
    name: champion => champion.champion,
    value: champion => `${champion.count} ban${champion.count === 1 ? '' : 's'}`
  });

  root.innerHTML = `
    <section class="fun-section">
      <h2 class="fun-section-title">Tournament legends</h2>
      <div class="fun-grid fun-grid-legends">${legends.map(playerCard).join('')}</div>
    </section>
    <section class="fun-section">
      <h2 class="fun-section-title">Player awards</h2>
      <div class="fun-grid">${playerAwards.map(playerCard).join('')}</div>
    </section>
    <section class="fun-section">
      <h2 class="fun-section-title">Champion awards</h2>
      <div class="fun-grid">
        ${championCard('👑', 'Best Champion', topChampions(false))}
        ${championCard('🗑️', 'Worst Champion', topChampions(true))}
        ${bannedCard}
      </div>
    </section>`;
} catch (error) {
  root.innerHTML = `<p class="error">${error.message}</p>`;
}
