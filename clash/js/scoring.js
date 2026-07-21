import { ROLE_BENCHMARKS } from "./benchmarks.js";

export const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "SUPPORT"];

const weights = {
  TOP:     { kda: .18, kp: .13, damage: .19, gold: .13, cs: .15, vision: .07, deaths: .10, result: .05 },
  JUNGLE:  { kda: .18, kp: .20, damage: .12, gold: .10, cs: .08, vision: .17, deaths: .10, result: .05 },
  MIDDLE:  { kda: .18, kp: .14, damage: .22, gold: .14, cs: .14, vision: .07, deaths: .06, result: .05 },
  BOTTOM:  { kda: .19, kp: .14, damage: .24, gold: .16, cs: .15, vision: .05, deaths: .02, result: .05 },
  SUPPORT: { kda: .17, kp: .22, damage: .07, gold: .05, cs: .02, vision: .30, deaths: .12, result: .05 }
};

const clamp10 = value => Math.max(0, Math.min(10, value));

// The Emerald+ benchmark maps to 6.75. A logarithmic ratio and tanh provide
// diminishing returns: below-average games fall toward 5, while 9-10 requires
// an exceptional result rather than merely exceeding the target a little.
const higher = (value, target) => {
  if (value <= 0 || target <= 0) return 0;
  return clamp10(6.75 + 3.15 * Math.tanh(Math.log(value / target) / 0.62));
};
const lower = (value, target) => {
  if (value < 0 || target <= 0) return 0;
  return clamp10(6.75 - 3.15 * Math.tanh(Math.log(Math.max(value, .01) / target) / 0.62));
};

function benchmarkFor(role) {
  return ROLE_BENCHMARKS[role];
}

export function grade(score) {
  if (score >= 9.5) return "S+"; if (score >= 9.0) return "S"; if (score >= 8.5) return "S-";
  if (score >= 8.0) return "A+"; if (score >= 7.5) return "A"; if (score >= 7.0) return "A-";
  if (score >= 6.5) return "B+"; if (score >= 6.0) return "B"; if (score >= 5.5) return "B-";
  if (score >= 5.0) return "C"; if (score >= 4.0) return "D"; return "F";
}

export function scoreGame(game) {
  const teamKills = game.players.reduce((sum, p) => sum + Number(p.kills || 0), 0);
  const minutes = Math.max(1, Number(game.durationSeconds || 0) / 60);
  return game.players.map(p => {
    const role = ROLES.includes(p.role) ? p.role : "MIDDLE";
    const t = benchmarkFor(role), w = weights[role];
    const kda = (Number(p.kills) + Number(p.assists)) / Math.max(1, Number(p.deaths));
    const kp = teamKills ? (Number(p.kills) + Number(p.assists)) / teamKills : 0;
    const metrics = {
      kda: higher(Math.log1p(kda), Math.log1p(t.kda)),
      kp: higher(kp, t.kp),
      damage: higher(Number(p.damage) / minutes, t.damage),
      gold: higher(Number(p.gold) / minutes, t.gold),
      cs: higher(Number(p.cs) / minutes, t.cs),
      vision: higher(Number(p.visionScore) / minutes, t.vision),
      deaths: lower(Number(p.deaths), t.deaths),
      result: game.result === "win" ? 8.5 : 5.0
    };
    const score = Object.entries(w).reduce((sum, [key, weight]) => sum + metrics[key] * weight, 0);
    return { ...p, kda, kp, score, grade: grade(score), metrics, benchmark: t };
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
