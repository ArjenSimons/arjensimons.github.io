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
  const gameAwards = [];
  const playerRecords = [];

  tournaments.forEach((tournament, tournamentIndex) => tournament.games.forEach((game, gameIndex) => {
    const durationSeconds = Math.max(0, Number(game.durationSeconds || 0));
    const teamKills = (game.players || []).reduce(
      (total, player) => total + Math.max(0, Number(player.kills || 0)),
      0
    );

    gameAwards.push({
      tournamentName: tournament.name || 'Unknown tournament',
      tournamentDate: tournament.date || '',
      tournamentId: manifest.tournaments[tournamentIndex].split('/').at(-1).replace('.json', ''),
      opponent: game.opponent || 'Unknown opponent',
      gameNumber: gameIndex + 1,
      durationSeconds,
      teamKills
    });

    (game.enemyBans || []).filter(Boolean).forEach(champion => {
      bans.set(champion, (bans.get(champion) || 0) + 1);
    });

    scoreGame(game).forEach(row => {
      playerRecords.push({
        ...row,
        tournamentName: tournament.name || 'Unknown tournament',
        tournamentId: manifest.tournaments[tournamentIndex].split('/').at(-1).replace('.json', ''),
        opponent: game.opponent || 'Unknown opponent',
        gameNumber: gameIndex + 1
      });
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

  const formatDuration = seconds => {
    const safeSeconds = Math.max(0, Math.round(Number(seconds || 0)));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  };

  const gameLabel = game => `vs ${game.opponent}`;
  const gameContext = game => `${game.tournamentName} · Game ${game.gameNumber}`;
  const longestGames = [...gameAwards]
    .filter(game => game.durationSeconds > 0)
    .sort((a, b) => b.durationSeconds - a.durationSeconds)
    .slice(0, 3);
  const shortestGames = [...gameAwards]
    .filter(game => game.durationSeconds > 0)
    .sort((a, b) => a.durationSeconds - b.durationSeconds)
    .slice(0, 3);
  const highestKillGames = [...gameAwards]
    .sort((a, b) => b.teamKills - a.teamKills || b.durationSeconds - a.durationSeconds)
    .slice(0, 3);

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


  const topPlayerRecords = key => [...playerRecords]
    .sort((a, b) => Number(b[key] || 0) - Number(a[key] || 0))
    .slice(0, 3);

  const recordContext = record => `vs ${record.opponent} · ${record.tournamentName} · Game ${record.gameNumber}`;
  const playerRecordAwards = [
    { icon: '⚔️', title: 'Most Kills', ranking: topPlayerRecords('kills'), value: record => `${Number(record.kills || 0)} kills · ${record.champion}` },
    { icon: '💀', title: 'Most Deaths', ranking: topPlayerRecords('deaths'), value: record => `${Number(record.deaths || 0)} deaths · ${record.champion}` },
    { icon: '🤝', title: 'Most Assists', ranking: topPlayerRecords('assists'), value: record => `${Number(record.assists || 0)} assists · ${record.champion}` },
    { icon: '💥', title: 'Most Damage', ranking: topPlayerRecords('damage'), value: record => `${Number(record.damage || 0).toLocaleString()} damage · ${record.champion}` },
    { icon: '🪙', title: 'Most Gold', ranking: topPlayerRecords('gold'), value: record => `${Number(record.gold || 0).toLocaleString()} gold · ${record.champion}` },
    { icon: '📈', title: 'Highest KDA', ranking: topPlayerRecords('kda'), value: record => `${format(record.kda, 2)} KDA · ${record.champion}` }
  ];

  const medalForPlace = place => ({ 1: '🥇', 2: '🥈', 3: '🥉' }[place] || '');

  const runnerUp = (entry, place, name, value) => `
    <div class="fun-runner">
      <span class="fun-medal-icon" aria-label="${place === 2 ? 'Second place' : 'Third place'}">${medalForPlace(place)}</span>
      <strong>${entry ? name(entry) : '—'}</strong>
      <small>${entry ? value(entry) : ''}</small>
    </div>`;

  const rankingCard = ({ icon, title, ranking, name, value, href }) => {
    const [winner, second, third] = ranking;
    const destination = winner && href ? href(winner) : '';
    const tag = destination ? 'a' : 'article';
    const linkAttributes = destination
      ? ` href="${destination}" class="card fun-card fun-card-link" aria-label="Open ${title} game"`
      : ' class="card fun-card"';
    return `
      <${tag}${linkAttributes}>
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
      </${tag}>`;
  };

  const playerCard = card => rankingCard({
    ...card,
    name: player => playerName(roster.players, player.playerId)
  });

  const playerRecordCard = card => rankingCard({
    ...card,
    name: record => playerName(roster.players, record.playerId),
    href: record => `tournament.html?id=${encodeURIComponent(record.tournamentId)}#game-${record.gameNumber}`
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

  const gameCard = (icon, title, ranking, metric) => rankingCard({
    icon,
    title,
    ranking,
    name: gameLabel,
    value: game => `${metric(game)} · ${gameContext(game)}`,
    href: game => `tournament.html?id=${encodeURIComponent(game.tournamentId)}#game-${game.gameNumber}`
  });

  root.innerHTML = `
    <section class="fun-section">
      <h2 class="fun-section-title">Tournament legends</h2>
      <div class="fun-grid fun-grid-legends">${legends.map(playerCard).join('')}</div>
    </section>
    <section class="fun-section">
      <h2 class="fun-section-title">Best player averages</h2>
      <div class="fun-grid">${playerAwards.map(playerCard).join('')}</div>
    </section>
    <section class="fun-section">
      <h2 class="fun-section-title">Player records</h2>
      <div class="fun-grid">${playerRecordAwards.map(playerRecordCard).join('')}</div>
    </section>
    <section class="fun-section">
      <h2 class="fun-section-title">Champion awards</h2>
      <div class="fun-grid">
        ${championCard('👑', 'Best Champion', topChampions(false))}
        ${championCard('🗑️', 'Worst Champion', topChampions(true))}
        ${bannedCard}
      </div>
    </section>
    <section class="fun-section">
      <h2 class="fun-section-title">Game awards</h2>
      <div class="fun-grid">
        ${gameCard('⏱️', 'Longest Game', longestGames, game => formatDuration(game.durationSeconds))}
        ${gameCard('⚡', 'Shortest Game', shortestGames, game => formatDuration(game.durationSeconds))}
        ${gameCard('🔥', 'Highest Kill Game', highestKillGames, game => `${game.teamKills} team kills`)}
      </div>
    </section>`;
} catch (error) {
  root.innerHTML = `<p class="error">${error.message}</p>`;
}
