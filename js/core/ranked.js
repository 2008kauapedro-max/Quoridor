/* The Rage Arena — core/ranked.js · lógica PURA do ranqueado */
import { RANKED } from "./constants.js";
import { newGameCustom, applyEvent, bfsDistance } from "./rules.js";

export function tierOf(rp){ let t = RANKED.TIERS[0]; for (const k of RANKED.TIERS) if ((rp ?? 0) >= k.min) t = k; return t; }
export function nextTier(rp){ for (const k of RANKED.TIERS) if (k.min > (rp ?? 0)) return k; return null; }
export function expectedScore(a, b){ return 1 / (1 + Math.pow(10, (b - a) / 400)); }
export function mmrDelta(my, opp, won, k){ return Math.round(k * ((won ? 1 : 0) - expectedScore(my, opp))); }
export function effTier(impacts){ const t = (impacts || []).reduce((a, b) => a + b, 0); if (t >= 6) return 3; if (t >= 4) return 2; if (t >= 2) return 1; return 0; }
export function rpBreakdown(myMMR, oppMMR, won, tier){
  const mod = Math.max(-10, Math.min(10, Math.round((oppMMR - myMMR) / 50)));
  const eff = won ? (RANKED.EFF_BONUS[tier] || 0) : 0;
  const base = won ? RANKED.RP_BASE_WIN : -RANKED.RP_BASE_WIN;
  const total = Math.max(-RANKED.RP_CAP, Math.min(RANKED.RP_CAP, base + mod + eff));
  return { base, mod, eff, total };
}
export function lbCompare(a, b){
  if ((b.rp || 0) !== (a.rp || 0)) return (b.rp || 0) - (a.rp || 0);
  if ((b.mmr || 0) !== (a.mmr || 0)) return (b.mmr || 0) - (a.mmr || 0);
  if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0);
  const ga = (a.wins || 0) + (a.losses || 0), gb = (b.wins || 0) + (b.losses || 0);
  const wa = ga ? (a.wins || 0) / ga : 0, wb = gb ? (b.wins || 0) / gb : 0;
  if (wb !== wa) return wb - wa;
  return String(a.user_id || "").localeCompare(String(b.user_id || ""));
}
/* Eficiência estratégica: re-simula a partida e mede o impacto REAL de cada
   barreira sua no caminho mínimo do adversário (antes vs depois). */
export function analyzeWallImpacts(state, me){
  const sim = newGameCustom(state.rows || 9, 10);
  const opp = me === "red" ? "blue" : "red";
  const impacts = [];
  for (const ev of (state.replay || [])){
    if (ev.t === "w" && ev.p === me){
      const g = sim.goals[opp];
      const before = bfsDistance(sim, sim.players[opp].r, sim.players[opp].c, g);
      applyEvent(sim, ev);
      const after = bfsDistance(sim, sim.players[opp].r, sim.players[opp].c, g);
      if (before >= 0 && after >= 0) impacts.push(after - before);
    } else applyEvent(sim, ev);
  }
  return impacts;
}
