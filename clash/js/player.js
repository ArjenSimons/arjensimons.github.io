import { loadJson, playerName } from './common.js';
import { scoreGame, summarizeTournament, grade } from './scoring.js';

const root = document.querySelector('#player-page');
const select = document.querySelector('#player-select');
const qs = new URLSearchParams(location.search);
const requestedId = qs.get('id');
const num = value => Number(value || 0);
const pct = value => `${Math.round(value * 100)}%`;
const fmt = value => Math.round(value).toLocaleString();
const gameLink = item => `tournament.html?id=${encodeURIComponent(item.tournamentId)}#game-${item.gameNumber}`;

function longestStreak(games, result) {
  let best = 0, current = 0;
  games.forEach(game => { current = game.result === result ? current + 1 : 0; best = Math.max(best, current); });
  return best;
}
function mode(values) {
  const counts = new Map();
  values.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts.entries()].sort((a,b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] || '—';
}
function average(items, key) { return items.length ? items.reduce((sum,item)=>sum + num(item[key]),0) / items.length : 0; }
function record(items, key, direction='max') {
  return [...items].sort((a,b) => direction === 'min' ? num(a[key])-num(b[key]) : num(b[key])-num(a[key]))[0];
}
function statCard(label, value, detail='') {
  return `<article class="summary-card player-summary-card"><span>${label}</span><strong>${value}</strong>${detail ? `<small>${detail}</small>` : ''}</article>`;
}
function featureCard(title, primary, value, detail='') {
  return `<article class="card player-feature"><p class="eyebrow">${title}</p><h2>${primary}</h2><strong>${value}</strong>${detail ? `<small>${detail}</small>` : ''}</article>`;
}
function clamp(value, min=0, max=10) { return Math.max(min, Math.min(max, value)); }
function deviation(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum,value)=>sum+value,0)/values.length;
  return Math.sqrt(values.reduce((sum,value)=>sum+(value-mean)**2,0)/values.length);
}
function relativeScore(value, target) {
  if (value <= 0 || target <= 0) return 0;
  return clamp(6.75 + 3.15 * Math.tanh(Math.log(Math.min(value/target,2.5))/.62));
}
function lowerRelativeScore(value, target) {
  if (value < 0 || target <= 0) return 0;
  return clamp(6.75 + 3.15 * Math.tanh(Math.log(Math.min(target/Math.max(value,.001),2.5))/.62));
}
function radarChart(stats) {
  const center=180, radius=112;
  const scaleValue=value=>clamp((value-3)/7,0,1);
  const point=(index,scale=1)=>{
    const angle=-Math.PI/2+index*Math.PI/3;
    return [center+Math.cos(angle)*radius*scale,center+Math.sin(angle)*radius*scale];
  };
  const polygon=scale=>stats.map((_,index)=>point(index,scale).map(value=>value.toFixed(1)).join(',')).join(' ');
  const valuePolygon=stats.map((stat,index)=>point(index,scaleValue(stat.value)).map(value=>value.toFixed(1)).join(',')).join(' ');
  return `<svg class="performance-radar" viewBox="0 0 360 360" role="img" aria-labelledby="radar-title radar-description">
    <title id="radar-title">Role-adjusted player strengths</title>
    <desc id="radar-description">${stats.map(stat=>`${stat.label} ${stat.value.toFixed(1)} out of 10`).join(', ')}</desc>
    <g class="radar-grid">${[.25,.5,.75,1].map(scale=>`<polygon points="${polygon(scale)}"></polygon>`).join('')}${stats.map((_,index)=>{const [x,y]=point(index);return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}"></line>`;}).join('')}</g>
    <polygon class="radar-area" points="${valuePolygon}"></polygon>
    <polyline class="radar-line" points="${valuePolygon} ${valuePolygon.split(' ')[0]}"></polyline>
    ${stats.map((stat,index)=>{const [x,y]=point(index,scaleValue(stat.value));const [labelX,labelY]=point(index,1.28);return `<g class="radar-stat" data-label="${stat.label}" data-description="${stat.description}" tabindex="0"><circle class="radar-hit" cx="${labelX}" cy="${labelY}" r="30"></circle><circle class="radar-point" cx="${x}" cy="${y}" r="4"></circle><text class="radar-label" x="${labelX}" y="${labelY-4}" text-anchor="middle">${stat.label}</text><text class="radar-value" x="${labelX}" y="${labelY+13}" text-anchor="middle">${stat.value.toFixed(1)}</text></g>`;}).join('')}
  </svg><div class="radar-tooltip" role="tooltip" hidden></div>`;
}
function performanceProfile(stats) {
  return `<div class="in-depth-profile">
    <div class="in-depth-heading"><span><i></i> Role benchmark</span></div>
    <div class="attribute-list">${stats.map(stat=>`
      <div class="attribute-row" data-label="${stat.label}" data-description="${stat.description}" tabindex="0">
        <div class="attribute-name"><strong>${stat.label}</strong></div>
        <div class="attribute-track" role="meter" aria-label="${stat.label}" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${stat.value.toFixed(1)}">
          <i class="attribute-fill" style="width:${clamp(stat.value)*10}%"></i>
          <b class="attribute-benchmark" aria-hidden="true"></b>
        </div>
        <output>${stat.value.toFixed(1)}</output>
      </div>`).join('')}</div><div class="attribute-tooltip" role="tooltip" hidden></div>
  </section>`;
}

function drawTrend(records) {
  const canvas = document.querySelector('#trend-canvas');
  if (!canvas) return;
  const metric = document.querySelector('#trend-metric').value;
  const windowSize = num(document.querySelector('#trend-window').value);
  const source = records.slice(-windowSize);
  const values = source.map((item, index) => {
    const prefix = source.slice(0, index + 1).slice(-5);
    if (metric === 'winrate') return prefix.filter(x => x.result === 'win').length / prefix.length * 100;
    return average(prefix, metric);
  });
  const labels = {score:'Score',kda:'KDA',damagePerMinute:'Damage/min',goldPerMinute:'Gold/min',csPerMinute:'CS/min',visionPerMinute:'Vision/min',kpPercent:'KP %',deaths:'Deaths',winrate:'Win rate %'};
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 900, height = 300;
  canvas.width = width * dpr; canvas.height = height * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);
  const css = getComputedStyle(document.documentElement);
  const line = css.getPropertyValue('--gold').trim(), grid = css.getPropertyValue('--line').trim(), text = css.getPropertyValue('--muted').trim();
  ctx.clearRect(0,0,width,height);
  if (!values.length) return;
  const minRaw = Math.min(...values), maxRaw = Math.max(...values), padding = Math.max((maxRaw-minRaw)*.15, metric==='winrate'?5:.25);
  const min = minRaw-padding, max = maxRaw+padding;
  const left=52,right=18,top=22,bottom=38, plotW=width-left-right, plotH=height-top-bottom;
  ctx.font='12px Inter, system-ui'; ctx.fillStyle=text; ctx.strokeStyle=grid; ctx.lineWidth=1;
  for(let i=0;i<=4;i++){ const y=top+plotH*i/4; const v=max-(max-min)*i/4; ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(width-right,y);ctx.stroke();ctx.fillText(v.toFixed(metric.includes('PerMinute')||metric==='score'||metric==='kda'?1:0),4,y+4); }
  const xFor=i=>left+(values.length===1?plotW/2:plotW*i/(values.length-1));
  const yFor=v=>top+(max-v)/(max-min)*plotH;
  ctx.strokeStyle=line;ctx.lineWidth=3;ctx.beginPath();values.forEach((v,i)=>i?ctx.lineTo(xFor(i),yFor(v)):ctx.moveTo(xFor(i),yFor(v)));ctx.stroke();
  ctx.fillStyle=line;values.forEach((v,i)=>{ctx.beginPath();ctx.arc(xFor(i),yFor(v),3.5,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle=text;ctx.textAlign='center';ctx.fillText(`Oldest`,left,height-12);ctx.fillText(`Latest`,width-right,height-12);ctx.textAlign='left';
  document.querySelector('#trend-caption').textContent = `${labels[metric]} · five-game rolling average over the last ${source.length} games`;
}

try {
  const [roster, manifest] = await Promise.all([loadJson('./data/players.json'), loadJson('./data/index.json')]);
  const tournaments = await Promise.all(manifest.tournaments.map(path => loadJson(`./data/${path}`)));
  tournaments.sort((a,b)=>a.date.localeCompare(b.date));
  const playedIds = new Set(tournaments.flatMap(t=>t.games.flatMap(g=>g.players.map(p=>p.playerId))));
  const available = roster.players.filter(p=>playedIds.has(p.id));
  select.innerHTML = available.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  const playerId = available.some(p=>p.id===requestedId) ? requestedId : available[0]?.id;
  if (!playerId) throw new Error('No player games recorded');
  select.value = playerId;
  select.addEventListener('change',()=>location.href=`player.html?id=${encodeURIComponent(select.value)}`);

  const records=[]; const teammateMap=new Map(); const roleKillRates=new Map(); const roleAssistRates=new Map(); const roleDeathRates=new Map(); let mvps=0, ints=0;
  tournaments.forEach(tournament=>{
    const summary=summarizeTournament(tournament);
    if(summary.mvp?.playerId===playerId) mvps++;
    if(summary.inter?.playerId===playerId) ints++;
    tournament.games.forEach((game,index)=>{
      const scoredRows=scoreGame(game);
      const minutes=Math.max(1,num(game.durationSeconds)/60);
      scoredRows.forEach(scoredRow=>{
        const killRates=roleKillRates.get(scoredRow.role)||[];
        killRates.push(num(scoredRow.kills)/minutes);
        roleKillRates.set(scoredRow.role,killRates);
        const assistRates=roleAssistRates.get(scoredRow.role)||[];
        assistRates.push(num(scoredRow.assists)/minutes);
        roleAssistRates.set(scoredRow.role,assistRates);
        const deathRates=roleDeathRates.get(scoredRow.role)||[];
        deathRates.push(num(scoredRow.deaths)/minutes);
        roleDeathRates.set(scoredRow.role,deathRates);
      });
      const row=scoredRows.find(p=>p.playerId===playerId);
      if(!row) return;
      records.push({...row,result:game.result,opponent:game.opponent,date:tournament.date,tournamentId:tournament.id,tournamentName:tournament.name,gameNumber:index+1,durationSeconds:num(game.durationSeconds),killsPerMinute:num(row.kills)/minutes,assistsPerMinute:num(row.assists)/minutes,deathsPerMinute:num(row.deaths)/minutes,damagePerMinute:num(row.damage)/minutes,goldPerMinute:num(row.gold)/minutes,csPerMinute:num(row.cs)/minutes,visionPerMinute:num(row.visionScore)/minutes,kpPercent:num(row.kp)*100});
      game.players.filter(p=>p.playerId!==playerId).forEach(teammate=>{
        const item=teammateMap.get(teammate.playerId)||{playerId:teammate.playerId,games:0,wins:0}; item.games++; if(game.result==='win') item.wins++; teammateMap.set(teammate.playerId,item);
      });
    });
  });
  const name=playerName(roster.players,playerId), wins=records.filter(r=>r.result==='win').length, totalMinutes=records.reduce((s,r)=>s+r.durationSeconds/60,0);
  const champMap=new Map();
  records.forEach(r=>{const item=champMap.get(r.champion)||{champion:r.champion,games:0,wins:0,totalScore:0,totalKda:0,totalKp:0,totalCs:0,totalGold:0,totalDamage:0,totalVision:0,totalMinutes:0,mvps:0,ints:0};item.games++;if(r.result==='win')item.wins++;item.totalScore+=r.score;item.totalKda+=r.kda;item.totalKp+=r.kp;item.totalCs+=num(r.cs);item.totalGold+=num(r.gold);item.totalDamage+=num(r.damage);item.totalVision+=num(r.visionScore);item.totalMinutes+=r.durationSeconds/60;champMap.set(r.champion,item);});
  const champions=[...champMap.values()].map(c=>({...c,winrate:c.wins/c.games,averageScore:c.totalScore/c.games,averageKda:c.totalKda/c.games,averageKp:c.totalKp/c.games,csPerMinute:c.totalCs/c.totalMinutes,goldPerMinute:c.totalGold/c.totalMinutes,damagePerMinute:c.totalDamage/c.totalMinutes,visionPerMinute:c.totalVision/c.totalMinutes})).sort((a,b)=>b.games-a.games||b.averageScore-a.averageScore);
  const playerAverageScore=average(records,'score');
  const reliableChampionScore=champion=>(champion.totalScore+playerAverageScore*2)/(champion.games+2);
  const twoGameChampions=champions.filter(c=>c.games>=2);
  const bestChampionPool=twoGameChampions.length?twoGameChampions:champions;
  const bestChampion=[...bestChampionPool].sort((a,b)=>reliableChampionScore(b)-reliableChampionScore(a)||b.games-a.games)[0], worstChampion=[...champions].sort((a,b)=>reliableChampionScore(a)-reliableChampionScore(b)||b.games-a.games)[0];
  const duos=[...teammateMap.values()].map(d=>({...d,name:playerName(roster.players,d.playerId),winrate:d.wins/d.games})); const eligibleDuos=duos.filter(d=>d.games>=4); const duoComparison=eligibleDuos.length?eligibleDuos:duos;
  const bestDuo=[...duoComparison].sort((a,b)=>b.winrate-a.winrate||b.games-a.games)[0], worstDuo=[...duoComparison].sort((a,b)=>a.winrate-b.winrate||b.games-a.games)[0];
  const tiedDuos=reference=>duoComparison.filter(duo=>Math.abs(duo.winrate-reference.winrate)<1e-9&&duo.games===reference.games);
  const duoCard=(title,reference)=>{
    if(!reference) return featureCard(title,'—','—');
    const tied=tiedDuos(reference);
    const tiedNames=tied.map(duo=>duo.name);
    const nameList=tiedNames.join('<br>');
    return tied.length>1
      ?featureCard(title,nameList,pct(reference.winrate),`Tied · ${reference.games} games each`)
      :featureCard(title,reference.name,pct(reference.winrate),`${reference.games} games together`);
  };
  const role=mode(records.map(r=>r.role)), favoriteChampion=champions[0]?.champion||'—';
  const averageMetric=key=>records.reduce((sum,row)=>sum+num(row.metrics?.[key]),0)/records.length;
  const attackScore=records.reduce((sum,row)=>{
    const roleRates=roleKillRates.get(row.role)||[];
    const roleKillAverage=roleRates.reduce((total,value)=>total+value,0)/Math.max(1,roleRates.length);
    return sum+relativeScore(row.killsPerMinute,roleKillAverage)*.4+num(row.metrics?.damage)*.6;
  },0)/records.length;
  const teamplayScore=records.reduce((sum,row)=>{
    const roleRates=roleAssistRates.get(row.role)||[];
    const roleAssistAverage=roleRates.reduce((total,value)=>total+value,0)/Math.max(1,roleRates.length);
    return sum+num(row.metrics?.kp)*.6+relativeScore(row.assistsPerMinute,roleAssistAverage)*.4;
  },0)/records.length;
  const radarStats=[
    {label:'Resources',value:(averageMetric('cs')+averageMetric('gold'))/2,description:'Average CS/min and gold/min compared with the role benchmark.'},
    {label:'Teamplay',value:teamplayScore,description:'Average kill participation and assists/min compared with the role benchmark.'},
    {label:'Control',value:averageMetric('vision'),description:'Average vision score per minute compared with the role benchmark.'},
    {label:'Consistency',value:clamp(10-deviation(records.map(row=>row.score))*2),description:`Based on the standard deviation of all game scores. Lower variation means a higher score.`},
    {label:'Defense',value:averageMetric('deaths'),description:'Average deaths per game compared with the role benchmark. Fewer deaths score higher.'},
    {label:'Attack',value:attackScore,description:'Average kills/min and damage/min compared with players in the same role.'}
  ];
  const deathsPerMinuteScore=records.reduce((sum,row)=>{
    const roleRates=roleDeathRates.get(row.role)||[];
    const roleDeathAverage=roleRates.reduce((total,value)=>total+value,0)/Math.max(1,roleRates.length);
    return sum+lowerRelativeScore(row.deathsPerMinute,roleDeathAverage);
  },0)/records.length;
  const detailStats=[
    {label:'KDA',value:averageMetric('kda'),description:'Average KDA score per game compared with the role played.'},
    {label:'Damage',value:averageMetric('damage'),description:'Average damage per minute score compared with the role played.'},
    {label:'CS',value:averageMetric('cs'),description:'Average CS per minute score compared with the role played.'},
    {label:'Deaths',value:deathsPerMinuteScore,description:'Average deaths per minute compared with the role played. Fewer deaths score higher.'},
    {label:'Vision',value:averageMetric('vision'),description:'Average vision score per minute compared with the role played.'},
    {label:'Gold',value:averageMetric('gold'),description:'Average gold per minute score compared with the role played.'},
    {label:'KP',value:averageMetric('kp'),description:'Average kill participation score per game compared with the role played.'}
  ];
  const recordsList=[['Most kills',record(records,'kills'),'kills','kills'],['Most assists',record(records,'assists'),'assists','assists'],['Most damage',record(records,'damage'),'damage','damage'],['Most gold',record(records,'gold'),'gold','gold'],['Highest KDA',record(records,'kda'),'kda','KDA'],['Highest CS',record(records,'cs'),'cs','CS'],['Highest vision score',record(records,'visionScore'),'visionScore','vision'],['Fewest deaths in a win',record(records.filter(r=>r.result==='win'),'deaths','min'),'deaths','deaths']].filter(x=>x[1]);
  const championStatKeys=['games','winrate','averageScore','averageKda','averageKp','csPerMinute','goldPerMinute','damagePerMinute','visionPerMinute'];
  const championMaxima=Object.fromEntries(championStatKeys.map(key=>[key,Math.max(...champions.map(item=>item[key]))]));
  const championLeader=(item,key)=>Math.abs(item[key]-championMaxima[key])<1e-9?'stat-leader':'';
  const championSorters={
    champion:(a,b)=>a.champion.localeCompare(b.champion), games:(a,b)=>b.games-a.games,
    winrate:(a,b)=>b.winrate-a.winrate, averageScore:(a,b)=>b.averageScore-a.averageScore,
    averageKda:(a,b)=>b.averageKda-a.averageKda, averageKp:(a,b)=>b.averageKp-a.averageKp,
    csPerMinute:(a,b)=>b.csPerMinute-a.csPerMinute, goldPerMinute:(a,b)=>b.goldPerMinute-a.goldPerMinute,
    damagePerMinute:(a,b)=>b.damagePerMinute-a.damagePerMinute, visionPerMinute:(a,b)=>b.visionPerMinute-a.visionPerMinute
  };
  const championRows=items=>items.map(c=>`<tr><td><strong>${c.champion}</strong></td><td class="${championLeader(c,'games')}">${c.games}</td><td class="${championLeader(c,'winrate')}">${pct(c.winrate)}</td><td class="${championLeader(c,'averageScore')}">${c.averageScore.toFixed(1)}</td><td class="${championLeader(c,'averageKda')}">${c.averageKda.toFixed(2)}</td><td class="${championLeader(c,'averageKp')}">${pct(c.averageKp)}</td><td class="${championLeader(c,'csPerMinute')}">${c.csPerMinute.toFixed(2)}</td><td class="${championLeader(c,'goldPerMinute')}">${fmt(c.goldPerMinute)}</td><td class="${championLeader(c,'damagePerMinute')}">${fmt(c.damagePerMinute)}</td><td class="${championLeader(c,'visionPerMinute')}">${c.visionPerMinute.toFixed(2)}</td></tr>`).join('');

  root.innerHTML=`
    <header class="player-hero card"><div><h1>${name}</h1><p>${role} · Most played champion: ${favoriteChampion}</p></div><div class="player-hero-rating"><strong>${average(records,'score').toFixed(1)}</strong><span>${grade(average(records,'score'))} average rating</span></div></header>
    <section class="player-overview"><div class="player-summary-grid">${statCard('Games',records.length)}${statCard('Record',`${wins}-${records.length-wins}`)}${statCard('Win rate',pct(wins/records.length))}${statCard('Average KDA',average(records,'kda').toFixed(2))}${statCard('Average KP',pct(average(records,'kp')))}${statCard('MVPs / INTs',`${mvps} / ${ints}`)}${statCard('Longest win streak',longestStreak(records,'win'))}${statCard('Longest loss streak',longestStreak(records,'loss'))}</div><article class="card performance-card"><p class="eyebrow">Performance profile</p><div class="performance-profile-body"><div class="radar-wrap">${radarChart(radarStats)}</div>${performanceProfile(detailStats)}</div></article></section>
    <section><p class="eyebrow">Strengths and curses</p><div class="player-feature-grid">${featureCard('Best champion',bestChampion?.champion||'—',bestChampion?`${bestChampion.averageScore.toFixed(1)} score · ${pct(bestChampion.winrate)}`:'—',bestChampion?`${bestChampion.games} games`: '')}${featureCard('Worst champion',worstChampion?.champion||'—',worstChampion?`${worstChampion.averageScore.toFixed(1)} score · ${pct(worstChampion.winrate)}`:'—',worstChampion?`${worstChampion.games} games`: '')}${duoCard('Best duo',bestDuo)}${duoCard('Worst duo',worstDuo)}</div><p class="section-note">Best champion needs 2 games; duos need 4 where possible. Worst champion includes one-game picks.</p></section>
    <section><p class="eyebrow">Single-game records</p><div class="player-record-grid">${recordsList.map(([title,item,key,label])=>`<a class="card player-record-card" href="${gameLink(item)}"><p class="eyebrow">${title}</p><h2>${key==='damage'||key==='gold'?fmt(item[key]):num(item[key]).toFixed(key==='kda'?2:0)} ${label}</h2><strong>${item.champion}</strong><small>${item.tournamentName} · Game ${item.gameNumber}</small></a>`).join('')}</div></section>
    <section class="card trend-panel"><div class="section-heading-row"><div><p class="eyebrow">Performance trend</p><h2>Recent form</h2></div><div class="trend-controls"><label>Statistic<select id="trend-metric"><option value="score">Score</option><option value="winrate">Win rate</option><option value="kda">KDA</option><option value="damagePerMinute">Damage/min</option><option value="goldPerMinute">Gold/min</option><option value="csPerMinute">CS/min</option><option value="visionPerMinute">Vision/min</option><option value="kpPercent">KP</option><option value="deaths">Deaths</option></select></label><label>Games<select id="trend-window"><option value="10">Last 10</option><option value="20" selected>Last 20</option><option value="40">Last 40</option><option value="9999">All games</option></select></label></div></div><canvas id="trend-canvas" aria-label="Player performance trend"></canvas><p id="trend-caption" class="section-note"></p></section>
    <section><div class="section-heading-row"><p class="eyebrow">Champion performances</p><label>Sort by <select id="champion-performance-sort"><option value="games">Games</option><option value="champion">Champion</option><option value="winrate">Win rate</option><option value="averageScore">Score</option><option value="averageKda">KDA</option><option value="averageKp">KP</option><option value="csPerMinute">CS/min</option><option value="goldPerMinute">Gold/min</option><option value="damagePerMinute">Damage/min</option><option value="visionPerMinute">Vision/min</option></select></label></div><div class="table-wrap"><table class="player-champion-table"><thead><tr><th>Champion</th><th>Games</th><th>Win rate</th><th>Score</th><th>KDA</th><th>KP</th><th>CS/min</th><th>Gold/min</th><th>Damage/min</th><th>Vision/min</th></tr></thead><tbody id="champion-performance-rows">${championRows(champions)}</tbody></table></div></section>
    <section><p class="eyebrow">Recent games</p><div class="recent-game-list">${records.slice(-12).reverse().map(r=>`<a class="card recent-game ${r.result}" href="${gameLink(r)}"><span class="recent-result">${r.result==='win'?'Victory':'Defeat'}</span><strong>${r.champion}</strong><span>${r.kills}/${r.deaths}/${r.assists}</span><span>${r.score.toFixed(1)} · ${r.grade}</span><small>${r.tournamentName} · Game ${r.gameNumber}</small></a>`).join('')}</div></section>`;
  document.querySelector('#trend-metric').addEventListener('change',()=>drawTrend(records));
  document.querySelector('#trend-window').addEventListener('change',()=>drawTrend(records));
  document.querySelector('#champion-performance-sort').addEventListener('change',event=>{
    const key=event.target.value;
    const sorted=[...champions].sort((a,b)=>championSorters[key](a,b)||b.games-a.games||a.champion.localeCompare(b.champion));
    document.querySelector('#champion-performance-rows').innerHTML=championRows(sorted);
  });
  const radarTooltip=document.querySelector('.radar-tooltip');
  const performanceCard=document.querySelector('.performance-card');
  const showRadarTooltip=(target,event)=>{
    radarTooltip.innerHTML=`<strong>${target.dataset.label}</strong><span>${target.dataset.description}</span>`;
    radarTooltip.hidden=false;
    if(event){
      const bounds=performanceCard.getBoundingClientRect();
      const desiredX=event.clientX-bounds.left+12;
      const desiredY=event.clientY-bounds.top+12;
      radarTooltip.style.left=`${Math.max(8,Math.min(desiredX,bounds.width-radarTooltip.offsetWidth-8))}px`;
      radarTooltip.style.top=`${Math.max(8,Math.min(desiredY,bounds.height-radarTooltip.offsetHeight-8))}px`;
    }
  };
  document.querySelectorAll('.radar-stat').forEach(stat=>{
    stat.addEventListener('pointerenter',event=>showRadarTooltip(stat,event));
    stat.addEventListener('pointermove',event=>showRadarTooltip(stat,event));
    stat.addEventListener('pointerleave',()=>radarTooltip.hidden=true);
    stat.addEventListener('focus',()=>showRadarTooltip(stat));
    stat.addEventListener('blur',()=>radarTooltip.hidden=true);
  });
  const attributeTooltip=document.querySelector('.attribute-tooltip');
  const inDepthProfile=document.querySelector('.in-depth-profile');
  const showAttributeTooltip=(row,event)=>{
    attributeTooltip.innerHTML=`<strong>${row.dataset.label}</strong><span>${row.dataset.description}</span>`;
    attributeTooltip.hidden=false;
    if(event){
      const bounds=inDepthProfile.getBoundingClientRect();
      const desiredX=event.clientX-bounds.left+12;
      const desiredY=event.clientY-bounds.top+12;
      attributeTooltip.style.left=`${Math.max(8,Math.min(desiredX,bounds.width-attributeTooltip.offsetWidth-8))}px`;
      attributeTooltip.style.top=`${Math.max(8,Math.min(desiredY,bounds.height-attributeTooltip.offsetHeight-8))}px`;
    }
  };
  document.querySelectorAll('.attribute-row').forEach(row=>{
    row.addEventListener('pointerenter',event=>showAttributeTooltip(row,event));
    row.addEventListener('pointermove',event=>showAttributeTooltip(row,event));
    row.addEventListener('pointerleave',()=>attributeTooltip.hidden=true);
    row.addEventListener('focus',()=>showAttributeTooltip(row));
    row.addEventListener('blur',()=>attributeTooltip.hidden=true);
  });
  window.addEventListener('resize',()=>drawTrend(records)); drawTrend(records);
} catch(error){ root.innerHTML=`<p class="error">${error.message}</p>`; }
