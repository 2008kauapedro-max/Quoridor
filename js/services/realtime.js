/* =============================================================
   Quoridor Arena — services/realtime.js  (v2 — polling confiável)
   ============================================================= */
import { getSession, sbClient } from "./supabase.js";

let eventCb = null, statusCb = null, inviteCb = null;
let roomChannel = null, userChannel = null;
let currentRoom = null, matched = false;
let pollTimers = [];

const me = () => getSession()?.user?.id || null;
const rndCode = () =>
  Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
const rndTurn = () => (Math.random() < .5 ? "red" : "blue");

function every(ms, fn){ const t = setInterval(fn, ms); pollTimers.push(t); return t; }
function stopPolls(){ pollTimers.forEach(clearInterval); pollTimers = []; }

/* ═══════════ status / eventos / chat ═══════════ */
export function onStatus(cb){
  statusCb = cb;
  window.addEventListener("offline", () => statusCb?.(false));
  window.addEventListener("online",  () => statusCb?.(true));
}
export function onEvent(cb){ eventCb = cb; }
export function sendAction(ev){ roomChannel?.send({ type:"broadcast", event:"action", payload:{ ev } }); }
export function sendChat(text){ roomChannel?.send({ type:"broadcast", event:"chat", payload:{ text } }); }

function openRoomChannel(code){
  if (!sbClient) return;
  roomChannel = sbClient.channel("room:" + code)
    .on("broadcast", { event:"action" }, (m) => eventCb?.({ kind:"action", ev:m.payload.ev }))
    .on("broadcast", { event:"chat"   }, (m) => eventCb?.({ kind:"chat", text:m.payload.text }))
    .subscribe();
}

/* ═══════════ leitura de sala ═══════════ */
async function readRoom(code){
  const { data } = await sbClient.from("rooms").select("*").eq("code", code).maybeSingle();
  return data || null;
}
async function findWaitingOther(){
  const { data } = await sbClient.from("rooms")
    .select("code").eq("is_public", true).eq("status", "waiting")
    .neq("host_id", me()).limit(1).maybeSingle();
  return data || null;
}
async function tryJoin(code){
  const { data } = await sbClient.from("rooms")
    .update({ guest_id: me(), status: "full" })
    .eq("code", code).eq("status", "waiting").is("guest_id", null)
    .select("code").maybeSingle();
  return !!data;
}

/* ═══════════ quando a sala começa ═══════════ */
function finalize(row, onMatched){
  if (matched) return;
  matched = true; stopPolls();
  const isHost = row.host_id === me();
  const myColor = isHost ? row.host_color : (row.host_color === "red" ? "blue" : "red");
  openRoomChannel(row.code);
  onMatched({ code: row.code, myColor, firstTurn: row.first_turn });
}

/* guest: espera virar "playing" */
function waitPoll(code, onMatched){
  currentRoom = code;
  every(1200, async () => {
    if (matched) return;
    const row = await readRoom(code);
    if (row?.status === "playing") finalize(row, onMatched);
  });
}

/* host: vigia a própria sala; sorteia quando entra guest */
function hostPoll(code, onMatched){
  currentRoom = code;
  every(1500, async () => {
    if (matched) return;
    const row = await readRoom(code);
    if (!row) return;
    if (row.status === "full" && row.guest_id && row.host_id === me()){
      await sbClient.from("rooms").update({
        status: "playing", host_color: rndTurn(), first_turn: rndTurn()
      }).eq("code", code);
      return;
    }
    if (row.status === "playing"){ finalize(row, onMatched); return; }
    /* enquanto espero, procuro outra sala p/ entrar (evita espera mútua) */
    const other = await findWaitingOther();
    if (other && (await tryJoin(other.code))){
      await sbClient.from("rooms").delete().eq("code", code);
      stopPolls();
      waitPoll(other.code, onMatched);
    }
  });
}

/* ═══════════ API pública ═══════════ */
export async function startQueue(onMatched){
  if (!sbClient || !me()) return;
  matched = false; stopPolls();
  const other = await findWaitingOther();
  if (other && (await tryJoin(other.code))){ waitPoll(other.code, onMatched); return; }
  const code = await createRoom(true);
  hostPoll(code, onMatched);
}

export async function cancelQueue(){
  matched = true; stopPolls();
  if (currentRoom)
    await sbClient?.from("rooms").delete().eq("code", currentRoom).is("guest_id", null);
  currentRoom = null;
}

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
  if (!(await tryJoin(code))){
    window.dispatchEvent(new CustomEvent("qa-toast", { detail: "Sala não encontrada ou cheia." }));
    return;
  }
  waitPoll(code, onMatched);
}

export async function leaveRoom(){
  stopPolls();
  if (currentRoom)
    await sbClient?.from("rooms").update({ status: "finished" }).eq("code", currentRoom);
  for (const ch of [roomChannel, userChannel]) if (ch) sbClient?.removeChannel(ch);
  roomChannel = userChannel = null;
  currentRoom = null; matched = false;
}

/* ═══════════ convites de amigos ═══════════ */
export function inviteFriend(id){
  if (!sbClient) return;
  createRoom(false).then((code) => {
    const ch = sbClient.channel("user:" + id);
    ch.subscribe(() => {
      ch.send({ type:"broadcast", event:"invite",
        payload:{ code, from: getSession()?.user?.user_metadata?.name || "Alguém" } });
    });
    window.dispatchEvent(new CustomEvent("qa-toast", { detail: "Convite enviado! 📨" }));
  });
}

export function bindSession(userId, handlers){
  inviteCb = handlers?.onInvite || null;
  if (!sbClient || !userId) return;
  userChannel = sbClient.channel("user:" + userId)
    .on("broadcast", { event:"invite" }, (m) => inviteCb?.(m.payload))
    .subscribe();
}

/* ═══════ FINAL DO ARQUIVO — confere se chegou até aqui ═══════ */
export const net = {
  startQueue, cancelQueue, createRoom, joinRoom, leaveRoom,
  onEvent, sendAction, sendChat, onStatus, inviteFriend
};
