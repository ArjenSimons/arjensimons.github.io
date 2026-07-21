import { loadJson } from './common.js';
import { ROLES } from './scoring.js';

const form = document.querySelector('#builder');
const games = document.querySelector('#games');
let roster;
let championData;

const num = value => Number(value || 0);
const playerOptions = () => roster.players.map(player => `<option value="${player.id}">${player.name}</option>`).join('');
const championOptions = () => championData.champions.map(champion => `<option value="${champion.name}">${champion.name}</option>`).join('');
const championSelect = (name, label = 'Champion') => `<label>${label}<select name="${name}"><option value="">None</option>${championOptions()}</select></label>`;

function addGame() {
  const index = games.children.length;
  const section = document.createElement('section');
  section.className = 'card game-editor';
  section.innerHTML = `
    <div class="game-head">
      <h2>Game ${index + 1}</h2>
      <button type="button" class="danger remove">Remove</button>
    </div>

    <div class="form-grid game-meta-grid">
      <label>Opponent<input name="opponent" required></label>
      <label>Result<select name="result"><option value="win">Win</option><option value="loss">Loss</option></select></label>
      <label>Duration (minutes)<input name="duration" type="number" min="1" step="0.01" required></label>
      <label>Enemy total kills<input name="enemyTeamKills" type="number" min="0" required></label>
    </div>

    <div class="draft-grid">
      <fieldset class="draft-panel">
        <legend>Champions banned by us</legend>
        <div class="ban-grid">${Array.from({ length: 5 }, (_, i) => championSelect(`ourBan${i + 1}`, `Ban ${i + 1}`)).join('')}</div>
      </fieldset>
      <fieldset class="draft-panel">
        <legend>Champions banned by enemy</legend>
        <div class="ban-grid">${Array.from({ length: 5 }, (_, i) => championSelect(`enemyBan${i + 1}`, `Ban ${i + 1}`)).join('')}</div>
      </fieldset>
    </div>

    <fieldset class="draft-panel enemy-lineup-panel">
      <legend>Enemy champions</legend>
      <div class="enemy-lineup">${ROLES.map(role => `<div class="enemy-pick"><span>${role}</span>${championSelect(`enemyChampion-${role}`, 'Champion')}</div>`).join('')}</div>
    </fieldset>

    <h3 class="editor-heading">Knoller lineup and stats</h3>
    <div class="lineups">${ROLES.map(role => `
      <fieldset class="player-row">
        <legend>${role}</legend>
        <label>Player<select name="playerId">${playerOptions()}</select></label>
        <input type="hidden" name="role" value="${role}">
        <label>Champion<select name="champion" required><option value="">Select champion</option>${championOptions()}</select></label>
        ${['kills', 'deaths', 'assists', 'cs', 'gold', 'damage', 'visionScore'].map(field => `<label>${field}<input name="${field}" type="number" min="0" required></label>`).join('')}
      </fieldset>`).join('')}</div>`;

  section.querySelector('.remove').onclick = () => section.remove();
  games.append(section);
}

function slug(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function download(object, name) {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([JSON.stringify(object, null, 2)], { type: 'application/json' }));
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

[roster, championData] = await Promise.all([
  loadJson('./data/players.json'),
  loadJson('./data/champions.json')
]);

document.querySelector('#add-game').onclick = addGame;
addGame();

form.onsubmit = event => {
  event.preventDefault();
  const formData = new FormData(form);
  const id = slug(formData.get('name'));
  const tournament = {
    id,
    name: formData.get('name'),
    date: formData.get('date'),
    tier: num(formData.get('tier')),
    placement: num(formData.get('placement')),
    manualMvp: null,
    manualInter: null,
    games: [...games.children].map(section => {
      const one = name => section.querySelector(`[name="${name}"]`).value;
      const compact = values => values.filter(Boolean);
      return {
        opponent: one('opponent'),
        result: one('result'),
        durationSeconds: Math.round(num(one('duration')) * 60),
        enemyTeamKills: num(one('enemyTeamKills')),
        ourBans: compact(Array.from({ length: 5 }, (_, i) => one(`ourBan${i + 1}`))),
        enemyBans: compact(Array.from({ length: 5 }, (_, i) => one(`enemyBan${i + 1}`))),
        enemyPlayers: ROLES.map(role => ({ role, champion: one(`enemyChampion-${role}`) })).filter(player => player.champion),
        players: [...section.querySelectorAll('.player-row')].map(row => {
          const get = name => row.querySelector(`[name="${name}"]`).value;
          return {
            playerId: get('playerId'),
            role: get('role'),
            champion: get('champion'),
            kills: num(get('kills')),
            deaths: num(get('deaths')),
            assists: num(get('assists')),
            cs: num(get('cs')),
            gold: num(get('gold')),
            damage: num(get('damage')),
            visionScore: num(get('visionScore'))
          };
        })
      };
    })
  };

  download(tournament, `${id}.json`);
  document.querySelector('#manifest-help').textContent = `Add "tournaments/${id}.json" to clash/data/index.json.`;
};
