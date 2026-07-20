import { loadJson, playerName, formatDate, resultLabel } from './common.js';
import { scoreGame, summarizeTournament } from './scoring.js';
const id = new URLSearchParams(location.search).get('id');
const root = document.querySelector('#content');
try {
 const [roster, manifest] = await Promise.all([loadJson('./data/players.json'), loadJson('./data/index.json')]);
 const path = manifest.tournaments.find(p => p.split('/').at(-1).replace('.json','') === id);
 if (!path) throw new Error('Tournament not found');
 const t = await loadJson(`./data/${path}`), summary = summarizeTournament(t);
 root.innerHTML = `<header class="hero compact"><p class="eyebrow">${formatDate(t.date)} · Tier ${t.tier ?? '—'}</p><h1>${t.name}</h1><p>${t.placement===1?'🏆 Champions':`Placement ${t.placement ?? '—'}`}</p></header>
 <section class="award-grid"><article class="card award"><span>🏅 Tournament MVP</span><h2>${playerName(roster.players,summary.mvp?.playerId)}</h2><strong>${summary.mvp?.average.toFixed(1)} · ${summary.mvp?.grade}</strong></article><article class="card award"><span>💀 Inter of the tournament</span><h2>${playerName(roster.players,summary.inter?.playerId)}</h2><strong>${summary.inter?.average.toFixed(1)} · ${summary.inter?.grade}</strong></article></section>
 <section><h2>Overall standings</h2><div class="table-wrap"><table><thead><tr><th>Player</th><th>Games</th><th>Roles</th><th>Rating</th><th>Grade</th></tr></thead><tbody>${summary.players.map(p=>`<tr><td>${playerName(roster.players,p.playerId)}</td><td>${p.games}</td><td>${p.roles.join(', ')}</td><td>${p.average.toFixed(1)}</td><td><b>${p.grade}</b></td></tr>`).join('')}</tbody></table></div></section>
 ${t.games.map((g,i)=>{const rows=scoreGame(g);return `<section class="card game"><div class="game-head"><div><p class="eyebrow">Game ${i+1}</p><h2 class="${g.result}">${resultLabel(g.result)} vs ${g.opponent}</h2></div><span>${Math.floor(g.durationSeconds/60)}:${String(g.durationSeconds%60).padStart(2,'0')}</span></div><div class="table-wrap"><table><thead><tr><th>Role</th><th>Player</th><th>Champion</th><th>K/D/A</th><th>KDA</th><th>KP</th><th>CS</th><th>Gold</th><th>Damage</th><th>Vision</th><th>Rating</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${p.role}</td><td>${playerName(roster.players,p.playerId)}</td><td>${p.champion}</td><td>${p.kills}/${p.deaths}/${p.assists}</td><td>${p.kda.toFixed(2)}</td><td>${Math.round(p.kp*100)}%</td><td>${p.cs}</td><td>${Number(p.gold).toLocaleString()}</td><td>${Number(p.damage).toLocaleString()}</td><td>${p.visionScore}</td><td><b>${p.score.toFixed(1)} · ${p.grade}</b></td></tr>`).join('')}</tbody></table></div></section>`}).join('')}`;
} catch(e){root.innerHTML=`<p class="error">${e.message}</p>`}
