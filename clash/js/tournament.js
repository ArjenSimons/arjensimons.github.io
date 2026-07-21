import { loadJson, playerName, formatDate, resultLabel } from './common.js';
import { scoreGame, summarizeTournament, ROLES } from './scoring.js';

const id = new URLSearchParams(location.search).get('id');
const root = document.querySelector('#content');
const list = values => values?.length ? values.map(value => `<span class="draft-chip">${value}</span>`).join('') : '<span class="muted">Not entered</span>';

try {
  const [roster, manifest] = await Promise.all([
    loadJson('./data/players.json'),
    loadJson('./data/index.json')
  ]);
  const path = manifest.tournaments.find(item => item.split('/').at(-1).replace('.json', '') === id);
  if (!path) throw new Error('Tournament not found');

  const tournament = await loadJson(`./data/${path}`);
  const summary = summarizeTournament(tournament);

  root.innerHTML = `
    <header class="hero compact">
      <p class="eyebrow">${formatDate(tournament.date)} · Tier ${tournament.tier ?? '—'}</p>
      <h1>${tournament.name}</h1>
      <p>${tournament.placement === 1 ? '🏆 Champions' : `Placement ${tournament.placement ?? '—'}`}</p>
    </header>

    <section class="award-grid">
      <article class="card award"><span>🏅 Tournament MVP</span><h2>${playerName(roster.players, summary.mvp?.playerId)}</h2><strong>${summary.mvp?.average.toFixed(1)} · ${summary.mvp?.grade}</strong></article>
      <article class="card award"><span>💀 Inter of the tournament</span><h2>${playerName(roster.players, summary.inter?.playerId)}</h2><strong>${summary.inter?.average.toFixed(1)} · ${summary.inter?.grade}</strong></article>
    </section>

    <section><h2>Overall standings</h2><div class="table-wrap"><table><thead><tr><th>Player</th><th>Games</th><th>Roles</th><th>Rating</th><th>Grade</th></tr></thead><tbody>${summary.players.map(player => `<tr><td>${playerName(roster.players, player.playerId)}</td><td>${player.games}</td><td>${player.roles.join(', ')}</td><td>${player.average.toFixed(1)}</td><td><b>${player.grade}</b></td></tr>`).join('')}</tbody></table></div></section>

    ${tournament.games.map((game, index) => {
      const rows = scoreGame(game);
      const ourKills = game.players.reduce((sum, player) => sum + Number(player.kills || 0), 0);
      const enemyKills = Number.isFinite(Number(game.enemyTeamKills)) ? Number(game.enemyTeamKills) : game.players.reduce((sum, player) => sum + Number(player.deaths || 0), 0);
      const enemyByRole = new Map((game.enemyPlayers || []).map(player => [player.role, player.champion]));
      const maxima = {
        kda: Math.max(...rows.map(player => Number(player.kda || 0))),
        kp: Math.max(...rows.map(player => Number(player.kp || 0))),
        cs: Math.max(...rows.map(player => Number(player.cs || 0))),
        gold: Math.max(...rows.map(player => Number(player.gold || 0))),
        damage: Math.max(...rows.map(player => Number(player.damage || 0))),
        visionScore: Math.max(...rows.map(player => Number(player.visionScore || 0))),
        score: Math.max(...rows.map(player => Number(player.score || 0)))
      };
      const leaderClass = (player, key) => Math.abs(Number(player[key] || 0) - maxima[key]) < 1e-9 ? 'stat-leader' : '';
      return `<section class="card game" id="game-${index + 1}">
        <div class="game-head">
          <div><p class="eyebrow">Game ${index + 1}</p><h2 class="${game.result}">${resultLabel(game.result)} vs ${game.opponent}</h2></div>
          <div class="game-score"><strong>${ourKills} – ${enemyKills}</strong><span>${Math.floor(game.durationSeconds / 60)}:${String(game.durationSeconds % 60).padStart(2, '0')}</span></div>
        </div>

        <div class="match-draft">
          <div class="draft-column"><h3>Knoller picks</h3>${ROLES.map(role => { const player = game.players.find(entry => entry.role === role); return `<div class="draft-row"><span>${role}</span><b>${player?.champion || '—'}</b></div>`; }).join('')}</div>
          <div class="draft-column"><h3>Enemy picks</h3>${ROLES.map(role => `<div class="draft-row"><span>${role}</span><b>${enemyByRole.get(role) || '—'}</b></div>`).join('')}</div>
          <div class="draft-column"><h3>Banned by us</h3><div class="draft-chips">${list(game.ourBans)}</div></div>
          <div class="draft-column"><h3>Banned by enemy</h3><div class="draft-chips">${list(game.enemyBans)}</div></div>
        </div>

        <div class="table-wrap"><table><thead><tr><th>Role</th><th>Player</th><th>Champion</th><th>K/D/A</th><th>KDA</th><th>KP</th><th>CS</th><th>Gold</th><th>Damage</th><th>Vision</th><th>Rating</th></tr></thead><tbody>${rows.map(player => `<tr><td>${player.role}</td><td>${playerName(roster.players, player.playerId)}</td><td>${player.champion}</td><td>${player.kills}/${player.deaths}/${player.assists}</td><td class="${leaderClass(player, 'kda')}">${player.kda.toFixed(2)}</td><td class="${leaderClass(player, 'kp')}">${Math.round(player.kp * 100)}%</td><td class="${leaderClass(player, 'cs')}">${player.cs}</td><td class="${leaderClass(player, 'gold')}">${Number(player.gold).toLocaleString()}</td><td class="${leaderClass(player, 'damage')}">${Number(player.damage).toLocaleString()}</td><td class="${leaderClass(player, 'visionScore')}">${player.visionScore}</td><td class="${leaderClass(player, 'score')}"><b>${player.score.toFixed(1)} · ${player.grade}</b></td></tr>`).join('')}</tbody></table></div>
      </section>`;
    }).join('')}`;
} catch (error) {
  root.innerHTML = `<p class="error">${error.message}</p>`;
}
