import { loadJson, playerName } from './common.js';
import { scoreGame } from './scoring.js';

const root = document.querySelector('#fun-stats');
const gameWindowSelect = document.querySelector('#stats-game-window');
const requestedGameWindow = new URLSearchParams(location.search).get('games') || 'all';
const format = (value, digits = 1) => Number(value || 0).toFixed(digits);

gameWindowSelect.value = ['5', '10', '20'].includes(requestedGameWindow) ? requestedGameWindow : 'all';
gameWindowSelect.addEventListener('change', () => {
  const url = new URL(location.href);
  if (gameWindowSelect.value === 'all') url.searchParams.delete('games');
  else url.searchParams.set('games', gameWindowSelect.value);
  location.href = url;
});

try {
  const [roster, manifest] = await Promise.all([
    loadJson('./data/players.json'),
    loadJson('./data/index.json')
  ]);
  const tournaments = await Promise.all(manifest.tournaments.map(path => loadJson(`./data/${path}`)));
  const gameTimeline = tournaments.flatMap((tournament, tournamentIndex) =>
    tournament.games.map((game, gameIndex) => ({ tournamentIndex, gameIndex, game, date: tournament.date || '' }))
  ).sort((a, b) => a.date.localeCompare(b.date) || a.gameIndex - b.gameIndex);
  const gameLimit = Number.parseInt(requestedGameWindow, 10);
  const activeGameEntries = Number.isFinite(gameLimit) ? gameTimeline.slice(-gameLimit) : gameTimeline;
  const activeGameKeys = new Set(activeGameEntries.map(entry => `${entry.tournamentIndex}:${entry.gameIndex}`));
  const activeGames = activeGameEntries.map(entry => entry.game);
  const players = new Map(roster.players.map(player => [player.id, {
    playerId: player.id,
    games: 0,
    score: 0,
    scoreSquared: 0,
    kda: 0,
    totalMinutes: 0,
    cs: 0,
    kp: 0,
    gold: 0,
    kills: 0,
    assists: 0,
    deaths: 0,
    vision: 0,
    damage: 0,
    championGames: new Map()
  }]));
  const champions = new Map();
  const bans = new Map();
  const ourBans = new Map();
  const enemyChampionRecords = new Map();
  const gameAwards = [];
  const playerRecords = [];

  tournaments.forEach((tournament, tournamentIndex) => tournament.games.forEach((game, gameIndex) => {
    if (!activeGameKeys.has(`${tournamentIndex}:${gameIndex}`)) return;
    const durationSeconds = Math.max(0, Number(game.durationSeconds || 0));
    const teamKills = (game.players || []).reduce(
      (total, player) => total + Math.max(0, Number(player.kills || 0)),
      0
    );
    const teamDeaths = (game.players || []).reduce(
      (total, player) => total + Math.max(0, Number(player.deaths || 0)),
      0
    );
    const enemyTeamKills = Math.max(0, Number(game.enemyTeamKills || 0));

    gameAwards.push({
      tournamentName: tournament.name || 'Unknown tournament',
      tournamentDate: tournament.date || '',
      tournamentId: manifest.tournaments[tournamentIndex].split('/').at(-1).replace('.json', ''),
      opponent: game.opponent || 'Unknown opponent',
      gameNumber: gameIndex + 1,
      durationSeconds,
      teamKills,
      teamDeaths,
      enemyTeamKills,
      killDifference: teamKills - enemyTeamKills,
      result: String(game.result || '').toLowerCase()
    });

    (game.enemyBans || []).filter(Boolean).forEach(champion => {
      bans.set(champion, (bans.get(champion) || 0) + 1);
    });
    (game.ourBans || []).filter(Boolean).forEach(champion => {
      ourBans.set(champion, (ourBans.get(champion) || 0) + 1);
    });
    new Set((game.enemyPlayers || []).map(player => player.champion).filter(Boolean)).forEach(champion => {
      const record = enemyChampionRecords.get(champion) || { champion, games: 0, wins: 0 };
      record.games += 1;
      if (game.result === 'win') record.wins += 1;
      enemyChampionRecords.set(champion, record);
    });

    scoreGame(game).forEach(row => {
      playerRecords.push({
        ...row,
        result: String(game.result || '').toLowerCase(),
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
          scoreSquared: 0,
          kda: 0,
          totalMinutes: 0,
          cs: 0,
          kp: 0,
          gold: 0,
          kills: 0,
          assists: 0,
          deaths: 0,
          vision: 0,
          damage: 0,
          championGames: new Map()
        });
      }

      const player = players.get(row.playerId);
      player.games += 1;
      player.score += row.score;
      player.scoreSquared += row.score ** 2;
      player.kda += row.kda;
      player.totalMinutes += Math.max(0, Number(game.durationSeconds || 0)) / 60;
      player.cs += Number(row.cs || 0);
      player.kp += row.kp;
      player.gold += Number(row.gold || 0);
      player.kills += Number(row.kills || 0);
      player.assists += Number(row.assists || 0);
      player.deaths += Number(row.deaths || 0);
      player.vision += Number(row.visionScore || 0);
      player.damage += Number(row.damage || 0);

      const championName = row.champion || 'Unknown';
      player.championGames.set(championName, (player.championGames.get(championName) || 0) + 1);
      const champion = champions.get(championName) || {
        champion: championName,
        games: 0,
        score: 0,
        players: new Set(),
        roles: new Set()
      };
      champion.games += 1;
      champion.score += row.score;
      champion.players.add(row.playerId);
      champion.roles.add(row.role);
      champions.set(championName, champion);
    });
  }));

  const rankedPlayers = [...players.values()]
    .filter(player => player.games > 0)
    .map(player => {
      const oneTrick = [...player.championGames.entries()]
        .filter(([, games]) => games >= 2)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      return {
        ...player,
        averageScore: player.score / player.games,
        ratingDeviation: Math.sqrt(Math.max(0, player.scoreSquared / player.games - (player.score / player.games) ** 2)),
        averageKda: player.kda / player.games,
        csPerMinute: player.totalMinutes > 0 ? player.cs / player.totalMinutes : 0,
        averageKp: player.kp / player.games,
        goldPerMinute: player.totalMinutes > 0 ? player.gold / player.totalMinutes : 0,
        averageKills: player.kills / player.games,
        averageAssists: player.assists / player.games,
        averageDeaths: player.deaths / player.games,
        visionPerMinute: player.totalMinutes > 0 ? player.vision / player.totalMinutes : 0,
        damagePerMinute: player.totalMinutes > 0 ? player.damage / player.totalMinutes : 0,
        oneTrickChampion: oneTrick?.[0],
        oneTrickGames: oneTrick?.[1] || 0,
        oneTrickShare: oneTrick ? oneTrick[1] / player.games : 0
      };
    });

  const rankedChampions = [...champions.values()]
    .filter(champion => champion.games > 0)
    .map(champion => ({
      ...champion,
      averageScore: champion.score / champion.games,
      playerCount: champion.players.size,
      roleCount: champion.roles.size
    }));

  const topPlayers = (key, ascending = false) => [...rankedPlayers]
    .sort((a, b) => (ascending ? a[key] - b[key] : b[key] - a[key]) || b.games - a.games)
    .slice(0, 3);

  const mostConsistentPlayers = [...rankedPlayers]
    .filter(player => player.games >= 5)
    .sort((a, b) => a.ratingDeviation - b.ratingDeviation || b.averageScore - a.averageScore || b.games - a.games)
    .slice(0, 3);

  const biggestCoinFlippers = [...rankedPlayers]
    .filter(player => player.games >= 5)
    .sort((a, b) => b.ratingDeviation - a.ratingDeviation || b.averageScore - a.averageScore || b.games - a.games)
    .slice(0, 3);

  const biggestOneTricks = [...rankedPlayers]
    .filter(player => player.oneTrickGames >= 2)
    .sort((a, b) => b.oneTrickShare - a.oneTrickShare || b.oneTrickGames - a.oneTrickGames || b.games - a.games)
    .slice(0, 3);

  const topChampions = ascending => [...rankedChampions]
    .sort((a, b) => (ascending ? a.averageScore - b.averageScore : b.averageScore - a.averageScore) || b.games - a.games)
    .slice(0, 3);

  const topBans = [...bans.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([champion, count]) => ({ champion, count }));

  const publicEnemies = [...ourBans.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([champion, count]) => ({ champion, count }));

  const biggestFlexes = [...rankedChampions]
    .sort((a, b) => b.playerCount - a.playerCount || b.roleCount - a.roleCount || b.games - a.games || a.champion.localeCompare(b.champion))
    .slice(0, 3);

  const overallWinrate = activeGames.length ? activeGames.filter(game => game.result === 'win').length / activeGames.length : 0;
  const nemesisPriorGames = 3000;
  const nemeses = [...enemyChampionRecords.values()]
    .filter(champion => champion.games >= 1)
    .map(champion => ({
      ...champion,
      winrate: champion.wins / champion.games,
      adjustedWinrate: (champion.wins + overallWinrate * nemesisPriorGames) / (champion.games + nemesisPriorGames)
    }))
    .sort((a, b) => a.adjustedWinrate - b.adjustedWinrate || b.games - a.games || a.champion.localeCompare(b.champion))
    .slice(0, 3);

  const formatDuration = seconds => {
    const safeSeconds = Math.max(0, Math.round(Number(seconds || 0)));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  };

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
  const safestGames = [...gameAwards]
    .sort((a, b) => a.teamDeaths - b.teamDeaths || b.killDifference - a.killDifference)
    .slice(0, 3);
  const painfulLosses = [...gameAwards]
    .filter(game => game.result === 'loss')
    .sort((a, b) => b.killDifference - a.killDifference || b.teamKills - a.teamKills)
    .slice(0, 3);
  const dominantWins = [...gameAwards]
    .filter(game => game.result === 'win')
    .sort((a, b) => b.killDifference - a.killDifference || b.teamKills - a.teamKills)
    .slice(0, 3);
  const bestPerformances = [...playerRecords]
    .sort((a, b) => b.score - a.score || b.kda - a.kda || Number(b.damage || 0) - Number(a.damage || 0))
    .slice(0, 10);

  const legends = [
    { icon: '🏆', title: 'Overall MVP', ranking: topPlayers('averageScore'), value: player => `${format(player.averageScore)} rating` },
    { icon: '💀', title: 'Overall Inter', ranking: topPlayers('averageScore', true), value: player => `${format(player.averageScore)} rating` }
  ];

  const playerAwards = [
    { icon: '⚔️', title: 'Untouchable', ranking: topPlayers('averageKda'), value: player => `${format(player.averageKda, 2)} KDA` },
    { icon: '🤝', title: 'Playmaker', ranking: topPlayers('averageKp'), value: player => `${Math.round(player.averageKp * 100)}% KP` },
    { icon: '💥', title: 'Damage Gremlin', ranking: topPlayers('damagePerMinute'), value: player => `${Math.round(player.damagePerMinute).toLocaleString()} damage/min` },
    { icon: '🌾', title: 'Farmer', ranking: topPlayers('csPerMinute'), value: player => `${format(player.csPerMinute, 2)} CS/min` },
    { icon: '🪙', title: 'Gold Goblin', ranking: topPlayers('goldPerMinute'), value: player => `${Math.round(player.goldPerMinute).toLocaleString()} gold/min` },
    { icon: '👁️', title: 'Visionair', ranking: topPlayers('visionPerMinute'), value: player => `${format(player.visionPerMinute, 2)} vision/min` },
    { icon: '🩶', title: 'Gray Screen Farmer', ranking: topPlayers('averageDeaths'), value: player => `${format(player.averageDeaths, 2)} deaths/game` },
    { icon: '💅', title: 'E-girl', ranking: topPlayers('averageAssists'), value: player => `${format(player.averageAssists, 2)} assists/game` },
    { icon: '🪓', title: 'Kill stealer', ranking: topPlayers('averageKills'), value: player => `${format(player.averageKills, 2)} kills/game` },
    { icon: '🤲', title: 'Steady Hands', ranking: mostConsistentPlayers, value: player => `${format(player.ratingDeviation, 2)} rating deviation` },
    { icon: '🎲', title: 'Dice Roller', ranking: biggestCoinFlippers, value: player => `${format(player.ratingDeviation, 2)} rating deviation` },
    { icon: '🦄', title: 'One Trick Pony', ranking: biggestOneTricks, value: player => `${Math.round(player.oneTrickShare * 100)}% ${player.oneTrickChampion} (${player.oneTrickGames} games)` }
  ];


  const topPlayerRecords = key => [...playerRecords]
    .sort((a, b) => Number(b[key] || 0) - Number(a[key] || 0))
    .slice(0, 3);

  const playerRecordAwards = [
    { icon: '⚔️', title: 'Most Kills', ranking: topPlayerRecords('kills'), value: record => `${Number(record.kills || 0)} kills - ${record.champion || 'Unknown'}` },
    { icon: '💀', title: 'Most Deaths', ranking: topPlayerRecords('deaths'), value: record => `${Number(record.deaths || 0)} deaths - ${record.champion || 'Unknown'}` },
    { icon: '🤝', title: 'Most Assists', ranking: topPlayerRecords('assists'), value: record => `${Number(record.assists || 0)} assists - ${record.champion || 'Unknown'}` },
    { icon: '💥', title: 'Most Damage', ranking: topPlayerRecords('damage'), value: record => `${Number(record.damage || 0).toLocaleString()} damage - ${record.champion || 'Unknown'}` },
    { icon: '🪙', title: 'Most Gold', ranking: topPlayerRecords('gold'), value: record => `${Number(record.gold || 0).toLocaleString()} gold - ${record.champion || 'Unknown'}` },
    { icon: '📈', title: 'Highest KDA', ranking: topPlayerRecords('kda'), value: record => `${format(record.kda, 2)} KDA - ${record.champion || 'Unknown'}` }
  ];

  const medalForPlace = place => ({ 1: '🥇', 2: '🥈', 3: '🥉' }[place] || '');

  const displayName = (entry, name, nameHref) => {
    const label = name(entry);
    return nameHref ? `<a class="player-name-link" href="${nameHref(entry)}">${label}</a>` : label;
  };

  const runnerUp = (entry, place, name, value, nameHref, href) => `
    <div class="fun-runner">
      <span class="fun-medal-icon" aria-label="${place === 2 ? 'Second place' : 'Third place'}">${medalForPlace(place)}</span>
      <strong>${entry ? displayName(entry, name, nameHref) : '—'}</strong>
      <small>${entry ? href ? `<a class="player-name-link" href="${href(entry)}">${value(entry)}</a>` : value(entry) : ''}</small>
    </div>`;

  const rankingCard = ({ icon, title, ranking, name, value, href, nameHref }) => {
    const [winner, second, third] = ranking;
    const destination = winner && href ? href(winner) : '';
    const tag = destination && !nameHref ? 'a' : 'article';
    const linkAttributes = destination
      ? tag === 'a' ? ` href="${destination}" class="card fun-card fun-card-link" aria-label="Open ${title} game"` : ' class="card fun-card"'
      : ' class="card fun-card"';
    return `
      <${tag}${linkAttributes}>
        <div class="fun-card-head">
          <span class="fun-icon">${icon}</span>
          <p class="eyebrow">${title}</p>
        </div>
        <div class="fun-winner">
          <span class="fun-medal-icon fun-medal-winner" aria-label="First place">🥇</span>
          <h2>${winner ? displayName(winner, name, nameHref) : '—'}</h2>
          <p>${winner ? destination && nameHref ? `<a class="player-name-link" href="${destination}">${value(winner)}</a>` : value(winner) : 'No data recorded'}</p>
        </div>
        <div class="fun-runners">
          ${runnerUp(second, '2', name, value, nameHref, tag === 'a' ? undefined : href)}
          ${runnerUp(third, '3', name, value, nameHref, tag === 'a' ? undefined : href)}
        </div>
      </${tag}>`;
  };

  const playerCard = card => rankingCard({
    ...card,
    name: player => playerName(roster.players, player.playerId),
    nameHref: player => `player.html?id=${encodeURIComponent(player.playerId)}`
  });

  const playerRecordCard = card => rankingCard({
    ...card,
    name: record => playerName(roster.players, record.playerId),
    nameHref: record => `player.html?id=${encodeURIComponent(record.playerId)}`,
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
    title: 'Most Feared Champion',
    ranking: topBans,
    name: champion => champion.champion,
    value: champion => `${champion.count} enemy ban${champion.count === 1 ? '' : 's'}`
  });

  const publicEnemyCard = rankingCard({
    icon: '🎯',
    title: 'Public Enemy',
    ranking: publicEnemies,
    name: champion => champion.champion,
    value: champion => `${champion.count} ban${champion.count === 1 ? '' : 's'} by us`
  });

  const biggestFlexCard = rankingCard({
    icon: '💪',
    title: 'Biggest Flex',
    ranking: biggestFlexes,
    name: champion => champion.champion,
    value: champion => `${champion.playerCount} player${champion.playerCount === 1 ? '' : 's'} · ${champion.roleCount} role${champion.roleCount === 1 ? '' : 's'}`
  });

  const nemesisCard = rankingCard({
    icon: '😈',
    title: 'Nemesis',
    ranking: nemeses,
    name: champion => champion.champion,
    value: champion => `${Math.round(champion.winrate * 100)}% win rate (${champion.games} games)`
  });

  const gameCard = (icon, title, ranking, metric) => rankingCard({
    icon,
    title,
    ranking,
    name: game => metric(game),
    value: gameContext,
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
        ${biggestFlexCard}
        ${bannedCard}
        ${publicEnemyCard}
        ${nemesisCard}
      </div>
    </section>
    <section class="fun-section">
      <h2 class="fun-section-title">Game awards</h2>
      <div class="fun-grid">
        ${gameCard('⏱️', 'Longest Game', longestGames, game => formatDuration(game.durationSeconds))}
        ${gameCard('⚡', 'Shortest Game', shortestGames, game => formatDuration(game.durationSeconds))}
        ${gameCard('🔥', 'Highest Kill Game', highestKillGames, game => `${game.teamKills} team kills`)}
        ${gameCard('🛡️', 'Safest Game', safestGames, game => `${game.teamDeaths} team deaths`)}
        ${gameCard('💔', 'Most Painful Loss', painfulLosses, game => `${game.teamKills}–${game.enemyTeamKills} kills (${game.killDifference >= 0 ? '+' : ''}${game.killDifference})`)}
        ${gameCard('👊', 'Most Dominant Win', dominantWins, game => `${game.teamKills}–${game.enemyTeamKills} kills (+${game.killDifference})`)}
      </div>
    </section>
    <section class="fun-section">
      <h2 class="fun-section-title">Top 10 performances</h2>
      <div class="best-performance-list">
        ${bestPerformances.map(performance => `<a class="card best-performance ${performance.result}" href="tournament.html?id=${encodeURIComponent(performance.tournamentId)}#game-${performance.gameNumber}">
          <span class="recent-result">${performance.result === 'win' ? 'Victory' : 'Defeat'}</span>
          <strong>${playerName(roster.players, performance.playerId)}</strong>
          <span>${performance.champion}</span>
          <span>${performance.kills}/${performance.deaths}/${performance.assists}</span>
          <span><b>${performance.score.toFixed(1)}</b> · ${performance.grade}</span>
          <small>${performance.tournamentName} · Game ${performance.gameNumber}</small>
        </a>`).join('') || '<p>No performances recorded.</p>'}
      </div>
    </section>`;
} catch (error) {
  root.innerHTML = `<p class="error">${error.message}</p>`;
}
