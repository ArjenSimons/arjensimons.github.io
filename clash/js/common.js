export async function loadJson(path) { const r = await fetch(path); if (!r.ok) throw new Error(`Could not load ${path}`); return r.json(); }
export const playerName = (players, id) => players.find(p => p.id === id)?.name || id;
export const formatDate = d => new Intl.DateTimeFormat(undefined, {year:'numeric',month:'long',day:'numeric'}).format(new Date(`${d}T12:00:00`));
export const resultLabel = r => r === 'win' ? 'Victory' : 'Defeat';
