import { loadJson, playerName, formatDate } from './common.js';
import { summarizeTournament, scoreGame } from './scoring.js';

const root = document.querySelector('#tournaments');

function tournamentLeaders(tournament) {
  let kills=null, assists=null, deaths=null, damage=null;
  tournament.games.forEach(game=>{
    game.players.forEach(player=>{
      const p={
        playerId: player.playerId,
        kills:Number(player.kills||0),
        assists:Number(player.assists||0),
        deaths:Number(player.deaths||0),
        damage:Number(player.damage||0)
      };
      if(!kills || p.kills>kills.kills) kills=p;
      if(!assists || p.assists>assists.assists) assists=p;
      if(!deaths || p.deaths<deaths.deaths) deaths=p;
      if(!damage || p.damage>damage.damage) damage=p;
    });
  });
  return {kills,assists,deaths,damage};
}

function formatNumber(value) {
  const n=Number(value||0);
  if(n>=10000) return (n/1000).toFixed(1)+'k';
  return new Intl.NumberFormat('en-US').format(n);
}
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

  const playerStats = new Map(roster.players.map(player => [player.id, { ...player, games: 0, wins: 0, totalScore: 0 }]));
  tournaments.forEach(tournament => {
    tournament.games.forEach(game => scoreGame(game).forEach(row => {
      const stats = playerStats.get(row.playerId);
      if (!stats) return;
      stats.games += 1;
      stats.totalScore += row.score;
      if (game.result === 'win') stats.wins += 1;
    }));
  });

  document.querySelector('#players').innerHTML = [...playerStats.values()]
    .filter(player => player.games > 0)
    .sort((a,b) =>
      b.games - a.games ||
      (b.totalScore / b.games) - (a.totalScore / a.games) ||
      (b.wins / b.games) - (a.wins / a.games) ||
      a.name.localeCompare(b.name)
    )
    .map(player => {
      const winrate = Math.round(player.wins / player.games * 100);
      const averageScore = player.totalScore / player.games;
      return `<a class="card player-card player-card-link" href="player.html?id=${encodeURIComponent(player.id)}"><h2>${player.name}</h2><dl class="player-stats"><div><dt>Games</dt><dd>${player.games}</dd></div><div><dt>Win rate</dt><dd>${winrate}%</dd></div><div><dt>Average score</dt><dd>${averageScore.toFixed(1)}</dd></div></dl></a>`;
    }).join('');

  root.innerHTML = tournaments.map(t => {
    const s = summarizeTournament(t);
    const leaders = tournamentLeaders(t);
    return `<article class="card tournament-card">
      <div class="tournament-card-main">
        <p class="eyebrow">${formatDate(t.date)} · Tier ${t.tier ?? '—'}</p>
        <h2>${t.name}</h2>
        <p>${t.placement === 1 ? '🏆 Champions' : `Placement: ${t.placement ?? '—'}`} · ${t.games.filter(g=>g.result==='win').length}-${t.games.filter(g=>g.result!=='win').length}</p>
      </div>
      <div class="tournament-highlights">
        <div class="awards">
          <span>🏅 MVP <b>${playerName(roster.players,s.mvp?.playerId)}</b></span>
          <span>💀 Inter <b>${playerName(roster.players,s.inter?.playerId)}</b></span>
        </div>
        <dl class="tournament-leaders">
          <div><dt>Most kills</dt><dd><b>${formatNumber(leaders.kills?.kills)}</b> · ${playerName(roster.players, leaders.kills?.playerId)}</dd></div>
          <div><dt>Most assists</dt><dd><b>${formatNumber(leaders.assists?.assists)}</b> · ${playerName(roster.players, leaders.assists?.playerId)}</dd></div>
          <div><dt>Fewest deaths</dt><dd><b>${formatNumber(leaders.deaths?.deaths)}</b> · ${playerName(roster.players, leaders.deaths?.playerId)}</dd></div>
          <div><dt>Most damage</dt><dd><b>${formatNumber(leaders.damage?.damage)}</b> · ${playerName(roster.players, leaders.damage?.playerId)}</dd></div>
        </dl>
      </div>
      <a class="button" href="tournament.html?id=${encodeURIComponent(t.id)}">Open tournament</a>
    </article>`;
  }).join('') || '<p>No tournaments yet.</p>';
} catch (e) { root.innerHTML = `<p class="error">${e.message}. Open this through a web server rather than directly from the file system.</p>`; }
