import { loadJson, playerName } from './common.js';
import { scoreGame, summarizeTournament } from './scoring.js';

const root = document.querySelector('#player-rankings');
const sortSelect = document.querySelector('#player-sort');
const blankPlayer = playerId => ({
  playerId, games: 0, wins: 0, totalScore: 0, totalKda: 0, totalKp: 0,
  totalMinutes: 0, totalCs: 0, totalGold: 0, totalVision: 0, totalDamage: 0, mvps: 0, ints: 0
});

const sorters = {
  score: (a, b) => b.averageScore - a.averageScore,
  games: (a, b) => b.games - a.games,
  winrate: (a, b) => b.winrate - a.winrate,
  kda: (a, b) => b.averageKda - a.averageKda,
  kp: (a, b) => b.averageKp - a.averageKp,
  cs: (a, b) => b.csPerMinute - a.csPerMinute,
  gold: (a, b) => b.goldPerMinute - a.goldPerMinute,
  vision: (a, b) => b.visionPerMinute - a.visionPerMinute,
  damage: (a, b) => b.damagePerMinute - a.damagePerMinute,
  mvps: (a, b) => b.mvps - a.mvps,
  ints: (a, b) => b.ints - a.ints,
  name: (a, b) => a.name.localeCompare(b.name)
};

const numericKeys = ['games', 'winrate', 'averageScore', 'averageKda', 'averageKp', 'csPerMinute', 'goldPerMinute', 'visionPerMinute', 'damagePerMinute', 'mvps', 'ints'];
const isLeader = (item, key, maxima) => Math.abs(item[key] - maxima[key]) < 1e-9;

try {
  const [roster, manifest] = await Promise.all([loadJson('./data/players.json'), loadJson('./data/index.json')]);
  const tournaments = await Promise.all(manifest.tournaments.map(path => loadJson(`./data/${path}`)));
  const players = new Map(roster.players.map(player => [player.id, blankPlayer(player.id)]));

  tournaments.forEach(tournament => {
    const summary = summarizeTournament(tournament);
    if (summary.mvp) {
      if (!players.has(summary.mvp.playerId)) players.set(summary.mvp.playerId, blankPlayer(summary.mvp.playerId));
      players.get(summary.mvp.playerId).mvps += 1;
    }
    if (summary.inter) {
      if (!players.has(summary.inter.playerId)) players.set(summary.inter.playerId, blankPlayer(summary.inter.playerId));
      players.get(summary.inter.playerId).ints += 1;
    }
    tournament.games.forEach(game => scoreGame(game).forEach(row => {
      if (!players.has(row.playerId)) players.set(row.playerId, blankPlayer(row.playerId));
      const item = players.get(row.playerId);
      item.games += 1;
      item.totalScore += row.score;
      item.totalKda += row.kda;
      item.totalKp += row.kp;
      item.totalMinutes += Math.max(0, Number(game.durationSeconds || 0)) / 60;
      item.totalCs += Number(row.cs || 0);
      item.totalGold += Number(row.gold || 0);
      item.totalVision += Number(row.visionScore || 0);
      item.totalDamage += Number(row.damage || 0);
      if (game.result === 'win') item.wins += 1;
    }));
  });

  const rows = [...players.values()].filter(item => item.games > 0).map(item => ({
    ...item,
    name: playerName(roster.players, item.playerId),
    averageScore: item.totalScore / item.games,
    averageKda: item.totalKda / item.games,
    averageKp: item.totalKp / item.games,
    csPerMinute: item.totalMinutes > 0 ? item.totalCs / item.totalMinutes : 0,
    goldPerMinute: item.totalMinutes > 0 ? item.totalGold / item.totalMinutes : 0,
    visionPerMinute: item.totalMinutes > 0 ? item.totalVision / item.totalMinutes : 0,
    damagePerMinute: item.totalMinutes > 0 ? item.totalDamage / item.totalMinutes : 0,
    winrate: item.wins / item.games
  }));

  const maxima = Object.fromEntries(numericKeys.map(key => [key, Math.max(...rows.map(item => item[key]))]));

  function render(sortKey = 'score') {
    const ranked = [...rows].sort((a, b) => sorters[sortKey](a, b) || b.games - a.games || a.name.localeCompare(b.name));
    root.innerHTML = ranked.length ? `<div class="table-wrap ranking-table-wrap"><table class="ranking-table player-stats-table">
      <thead><tr><th>#</th><th>Player</th><th>Games</th><th>Win rate</th><th>Score</th><th>KDA</th><th>KP</th><th>CS/min</th><th>Gold/min</th><th>Vision/min</th><th>Damage/min</th><th>MVPs</th><th>INTs</th></tr></thead>
      <tbody>${ranked.map((item, index) => `<tr>
        <td class="rank-cell">${index + 1}</td>
        <td><strong>${item.name}</strong></td>
        <td class="${isLeader(item, 'games', maxima) ? 'stat-leader' : ''}">${item.games}</td>
        <td class="${isLeader(item, 'winrate', maxima) ? 'stat-leader' : ''}">${Math.round(item.winrate * 100)}%</td>
        <td class="${isLeader(item, 'averageScore', maxima) ? 'stat-leader' : ''}">${item.averageScore.toFixed(1)}</td>
        <td class="${isLeader(item, 'averageKda', maxima) ? 'stat-leader' : ''}">${item.averageKda.toFixed(2)}</td>
        <td class="${isLeader(item, 'averageKp', maxima) ? 'stat-leader' : ''}">${Math.round(item.averageKp * 100)}%</td>
        <td class="${isLeader(item, 'csPerMinute', maxima) ? 'stat-leader' : ''}">${item.csPerMinute.toFixed(2)}</td>
        <td class="${isLeader(item, 'goldPerMinute', maxima) ? 'stat-leader' : ''}">${Math.round(item.goldPerMinute).toLocaleString()}</td>
        <td class="${isLeader(item, 'visionPerMinute', maxima) ? 'stat-leader' : ''}">${item.visionPerMinute.toFixed(2)}</td>
        <td class="${isLeader(item, 'damagePerMinute', maxima) ? 'stat-leader' : ''}">${Math.round(item.damagePerMinute).toLocaleString()}</td>
        <td class="${isLeader(item, 'mvps', maxima) ? 'stat-leader' : ''}">${item.mvps}</td>
        <td class="${isLeader(item, 'ints', maxima) ? 'stat-leader' : ''}">${item.ints}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : '<p>No player games recorded.</p>';
  }

  sortSelect.addEventListener('change', () => render(sortSelect.value));
  render(sortSelect.value);
} catch (error) {
  root.innerHTML = `<p class="error">${error.message}</p>`;
}
