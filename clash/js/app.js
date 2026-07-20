import { loadJson, playerName, formatDate } from './common.js';
import { summarizeTournament } from './scoring.js';

const root = document.querySelector('#tournaments');
try {
  const [roster, manifest] = await Promise.all([loadJson('./data/players.json'), loadJson('./data/index.json')]);
  document.querySelector('#team-name').textContent = roster.teamName;
  const tournaments = await Promise.all(manifest.tournaments.map(path => loadJson(`./data/${path}`)));
  tournaments.sort((a,b) => b.date.localeCompare(a.date));
  const wins = tournaments.reduce((n,t) => n + t.games.filter(g => g.result === 'win').length, 0);
  const games = tournaments.reduce((n,t) => n + t.games.length, 0);
  document.querySelector('#summary').innerHTML = `<strong>${tournaments.length}</strong><span>Tournaments</span><strong>${wins}-${games-wins}</strong><span>Match record</span><strong>${games ? Math.round(wins/games*100) : 0}%</strong><span>Win rate</span>`;
  root.innerHTML = tournaments.map(t => {
    const s = summarizeTournament(t);
    return `<article class="card tournament-card"><div><p class="eyebrow">${formatDate(t.date)} · Tier ${t.tier ?? '—'}</p><h2>${t.name}</h2><p>${t.placement === 1 ? '🏆 Champions' : `Placement: ${t.placement ?? '—'}`} · ${t.games.filter(g=>g.result==='win').length}-${t.games.filter(g=>g.result!=='win').length}</p></div><div class="awards"><span>🏅 MVP <b>${playerName(roster.players,s.mvp?.playerId)}</b></span><span>💀 Inter <b>${playerName(roster.players,s.inter?.playerId)}</b></span></div><a class="button" href="tournament.html?id=${encodeURIComponent(t.id)}">Open tournament</a></article>`;
  }).join('') || '<p>No tournaments yet.</p>';
} catch (e) { root.innerHTML = `<p class="error">${e.message}. Open this through a web server rather than directly from the file system.</p>`; }
