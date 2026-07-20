export const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "SUPPORT"];

const weights = {
  TOP:     { kda: .18, kp: .13, damage: .19, gold: .13, cs: .15, vision: .07, deaths: .10, result: .05 },
  JUNGLE:  { kda: .18, kp: .20, damage: .12, gold: .10, cs: .08, vision: .17, deaths: .10, result: .05 },
  MIDDLE:  { kda: .18, kp: .14, damage: .22, gold: .14, cs: .14, vision: .07, deaths: .06, result: .05 },
  BOTTOM:  { kda: .19, kp: .14, damage: .24, gold: .16, cs: .15, vision: .05, deaths: .02, result: .05 },
  SUPPORT: { kda: .17, kp: .22, damage: .07, gold: .05, cs: .02, vision: .30, deaths: .12, result: .05 }
};

const targets = {
  TOP:     { kda: 3.0, kp: .55, damage: 650, gold: 390, cs: 7.0, vision: 1.0, deaths: 4.5 },
  JUNGLE:  { kda: 3.2, kp: .68, damage: 480, gold: 350, cs: 5.2, vision: 1.5, deaths: 4.5 },
  MIDDLE:  { kda: 3.5, kp: .62, damage: 750, gold: 420, cs: 7.5, vision: .9, deaths: 4.0 },
  BOTTOM:  { kda: 3.5, kp: .61, damage: 800, gold: 450, cs: 8.1, vision: .65, deaths: 4.0 },
  SUPPORT: { kda: 3.4, kp: .72, damage: 250, gold: 270, cs: 1.2, vision: 2.4, deaths: 5.0 }
};

const clamp = n => Math.max(0, Math.min(100, n));
const higher = (value, target) => clamp(50 + 35 * ((value / Math.max(target, .01)) - 1));
const lower = (value, target) => clamp(50 - 30 * ((value / Math.max(target, .01)) - 1));

export function grade(score) {
  if (score >= 95) return "S+"; if (score >= 90) return "S"; if (score >= 85) return "S-";
  if (score >= 80) return "A+"; if (score >= 75) return "A"; if (score >= 70) return "A-";
  if (score >= 65) return "B+"; if (score >= 60) return "B"; if (score >= 55) return "B-";
  if (score >= 50) return "C"; if (score >= 40) return "D"; return "F";
}

export function scoreGame(game) {
  const teamKills = game.players.reduce((sum, p) => sum + Number(p.kills || 0), 0);
  const minutes = Math.max(1, Number(game.durationSeconds || 0) / 60);
  return game.players.map(p => {
    const role = ROLES.includes(p.role) ? p.role : "MIDDLE";
    const t = targets[role], w = weights[role];
    const kda = (Number(p.kills) + Number(p.assists)) / Math.max(1, Number(p.deaths));
    const kp = teamKills ? (Number(p.kills) + Number(p.assists)) / teamKills : 0;
    const metrics = {
      kda: higher(Math.log1p(kda), Math.log1p(t.kda)), kp: higher(kp, t.kp),
      damage: higher(Number(p.damage) / minutes, t.damage), gold: higher(Number(p.gold) / minutes, t.gold),
      cs: higher(Number(p.cs) / minutes, t.cs), vision: higher(Number(p.visionScore) / minutes, t.vision),
      deaths: lower(Number(p.deaths), t.deaths), result: game.result === "win" ? 100 : 35
    };
    const score = Object.entries(w).reduce((sum, [key, weight]) => sum + metrics[key] * weight, 0);
    return { ...p, kda, kp, score, grade: grade(score), metrics };
  });
}

export function summarizeTournament(tournament) {
  const byPlayer = new Map();
  tournament.games.forEach((game, gameIndex) => scoreGame(game).forEach(row => {
    const item = byPlayer.get(row.playerId) || { playerId: row.playerId, scores: [], games: 0, roles: new Set() };
    item.scores.push(row.score); item.games += 1; item.roles.add(row.role); item.lastGame = gameIndex; byPlayer.set(row.playerId, item);
  }));
  const players = [...byPlayer.values()].map(p => {
    const average = p.scores.reduce((a,b) => a+b, 0) / p.scores.length;
    return { ...p, roles: [...p.roles], average, grade: grade(average) };
  }).sort((a,b) => b.average - a.average);
  const mvp = tournament.manualMvp ? players.find(p => p.playerId === tournament.manualMvp) : players[0];
  const inter = tournament.manualInter ? players.find(p => p.playerId === tournament.manualInter) : players.at(-1);
  return { players, mvp, inter };
}
