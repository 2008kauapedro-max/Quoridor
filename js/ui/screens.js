/* =============================================================
Quoridor Arena — ui/screens.js (v2 — skins sincronizadas)
============================================================= */
import {
  TEXTS, NAMES, AI_LEVELS, SKINS, ACHIEVEMENTS, SKIN_CATALOG, ADMIN_EMAIL,
  levelFromXp, xpForLevel, leagueOf, ELO_START, pieceBgFor
} from "../core/constants.js";
import {
  newGame, newGameRace, applyMove, applyWall, validateWall, randomFirstTurn, applyEvent
} from "../core/rules.js";
import { chooseAiAction } from "../core/ai.js";
import { createBoard } from "./board.js";
import { SFX, toast, confetti } from "./effects.js";
import {
  getSettings, setSettings, getStats, recordMatch, getUnlocked,
  getSnapshot, setSnapshot, clearSnapshot, setLastReplay
} from "../services/storage.js";
import {
  isConfigured, getSession, onAuthChange,
  loginEmail, registerEmail, loginGoogle, logout, resetPassword,
  getProfile, updateProfile, uploadAvatar, getRanking, searchPlayers, getFriends,
  getFriendRequests, respondFriendRequest, removeFriend, sendFriendRequest, getAnnouncements, postAnnouncement
} from "../services/supabase.js";
import { net } from "../services/realtime.js";

const $ = (id) => document.getElementById(id);
let current = "loading";

/* ═══════════ NAVEGAÇÃO ═══════════ */
export function showScreen(name){
  document.querySelectorAll(".screen").forEach((s) =>
    s.classList.toggle("active", s.dataset.screen === name));
  current = name;
  if (name === "ranking") refreshRanking("global");
  if (name === "skins") renderSkins();
  if (name === "profile") refreshProfile();
}

/* ═══════════ i18n & CONFIGURAÇÕES ═══════════ */
export function applySettings(s){
  const html = document.documentElement;
  let theme = s.theme;
  if (theme === "auto")
    theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  html.dataset.theme = theme;
  html.dataset.skin = s.skin;
  html.dataset.piece = s.piece || "p-classic";
  html.dataset.frame = s.frame || "f-none";
  html.dataset.quality = s.quality;
  html.dataset.animations = s.animations ? "on" : "off";
  html.lang = s.lang;
  import("./effects.js").then((fx) => {
    fx.setVolume(s.volume / 100);
    fx.setEnabled(s.sound !== false);
    fx.setMusic(!!s.music);
  });
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const t = TEXTS[s.lang]?.[el.dataset.i18n];
    if (t) el.textContent = t;
  });
}

/* ═══════════ MODAL GENÉRICO ═══════════ */
export function openModal(title, choices, bodyHTML = ""){
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = bodyHTML;
  const box = $("modalActions");
  box.innerHTML = "";
  for (const ch of choices){
    const b = document.createElement("button");
    b.className = "choice-btn";
    b.textContent = ch.label;
    b.onclick = () => { closeModal(); ch.onClick?.(); };
    box.appendChild(b);
  }
  $("modal").classList.remove("hidden");
}
export function closeModal(){ $("modal").classList.add("hidden"); }

/* ═══════════ SESSÃO DE JOGO ═══════════ */
let S = null;
let board = null;
let replayBoard = null;

function freshSession(mode, level){
  return {
    mode, level: level || "medium",
    state: newGame(),
    uiMode: "move",
    locked: true,
    seconds: 0, timerId: null, aiTimer: null,
    myColor: null, oppPiece: null
  };
}

const myTurn = () => {
  if (!S || S.state.over) return false;
  if (S.mode === "local") return true;
  if (S.mode === "ai")    return S.state.turn === "red";
  return S.state.turn === S.myColor;
};

export function startGame(opts){
  endSession(false);
  S = freshSession(opts.mode, opts.level);
  S.race = !!opts.race;
  if (opts.state){ S.state = opts.state; S.seconds = opts.seconds || 0; }
  else if (S.race){ S.state = newGameRace(); }
  if (opts.myColor) S.myColor = opts.myColor;
  S.private = !!opts.private;
  if (opts.firstTurn) S.state.turn = opts.firstTurn;
  else if (!opts.state) S.state.turn = randomFirstTurn();

  const myColor = opts.myColor || "red";
  const flipped = S.race ? false : (myColor === "blue");

  board = createBoard($("board"), controller, flipped, S.state);
  board.fit($("stage"), $("boardFrame"));
  showScreen("game");

  /* skins sincronizadas: mesma cor nas duas telas; barreiras seguem a cor */
  const myPiece = getSettings().piece || "p-classic";
  if (S.mode === "online" && S.myColor){
    const oppC = S.myColor === "red" ? "blue" : "red";
    board.setPieceColors({
      [S.myColor]: pieceBgFor(myPiece, S.myColor, true),
      [oppC]: pieceBgFor("p-classic", oppC, true)
    });
    for (const d of [300, 1200, 2500, 5000, 8000, 12000]) setTimeout(() => net.sendSkin(myPiece), d);
  } else {
    board.setPieceColors({
      red:  pieceBgFor(myPiece, "red",  false),
      blue: pieceBgFor(myPiece, "blue", false)
    });
  }

  $("btnRestart").classList.toggle("hidden", S.mode === "online");
  updateHUD();
  board.sync(S.state);
  startTimer();

  const first = S.state.turn;
  const banner = $("turnBanner");
  banner.textContent = (first === "red" ? "🔴 " : "🔵 ") + NAMES[first] + " começa";
  banner.classList.remove("hidden");
  setTimeout(() => {
    banner.classList.add("hidden");
    if (S){ S.locked = false; maybeAI(); }
  }, 2000);
}

function startTimer(){
  stopTimer();
  S.timerId = setInterval(() => {
    S.seconds++;
    $("timerText").textContent = fmt(S.seconds);
  }, 1000);
}
function stopTimer(){ if (S?.timerId) clearInterval(S.timerId); }
const fmt = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");

/* ---------- controller entregue ao board.js ---------- */
const controller = {
  canPlaceWall(o, r, c){
    return S && !S.locked && myTurn() &&
           S.state.players[S.state.turn].walls > 0 &&
           validateWall(S.state, o, r, c).ok;
  },
  handleMove(r, c){
    if (!S || S.locked || !myTurn()) return;
    const ev = applyMove(S.state, r, c);
    if (!ev){ board.deny(r, c); SFX.deny(); return; }
    afterAction(ev, "move");
  },
  handleWall(o, r, c){
    if (!S || S.locked || !myTurn()) return false;
    const ev = applyWall(S.state, o, r, c);
    if (!ev){
      const v = validateWall(S.state, o, r, c);
      toast(v.reason === "caminho"
        ? "Você não pode bloquear completamente o caminho."
        : "Posição inválida para barreira.");
      return false;
    }
    afterAction(ev, "wall");
    return true;
  }
};

function afterAction(ev, kind){
  kind === "move" ? SFX.move() : SFX.wall();
  board.sync(S.state);
  updateHUD();
  if (S.mode !== "online") setSnapshot({ mode: S.mode, level: S.level, state: S.state, seconds: S.seconds });
  else { net.sendAction(ev); net.sendSkin(getSettings().piece || "p-classic"); }
  if (S.state.over) return endGame();
  maybeAI();
}

function maybeAI(){
  if (!S || S.mode !== "ai" || S.state.turn !== "blue" || S.state.over) return;
  S.aiTimer = setTimeout(() => {
    if (!S) return;
    const a = chooseAiAction(S.state, S.level);
    if (!a) return;
    const ev = a.type === "move"
      ? applyMove(S.state, a.r, a.c)
      : applyWall(S.state, a.o, a.r, a.c);
    if (ev) afterAction(ev, ev.t === "m" ? "move" : "wall");
  }, 700);
}

/* ---------- eventos remotos (online) ---------- */
function applyOppSkin(piece){
  if (!S || S.mode !== "online" || !S.myColor || !piece) return;
  if (S.oppPiece === piece) return;
  S.oppPiece = piece;
  const opp = S.myColor === "red" ? "blue" : "red";
  board?.setPieceColors({ [opp]: pieceBgFor(piece, opp, true) });
  board?.sync(S.state);
}

export function handleRemoteEvent(ev){
  if (!S || S.mode !== "online") return;
  const applied = applyEvent(S.state, ev);
  if (!applied){ toast("Jogada inválida recebida — ignorada."); return; }
  (applied.t === "m" ? SFX.move() : SFX.wall());
  board.sync(S.state);
  updateHUD();
  if (S.state.over) endGame();
}

/* ---------- HUD ---------- */
/* ---------- MODO CORRIDA ---------- */
async function startRaceOnline(){
  if (!isConfigured()){ toast("Configure o Supabase em js/config.js."); return; }
  if (!getSession()){ const ok = await net.ensureAnon(); if (!ok){ toast("Entre na sua conta para jogar online."); showScreen("auth"); return; } }
  $("searchOverlay").classList.remove("hidden");
  net.startQueue((info) => {
    $("searchOverlay").classList.add("hidden");
    startGame({ mode: "online", ...info });
  }, "race");
}
async function startRaceFriends(){
  if (!isConfigured()){ toast("Configure o Supabase em js/config.js."); return; }
  if (!getSession()){ const ok = await net.ensureAnon(); if (!ok){ toast("Entre na sua conta para convidar amigos."); showScreen("auth"); return; } }
  const friends = await getFriends();
  if (!friends?.length){ toast("Você ainda não tem amigos! Busque no Perfil → Amigos."); return; }
  openModal("🏁 Convidar pra Corrida", friends.map((f) => ({
    label: "👥 " + f.username, onClick: () => { net.inviteFriend(f.id, "race"); }
  })));
}
async function loadRaceFriends(){
  if (!isConfigured()){ toast("Configure o Supabase em js/config.js."); return; }
  if (!getSession()){ const ok = await net.ensureAnon(); if (!ok){ toast("Entre na sua conta."); showScreen("auth"); return; } }
  const wrap = $("raceFriendsWrap");
  const list = $("raceFriendsList");
  wrap.classList.remove("hidden");
  list.innerHTML = '<p class="hint">carregando…</p>';
  const friends = await getFriends();
  if (!friends?.length){ list.innerHTML = '<p class="hint">Você ainda não tem amigos! Busque no Perfil → Amigos.</p>'; return; }
  list.innerHTML = friends.map((f) => `
    <div class="friend-row">
      <img class="rank-avatar" src="${f.avatar_url || "icons/icon.svg"}" alt="">
      <span class="rank-name">${escapeHtml(f.username)}</span>
      <button class="mini-btn" data-raceinvite="${f.id}">Convidar</button>
    </div>`).join("");
}
/* ---------- SININHO ---------- */
let bellTab = "req";
let bubbleFor = 0;
let cachedAnns = [];
async function refreshBell(){
  const badge = $("bellBadge");
  if (!badge) return;
  if (!getSession()){ badge.classList.add("hidden"); return; }
  const [reqs, anns] = await Promise.all([getFriendRequests(), getAnnouncements()]);
  cachedAnns = anns || [];
  const seen = +(localStorage.getItem("qa_ann_seen") || 0);
  const fresh = cachedAnns.filter((a) => a.id > seen);
  const n = (reqs || []).length + fresh.length;
  badge.textContent = n;
  badge.classList.toggle("hidden", n === 0);
  if (fresh.length && $("msgBubble") && fresh[0].id !== bubbleFor){ bubbleFor = fresh[0].id;
    $("msgBubbleTitle").textContent = fresh[0].title;
    $("msgBubbleBody").textContent = fresh[0].body + " · abra o 🔔 na tela inicial!";
    $("msgBubble").classList.remove("hidden");
    setTimeout(() => $("msgBubble").classList.add("hidden"), 9000);
  }
  if ($("bellPanel") && !$("bellPanel").classList.contains("hidden")) renderBellBody(reqs);
}
async function renderBellBody(reqs){
  const body = $("bellBody");
  if (!body) return;
  reqs = reqs || await getFriendRequests();
  let html = '<div class="tabs">' +
    '<button class="tab' + (bellTab === "req" ? " active" : "") + '" data-belltab="req">📨 Pedidos</button>' +
    '<button class="tab' + (bellTab === "ann" ? " active" : "") + '" data-belltab="ann">📢 Avisos</button>' +
    '<button class="tab' + (bellTab === "info" ? " active" : "") + '" data-belltab="info">ℹ️ Info</button></div>';
  if (bellTab === "req"){
    if (!reqs?.length) html += '<p class="hint">nenhum pedido pendente</p>';
    else html += reqs.map((r) => `
      <div class="friend-row">
        <img class="rank-avatar" src="${r.avatar_url || "icons/icon.svg"}" alt="">
        <span class="rank-name">${escapeHtml(r.username)}</span>
        <button class="mini-btn" data-accept="${r.id}">✅</button>
        <button class="mini-btn" data-decline="${r.id}">❌</button>
      </div>`).join("");
  } else if (bellTab === "ann"){
    if (!cachedAnns?.length) html += '<p class="hint">nenhum aviso ainda</p>';
    else html += cachedAnns.map((a) => `
      <div class="friend-row" style="align-items:flex-start">
        <div class="msg-avatar" style="width:34px;height:34px;font-size:16px">📢</div>
        <div class="msg-text"><b>${escapeHtml(a.title)}</b><span>${escapeHtml(a.body)}</span></div>
      </div>`).join("");
    if (getSettings().admin){
      html += '<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">' +
        '<input id="annTitle" class="input" placeholder="Título do aviso">' +
        '<input id="annBody" class="input" placeholder="Mensagem pra todos os jogadores">' +
        '<button class="mini-btn" data-annsend="1">📤 Enviar pra todos</button></div>';
    }
  } else {
    html += '<p class="hint">🔄 Semanal zera segunda · mensal dia 1º · global em 1º/01 e 1º/07.</p>';
    html += '<p class="hint">🏁 Modo Rush: corrida lado a lado disponível!</p>';
    html += '<p class="hint">📲 Instale o jogo pelo menu → Baixar App.</p>';
  }
  body.innerHTML = html;
}/* ---------- TELA DE AMIGOS ---------- */
async function renderFriendsScreen(){
  const list = $("friendsList2");
  if (!list) return;
  list.innerHTML = '<p class="hint">carregando…</p>';
  const friends = await getFriends();
  if (!friends?.length){ list.innerHTML = '<p class="hint">você ainda não tem amigos — busque aí em cima!</p>'; return; }
  list.innerHTML = friends.map((f) => `
    <div class="friend-row">
      <img class="rank-avatar" src="${f.avatar_url || "icons/icon.svg"}" alt="">
      <span class="rank-name">${escapeHtml(f.username)}</span>
      <button class="mini-btn" data-finvt="${f.id}">Convidar</button>
      <button class="mini-btn" data-frem="${f.id}">Remover</button>
    </div>`).join("");
}
function updateHUD(){
  if (!S) return;
  const cur = S.state.turn;
  $("turnText").textContent = "Vez do " + NAMES[cur];
  $("turnPill").classList.toggle("is-red",  cur === "red");
  $("turnPill").classList.toggle("is-blue", cur === "blue");
  $("wallsRed").textContent  = S.state.players.red.walls;
  $("wallsBlue").textContent = S.state.players.blue.walls;
  $("chipRed").classList.toggle("is-turn",  cur === "red");
  $("chipBlue").classList.toggle("is-turn", cur === "blue");
  const noWalls = S.state.players[cur].walls <= 0;
  $("modeWallH").disabled = noWalls;
  $("modeWallV").disabled = noWalls;
}

function setUiMode(m){
  if (!S) return;
  S.uiMode = m;
  board.setMode(m);
  $("modeMove").classList.toggle("active",  m === "move");
  $("modeWallH").classList.toggle("active", m === "h");
  $("modeWallV").classList.toggle("active", m === "v");
  board.sync(S.state);
}

/* ---------- fim de jogo ---------- */
function endGame(){
  stopTimer();
  const w = S.state.winner;
  confetti(w);
  SFX.win();
  setLastReplay(S.state.replay);

  const humanColor = S.mode === "ai" ? "red" : (S.mode === "online" ? S.myColor : w);
  const humanWon = humanColor === w;
  const extra = JSON.parse(localStorage.getItem("qa_extra") || "{}");
  if (humanWon){
    if (S.mode === "online") extra.onlineWins = (extra.onlineWins||0)+1;
    if (S.mode === "ai" && S.level === "expert") extra.iaExpertWins = (extra.iaExpertWins||0)+1;
  }
  if (S.private) extra.privateGames = (extra.privateGames||0)+1;
  localStorage.setItem("qa_extra", JSON.stringify(extra));
  const res = S.mode === "online"
    ? recordMatch({
        mode: S.mode, winner: w, myColor: humanColor,
        durationSec: S.seconds,
        wallsUsed: S.state.stats.walls[humanColor],
        movesUsed: S.state.stats.moves[humanColor],
        wasBehind: S.state.stats.wasBehind[humanColor]
      })
    : { xp: 0, eloDelta: 0, unlocked: [] };
  $("winText").textContent = NAMES[w] + " venceu!";
  $("winSub").textContent = `+${res.xp} XP` + (res.eloDelta ? ` · ${res.eloDelta > 0 ? "+" : ""}${res.eloDelta} Elo` : "");
  for (const key of res.unlocked) toast("🏅 Conquista: " + ACHIEVEMENTS.find((a) => a.key === key)?.name);
  $("overlayCard").className = "overlay-card " + w;
  $("winEmoji").classList.remove("bounce"); void $("winEmoji").offsetWidth;
  $("winEmoji").classList.add("bounce");
  $("btnRematch").classList.toggle("hidden", S.mode === "online");
  $("overlay").classList.remove("hidden");
  clearSnapshot();
}

export function endSession(goHome = true){
  stopTimer();
  if (S?.aiTimer) clearTimeout(S.aiTimer);
  if (S?.mode === "online") net.leaveRoom();
  if (board){ board.destroy(); board = null; }
  S = null;
  $("overlay").classList.add("hidden");
  if (goHome) showScreen("home");
}

/* ═══════════ REPLAY ═══════════ */
const RP = { events: [], idx: 0, playing: false, timer: null, state: null };

export function openReplay(events){
  if (!events?.length){ toast("Nenhum replay disponível."); return; }
  RP.events = events; RP.idx = 0; RP.playing = false; RP.state = newGame();
  if (replayBoard) replayBoard.destroy();
  replayBoard = createBoard($("replayBoard"), null, false);
  replayBoard.sync(RP.state);
  $("btnReplayPlay").textContent = "▶";
  showScreen("replay");
}
function rpStep(dir){
  const next = RP.idx + dir;
  if (next < 0 || next >= RP.events.length) return rpPause();
  if (dir > 0){ applyEvent(RP.state, RP.events[RP.idx]); RP.idx++; }
  else {
    RP.idx = next;
    RP.state = newGame();
    for (let i = 0; i < RP.idx; i++) applyEvent(RP.state, RP.events[i]);
  }
  replayBoard.sync(RP.state);
}
function rpPlay(){
  RP.playing = true;
  $("btnReplayPlay").textContent = "⏸";
  const speed = parseFloat($("replaySpeed").value) || 1;
  RP.timer = setInterval(() => rpStep(1), 900 / speed);
}
function rpPause(){
  RP.playing = false;
  $("btnReplayPlay").textContent = "▶";
  if (RP.timer) clearInterval(RP.timer);
}
const replayCode = () => btoa(unescape(encodeURIComponent(JSON.stringify(RP.events.length ? RP.events : S?.state.replay || []))));

/* ═══════════ PERFIL / RANKING / AMIGOS ═══════════ */
async function refreshRanking(period){
  const list = $("rankingList");
  list.innerHTML = '<li class="queue-status"><span class="spinner"></span> carregando…</li>';
  const rows = await getRanking(period);
  if (!rows?.length){
    list.innerHTML = '<li class="hint">Sem partidas ranqueadas ainda — jogue online! 🌐</li>';
    return;
  }
  const me = getSession()?.user?.id;
  list.innerHTML = rows.map((r, i) => `
    <li class="rank-item ${r.id === me ? "me" : ""}">
      <span class="rank-pos">${i + 1}</span>
      <img class="rank-avatar frm-${r.frame || "none"}" src="${r.avatar_url || "icons/icon.svg"}" alt="">
      <span class="rank-name">${escapeHtml(r.username)}</span>
      <span class="rank-elo">${r.elo ?? ELO_START}</span>
    </li>`).join("");
}

async function refreshProfile(){
  const st = getStats();
  const lvl = levelFromXp(st.xp);
  const base = xpForLevel(lvl), next = xpForLevel(lvl + 1);
  $("xpFill").style.width = Math.min(100, ((st.xp - base) / (next - base)) * 100) + "%";
  $("xpLabel").textContent = `Nível ${lvl} · ${st.xp - base}/${next - base} XP`;
  $("profileName").textContent = getSession()?.user?.user_metadata?.name || "Jogador local";
  getProfile().then((p) => {
    if (p?.avatar_url){
      $("profileAvatar").src = p.avatar_url;
      $("homeUserAvatar").src = p.avatar_url;
    }
  });
  $("profileLeague").textContent = `${leagueOf(st.elo).icon} ${leagueOf(st.elo).name} · Elo ${st.elo}`;

  const winrate = st.games ? Math.round((st.wins / st.games) * 100) : 0;
  $("profileStats").innerHTML = [
    [st.wins, "vitórias"], [st.losses, "derrotas"], [st.draws, "empates"],
    [winrate + "%", "taxa vitória"], [fmt(st.timeSec), "tempo"],
    [st.moves, "movimentos"], [st.walls, "barreiras"], [st.bestWinStreak, "sequência"]
  ].map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join("");

  const unlocked = getUnlocked();
  $("achievementsList").innerHTML = ACHIEVEMENTS.map((a) => `
    <div class="ach ${unlocked.includes(a.key) ? "" : "locked"}" title="${a.desc}">
      <span class="ach-icon">${a.icon}</span>${a.name}
    </div>`).join("");

  $("skinsRow").innerHTML = SKINS.map((sk) => `
    <button class="skin-chip ${getSettings().skin === sk.key ? "active" : ""}"
            data-skin="${sk.key}"
            style="background:linear-gradient(135deg, ${sk.swatch[0]} 50%, ${sk.swatch[1]} 50%)">
      <span>${sk.name}</span>
    </button>`).join("");

  if (S && S.mode === "online" && S.myColor) {
    localStorage.setItem("qa_lastColor", S.myColor);
  }

  const friends = await getFriends();
  $("friendsList").innerHTML = friends?.length
    ? friends.map((f) => `
        <div class="friend-row">
          <span class="f-status ${f.online ? "on" : ""}"></span>
          <img class="rank-avatar" src="${f.avatar_url || "icons/icon.svg"}" alt="">
          <span class="rank-name">${escapeHtml(f.username)}</span>
          <button class="mini-btn" data-invite="${f.id}">Convidar</button>
        </div>`).join("")
    : '<p class="hint">Busque jogadores pelo nome e monte sua lista. 🔎</p>';
}

const isAdmin = () => (getSession()?.user?.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

/* ═══════════ SKINS (personalização) ═══════════ */
const CAT_KEY = { board:"skin", piece:"piece", frame:"frame" };
let skinCat = "piece";
const extraStats = () => ({ ...getStats(), ...(JSON.parse(localStorage.getItem("qa_extra")||"{}")) });
function skinUnlocked(it){
  if (isAdmin() && localStorage.getItem("qa_admin") !== "0") return true;
  if (it.free) return true;
  const s = extraStats();
  return it.unlock.cur(s, levelFromXp(s.xp)) >= it.unlock.target;
}
export function renderSkins(cat){
  skinCat = cat || skinCat;
  const equipped = getSettings()[CAT_KEY[skinCat]];
  $("skinsList").innerHTML = SKIN_CATALOG.filter((i)=>i.cat===skinCat).map((it)=>{
    const un = skinUnlocked(it);
    return `<button class="skin-card ${equipped===it.id?"active":""} ${un?"":"locked"}" data-skinid="${it.id}">
      <span class="skin-swatch" style="background:linear-gradient(135deg,${it.swatch[0]} 50%,${it.swatch[1]} 50%)"></span>
      <span class="skin-name">${it.name}</span>
      <span class="skin-state">${equipped===it.id?"✔ Equipada":un?"Livre":"🔒"}</span>
    </button>`;
  }).join("");
}
function clickSkin(id){
  const it = SKIN_CATALOG.find((i)=>i.id===id);
  if (!it) return;
  if (!skinUnlocked(it)){
    const s = extraStats();
    const cur = it.unlock.cur(s, levelFromXp(s.xp));
    openModal(`🔒 ${it.name}`, [{ label:"Fechar", onClick:null }],
      `<p style="padding:8px 0">${it.unlock.desc}</p>
       <p class="hint">Progresso: ${Math.min(cur,it.unlock.target)}/${it.unlock.target}</p>`);
    return;
  }
  const st = getSettings();
  st[CAT_KEY[it.cat]] = it.id;
  setSettings(st); applySettings(st); renderSkins(it.cat); if (getSession()) updateProfile({ frame: st.frame || "f-none", piece: st.piece || "p-classic" }); SFX.click();
}

const escapeHtml = (s) => String(s ?? "").replace(/[<>&"]/g, (c) =>
  ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

/* ═══════════ INICIALIZAÇÃO DA CAMADA UI ═══════════ */
export function initScreens(){
  applySettings(getSettings());

  document.querySelectorAll("[data-back]").forEach((b) =>
    b.addEventListener("click", () => { SFX.click(); showScreen(b.dataset.back); }));

  $("btnLocal").onclick = () => { SFX.click(); startGame({ mode: "local" }); };
  $("btnRace").onclick = () => {
    SFX.click();
    openModal("🏁 Modo Corrida", [
      { label: "⚡ Corrida Online", onClick: () => startRaceOnline() },
      { label: "👥 Corrida com Amigo", onClick: () => startRaceFriends() },
      { label: "🎮 Corrida Local (2 no mesmo aparelho)", onClick: () => startGame({ mode: "local", race: true }) }
    ]);
  };
  $("btnAI").onclick = () => {
    SFX.click();
    openModal("Escolha o nível da IA", AI_LEVELS.map((l) => ({
      label: `${l.icon} ${l.name}`, onClick: () => startGame({ mode: "ai", level: l.key })
    })));
  };
  $("btnOnline").onclick = async () => {
    SFX.click();
    if (!isConfigured()){ toast("Configure o Supabase em js/config.js para jogar online."); return; }
    if (!getSession()){ const ok = await net.ensureAnon(); if (!ok){ toast("Entre na sua conta para jogar online."); showScreen("auth"); return; } }
    showScreen("lobby");
  };
  $("btnSkins").onclick = () => { SFX.click(); showScreen("skins"); };
  if ($("btnOpenSkins")) $("btnOpenSkins").onclick = () => { SFX.click(); showScreen("skins"); };
  document.querySelectorAll(".skin-tabs .tab").forEach((t)=>t.addEventListener("click",()=>{
    document.querySelectorAll(".skin-tabs .tab").forEach((x)=>x.classList.remove("active"));
    t.classList.add("active"); renderSkins(t.dataset.cat);
  }));
  $("skinsList").addEventListener("click",(e)=>{
    const b = e.target.closest(".skin-card"); if (b) clickSkin(b.dataset.skinid);
  });
  $("btnRanking").onclick  = () => { SFX.click(); showScreen("ranking"); };
  $("btnProfile").onclick  = () => { SFX.click(); showScreen("profile"); };
  $("btnHowTo").onclick    = () => { SFX.click(); showScreen("howto"); };
  $("btnSettings").onclick = () => { SFX.click(); showScreen("settings"); };
  $("btnLogin").onclick    = () => { SFX.click(); showScreen("auth"); };

  const sbOpen  = () => { $("sidebar").classList.add("open"); $("sidebarBackdrop").classList.remove("hidden"); };
  const sbClose = () => { $("sidebar").classList.remove("open"); $("sidebarBackdrop").classList.add("hidden"); };
  $("btnSidebarOpen").onclick  = sbOpen;
  $("btnSidebarClose").onclick = sbClose;
  $("sidebarBackdrop").onclick = sbClose;
  document.querySelectorAll(".side-link").forEach((b) => b.addEventListener("click", sbClose));

  const goOnline = async (fn) => {
    if (!isConfigured()){ toast("Configure o Supabase em js/config.js."); return; }
    if (!getSession()){ const ok = await net.ensureAnon(); if (!ok){ toast("Entre na sua conta para jogar online."); showScreen("auth"); return; } }
    showScreen("lobby"); fn();
  };
  $("btnFindMatch").onclick = async () => {
    SFX.click();
    if (!isConfigured()){ toast("Configure o Supabase em js/config.js."); return; }
    if (!getSession()){ const ok = await net.ensureAnon(); if (!ok){ toast("Entre na sua conta para jogar online."); showScreen("auth"); return; } }
    $("searchOverlay").classList.remove("hidden");
    net.startQueue((info) => {
      $("searchOverlay").classList.add("hidden");
      startGame({ mode: "online", ...info });
    });
  };
  $("btnCancelSearch").onclick = () => {
    net.cancelQueue();
    $("searchOverlay").classList.add("hidden");
  };
  $("btnCreateRoomHome").onclick = () => { SFX.click(); goOnline(() => $("btnCreateRoom").click()); };
  $("btnJoinCodeHome").onclick   = () => { SFX.click(); goOnline(() => setTimeout(() => $("roomCodeInput").focus(), 60)); };

  const setTab = (login) => {
    $("tabLogin").classList.toggle("active", login);
    $("tabRegister").classList.toggle("active", !login);
    $("authName").classList.toggle("hidden", login);
    $("btnForgot").classList.toggle("hidden", !login);
    $("authHint").classList.toggle("hidden", login);
    $("btnAuthSubmit").textContent = login ? "Entrar" : "Criar conta";
    $("btnAuthSubmit").dataset.login = login ? "1" : "";
  };
  $("tabLogin").onclick    = () => setTab(true);
  $("tabRegister").onclick = () => setTab(false);
  setTab(true);
  $("btnAuthSubmit").onclick = async () => {
    const email = $("authEmail").value.trim(), pass = $("authPassword").value;
    const err = $("authError"); err.classList.add("hidden");
    const isLogin = $("btnAuthSubmit").dataset.login === "1";
    const r = isLogin ? await loginEmail(email, pass)
                      : await registerEmail($("authName").value.trim(), email, pass);
    if (r.error){ err.textContent = r.error; err.classList.remove("hidden"); return; }
    toast(isLogin ? "Bem-vindo de volta! 👋" : "Conta criada! Confira seu e-mail. 📬");
    showScreen("home");
  };
  $("btnGoogle").onclick = async () => { const r = await loginGoogle(); if (r?.error) toast(r.error); };
  $("btnForgot").onclick = async () => {
    const r = await resetPassword($("authEmail").value.trim());
    toast(r.error ? r.error : "E-mail de recuperação enviado. 📬");
  };

  const bindSet = (id, key, transform = (v) => v) => {
    $(id).addEventListener("change", (e) => {
      const s = getSettings();
      s[key] = transform(e.target.type === "checkbox" ? e.target.checked : e.target.value);
      setSettings(s);
      applySettings(s);
      SFX.click();
    });
  };
  const s0 = getSettings();
  $("setTheme").value = s0.theme; $("setLang").value = s0.lang;
  $("setVolume").value = s0.volume; $("setMusic").checked = !!s0.music;
  $("setAnimations").checked = s0.animations !== false; $("setQuality").value = s0.quality;
  bindSet("setTheme", "theme"); bindSet("setLang", "lang");
  bindSet("setVolume", "volume", (v) => +v);
  bindSet("setMusic", "music"); bindSet("setAnimations", "animations");
  bindSet("setQuality", "quality");
  $("setAdmin").addEventListener("change", (e) => {
    localStorage.setItem("qa_admin", e.target.checked ? "1" : "0");
    toast(e.target.checked ? "Skins liberadas! 🔓" : "Skins travadas p/ teste.");
    renderSkins();
  });
  $("btnLogout").onclick = async () => { await logout(); toast("Até logo! 👋"); showScreen("home"); };

  document.querySelectorAll(".rank-tabs .tab").forEach((t) =>
    t.addEventListener("click", () => {
      document.querySelectorAll(".rank-tabs .tab").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      refreshRanking(t.dataset.period);
    }));

  $("skinsRow").addEventListener("click", (e) => {
    const chip = e.target.closest(".skin-chip");
    if (!chip) return;
    const s = getSettings(); s.skin = chip.dataset.skin;
    setSettings(s); applySettings(s); refreshProfile(); SFX.click();
  });
  $("btnAvatar").onclick = () => $("avatarInput").click();
  $("avatarInput").addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (f){ const r = await uploadAvatar(f); if (r?.error) toast(r.error); else toast("Foto atualizada! 📷"); }
  });
  $("btnFriendSearch").onclick = async () => {
    const rows = await searchPlayers($("friendSearch").value.trim());
    $("friendsList").innerHTML = rows?.length
      ? rows.map((p) => `
          <div class="friend-row">
            <img class="rank-avatar" src="${p.avatar_url || "icons/icon.svg"}" alt="">
            <span class="rank-name">${escapeHtml(p.username)}</span>
            <button class="mini-btn" data-add="${p.id}">Add</button>
          </div>`).join("")
      : '<p class="hint">Ninguém encontrado com esse nome.</p>';
  };
  $("friendsList").addEventListener("click", (e) => {
    const inv = e.target.dataset.invite, add = e.target.dataset.add;
    if (inv) net.inviteFriend(inv);
    if (add) import("../services/supabase.js").then((m) => m.sendFriendRequest(add));
  });

  $("btnQueue").onclick = () => {
    $("queueStatus").classList.remove("hidden");
    $("btnCancelQueue").classList.remove("hidden");
    $("btnQueue").classList.add("hidden");
    net.startQueue((info) => startGame({ mode: "online", ...info }));
  };
  $("btnCancelQueue").onclick = () => {
    net.cancelQueue();
    $("queueStatus").classList.add("hidden");
    $("btnCancelQueue").classList.add("hidden");
    $("btnQueue").classList.remove("hidden");
  };
  $("btnCreateRoom").onclick = async () => {
    const code = await net.createRoom(false);
    $("roomCodeDisplay").classList.remove("hidden");
    $("roomCodeDisplay").querySelector("b").textContent = code;
    net.hostRoom(code, (info) => startGame({ mode: "online", private: true, ...info }));
    toast("Sala criada! Compartilhe o código.");
  };
  $("btnJoinRoom").onclick = () =>
    net.joinRoom($("roomCodeInput").value.trim().toUpperCase(),
      (info) => startGame({ mode: "online", private: true, ...info }));
  $("modeMove").onclick  = () => setUiMode("move");
  $("modeWallH").onclick = () => setUiMode("h");
  $("modeWallV").onclick = () => setUiMode("v");
  $("btnRestart").onclick = () => openModal("Reiniciar partida?", [
    { label: "↻ Reiniciar", onClick: () => startGame({ mode: S.mode, level: S.level }) },
    { label: "Cancelar", onClick: null }
  ]);
  $("btnMenu").onclick = () => openModal("Sair da partida?", [
    { label: "🏠 Sair", onClick: () => endSession(true) },
    { label: "Continuar", onClick: null }
  ]);
  $("btnChat").onclick = () => {
    $("chatBar").classList.toggle("hidden");
    $("chatFeed").classList.remove("hidden");
  };
  $("chatBar").addEventListener("click", (e) => {
    const btn = e.target.closest(".chat-btn");
    if (!btn) return;
    feedBubble(btn.dataset.msg, true);
    if (S?.mode === "online") net.sendChat(btn.dataset.msg);
    SFX.chat();
  });

  $("btnRematch").onclick     = () => startGame({ mode: S?.mode || "local", level: S?.level });
  $("btnReplayWatch").onclick = () => { $("overlay").classList.add("hidden"); openReplay(S?.state.replay); };
  $("btnExitToHome").onclick  = () => endSession(true);

  $("btnReplayPlay").onclick = () => (RP.playing ? rpPause() : rpPlay());
  $("btnReplayBack").onclick = () => { rpPause(); rpStep(-1); };
  $("btnReplayFwd").onclick  = () => { rpPause(); rpStep(1); };
  $("btnReplayShare").onclick = async () => {
    try { await navigator.clipboard.writeText(replayCode()); toast("Código do replay copiado! 📤"); }
    catch (_) { toast(replayCode()); }
  };
  $("btnReplayLoad").onclick = () => {
    try {
      const ev = JSON.parse(decodeURIComponent(escape(atob($("replayCodeInput").value.trim()))));
      openReplay(ev);
    } catch (_) { toast("Código de replay inválido."); }
  };

  window.addEventListener("keydown", (e) => {
    if (current !== "game" || !S) return;
    const dirs = { ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1] };
    if (dirs[e.key]){
      e.preventDefault();
      setUiMode("move");
      const p = S.state.players[S.state.turn];
      controller.handleMove(p.r + dirs[e.key][0], p.c + dirs[e.key][1]);
    }
    if (e.key === "1") setUiMode("move");
    if (e.key === "2") setUiMode("h");
    if (e.key === "3") setUiMode("v");
  });

  const refit = () => { if (S && board) board.fit($("stage"), $("boardFrame")); };
  window.addEventListener("resize", refit);
  window.addEventListener("orientationchange", refit);

  onAuthChange((session) => {
    const logged = !!session;
    const admin = (session?.user?.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const adminRow = $("setAdmin")?.closest(".set-row");
    if (adminRow) adminRow.classList.toggle("hidden", !admin);
    if (admin && $("setAdmin")) $("setAdmin").checked = localStorage.getItem("qa_admin") !== "0";
    $("btnLogin").classList.toggle("hidden", logged);
    $("homeUserChip").classList.toggle("hidden", !logged);
    $("btnLogout").classList.toggle("hidden", !logged);
    if (logged){
      $("homeUserName").textContent = session.user.user_metadata?.name || "Jogador";
      getProfile().then((p) => {
        if (p?.avatar_url) $("homeUserAvatar").src = p.avatar_url;
      });
    }
  });

  /* ═══ INSTALAR APP ═══ */
  window.addEventListener("qa-install-help", () => {
    $("modalTitle").textContent = "📲 Instalar o jogo";
    $("modalBody").innerHTML =
      '<p class="hint" style="margin:6px 0;text-align:left">📱 <b>Celular (Chrome):</b> toque nos ⋮ (três pontinhos) → "Instalar app" ou "Adicionar à tela inicial".</p>' +
      '<p class="hint" style="margin:6px 0;text-align:left">💻 <b>PC (Chrome/Edge):</b> ⋮ → "Instalar Quoridor Arena" (ou no ícone da barra de endereço).</p>' +
      '<p class="hint" style="margin:6px 0;text-align:left">✅ Depois o jogo vira um app com ícone na tela!</p>';
    $("modalActions").innerHTML = '<button class="menu-btn primary" id="modalInstallOk">Entendi!</button>';
    $("modal").classList.remove("hidden");
    $("modalInstallOk").onclick = () => $("modal").classList.add("hidden");
  });
  const banner = $("installBanner");
  if (banner && !localStorage.getItem("qa_install_ok") && !matchMedia("(display-mode: standalone)").matches){
    banner.classList.remove("hidden");
  }
  $("btnInstallBanner")?.addEventListener("click", () => window.dispatchEvent(new CustomEvent("qa-install-help")));
  $("btnDismissBanner")?.addEventListener("click", () => {
    $("installBanner").classList.add("hidden");
    localStorage.setItem("qa_install_ok", "1");
  });
  $("msgBubble").addEventListener("click", (e) => {
    if (e.target.id === "msgBubbleClose"){ $("msgBubble").classList.add("hidden"); return; }
    bellTab = "ann";
    $("bellPanel").classList.remove("hidden");
    renderBellBody(); refreshBell();
    $("msgBubble").classList.add("hidden");
  });
  /* ═══ TELA DE AMIGOS ═══ */
  $("btnFriends").onclick = () => { SFX.click(); showScreen("friends"); renderFriendsScreen(); };
  $("btnFriendSearch2").onclick = async () => {
    const q = $("friendSearch2").value.trim();
    const res = await searchPlayers(q);
    const box = $("friendSearchResults");
    if (!res?.length){ box.innerHTML = '<p class="hint">ninguém encontrado</p>'; return; }
    box.innerHTML = res.map((p) => `
      <div class="friend-row">
        <img class="rank-avatar" src="${p.avatar_url || "icons/icon.svg"}" alt="">
        <span class="rank-name">${escapeHtml(p.username)}</span>
        <button class="mini-btn" data-fadd="${p.id}">Adicionar</button>
      </div>`).join("");
  };
  $("friendsList2").addEventListener("click", async (e) => {
    const rem = e.target.dataset.frem, inv = e.target.dataset.finvt;
    if (rem){ await removeFriend(rem); toast("Amigo removido."); renderFriendsScreen(); }
    if (inv){ net.inviteFriend(inv, "classic"); toast("Convite enviado! ⚔️"); }
  });
  $("friendSearchResults").addEventListener("click", async (e) => {
    const add = e.target.dataset.fadd;
    if (add){ await sendFriendRequest(add); toast("Pedido enviado! 📨"); }
  });
  /* ═══ SININHO ═══ */
  $("btnBell").onclick = () => { SFX.click(); const p = $("bellPanel"); p.classList.toggle("hidden"); if (!p.classList.contains("hidden")){ if (cachedAnns.length) localStorage.setItem("qa_ann_seen", Math.max(...cachedAnns.map((a) => a.id), 0)); renderBellBody(); refreshBell(); } };
  $("btnBellClose").onclick = () => $("bellPanel").classList.add("hidden");
  $("bellBody").addEventListener("click", async (e) => {
    const tab = e.target.dataset.belltab; if (tab){ bellTab = tab; if (tab === "ann" && cachedAnns.length) localStorage.setItem("qa_ann_seen", Math.max(...cachedAnns.map((a) => a.id), 0)); renderBellBody(); refreshBell(); return; }
    if (e.target.dataset.annsend){ await postAnnouncement($("annTitle").value || "📢 Aviso", $("annBody").value || ""); toast("Mensagem enviada pra todos! 📢"); renderBellBody(); refreshBell(); return; }
    const acc = e.target.dataset.accept, dec = e.target.dataset.decline, rem = e.target.dataset.removefriend;
    if (acc){ await respondFriendRequest(acc, true); toast("Agora vocês são amigos! 🎉"); }
    if (dec){ await respondFriendRequest(dec, false); toast("Pedido recusado."); }
    if (rem){ await removeFriend(rem); toast("Amigo removido."); }
    if (acc || dec || rem){ renderBellBody(); refreshBell(); }
  });
  setInterval(refreshBell, 15000);
  /* ═══ MODO RUSH (tela própria) ═══ */
  $("btnRace").onclick = () => { SFX.click(); showScreen("race"); };
  $("btnRaceOnline").onclick = () => { SFX.click(); startRaceOnline(); };
  $("btnRaceFriends").onclick = () => { SFX.click(); loadRaceFriends(); };
  $("btnRaceLocal").onclick = () => { SFX.click(); startGame({ mode: "local", race: true }); };
  $("raceFriendsList").addEventListener("click", (e) => {
    const id = e.target.dataset.raceinvite;
    if (id) net.inviteFriend(id, "race");
  });
  net.onStatus((on) => $("reconnect").classList.toggle("hidden", on));
  /* btnLogout v5 (limpa tudo + recarrega) */
  $("btnLogout").onclick = async () => {
    SFX.click();
    $("sidebar").classList.remove("open");
    $("sidebarBackdrop").classList.add("hidden");
    try { await logout(); } catch (_){}
    Object.keys(localStorage).forEach((k) => { if (k.startsWith("sb-")) localStorage.removeItem(k); });
    location.reload();
  };
  const bla = $("btnLogoutAlt");
  if (bla) bla.onclick = () => $("btnLogout").click();
  net.onEvent((msg) => {
    if (msg.kind === "action"){ applyOppSkin(msg.piece); handleRemoteEvent(msg.ev); }
        if (msg.kind === "skin")   applyOppSkin(msg.piece);
    if (msg.kind === "skinreq") net.sendSkin(getSettings().piece || "p-classic");
    if (msg.kind === "skinreq") net.sendSkin(getSettings().piece || "p-classic");
    if (msg.kind === "chat")   feedBubble(msg.text, false);
  });
}

function feedBubble(text, me){
  const feed = $("chatFeed");
  feed.classList.remove("hidden");
  const b = document.createElement("div");
  b.className = "bubble" + (me ? " me" : "");
  b.textContent = text;
  feed.appendChild(b);
  while (feed.children.length > 4) feed.removeChild(feed.firstChild);
  setTimeout(() => b.remove(), 4000);
}