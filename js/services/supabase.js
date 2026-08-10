/* =============================================================
   Quoridor Arena — services/supabase.js
   -------------------------------------------------------------
   Cliente Supabase (plano 100% gratuito) carregado via CDN esm.sh
   (sem build, sem Node). Sem chaves configuradas → tudo retorna
   null/{error} e o jogo segue em modo local.
   ============================================================= */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ELO_START } from "../core/constants.js";

/* Config opcional: se js/config.js não existir ou estiver vazio,
   o import falha SEM DERRUBAR o app e seguimos desconfigurados. */
let CONFIG = { SUPABASE_URL: "", SUPABASE_ANON_KEY: "" };
try {
  const m = await import("../config.js");
  if (m.CONFIG) CONFIG = m.CONFIG;
} catch (_) { /* config.js ausente/vazio → modo offline */ }

export const isConfigured = () =>
  !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);

/* Cliente único (criado só se configurado) */
const sb = isConfigured()
  ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
  : null;
  export { sb as sbClient };

/* Sessão em memória (leituras síncronas pelo app) */
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
  if (!data.session) return { pending: true };   // precisa confirmar e-mail
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
  await sb.signOut();
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

/* Foto → bucket "avatars" (Storage gratuito) → URL pública no perfil */
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
  const a = me;         // par ordenado = sem duplicata
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

/* ═══════════ REPORTE DE PARTIDA (Elo/stats oficiais) ═══════════
   Chama a função SQL report_match() — RLS garante permissão. */
export async function reportMatch(sum){
  if (!sb || !currentSession) return;
      await sb.rpc("report_match", { payload: {
    winner_color: sum.winner,
    my_color: sum.myColor,
    duration_sec: sum.durationSec || 0,
    moves_me: sum.movesUsed || 0,
    walls_me: sum.wallsUsed || 0,
    replay: sum.replay || []
  } }).then(() => {}, () => {});   // silencioso: offline não trava o jogo
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