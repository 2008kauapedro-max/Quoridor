/* =============================================================
   The Rage Arena — services/storage.js (v3 — antifarm par repetido)
   ============================================================= */
import { LS_PREFIX, ELO_START, XP_WIN, XP_LOSS, ACHIEVEMENTS } from "../core/constants.js";
import { reportMatch as cloudReport, isConfigured, getSession, sbClient } from "./supabase.js";

function read(key, fallback){
  try {
    const v = localStorage.getItem(LS_PREFIX + key);
    return v ? JSON.parse(v) : fallback;
  } catch (_) { return fallback; }
}
function write(key, value){
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch (_) {}
}

export const DEFAULT_SETTINGS = {
  theme: "auto", lang: "pt", volume: 80, sound: true, music: false,
  animations: true, quality: "high", skin: "classic"
};
export function getSettings(){ return { ...DEFAULT_SETTINGS, ...read("settings", {}) }; }
let _saveT = null;
export function setSettings(s){
  write("settings", s);
  clearTimeout(_saveT);
  _saveT = setTimeout(() => saveCloudData(), 800);
}

export const DEFAULT_STATS = {
  xp: 0, elo: ELO_START,
  wins: 0, losses: 0, draws: 0, games: 0,
  moves: 0, walls: 0, timeSec: 0,
  winStreak: 0, bestWinStreak: 0,
  lossStreak: 0, worstLossStreak: 0
};
export function getStats(){ return { ...DEFAULT_STATS, ...read("stats", {}) }; }

export function getUnlocked(){ return read("ach", []); }

function mergeNums(a, b){
  const m = { ...a, ...b };
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])){
    if (typeof a[k] === "number" || typeof b[k] === "number")
      m[k] = Math.max(Number(a[k]) || 0, Number(b[k]) || 0);
  }
  return m;
}
function mergeStats(local, cloud){
  return mergeNums({ ...DEFAULT_STATS, ...local }, cloud || {});
}
export async function syncCloudData(){
  if (!isConfigured() || !getSession() || !sbClient) return;
  try {
    const id = getSession().user.id;
    const { data } = await sbClient.from("profiles")
      .select("stats, achievements, extra, prefs").eq("id", id).maybeSingle();
    const mStats = mergeStats(getStats(), data?.stats || {});
    const mExtra = mergeNums(read("extra", {}), data?.extra || {});
    const mAch = [...new Set([...getUnlocked(), ...(Array.isArray(data?.achievements) ? data.achievements : [])])];
    const mPrefs = { ...getSettings(), ...(data?.prefs || {}) };
    write("stats", mStats);
    write("extra", mExtra);
    write("ach", mAch);
    write("settings", mPrefs);
        await sbClient.from("profiles").update({
      stats: mStats, achievements: mAch, extra: mExtra,
      prefs: { piece: mPrefs.piece, frame: mPrefs.frame, wall: mPrefs.wall, title: mPrefs.title, skin: mPrefs.skin, customColor: mPrefs.customColor }
    }).eq("id", id);
    const { data: paid } = await sbClient.from("purchases").select("skin_id").eq("user_id", id).eq("status", "paid");
    const paidList = (paid || []).map((p) => p.skin_id);
    write("paid", paidList);
    write("pending", read("pending", []).filter((k) => !paidList.includes(k)));
  } catch (_) {}
}

async function saveCloudData(){
  if (!isConfigured() || !getSession() || !sbClient) return;
  try {
    const s = getSettings();
    await sbClient.from("profiles").update({
      stats: getStats(), achievements: getUnlocked(), extra: read("extra", {}),
      prefs: { piece: s.piece, frame: s.frame, wall: s.wall, title: s.title, skin: s.skin, customColor: s.customColor }
    }).eq("id", getSession().user.id);
  } catch (_) {}
}
export function saveCloudNow(){ return saveCloudData(); }

/* Registra o fim de uma partida → retorna { xp, eloDelta, unlocked[] } */
export function recordMatch(sum){
  const st = getStats();
  st.timeSec += sum.durationSec || 0;
  st.walls   += sum.wallsUsed  || 0;
  st.moves   += sum.movesUsed  || 0;

  let xp = 0, eloDelta = 0;
  const unlocked = [];

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

    if (sum.mode === "online"){
      if (sum.repeated){
        eloDelta = 0;
      } else if (sum.abandoned && win && (sum.movesUsed || 0) < 2){
        eloDelta = 0;
      } else if (sum.abandoned && win){
        eloDelta = 8;
      } else {
        eloDelta = win ? 16 : -16;
      }
      if (eloDelta) st.elo = Math.max(100, st.elo + eloDelta);
      if (!sum.repeated && isConfigured() && getSession()){
        try { cloudReport(sum); } catch (_) {}
      }
    }

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
  if (unlocked.length || sum.mode === "online") saveCloudData();
  return { xp, eloDelta, unlocked };
}

export function setSnapshot(data){
  write("snapshot", { ...data, at: Date.now() });
}
export function getSnapshot(){
  const snap = read("snapshot", null);
  if (!snap) return null;
  if (Date.now() - snap.at > 7 * 24 * 3600 * 1000){
    clearSnapshot();
    return null;
  }
  return snap;
}
export function clearSnapshot(){
  try { localStorage.removeItem(LS_PREFIX + "snapshot"); } catch (_) {}
}
export function hasSnapshot(){ return !!getSnapshot(); }

export function setLastReplay(list){ write("lastReplay", list || []); }
export function getLastReplay(){ return read("lastReplay", []); }
export function getClips(){ try { return JSON.parse(localStorage.getItem("qa_clips") || "[]"); } catch (_){ return []; } }
export function saveClip(clip){ const arr = getClips(); arr.unshift(clip); try { localStorage.setItem("qa_clips", JSON.stringify(arr.slice(0, 10))); } catch (_){} }
export function deleteClip(id){ localStorage.setItem("qa_clips", JSON.stringify(getClips().filter((c) => c.id !== id))); }
