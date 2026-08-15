import { getSession, sbClient } from "./supabase.js";
import { getSettings } from "./storage.js";

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
export function sendAction(ev){roomChannel?.send({type:"broadcast",event:"action",payload:{ev,piece:getSettings().piece||"p-classic"}});}
export function sendChat(t){roomChannel?.send({type:"broadcast",event:"chat",payload:{text:t}});}
export function sendSkin(piece){roomChannel?.send({type:"broadcast",event:"skin",payload:{piece}});}
export function sendSkinReq(){roomChannel?.send({type:"broadcast",event:"skinreq",payload:{}});}

function openRoomChannel(code){
  if(!sbClient)return;
  roomChannel=sbClient.channel("room:"+code)
    .on("broadcast",{event:"action"},(m)=>eventCb?.({kind:"action",ev:m.payload.ev,piece:m.payload.piece}))
    .on("broadcast",{event:"skin"},(m)=>eventCb?.({kind:"skin",piece:m.payload.piece}))
    .on("broadcast",{event:"skinreq"},()=>eventCb?.({kind:"skinreq"}))
    .on("broadcast",{event:"chat"},(m)=>eventCb?.({kind:"chat",text:m.payload.text}))
    .subscribe();
}
async function readRoom(code){
  const {data}=await sbClient.from("rooms").select("*").eq("code",code).maybeSingle();
  return data||null;
}
async function findWaitingOther(mode){
  const cutoff=new Date(Date.now()-20000).toISOString();
  const {data}=await sbClient.from("rooms").select("code")
    .eq("is_public",true).eq("status","waiting").eq("mode",mode||"classic").neq("host_id",me())
    .gte("last_seen",cutoff).limit(1).maybeSingle();
  return data||null;
}
async function tryJoin(code){
  const {data}=await sbClient.from("rooms")
    .update({guest_id:me(),status:"full"})
    .eq("code",code).eq("status","waiting").is("guest_id",null)
    .select("code").maybeSingle();
  return !!data;
}
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
  onMatched({code:row.code,myColor,firstTurn:row.first_turn,race:row.mode==="race",ranked:row.mode==="ranked",set:row.settings||null});
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

export async function startQueue(onMatched, mode, mmr){
  reset();
  await sbClient?.from("rooms").delete().eq("host_id",me()).eq("status","waiting");
  const other= mode==="ranked" ? await findWaitingRanked(mmr) : await findWaitingOther(mode);
  if(other&&await tryJoin(other.code)){pollRoom(other.code,onMatched);return;}
  const code=await createRoom(true, mode, mode==="ranked"&&mmr?{mmr}:null);
  pollRoom(code,onMatched);
  every(1500,async()=>{
    if(matched)return;
    await sbClient?.from("rooms").update({last_seen:new Date().toISOString()}).eq("code",code).eq("status","waiting");
    const mine=await readRoom(code);
    if(mine&&mine.status==="waiting"){
      const o= mode==="ranked" ? await findWaitingRanked(mmr) : await findWaitingOther(mode);
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
export async function createRoom(isPublic, mode, settings){
  const code=rndCode();
  await sbClient.from("rooms").insert({code,host_id:me(),is_public:!!isPublic,status:"waiting",mode:mode||"classic",settings:settings||null});
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
  if(roomChannel)sbClient?.removeChannel(roomChannel);
  roomChannel=null;currentRoom=null;matched=false;
}
export function inviteFriend(id, mode){
  if(!sbClient)return;
  reset();
  createRoom(false, mode).then((code)=>{
    const ch=sbClient.channel("user:"+id);
    ch.subscribe(()=>{ch.send({type:"broadcast",event:"invite",
      payload:{code,from:getSession()?.user?.user_metadata?.name||"Alguém"}});});
    pollRoom(code,(info)=>matchHandler?.(info));
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
export async function ensureAnon(){if(!sbClient)return false;if(getSession())return true;const r=await sbClient.auth.signInAnonymously();return !r.error;}
export const net={startQueue,cancelQueue,createRoom,joinRoom,leaveRoom,hostRoom,
  onEvent,sendAction,sendChat,sendSkin,sendSkinReq,onStatus,inviteFriend,onMatch};
async function findWaitingRanked(mmr){
  const cutoff=new Date(Date.now()-20000).toISOString();
  const {data}=await sbClient.from("rooms").select("code,created_at,settings")
    .eq("is_public",true).eq("status","waiting").eq("mode","ranked").neq("host_id",me())
    .gte("last_seen",cutoff).order("created_at",{ascending:true}).limit(20);
  for(const r of (data||[])){
    if(mmr!=null){
      const rm=+(r.settings?.mmr??1000);
      const age=(Date.now()-new Date(r.created_at).getTime())/1000;
      if(Math.abs(rm-mmr)>100+age*8) continue;
    }
    return {code:r.code};
  }
  return null;
}
