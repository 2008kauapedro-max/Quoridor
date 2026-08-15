/* =============================================================
   The Rage Arena — services/supabase.js (v2 — loja integrada)
   ============================================================= */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ELO_START } from "../core/constants.js";

let CONFIG = { SUPABASE_URL: "", SUPABASE_ANON_KEY: "" };
try {
  const m = await import("../config.js");
  if (m.CONFIG) CONFIG = m.CONFIG;
} catch (_) { /* config.js ausente/vazio → modo offline */ }

export const isConfigured = () =>
  !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);

const sb = isConfigured()
  ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
  : null;
export { sb as sbClient };

let currentSession = null;
if (sb){
  sb.auth.getSession().then(({ data }) => { currentSession = data.session || null; });
  sb.auth.onAuthStateChange((_ev, session) => { currentSession = session; });
}
export const getSession = () => currentSession;

export function onAuthChange(cb){
  if (!sb){ cb(null); return () => {}; }
  const { data } = sb.auth.onAuthStateChange((_ev, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

const err = (e) => ({ error: e?.message || "Erro inesperado" });
const need = () => ({ error: "Configure o Supabase em js/config.js" });

/* ═══════════ AUTENTICAÇÃO ═══════════ */
export async function loginEmail(email, pass){
  if (!sb) return need();
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  return error ? err(error) : {};
}

export async function registerEmail(name, email, pass){
  if (!sb) return need();
  const { data, error } = await sb.auth.signUp({
    email, password: pass,
    options: { data: { name: name || "Jogador" } }
  });
  if (error) return err(error);
  if (!data.session) return { pending: true };
  return {};
}

export async function loginGoogle(){
  if (!sb) return need();
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: location.origin }
  });
  return error ? err(error) : {};
}

export async function resetPassword(email){
  if (!sb) return need();
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
  return error ? err(error) : {};
}

export async function logout(){
  if (!sb) return;
  try { await sb.signOut({ scope: "local" }); } catch (_){}
  currentSession = null;
}

/* ═══════════ PERFIL ═══════════ */
export async function getProfile(){
  if (!sb || !currentSession) return null;
  const { data } = await sb.from("profiles")
    .select("*").eq("id", currentSession.user.id).maybeSingle();
  return data || null;
}

export async function updateProfile(patch){
  if (!sb || !currentSession) return need();
  const { error } = await sb.from("profiles")
    .update(patch).eq("id", currentSession.user.id);
  return error ? err(error) : {};
}

export async function uploadAvatar(file){
  if (!sb || !currentSession) return need();
  const id = currentSession.user.id;
  const path = `${id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
  const up = await sb.storage.from("avatars").upload(path, file, { upsert: true });
  if (up.error) return err(up.error);
  const { data } = sb.storage.from("avatars").getPublicUrl(path);
  return updateProfile({ avatar_url: data.publicUrl });
}

/* ═══════════ RANKING (Top 100) ═══════════ */
export async function getRanking(period){
  if (!sb) return null;
  if (period === "global"){
    const { data } = await sb.from("leaderboard_global").select("id, username, avatar_url, elo, frame").limit(100);
    return data || null;
  }
  const view = period === "weekly" ? "leaderboard_weekly" : "leaderboard_monthly";
  const { data } = await sb.from(view)
    .select("id, username, avatar_url, elo, frame").limit(100);
  return data || null;
}

/* ═══════════ AMIGOS ═══════════ */
export async function searchPlayers(q){
  if (!sb || !q || !currentSession) return null;
  const { data } = await sb.from("profiles")
    .select("id, username, avatar_url")
    .ilike("username", `%${q}%`)
    .neq("id", currentSession.user.id)
    .limit(10);
  return data || null;
}

export async function sendFriendRequest(otherId){
  if (!sb || !currentSession) return need();
  const me = currentSession.user.id;
  const a = me;
  const b = otherId;
  const { error } = await sb.from("friendships")
    .upsert({ user_a: a, user_b: b, status: "pending" },
            { onConflict: "user_a,user_b" });
  return error ? err(error) : {};
}

export async function getFriends(){
  if (!sb || !currentSession) return null;
  const me = currentSession.user.id;
  const { data } = await sb.from("friendships")
    .select("user_a, user_b, status")
    .eq("status", "accepted")
    .or(`user_a.eq.${me},user_b.eq.${me}`);
  if (!data?.length) return [];
  const ids = data.map((f) => (f.user_a === me ? f.user_b : f.user_a));
  const { data: profs } = await sb.from("profiles")
    .select("id, username, avatar_url").in("id", ids);
  return (profs || []).map((p) => ({ ...p, online: false }));
}

/* ═══════════ REPORTE DE PARTIDA ═══════════ */
export async function reportMatch(sum){
  if (!sb || !currentSession) return;
  await sb.rpc("report_match", { payload: {
    winner_color: sum.winner,
    my_color: sum.myColor,
    duration_sec: sum.durationSec || 0,
    moves_me: sum.movesUsed || 0,
    walls_me: sum.wallsUsed || 0,
    replay: sum.replay || []
  } }).then(() => {}, () => {});
}

/* ═══════════ LOJA — pedidos de compra ═══════════ */
export async function requestPurchase(skinId){
  if (!sb || !currentSession) return need();
  const { data: prof } = await sb.from("profiles")
    .select("avatar_url, elo").eq("id", currentSession.user.id).maybeSingle();
  const { error } = await sb.from("purchases").insert({
    user_id: currentSession.user.id,
    username: currentSession.user.user_metadata?.name || "Jogador",
    avatar_url: prof?.avatar_url || "",
    elo: prof?.elo ?? 0,
    skin_id: skinId, status: "pending"
  });
  return error ? err(error) : {};
}
export async function rejectPurchase(id){
  if (!sb || !currentSession) return need();
  const { error } = await sb.from("purchases").delete().eq("id", id);
  return error ? err(error) : {};
}
export async function listPendingPurchases(){
  if (!sb || !currentSession) return [];
  const { data } = await sb.from("purchases").select("*")
    .eq("status", "pending").order("id", { ascending: false }).limit(50);
  return data || [];
}
export async function approvePurchase(id){
  if (!sb || !currentSession) return need();
  const { error } = await sb.from("purchases").update({ status: "paid" }).eq("id", id);
  return error ? err(error) : {};
}

export async function getFriendRequests(){
  if (!sb || !currentSession) return [];
  const me = currentSession.user.id;
  const { data } = await sb.from("friendships")
    .select("user_a, user_b, status").eq("user_b", me).eq("status", "pending");
  if (!data?.length) return [];
  const ids = data.map((f) => f.user_a);
  const { data: profs } = await sb.from("profiles")
    .select("id, username, avatar_url").in("id", ids);
  return profs || [];
}

export async function respondFriendRequest(otherId, accept){
  if (!sb || !currentSession) return need();
  const me = currentSession.user.id;
  if (accept){
    const { error } = await sb.from("friendships")
      .update({ status: "accepted" }).eq("user_a", otherId).eq("user_b", me);
    return error ? err(error) : {};
  }
  const { error } = await sb.from("friendships")
    .delete().eq("user_a", otherId).eq("user_b", me);
  return error ? err(error) : {};
}

export async function removeFriend(otherId){
  if (!sb || !currentSession) return need();
  const me = currentSession.user.id;
  const { error } = await sb.from("friendships").delete().eq("status", "accepted")
    .or(`and(user_a.eq.${me},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${me})`);
  return error ? err(error) : {};
}

export async function getAnnouncements(){
  if (!sb) return [];
  const { data } = await sb.from("announcements")
    .select("id, title, body, created_at")
    .order("id", { ascending: false }).limit(10);
  return data || [];
}

export async function postAnnouncement(title, body){
  if (!sb) return need();
  const { error } = await sb.from("announcements").insert({ title, body });
  return error ? err(error) : {};
}
/* ═══════════ ANTIFARM — partidas repetidas do mesmo par ═══════════ */
export async function pairCount(otherId){
  if (!sb || !currentSession || !otherId) return 0;
  const me = currentSession.user.id;
  const a = me < otherId ? me : otherId, b = me < otherId ? otherId : me;
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await sb.from("match_log")
    .select("*", { count: "exact", head: true })
    .eq("a", a).eq("b", b).gte("at", since);
  return count || 0;
}
export async function logMatch(otherId){
  if (!sb || !currentSession || !otherId) return;
  const me = currentSession.user.id;
  if (me >= otherId) return;
  await sb.from("match_log").insert({ a: me, b: otherId });
}

export async function getRankedRanking(){
  if (!sb) return null;
  const { data } = await sb.from("profiles")
    .select("id, username, avatar_url, frame, elo_ranked, ranked_games")
    .gt("ranked_games", 0)
    .order("elo_ranked", { ascending: false })
    .limit(100);
  return data || null;
}

export async function claimRankedMatch(roomCode){
  if (!sb) return null;
  const { data, error } = await sb.rpc("ranked_claim_match", { p_room: roomCode });
  if (error) throw error; return data;
}
export async function submitRankedResult(p){
  if (!sb) return null;
  const { data, error } = await sb.rpc("ranked_report_result", {
    p_match: p.matchId, p_won: p.iWon, p_abandoned: p.abandoned,
    p_impacts: p.impacts, p_wu: p.wallsUsed, p_wl: p.wallsLeft, p_dur: p.durationSec });
  if (error) throw error; return data;
}
export async function getRankedResult(matchId){
  if (!sb) return null;
  const { data, error } = await sb.rpc("ranked_get_result", { p_match: matchId });
  if (error) throw error; return data;
}
export async function autoWinRanked(matchId){
  if (!sb) return null;
  const { data, error } = await sb.rpc("ranked_auto_win", { p_match: matchId });
  if (error) throw error; return data;
}
export async function getMyRanked(){
  const ses = getSession();
  if (!sb || !ses) return null;
  const { data } = await sb.from("ranked").select("*").eq("user_id", ses.user.id).maybeSingle();
  return data || null;
}
export async function getRankedBoard(){
  if (!sb) return null;
  const { data } = await sb.from("ranked").select("*, profiles(username, avatar_url, frame)")
    .order("rp", { ascending: false }).order("mmr", { ascending: false }).limit(100);
  return data || null;
}
export async function getRankedHistory(){
  const ses = getSession();
  if (!sb || !ses) return null;
  const { data } = await sb.from("ranked_history").select("*")
    .eq("user_id", ses.user.id).order("created_at", { ascending: false }).limit(10);
  return data || null;
}

export async function listPendingRanked(){
  const ses = getSession();
  if (!sb || !ses) return [];
  const { data } = await sb.from("ranked_matches").select("id,player_a,player_b,rep_a,rep_b").eq("status", "pending");
  return (data || []).filter((m) =>
    (m.player_a === ses.user.id && m.rep_a && !m.rep_b) ||
    (m.player_b === ses.user.id && m.rep_b && !m.rep_a));
}
