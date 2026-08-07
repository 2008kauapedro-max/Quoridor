/* =============================================================
   Quoridor Arena — services/storage.js
   -------------------------------------------------------------
   Persistência local GRATUITA (LocalStorage), com prefixo "qa_".
   Tudo que é "do aparelho" vive aqui; o que é "da conta" vai
   pro Supabase (services/supabase.js).
   ============================================================= */
import { LS_PREFIX, ELO_START, XP_WIN, XP_LOSS, ACHIEVEMENTS } from "../core/constants.js";
import { reportMatch as cloudReport, isConfigured, getSession } from "./supabase.js";

/* helpers seguros (JSON nunca quebra o jogo) */
function read(key, fallback){
  try {
    const v = localStorage.getItem(LS_PREFIX + key);
    return v ? JSON.parse(v) : fallback;
  } catch (_) { return fallback; }
}
function write(key, value){
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch (_) {}
}

/* ═══════════ CONFIGURAÇÕES ═══════════ */
export const DEFAULT_SETTINGS = {
  theme: "auto",        // claro | escuro | auto
  lang: "pt",           // pt | en
  volume: 80,           // 0–100
  sound: true,
  music: false,
  animations: true,
  quality: "high",      // high | low
  skin: "classic"       // classic | neon | pastel
};
export function getSettings(){ return { ...DEFAULT_SETTINGS, ...read("settings", {}) }; }
export function setSettings(s){ write("settings", s); }

/* ═══════════ ESTATÍSTICAS ═══════════ */
export const DEFAULT_STATS = {
  xp: 0, elo: ELO_START,
  wins: 0, losses: 0, draws: 0, games: 0,
  moves: 0, walls: 0, timeSec: 0,
  winStreak: 0, bestWinStreak: 0,
  lossStreak: 0, worstLossStreak: 0
};
export function getStats(){ return { ...DEFAULT_STATS, ...read("stats", {}) }; }

/* ═══════════ CONQUISTAS ═══════════ */
export function getUnlocked(){ return read("ach", []); }

/* Registra o fim de uma partida → retorna { xp, eloDelta, unlocked[] } */
export function recordMatch(sum){
  const st = getStats();
  st.timeSec += sum.durationSec || 0;
  st.walls   += sum.wallsUsed  || 0;
  st.moves   += sum.movesUsed  || 0;

  let xp = 0, eloDelta = 0;
  const unlocked = [];

  /* modo local (sofá) conta só tempo/movimentos/paredes */
  if (sum.mode !== "local"){
    const win = sum.winner === sum.myColor;
    st.games++;

    if (win){
      st.wins++; st.winStreak++; st.lossStreak = 0;
      st.bestWinStreak = Math.max(st.bestWinStreak, st.winStreak);
      xp += XP_WIN;
    } else {
      st.losses++; st.lossStreak++; st.winStreak = 0;
      st.worstLossStreak = Math.max(st.worstLossStreak, st.lossStreak);
      xp += XP_LOSS;
    }

    /* Elo espelhado offline (o oficial vem do Supabase no login) */
    if (sum.mode === "online"){
      eloDelta = win ? 16 : -16;
      st.elo = Math.max(100, st.elo + eloDelta);
      if (isConfigured() && getSession()){
        try { cloudReport(sum); } catch (_) {}   // fire-and-forget
      }
    }

    /* —— conquistas —— */
    const already = getUnlocked();
    const grant = (key) => {
      if (already.includes(key) || unlocked.includes(key)) return;
      unlocked.push(key);
      xp += ACHIEVEMENTS.find((a) => a.key === key)?.xp || 0;
    };
    if (win){
      grant("first_win");
      if (st.wins >= 10)  grant("wins_10");
      if (st.wins >= 50)  grant("wins_50");
      if (st.wins >= 100) grant("wins_100");
      if (st.wins >= 500) grant("wins_500");
      if ((sum.wallsUsed || 0) === 0)      grant("no_walls");
      if ((sum.durationSec || 999) < 120)  grant("fast_win");
      if (sum.wasBehind)                   grant("comeback");
    }
    st.xp += xp;
    if (unlocked.length) write("ach", [...already, ...unlocked]);
  }

  write("stats", st);
  return { xp, eloDelta, unlocked };
}

/* ═══════════ AUTOSAVE ("deseja continuar?") ═══════════ */
export function setSnapshot(data){
  write("snapshot", { ...data, at: Date.now() });
}
export function getSnapshot(){
  const snap = read("snapshot", null);
  if (!snap) return null;
  if (Date.now() - snap.at > 7 * 24 * 3600 * 1000){   // expira em 7 dias
    clearSnapshot();
    return null;
  }
  return snap;
}
export function clearSnapshot(){
  try { localStorage.removeItem(LS_PREFIX + "snapshot"); } catch (_) {}
}
export function hasSnapshot(){ return !!getSnapshot(); }

/* ═══════════ ÚLTIMO REPLAY ═══════════ */
export function setLastReplay(list){ write("lastReplay", list || []); }
export function getLastReplay(){ return read("lastReplay", []); }