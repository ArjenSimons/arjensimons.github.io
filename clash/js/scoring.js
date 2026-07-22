import { ROLE_BENCHMARKS } from "./benchmarks.js";

export const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "SUPPORT"];

// Role benchmarks already normalize the natural statistical differences between
// roles. These weights therefore only express small differences in what each
// role is expected to contribute; they are deliberately kept close together.
// Every row sums to 1 and the final 0-10 conversion is identical for all roles.
const weights = {
  TOP:     { kda: .25, kp: .20, damage: .15, gold: .1, cs: .1, vision: .05, deaths: .1, result: .05 },
  JUNGLE:  { kda: .25, kp: .20, damage: .15, gold: .1, cs: .1, vision: .05, deaths: .1, result: .05 },
  MIDDLE:  { kda: .25, kp: .20, damage: .15, gold: .1, cs: .1, vision: .05, deaths: .1, result: .05 },
  BOTTOM:  { kda: .25, kp: .20, damage: .15, gold: .1, cs: .1, vision: .05, deaths: .1, result: .05 },
  SUPPORT: { kda: .25, kp: .20, damage: .15, gold: .1, cs: .01, vision: .14, deaths: .1, result: .05 }
};

const clamp10 = value => Math.max(0, Math.min(10, value));
const MAX_FAVOURABLE_RATIO = 2.5;
const SCORE_PIVOT = 6.5;
const UPPER_SCORE_CONTRAST = 1.2;
const LOWER_SCORE_CONTRAST = 1.5;

// The Silver+ benchmark maps to 6.75. A logarithmic ratio and tanh provide
// diminishing returns: below-average games fall toward 5, while 9-10 requires
// an exceptional result rather than merely exceeding the target a little.
//
// A single metric is capped at 175% of its benchmark in the favourable
// direction. This prevents one extreme statistic from overpowering the full
// role-weighted score. Poor performance is deliberately not capped.
const higher = (value, target) => {
  if (value <= 0 || target <= 0) return 0;
  const ratio = Math.min(value / target, MAX_FAVOURABLE_RATIO);
  return clamp10(6.75 + 3.15 * Math.tanh(Math.log(ratio) / 0.62));
};
const lower = (value, target) => {
  if (value < 0 || target <= 0) return 0;
  const favourableRatio = Math.min(target / Math.max(value, .01), MAX_FAVOURABLE_RATIO);
  return clamp10(6.75 + 3.15 * Math.tanh(Math.log(favourableRatio) / 0.62));
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
      result: game.result === "win" ? 10 : 4
    };
    const rawScore = Object.entries(w).reduce((sum, [key, weight]) => sum + metrics[key] * weight, 0);
    // Keep 7 as a stable pivot: above-average games always gain some
    // separation, while weaker games spread out more strongly so the overall
    // average remains near 6.5 without penalizing a good performance.
    const contrast = rawScore >= SCORE_PIVOT ? UPPER_SCORE_CONTRAST : LOWER_SCORE_CONTRAST;
    const score = clamp10(SCORE_PIVOT + contrast * (rawScore - SCORE_PIVOT));
    return { ...p, kda, kp, score, rawScore, grade: grade(score), metrics, benchmark: t };
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
