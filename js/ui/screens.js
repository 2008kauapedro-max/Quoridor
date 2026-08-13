/* =============================================================
   The Rage Arena — ui/screens.js (v7 — corrigido + sync cloud)
   ============================================================= */
import {
  TEXTS, NAMES, AI_LEVELS, SKINS, ACHIEVEMENTS, SKIN_CATALOG, ADMIN_EMAIL,
  levelFromXp, xpForLevel, leagueOf, ELO_START, pieceBgFor, pieceWallFor
} from "../core/constants.js";
import {
  newGame, newGameRace, applyMove, applyWall, validateWall, randomFirstTurn, applyEvent
} from "../core/rules.js";
import { chooseAiAction } from "../core/ai.js";
import { createBoard } from "./board.js";
import { SFX, toast, confetti } from "./effects.js";
import {
  getSettings, setSettings, getStats, recordMatch, getUnlocked,
  getSnapshot, setSnapshot, clearSnapshot, setLastReplay, syncCloudData
} from "../services/storage.js";
import {
  isConfigured, getSession, onAuthChange,
  loginEmail, registerEmail, loginGoogle, logout, resetPassword,
  getProfile, updateProfile, uploadAvatar, getRanking, searchPlayers, getFriends,
  getFriendRequests, respondFriendRequest, removeFriend, sendFriendRequest, getAnnouncements, postAnnouncement
} from "../services/supabase.js";
import { net } from "../services/realtime.js";
import {
  initWorkshop, mainColorFor, userWallBg, applyUserBoard, applyUserFrames,
  registerUserSkins, titleOf
} from "./workshop.js";

const $ = (id) => document.getElementById(id);
let current = "loading";
let myAvatar = null;

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

/* ═══════════ MODAL DE APOIO (QR Code PIX) ═══════════ */
function emv(id, value){ return id + String(value.length).padStart(2, "0") + value; }
function crc16(s){
  let crc = 0xFFFF;
  for (let i = 0; i < s.length; i++){
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++)
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
function pixPayload(key, name, city){
  const acc = emv("26", emv("00", "BR.GOV.BCB.PIX") + emv("01", key));
  let p = emv("00", "01") + acc + emv("52", "0000") + emv("53", "986") + emv("58", "BR") +
          emv("59", name.slice(0, 25)) + emv("60", city.slice(0, 15)) + emv("62", emv("05", "***"));
  p += "6304";
  return p + crc16(p);
}
function openDonateModal(){
  const pixKey = "theragearenaa@gmail.com";
  const payload = pixPayload(pixKey, "PEDRO KAUA", "PLANALTINA");
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=2&data=" + encodeURIComponent(payload);
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px";
  modal.innerHTML = `
    <div style="background:#1e293b;color:#fff;padding:22px;border-radius:16px;max-width:400px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5);max-height:92vh;overflow:auto">
      <div style="font-size:40px;margin-bottom:10px">💝</div>
      <h2 style="margin:0 0 10px;font-size:21px">Apoie o The Rage Arena!</h2>
      <p style="margin:0 0 14px;line-height:1.55;font-size:13px;color:#cbd5e1">
        Qualquer valor já ajuda <strong style="color:#fbbf24">demais</strong>! Todo o apoio vai direto pro
        <strong style="color:#22d3ee">desenvolvimento do game</strong>: novidades, skins, servidores e melhorias. 🙏
      </p>
      <div style="background:#fff;padding:10px;border-radius:14px;display:inline-block;margin-bottom:6px">
        <img src="${qrUrl}" alt="QR Code PIX" style="width:200px;height:200px;display:block;border-radius:8px">
      </div>
      <p style="margin:0 0 14px;font-size:11px;color:#94a3b8">Escaneie com o app do seu banco 📷</p>
      <div style="display:flex;gap:10px;margin-bottom:10px">
        <button id="copyPasteBtn" style="flex:1;background:#22c55e;color:#fff;border:none;padding:12px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">📄 Copia e Cola</button>
        <button id="copyPixBtn" style="flex:1;background:#0ea5e9;color:#fff;border:none;padding:12px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">🔑 Copiar chave</button>
      </div>
      <button id="closeDonateModal" style="width:100%;background:transparent;color:#94a3b8;border:1px solid #334155;padding:10px;border-radius:10px;font-size:13px;cursor:pointer">Fechar</button>
    </div>
  `;
  document.body.appendChild(modal);
  const flash = (btn, txt, bg) => {
    const old = btn.innerHTML, ob = btn.style.background;
    btn.innerHTML = txt; btn.style.background = bg;
    setTimeout(() => { btn.innerHTML = old; btn.style.background = ob; }, 1800);
  };
  const copy = async (txt, btn) => {
    try { await navigator.clipboard.writeText(txt); flash(btn, "✅ Copiado!", "#16a34a"); }
    catch (_){ prompt("Copie manualmente:", txt); }
  };
  document.getElementById("copyPasteBtn").onclick = (e) => copy(payload, e.currentTarget);
  document.getElementById("copyPixBtn").onclick = (e) => copy(pixKey, e.currentTarget);
 
  document.getElementById("closeDonateModal").onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

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
    myColor: null, oppPiece: null, oppProfile: null
  };
}

const myTurn = () => {
  if (!S || S.state.over) return false;
  if (S.mode === "local") return true;
  if (S.mode === "ai")    return S.state.turn === "red";
  return S.state.turn === S.myColor;
};

function updateStrips(){
  if (!S || !board?.setGoalColors) return;
  const myPiece = getSettings().piece || "p-classic";
  let red = "#ef4444", blue = "#3b82f6";
  if (S.mode === "online" && S.myColor){
    const mine = mainColorFor(myPiece, S.myColor, true);
    const oppP = S.oppPiece || "p-classic";
    const other = mainColorFor(oppP, S.myColor === "red" ? "blue" : "red", true);
    if (S.myColor === "red"){ red = mine; blue = other; }
    else { red = other; blue = mine; }
  } else {
    red = mainColorFor(myPiece, "red", false);
  }
  board.setGoalColors(red, blue);
}

function sendMyProfile(){
  try {
    const s = getSettings();
    const st = getStats();
    net.sendSkin(JSON.stringify({
      p: s.piece || "p-classic",
      n: getSession()?.user?.user_metadata?.name || "Jogador",
      a: myAvatar || "",
      e: st.elo ?? ELO_START,
      l: levelFromXp(st.xp),
      f: s.frame || "f-none"
    }));
  } catch (_){}
}
function handleSkinMsg(raw){
  if (!S || S.mode !== "online" || !raw) return;
  if (String(raw).charAt(0) === "{"){
    try {
      const d = JSON.parse(raw);
      S.oppProfile = d;
      if (d.p) applyOppSkin(d.p);
      updateHUD();
      return;
    } catch (_){}
  }
  applyOppSkin(raw);
}

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

  const myPiece = getSettings().piece || "p-classic";
  const wBg = userWallBg(getSettings().wall);
  if (S.mode === "online" && S.myColor){
    const oppC = S.myColor === "red" ? "blue" : "red";
    board.setPieceColors({
      [S.myColor]: pieceBgFor(myPiece, S.myColor, true),
      [oppC]: pieceBgFor("p-classic", oppC, true),
      wallRed:  S.myColor === "red"  ? (wBg || pieceWallFor(myPiece, "red", true))  : "#ef4444",
      wallBlue: S.myColor === "blue" ? (wBg || pieceWallFor(myPiece, "blue", true)) : "#3b82f6"
    });
    for (const d of [300, 1200, 2500, 5000, 8000, 12000]) setTimeout(() => sendMyProfile(), d);
  } else {
    board.setPieceColors({
      red:  pieceBgFor(myPiece, "red",  false),
      blue: pieceBgFor(myPiece, "blue", false),
      wallRed:  wBg || pieceWallFor(myPiece, "red"),
      wallBlue: "#3b82f6"
    });
  }
  updateStrips();

  $("btnRestart").classList.toggle("hidden", S.mode === "online");
    updateHUD();
  board.sync(S.state);
  startTimer();
  startTurnTimer();
  resetTurnTimer();
  const first = S.state.turn;
  const banner = $("turnBanner");
  banner.textContent = (first === "red" ? "🔴 " : "🔵 ") + NAMES[first] + " começa";
  banner.classList.remove("hidden");
  setTimeout(() => {
    banner.classList.add("hidden");
    if (S){ S.locked = false; maybeAI(); }
  }, 2000);
  setTimeout(() => { if (S) S.locked = false; }, 4000);
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

/* ---------- TIMER DE TURNO (30s por jogada) ---------- */
const TURN_SECONDS = 30;
function humanTurn(){
  if (!S || S.state.over) return false;
  if (S.mode === "local") return true;
  if (S.mode === "ai") return S.state.turn === "red";
  return S.state.turn === S.myColor;
}
function paintTimer(){
  if (!S) return;
  const pct = Math.max(0, (S.turnLeft / TURN_SECONDS) * 100);
  const cur = S.state.turn;
  const barR = $("ahTrBar"), barB = $("ahTbBar");
  if (barR) barR.style.width = (cur === "red" ? pct : 100) + "%";
  if (barB) barB.style.width = (cur === "blue" ? pct : 100) + "%";
  const tR = $("ahTrTxt"), tB = $("ahTbTxt");
  if (tR) tR.textContent = cur === "red" ? Math.ceil(S.turnLeft) + "s" : "";
  if (tB) tB.textContent = cur === "blue" ? Math.ceil(S.turnLeft) + "s" : "";
}
function resetTurnTimer(){ if (S){ S.turnLeft = TURN_SECONDS; paintTimer(); } }
function stopTurnTimer(){ if (S?.turnInt) clearInterval(S.turnInt); if (S) S.turnInt = null; }
function startTurnTimer(){
  stopTurnTimer();
  S.turnInt = setInterval(() => {
    if (!S || S.state.over){ stopTurnTimer(); return; }
    if (!humanTurn()){ S.turnLeft = TURN_SECONDS; paintTimer(); return; }
    S.turnLeft -= 0.25;
    if (S.turnLeft <= 0){
      stopTurnTimer();
      toast("⏱ Tempo esgotado — vez passada!");
      doSkip();
      return;
    }
    paintTimer();
  }, 250);
}
function doSkip(){
  if (!S || S.state.over) return;
  S.state.turn = S.state.turn === "red" ? "blue" : "red";
  board.sync(S.state);
  updateHUD();
  if (S.mode === "online"){ try { net.sendAction({ t: "skip" }); } catch (_){} }
  resetTurnTimer();
  maybeAI();
}

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
  resetTurnTimer();
  if (S.mode !== "online") setSnapshot({ mode: S.mode, level: S.level, state: S.state, seconds: S.seconds });
  else { try { net.sendAction(ev); sendMyProfile(); } catch (_){ toast("Conexão instável — jogada aplicada."); } }
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

function applyOppSkin(piece){
  if (!S || S.mode !== "online" || !S.myColor || !piece) return;
  if (S.oppPiece === piece) return;
  S.oppPiece = piece;
  const opp = S.myColor === "red" ? "blue" : "red";
  board?.setPieceColors({ [opp]: pieceBgFor(piece, opp, true) });
  updateStrips();
  board?.sync(S.state);
}

export function handleRemoteEvent(ev){
  if (!S || S.mode !== "online") return;
  if (ev && ev.t === "skip"){
    S.state.turn = S.state.turn === "red" ? "blue" : "red";
    board.sync(S.state);
    updateHUD();
    resetTurnTimer();
    return;
  }
    if (ev && ev.t === "resign"){
    if (S.state.over) return;
    S.state.winner = S.myColor;
    S.state.over = true;
    toast("🏳️ O rival abandonou a partida — vitória sua!");
    endGame();
    return;
  }
  const applied = applyEvent(S.state, ev);
  if (!applied){ toast("Jogada inválida recebida — ignorada."); return; }
  (applied.t === "m" ? SFX.move() : SFX.wall());
  board.sync(S.state);
  updateHUD();
  if (S.state.over) endGame();
}

/* ---------- HUD / ARENA ---------- */
(function(){
  let st = document.getElementById("ahCss");
  if (!st){ st = document.createElement("style"); st.id = "ahCss"; document.head.appendChild(st); }
  st.textContent =
    "#arenaHud{width:100%;max-width:600px;margin:2px auto 10px;padding:0 10px;box-sizing:border-box}" +
    "#arenaHud .ah-turn{display:flex;justify-content:center;margin-bottom:6px}" +
    "#arenaHud .ah-turn span{font-size:10px;font-weight:800;letter-spacing:.06em;padding:4px 12px;border-radius:999px;background:var(--card,#161b26);border:1px solid var(--line,#2a2f3a);color:var(--text,#eee);transition:all .3s}" +
    "#arenaHud .ah-cols{display:flex;gap:8px;align-items:stretch;justify-content:center}" +
    "#arenaHud .ah-col{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;align-items:center}" +
    "#arenaHud .ah-card{width:100%;display:flex;align-items:center;gap:7px;background:var(--card,#161b26);border:1px solid var(--line,#2a2f3a);border-radius:12px;padding:7px 9px;box-sizing:border-box}" +
    "#arenaHud .ah-card img{width:34px;height:34px;border-radius:50%;flex:0 0 auto;object-fit:cover;background:#333}" +
    "#arenaHud .ah-name{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text,#eee)}" +
    "#arenaHud .ah-sub{font-size:9px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text,#eee)}" +
       "#arenaHud .ah-walls{font-size:10px;font-weight:700;opacity:.9;color:var(--text,#eee)}" +
    "#arenaHud .ah-time{width:100%;height:8px;background:rgba(255,255,255,.10);border-radius:5px;position:relative;overflow:hidden}" +
    "#arenaHud .ah-time i{position:absolute;left:0;top:0;bottom:0;width:100%;border-radius:5px;transition:width .25s linear}" +
    "#arenaHud #ahTrBar{background:#f87171}#arenaHud #ahTbBar{background:#60a5fa}" +
    "#arenaHud .ah-time span{position:absolute;right:3px;top:0;font-size:7px;font-weight:800;color:#fff;text-shadow:0 1px 2px #000}" +
    "@media (min-width:768px){#arenaHud{max-width:680px}#arenaHud .ah-card img{width:38px;height:38px}#arenaHud .ah-name{font-size:13px}#arenaHud .ah-sub{font-size:10px}}";
})();

function buildArenaHud(){
  if (document.getElementById("arenaHud") || !$("stage")) return;
  const hud = document.createElement("div");
  hud.id = "arenaHud";
  hud.innerHTML =
    '<div class="ah-turn"><span id="ahTurn">—</span></div>' +
    '<div class="ah-cols">' +
      '<div class="ah-col">' +
        '<div class="ah-card" id="ahRed">' +
          '<img id="ahRedImg" src="icons/icon.svg" alt="">' +
          '<div style="min-width:0"><div class="ah-name" id="ahRedName">—</div><div class="ah-sub" id="ahRedSub">—</div></div>' +
        '</div>' +
                '<div class="ah-time"><i id="ahTrBar"></i><span id="ahTrTxt"></span></div>' +
        '<div class="ah-walls" id="ahWr"></div>' +
      '</div>' +
      '<div class="ah-col">' +
        '<div class="ah-card" id="ahBlue">' +
          '<img id="ahBlueImg" src="icons/icon.svg" alt="">' +
          '<div style="min-width:0"><div class="ah-name" id="ahBlueName">—</div><div class="ah-sub" id="ahBlueSub">—</div></div>' +
        '</div>' +
                '<div class="ah-time"><i id="ahTbBar"></i><span id="ahTbTxt"></span></div>' +
        '<div class="ah-walls" id="ahWb"></div>' +
      '</div>' +
    '</div>';
  $("stage").parentElement.insertBefore(hud, $("stage"));
  const old = $("turnPill");
  if (old) old.style.display = "none";
}

function fillCard(color){
  if (!S) return;
  const pre = color === "red" ? "ahRed" : "ahBlue";
  const nameEl = $(pre + "Name"), subEl = $(pre + "Sub"), imgEl = $(pre + "Img");
  if (!nameEl) return;
  const s = getSettings();
  const st = getStats();
  const isMe  = S.mode === "online" && S.myColor === color;
  const isOpp = S.mode === "online" && S.myColor && S.myColor !== color;
  let name = NAMES[color], sub = "", av = "icons/icon.svg", frame = "f-none";

  if (isMe){
    name = getSession()?.user?.user_metadata?.name || "Você";
    frame = s.frame || "f-none";
    const lg = leagueOf(st.elo ?? ELO_START);
    sub = lg.icon + " " + lg.name + " · " + (st.elo ?? ELO_START) + " · Nv " + levelFromXp(st.xp);
    if (myAvatar) av = myAvatar;
    else getProfile().then((p) => { if (p?.avatar_url){ myAvatar = p.avatar_url; const im = $(pre + "Img"); if (im) im.src = p.avatar_url; } });
  } else if (isOpp){
    const d = S.oppProfile;
    if (d){
      name = d.n || "Rival";
      frame = d.f || "f-none";
      const lg = leagueOf(d.e ?? ELO_START);
      sub = lg.icon + " " + lg.name + " · " + (d.e ?? ELO_START) + " · Nv " + (d.l ?? 0);
      if (d.a) av = d.a;
    } else { name = "Rival"; sub = "conectando…"; }
  }
  imgEl.className = "rank-avatar frm-" + frame;
  imgEl.src = av;
  nameEl.textContent = name;
  subEl.textContent = sub;
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
  $("chipBlue").classList.toggle("is-turn",  cur === "blue");
  const noWalls = S.state.players[cur].walls <= 0;
  $("modeWallH").disabled = noWalls;
  $("modeWallV").disabled = noWalls;
  if (document.getElementById("arenaHud")){
    fillCard("red"); fillCard("blue");
    const t = $("ahTurn");
    t.textContent = S.mode === "online"
      ? (cur === S.myColor ? "SEU TURNO" : "VEZ DO RIVAL")
      : "VEZ DO " + NAMES[cur].toUpperCase();
    t.style.color = cur === "red" ? "#f87171" : "#60a5fa";
    t.style.borderColor = cur === "red" ? "#f8717166" : "#60a5fa66";
    $("ahWr").textContent = "🧱 " + S.state.players.red.walls;
    $("ahWb").textContent = "🧱 " + S.state.players.blue.walls;
  }
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

function endGame(){
  stopTimer();
  stopTurnTimer();
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
  stopTurnTimer();
  if (S?.aiTimer) clearTimeout(S.aiTimer);
  if (S?.mode === "online" && S.state && !S.state.over){
    try {
      net.sendAction({ t: "resign" });
      const other = S.myColor === "red" ? "blue" : "red";
      recordMatch({
        mode: "online", winner: other, myColor: S.myColor,
        durationSec: S.seconds,
        wallsUsed: S.state.stats.walls[S.myColor],
        movesUsed: S.state.stats.moves[S.myColor],
        wasBehind: S.state.stats.wasBehind[S.myColor]
      });
      toast("🏳️ Você abandonou — derrota contabilizada.");
    } catch (_){}
  }
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

/* ═══════════ SININHO ═══════════ */
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
}

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

async function refreshRanking(period){
  const list = $("rankingList");
  list.innerHTML = '<li class="queue-status"><span class="spinner"></span> carregando…</li>';
  const rows = await getRanking(period);
  if (!rows || !rows.length){
    list.innerHTML = '<li class="hint">Sem partidas ranqueadas ainda — jogue online! 🌐</li>';
    return;
  }
  const ses = getSession();
  const me = ses ? ses.user.id : null;
  const TOP = 15;
  const top = rows.slice(0, TOP);
  let html = "";
  for (let i = 0; i < top.length; i++){
    const r = top[i];
    html += '<li class="rank-item ' + (r.id === me ? "me" : "") + '">' +
      '<span class="rank-pos">' + (i + 1) + '</span>' +
      '<img class="rank-avatar frm-' + (r.frame || "none") + '" src="' + (r.avatar_url || "icons/icon.svg") + '" alt="">' +
      '<span class="rank-name">' + escapeHtml(r.username) + '</span>' +
      '<span class="rank-elo">' + (r.elo != null ? r.elo : ELO_START) + '</span></li>';
  }
  const myIdx = me ? rows.findIndex(function(r){ return r.id === me; }) : -1;
  if (myIdx >= TOP){
    const my = rows[myIdx];
    const gate = top[TOP - 1];
    const myElo = my.elo != null ? my.elo : ELO_START;
    const gateElo = gate.elo != null ? gate.elo : ELO_START;
    const diff = Math.max(0, gateElo - myElo);
    html += '<li class="rank-item me" style="margin-top:10px;border:1px dashed var(--line);border-radius:12px">' +
      '<span class="rank-pos">' + (myIdx + 1) + '</span>' +
      '<img class="rank-avatar frm-' + (my.frame || "none") + '" src="' + (my.avatar_url || "icons/icon.svg") + '" alt="">' +
      '<span class="rank-name">' + escapeHtml(my.username) + ' · você</span>' +
      '<span class="rank-elo">' + myElo + '</span></li>';
    html += '<li class="hint" style="padding:10px;text-align:center">' +
      (diff === 0 ? "🔥 Você tá na porta do TOP 15 — uma vitória te coloca!"
                  : "🎯 Faltam <b>" + diff + "</b> pontos pra você entrar no TOP " + TOP + "!") + '</li>';
  } else if (me && myIdx === -1){
    html += '<li class="hint" style="padding:10px;text-align:center">🌐 Jogue partidas online pra entrar no ranking!</li>';
  }
  list.innerHTML = html;
}

async function refreshProfile(){
  const st = getStats();
  const lvl = levelFromXp(st.xp);
  const base = xpForLevel(lvl), next = xpForLevel(lvl + 1);
  $("xpFill").style.width = Math.min(100, ((st.xp - base) / (next - base)) * 100) + "%";
  $("xpLabel").textContent = `Nível ${lvl} · ${st.xp - base}/${next - base} XP`;
  $("profileName").textContent = getSession()?.user?.user_metadata?.name || "Jogador local";
  const t = titleOf(getSettings().title);
  const pn = $("profileTitle");
  if (pn){ pn.textContent = t ? t.name : ""; pn.setAttribute("style", t?.style || ""); }
  getProfile().then((p) => {
    if (p?.avatar_url){
      myAvatar = p.avatar_url;
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
  const btnDonateProfile = document.createElement("button");
  btnDonateProfile.textContent = "💝 Apoiar o Desenvolvimento";
  btnDonateProfile.style.cssText = "display:block;margin:16px auto;padding:12px 24px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1e293b;font-weight:700;border:none;border-radius:12px;cursor:pointer;box-shadow:0 4px 12px rgba(251,191,36,.3);transition:transform .2s;font-size:14px";
  btnDonateProfile.onmouseover = () => btnDonateProfile.style.transform = "scale(1.05)";
  btnDonateProfile.onmouseout = () => btnDonateProfile.style.transform = "scale(1)";
  btnDonateProfile.onclick = openDonateModal;
  $("achievementsList").parentNode.insertBefore(btnDonateProfile, $("achievementsList"));

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
  $("skinsList").innerHTML = SKIN_CATALOG.filter((i)=>i.cat===skinCat && !i.hide).map((it)=>{
    const un = skinUnlocked(it);
    return `<button class="skin-card ${equipped===it.id?"active":""} ${un?"":"locked"}" data-skinid="${it.id}">
            <span class="skin-swatch" style="background:${it.badge ? it.badge : 'linear-gradient(135deg,' + it.swatch[0] + ' 50%,' + it.swatch[1] + ' 50%)'};border-radius:50%"></span>
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
  setSettings(st); applySettings(st); applyUserBoard(); applyUserFrames(); renderSkins(it.cat);
  if (getSession()) updateProfile({ frame: st.frame || "f-none", piece: st.piece || "p-classic" });
  SFX.click();
}

const escapeHtml = (s) => String(s ?? "").replace(/[<>&"]/g, (c) =>
  ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

/* ═══════════ INICIALIZAÇÃO ═══════════ */
export function initScreens(){
  registerUserSkins();
  applyUserBoard();
  applyUserFrames();
  applySettings(getSettings());
  document.querySelectorAll('[data-i18n="goalRed"],[data-i18n="goalBlue"]').forEach((el) => el.style.display = "none");

  document.querySelectorAll("[data-back]").forEach((b) =>
    b.addEventListener("click", () => { SFX.click(); showScreen(b.dataset.back); }));

  $("btnLocal").onclick = () => { SFX.click(); startGame({ mode: "local" }); };
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

  if ($("sidebar") && !document.getElementById("btnDonateSide")){
    const btnDonate = document.createElement("button");
    btnDonate.id = "btnDonateSide";
    btnDonate.textContent = "💝 Apoiar o Projeto";
    btnDonate.className = "side-link";
    btnDonate.style.cssText = "margin-top:8px;color:#fbbf24;font-weight:600";
    btnDonate.onclick = () => { sbClose(); openDonateModal(); };
    $("sidebar").appendChild(btnDonate);
  }

  if ($("btnFindMatch") && !document.getElementById("btnDonateLobby")){
    const btnDonateLobby = document.createElement("button");
    btnDonateLobby.id = "btnDonateLobby";
    btnDonateLobby.textContent = "💝 Apoiar o Jogo";
    btnDonateLobby.style.cssText = "display:block;margin:12px auto 0;padding:10px 20px;background:transparent;border:2px solid #fbbf24;color:#fbbf24;font-weight:600;border-radius:12px;cursor:pointer;transition:all .2s";
    btnDonateLobby.onmouseover = () => { btnDonateLobby.style.background = "#fbbf24"; btnDonateLobby.style.color = "#1e293b"; };
    btnDonateLobby.onmouseout = () => { btnDonateLobby.style.background = "transparent"; btnDonateLobby.style.color = "#fbbf24"; };
    btnDonateLobby.onclick = openDonateModal;
    $("btnFindMatch").parentNode.appendChild(btnDonateLobby);
  }

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
  const antiQuit = () => {
    if (S && S.mode === "online" && !S.state.over){
      try { net.sendAction({ t: "resign" }); } catch (_){}
    }
  };
  window.addEventListener("beforeunload", antiQuit);
  window.addEventListener("pagehide", antiQuit);
  window.addEventListener("resize", refit);
  window.addEventListener("orientationchange", refit);

  onAuthChange(async (session) => {
    const logged = !!session;
    if (logged) await syncCloudData();
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
        if (p?.avatar_url){
          myAvatar = p.avatar_url;
          $("homeUserAvatar").src = p.avatar_url;
        }
      });
    }
  });

  window.addEventListener("qa-install-help", () => {
    $("modalTitle").textContent = "📲 Instalar o jogo";
    $("modalBody").innerHTML =
      '<p class="hint" style="margin:6px 0;text-align:left">📱 <b>Celular (Chrome):</b> toque nos ⋮ (três pontinhos) → "Instalar app" ou "Adicionar à tela inicial".</p>' +
      '<p class="hint" style="margin:6px 0;text-align:left">💻 <b>PC (Chrome/Edge):</b> ⋮ → "Instalar The Rage Arena" (ou no ícone da barra de endereço).</p>' +
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

  $("btnRace").onclick = () => { SFX.click(); showScreen("race"); };
  $("btnRaceOnline").onclick = () => { SFX.click(); startRaceOnline(); };
  $("btnRaceFriends").onclick = () => { SFX.click(); loadRaceFriends(); };
  $("btnRaceLocal").onclick = () => { SFX.click(); startGame({ mode: "local", race: true }); };
  $("raceFriendsList").addEventListener("click", (e) => {
    const id = e.target.dataset.raceinvite;
    if (id) net.inviteFriend(id, "race");
  });

  net.onStatus((on) => $("reconnect").classList.toggle("hidden", on));
  buildArenaHud();
  initWorkshop();
  (function(){
    const st = document.createElement("style");
    st.textContent = "#reconnect{pointer-events:none}";
    document.head.appendChild(st);
  })();

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
    try {
      if (msg.kind === "action"){ handleSkinMsg(msg.piece); handleRemoteEvent(msg.ev); }
      if (msg.kind === "skin")   handleSkinMsg(msg.piece);
      if (msg.kind === "skinreq") sendMyProfile();
      if (msg.kind === "chat")   feedBubble(msg.text, false);
    } catch (err){ console.warn("evento ignorado:", err); }
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