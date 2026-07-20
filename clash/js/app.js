import { loadJson, playerName, formatDate } from './common.js';
import { summarizeTournament } from './scoring.js';

const root = document.querySelector('#tournaments');
try {
  const [roster, manifest] = await Promise.all([loadJson('./data/players.json'), loadJson('./data/index.json')]);
  const tournaments = await Promise.all(manifest.tournaments.map(path => loadJson(`./data/${path}`)));
  tournaments.sort((a,b) => b.date.localeCompare(a.date));
  const wins = tournaments.reduce((n,t) => n + t.games.filter(g => g.result === 'win').length, 0);
  const games = tournaments.reduce((n,t) => n + t.games.length, 0);
  document.querySelector('#summary').innerHTML = `
    <article class="summary-card"><span>Tournaments</span><strong>${tournaments.length}</strong></article>
    <article class="summary-card"><span>Match record</span><strong>${wins}-${games-wins}</strong></article>
    <article class="summary-card"><span>Win rate</span><strong>${games ? Math.round(wins/games*100) : 0}%</strong></article>`;
  const playerStats = new Map(roster.players.map(player => [player.id, { ...player, games: 0, wins: 0, mvps: 0, ints: 0 }]));
  tournaments.forEach(tournament => {
    const summary = summarizeTournament(tournament);
    if (summary.mvp && playerStats.has(summary.mvp.playerId)) playerStats.get(summary.mvp.playerId).mvps += 1;
    if (summary.inter && playerStats.has(summary.inter.playerId)) playerStats.get(summary.inter.playerId).ints += 1;
    tournament.games.forEach(game => game.players.forEach(appearance => {
      const stats = playerStats.get(appearance.playerId);
      if (!stats) return;
      stats.games += 1;
      if (game.result === 'win') stats.wins += 1;
    }));
  });
  document.querySelector('#players').innerHTML = [...playerStats.values()].map(player => {
    const winrate = player.games ? Math.round(player.wins / player.games * 100) : 0;
    return `<article class="card player-card"><h2>${player.name}</h2><dl class="player-stats"><div><dt>Games</dt><dd>${player.games}</dd></div><div><dt>Win rate</dt><dd>${winrate}%</dd></div><div><dt>MVPs</dt><dd>${player.mvps}</dd></div><div><dt>INTs</dt><dd>${player.ints}</dd></div></dl></article>`;
  }).join('');
  root.innerHTML = tournaments.map(t => {
    const s = summarizeTournament(t);
    return `<article class="card tournament-card"><div><p class="eyebrow">${formatDate(t.date)} · Tier ${t.tier ?? '—'}</p><h2>${t.name}</h2><p>${t.placement === 1 ? '🏆 Champions' : `Placement: ${t.placement ?? '—'}`} · ${t.games.filter(g=>g.result==='win').length}-${t.games.filter(g=>g.result!=='win').length}</p></div><div class="awards"><span>🏅 MVP <b>${playerName(roster.players,s.mvp?.playerId)}</b></span><span>💀 Inter <b>${playerName(roster.players,s.inter?.playerId)}</b></span></div><a class="button" href="tournament.html?id=${encodeURIComponent(t.id)}">Open tournament</a></article>`;
  }).join('') || '<p>No tournaments yet.</p>';
} catch (e) { root.innerHTML = `<p class="error">${e.message}. Open this through a web server rather than directly from the file system.</p>`; }
