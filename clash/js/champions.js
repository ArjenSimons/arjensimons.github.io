import { loadJson } from './common.js';
import { scoreGame } from './scoring.js';

const root = document.querySelector('#champion-stats');
const sortSelect = document.querySelector('#champion-sort');

const sorters = {
  games: (a, b) => b.games - a.games,
  score: (a, b) => b.averageScore - a.averageScore,
  winrate: (a, b) => b.winrate - a.winrate,
  kda: (a, b) => b.averageKda - a.averageKda,
  kp: (a, b) => b.averageKp - a.averageKp,
  cs: (a, b) => b.csPerMinute - a.csPerMinute,
  gold: (a, b) => b.goldPerMinute - a.goldPerMinute,
  vision: (a, b) => b.visionPerMinute - a.visionPerMinute,
  damage: (a, b) => b.damagePerMinute - a.damagePerMinute,
  name: (a, b) => a.champion.localeCompare(b.champion)
};

const numericKeys = ['games', 'winrate', 'averageScore', 'averageKda', 'averageKp', 'csPerMinute', 'goldPerMinute', 'visionPerMinute', 'damagePerMinute'];
const isLeader = (item, key, maxima) => Math.abs(item[key] - maxima[key]) < 1e-9;

try {
  const manifest = await loadJson('./data/index.json');
  const tournaments = await Promise.all(manifest.tournaments.map(path => loadJson(`./data/${path}`)));
  const champions = new Map();

  tournaments.forEach(tournament => tournament.games.forEach(game => {
    scoreGame(game).forEach(row => {
      const champion = row.champion || 'Unknown';
      const item = champions.get(champion) || {
        champion, games: 0, wins: 0, totalScore: 0, totalKda: 0,
        totalKp: 0, totalMinutes: 0, totalCs: 0, totalGold: 0, totalVision: 0, totalDamage: 0
      };
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
      champions.set(champion, item);
    });
  }));

  const rows = [...champions.values()].map(item => ({
    ...item,
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

  function render(sortKey = 'games') {
    const ranked = [...rows].sort((a, b) => sorters[sortKey](a, b) || b.games - a.games || a.champion.localeCompare(b.champion));
    root.innerHTML = ranked.length ? `<div class="table-wrap ranking-table-wrap"><table class="ranking-table">
      <thead><tr><th>#</th><th>Champion</th><th>Games</th><th>Win rate</th><th>Score</th><th>KDA</th><th>KP</th><th>CS/min</th><th>Gold/min</th><th>Vision/min</th><th>Damage/min</th></tr></thead>
      <tbody>${ranked.map((item, index) => `<tr>
        <td class="rank-cell">${index + 1}</td>
        <td><strong>${item.champion}</strong></td>
        <td class="${isLeader(item, 'games', maxima) ? 'stat-leader' : ''}">${item.games}</td>
        <td class="${isLeader(item, 'winrate', maxima) ? 'stat-leader' : ''}">${Math.round(item.winrate * 100)}%</td>
        <td class="${isLeader(item, 'averageScore', maxima) ? 'stat-leader' : ''}">${item.averageScore.toFixed(1)}</td>
        <td class="${isLeader(item, 'averageKda', maxima) ? 'stat-leader' : ''}">${item.averageKda.toFixed(2)}</td>
        <td class="${isLeader(item, 'averageKp', maxima) ? 'stat-leader' : ''}">${Math.round(item.averageKp * 100)}%</td>
        <td class="${isLeader(item, 'csPerMinute', maxima) ? 'stat-leader' : ''}">${item.csPerMinute.toFixed(2)}</td>
        <td class="${isLeader(item, 'goldPerMinute', maxima) ? 'stat-leader' : ''}">${Math.round(item.goldPerMinute).toLocaleString()}</td>
        <td class="${isLeader(item, 'visionPerMinute', maxima) ? 'stat-leader' : ''}">${item.visionPerMinute.toFixed(2)}</td>
        <td class="${isLeader(item, 'damagePerMinute', maxima) ? 'stat-leader' : ''}">${Math.round(item.damagePerMinute).toLocaleString()}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : '<p>No champion games recorded.</p>';
  }

  sortSelect.addEventListener('change', () => render(sortSelect.value));
  render(sortSelect.value);
} catch (error) {
  root.innerHTML = `<p class="error">${error.message}</p>`;
}
