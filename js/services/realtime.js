/* =============================================================
   Quoridor Arena — services/realtime.js
   -------------------------------------------------------------
   Multiplayer via Supabase Realtime (plano gratuito):
   • Matchmaking: entra na fila → acha sala pública esperando OU
     cria a sua e espera alguém entrar.
   • Salas privadas por código + convites de amigos ao vivo.
   • Partida sincronizada por broadcast (ação a ação).
   • Status de conexão p/ overlay "Reconectando…".
   ============================================================= */
import { getSession } from "./supabase.js";
import { sbClient } from "./supabase.js";
import { randomFirstTurn } from "../core/rules.js";

/* callbacks registrados pelas telas */
let eventCb = null;
let statusCb = null;
let inviteCb = null;

/* canais ativos */
let roomChannel = null;
let queueChannel = null;
let userChannel = null;
let currentRoom = null;
let matched = false;

const me = () => getSession()?.user?.id || null;
const rndCode = () =>
  Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

/* ═══════════ STATUS DE CONEXÃO ═══════════ */
export function onStatus(cb){
  statusCb = cb;
  window.addEventListener("offline", () => statusCb?.(false));  // mostra "Reconectando…"
  window.addEventListener("online",  () => statusCb?.(true));   // esconde
}

/* ═══════════ EVENTOS DE PARTIDA / CHAT ═══════════ */
export function onEvent(cb){ eventCb = cb; }

export function sendAction(ev){
  roomChannel?.send({ type: "broadcast", event: "action", payload: { ev } });
}
export function sendChat(text){
  roomChannel?.send({ type: "broadcast", event: "chat", payload: { text } });
}

/* ═══════════ CANAL DA SALA (jogada + chat) ═══════════ */
function openRoomChannel(code){
  if (!sbClient) return;
  roomChannel = sbClient.channel("room:" + code)
    .on("broadcast", { event: "action" }, (m) => eventCb?.({ kind: "action", ev: m.payload.ev }))
    .on("broadcast", { event: "chat"   }, (m) => eventCb?.({ kind: "chat",  text: m.payload.text }))
    .subscribe();
}

/* ═══════════ MATCHMAKING (FILA) ═══════════ */
export async function startQueue(onMatched){
  if (!sbClient || !me()) return;
  matched = false;

  /* 1) tenta entrar numa sala pública que já está esperando */
  const { data: waiting } = await sbClient.from("rooms")
    .select("code").eq("is_public", true).eq("status", "waiting")
    .neq("host_id", me()).limit(1).maybeSingle();

  if (waiting){
    const ok = await tryJoin(waiting.code);
    if (ok){ await waitStart(waiting.code, false, onMatched); return; }
  }

  /* 2) senão, cria a sua e espera alguém entrar */
  const code = await createRoom(true);
  watchMyRoom(code, onMatched);

  /* 3) e fica de olho em salas novas que surgirem (entra na hora) */
  queueChannel = sbClient.channel("queue-watch")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "rooms",
                              filter: "is_public=eq.true" }, async (msg) => {
      if (matched || msg.new?.host_id === me()) return;
      const ok = await tryJoin(msg.new.code);
      if (ok){
        matched = true;
        await sbClient.from("rooms").delete().eq("code", code); // abandona a minha
        queueChannel && sbClient.removeChannel(queueChannel);
        watchMyRoom(msg.new.code, onMatched, true);
      }
    })
    .subscribe();
}

export async function cancelQueue(){
  matched = true;   // trava callbacks pendentes
  if (queueChannel) sbClient?.removeChannel(queueChannel);
  queueChannel = null;
  if (currentRoom)
    await sbClient?.from("rooms").delete().eq("code", currentRoom).eq("guest_id", null);
  currentRoom = null;
}

/* Tenta virar guest da sala (atômico: só se ainda não tiver guest) */
async function tryJoin(code){
  const { data } = await sbClient.from("rooms")
    .update({ guest_id: me(), status: "full" })
    .eq("code", code).eq("status", "waiting").is("guest_id", null)
    .select("code").maybeSingle();
  return !!data;
}

/* ═══════════ SALAS ═══════════ */
export async function createRoom(isPublic){
  const code = rndCode();
  await sbClient.from("rooms").insert({
    code, host_id: me(), is_public: !!isPublic, status: "waiting"
  });
  currentRoom = code;
  return code;
}

export async function joinRoom(code, onMatched){
  if (!sbClient || !code) return;
  const ok = await tryJoin(code);
  if (!ok){ eventCb?.({ kind: "chat", text: "" }); /* noop */
    window.dispatchEvent(new CustomEvent("qa-toast", { detail: "Sala não encontrada ou cheia." }));
    return;
  }
  await waitStart(code, false, onMatched);
}

/* Host: fica vigiando a própria sala; quando entra guest, sorteia e inicia */
function watchMyRoom(code, onMatched, asGuest = false){
  currentRoom = code;
  if (asGuest){ waitStart(code, false, onMatched); return; }

  sbClient.channel("room-watch:" + code)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms",
                              filter: `code=eq.${code}` }, async (msg) => {
      const row = msg.new;
      /* sou host e chegou guest → sorteio cores/turno e inicio */
      if (row.host_id === me() && row.guest_id && row.status === "full"){
        await sbClient.from("rooms").update({
          status: "playing",
          host_color: randomFirstTurn() === "red" ? "red" : "blue",
          first_turn: randomFirstTurn()
        }).eq("code", code);
      }
      /* status playing → ambos entram */
      if (row.status === "playing" && !matched){
        matched = true;
        const isHost = row.host_id === me();
        const myColor = isHost ? row.host_color : (row.host_color === "red" ? "blue" : "red");
        openRoomChannel(code);
        onMatched({ code, myColor, firstTurn: row.first_turn });
      }
    })
    .subscribe();
}

/* Guest: espera o host publicar status "playing" com cores/turno */
async function waitStart(code, _isHost, onMatched){
  currentRoom = code;
  const timeout = setTimeout(() => {
    window.dispatchEvent(new CustomEvent("qa-toast", { detail: "O anfitrião não iniciou a sala." }));
  }, 12000);
  sbClient.channel("room-wait:" + code)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms",
                              filter: `code=eq.${code}` }, (msg) => {
      const row = msg.new;
      if (row.status === "playing" && !matched){
        matched = true;
        clearTimeout(timeout);
        const myColor = row.guest_id === me()
          ? (row.host_color === "red" ? "blue" : "red")
          : row.host_color;
        openRoomChannel(code);
        onMatched({ code, myColor, firstTurn: row.first_turn });
      }
    })
    .subscribe();
}

/* ═══════════ SAIR / LIMPAR ═══════════ */
export async function leaveRoom(){
  if (currentRoom)
    await sbClient?.from("rooms").update({ status: "finished" }).eq("code", currentRoom);
  for (const ch of [roomChannel, queueChannel, userChannel])
    if (ch) sbClient?.removeChannel(ch);
  roomChannel = queueChannel = userChannel = null;
  currentRoom = null; matched = false;
}

/* ═══════════ CONVITES DE AMIGOS (ao vivo) ═══════════ */
export function inviteFriend(id){
  if (!sbClient) return;
  createRoom(false).then((code) => {
    sbClient.channel("user:" + id)
      .subscribe(() => {
        sbClient.channel("user:" + id)
          .send({ type: "broadcast", event: "invite",
                  payload: { code, from: getSession()?.user?.user_metadata?.name || "Alguém" } });
      });
    window.dispatchEvent(new CustomEvent("qa-toast", { detail: "Convite enviado! 📨" }));
  });
}

/* Assiste o canal do PRÓPRIO usuário (recebe convites em qualquer tela) */
export function bindSession(userId, handlers){
  inviteCb = handlers?.onInvite || null;
  if (!sbClient || !userId) return;
  userChannel = sbClient.channel("user:" + userId)
    .on("broadcast", { event: "invite" }, (m) => inviteCb?.(m.payload))
    .subscribe();
}
/* objeto único p/ telas chamarem: net.startQueue(...), net.sendChat(...) */
export const net = {
  startQueue, cancelQueue, createRoom, joinRoom, leaveRoom,
  onEvent, sendAction, sendChat, onStatus, inviteFriend
};