import { getSession, sbClient } from "./supabase.js";

let eventCb=null, statusCb=null, inviteCb=null, matchHandler=null;
let roomChannel=null, userChannel=null;
let currentRoom=null, matched=false;
let pollTimers=[];

const me=()=>getSession()?.user?.id||null;
const rndCode=()=>Array.from({length:6},()=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random()*32)]).join("");
const rndTurn=()=>Math.random()<.5?"red":"blue";
function every(ms,fn){const t=setInterval(fn,ms);pollTimers.push(t);return t;}
function stopPolls(){pollTimers.forEach(clearInterval);pollTimers=[];}
function reset(){matched=false;stopPolls();currentRoom=null;}

export function onMatch(cb){matchHandler=cb;}
export function onStatus(cb){statusCb=cb;
  window.addEventListener("offline",()=>statusCb?.(false));
  window.addEventListener("online",()=>statusCb?.(true));}
export function onEvent(cb){eventCb=cb;}
export function sendAction(ev){roomChannel?.send({type:"broadcast",event:"action",payload:{ev}});}
export function sendChat(t){roomChannel?.send({type:"broadcast",event:"chat",payload:{text:t}});}

function openRoomChannel(code){
  if(!sbClient)return;
  roomChannel=sbClient.channel("room:"+code)
    .on("broadcast",{event:"action"},(m)=>eventCb?.({kind:"action",ev:m.payload.ev}))
    .on("broadcast",{event:"chat"},(m)=>eventCb?.({kind:"chat",text:m.payload.text}))
    .subscribe();
}
async function readRoom(code){
  const {data}=await sbClient.from("rooms").select("*").eq("code",code).maybeSingle();
  return data||null;
}
async function findWaitingOther(){
  const cutoff=new Date(Date.now()-90000).toISOString();
  const {data}=await sbClient.from("rooms").select("code")
    .eq("is_public",true).eq("status","waiting").neq("host_id",me())
    .gte("created_at",cutoff).limit(1).maybeSingle();
  return data||null;
}
async function tryJoin(code){
  const {data}=await sbClient.from("rooms")
    .update({guest_id:me(),status:"full"})
    .eq("code",code).eq("status","waiting").is("guest_id",null)
    .select("code").maybeSingle();
  return !!data;
}
/* QUALQUER lado vira "playing" (simétrico, à prova de cache velho) */
async function flipToPlaying(row){
  await sbClient.from("rooms")
    .update({status:"playing",host_color:rndTurn(),first_turn:rndTurn()})
    .eq("code",row.code).eq("status","full");
}
function finalize(row,onMatched){
  if(matched)return;
  matched=true;stopPolls();
  const isHost=row.host_id===me();
  const myColor=isHost?row.host_color:(row.host_color==="red"?"blue":"red");
  openRoomChannel(row.code);
  onMatched({code:row.code,myColor,firstTurn:row.first_turn});
}
function pollRoom(code,onMatched){
  currentRoom=code;
  every(1200,async()=>{
    if(matched)return;
    const row=await readRoom(code);
    if(!row)return;
    if(row.status==="full")await flipToPlaying(row);
    else if(row.status==="playing")finalize(row,onMatched);
  });
}

export async function startQueue(onMatched){
  reset();
  await sbClient?.from("rooms").delete().eq("host_id",me()).eq("status","waiting");
  const other=await findWaitingOther();
  if(other&&await tryJoin(other.code)){pollRoom(other.code,onMatched);return;}
  const code=await createRoom(true);
  pollRoom(code,onMatched);
  every(1500,async()=>{
    if(matched)return;
    const mine=await readRoom(code);
    if(mine&&mine.status==="waiting"){
      const o=await findWaitingOther();
      if(o&&await tryJoin(o.code)){
        await sbClient.from("rooms").delete().eq("code",code);
        stopPolls();pollRoom(o.code,onMatched);
      }
    }
  });
}
export async function cancelQueue(){
  reset();matched=true;
  if(currentRoom)await sbClient?.from("rooms").delete().eq("code",currentRoom).is("guest_id",null);
  currentRoom=null;
}
export async function createRoom(isPublic){
  const code=rndCode();
  await sbClient.from("rooms").insert({code,host_id:me(),is_public:!!isPublic,status:"waiting"});
  currentRoom=code;return code;
}
export async function joinRoom(code,onMatched){
  if(!sbClient||!code)return;
  reset();
  if(!(await tryJoin(code))){
    window.dispatchEvent(new CustomEvent("qa-toast",{detail:"Sala não encontrada ou cheia."}));
    return;
  }
  pollRoom(code,onMatched);
}
export async function leaveRoom(){
  stopPolls();
  if(currentRoom)await sbClient?.from("rooms").update({status:"finished"}).eq("code",currentRoom);
  if(roomChannel)sbClient?.removeChannel(roomChannel);   // fecha só o canal da sala
  roomChannel=null;currentRoom=null;matched=false;
  /* userChannel (convites) continua vivo p/ os próximos convites */
}
export function inviteFriend(id){
  if(!sbClient)return;
  reset();
  createRoom(false).then((code)=>{
    const ch=sbClient.channel("user:"+id);
    ch.subscribe(()=>{ch.send({type:"broadcast",event:"invite",
      payload:{code,from:getSession()?.user?.user_metadata?.name||"Alguém"}});});
    pollRoom(code,(info)=>matchHandler?.(info));   // quem convida vigia também
    window.dispatchEvent(new CustomEvent("qa-toast",{detail:"Convite enviado! 📨"}));
  });
}
export function bindSession(userId,handlers){
  inviteCb=handlers?.onInvite||null;
  if(!sbClient||!userId)return;
  userChannel=sbClient.channel("user:"+userId)
    .on("broadcast",{event:"invite"},(m)=>inviteCb?.(m.payload))
    .subscribe();
}
export function hostRoom(code,onMatched){reset();pollRoom(code,onMatched);}
export const net={startQueue,cancelQueue,createRoom,joinRoom,leaveRoom,hostRoom,
  onEvent,sendAction,sendChat,onStatus,inviteFriend,onMatch};