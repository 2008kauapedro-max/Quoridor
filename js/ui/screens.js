/* =============================================================
   The Rage Arena — ui/screens.js (v9 — loja com confirmação)
   ============================================================= */
import {
  TEXTS, NAMES, AI_LEVELS, SKINS, ACHIEVEMENTS, SKIN_CATALOG, ADMIN_EMAIL,
  levelFromXp, xpForLevel, leagueOf, ELO_START, pieceBgFor, pieceWallFor, setCustomColor, rankOf, nextRank
} from "../core/constants.js";
import {
  newGame, newGameRace, newGameCustom, applyMove, applyWall, validateWall, randomFirstTurn, applyEvent
} from "../core/rules.js";
import { analyzeWallImpacts } from "../core/ranked.js";
import { chooseAiAction } from "../core/ai.js";
import { createBoard } from "./board.js";
import { SFX, toast, confetti } from "./effects.js";
import {
  getSettings, setSettings, getStats, recordMatch, getUnlocked,
  getSnapshot, setSnapshot, clearSnapshot, setLastReplay, syncCloudData, getClips, saveClip, deleteClip
} from "../services/storage.js";
import {
  isConfigured, getSession, onAuthChange,
  loginEmail, registerEmail, loginGoogle, logout, resetPassword,
  getProfile, updateProfile, uploadAvatar, getRanking, searchPlayers, getFriends,
  getFriendRequests, respondFriendRequest, removeFriend, sendFriendRequest, getAnnouncements, postAnnouncement,
    pairCount, logMatch, requestPurchase, listPendingPurchases, approvePurchase, rejectPurchase, getRankedRanking, claimRankedMatch, submitRankedResult, getRankedResult, autoWinRanked, getMyRanked, getRankedBoard, getRankedHistory, listPendingRanked
} from "../services/supabase.js";
import { net } from "../services/realtime.js";
import {
  initWorkshop, mainColorFor, userWallBg, applyUserBoard, applyUserFrames,
  registerUserSkins, titleOf
} from "./workshop.js";

const $ = (id) => document.getElementById(id);
let current = "loading";
let myAvatar = null;

export function showScreen(hideVictory && 0;
name){
  try { hideVictory(); } catch (_){}
  document.querySelectorAll(".screen").forEach((s) =>
    s.classList.toggle("active", s.dataset.screen === name));
  current = name;
  if (name === "ranking") refreshRanking("global");
  if (name === "skins"){ pieceSub = "classic"; renderSkins(); }
  if (name === "profile") refreshProfile();
  if (name === "ranked") refreshRanked2();
  if (name === "clips") refreshClips();
}

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
function pixPayload(key, name, city, amount){
  const acc = emv("26", emv("00", "BR.GOV.BCB.PIX") + emv("01", key));
  let p = emv("00", "01") + acc + emv("52", "0000") + emv("53", "986") +
          (amount ? emv("54", amount.toFixed(2)) : "") + emv("58", "BR") +
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
        Qualquer valor já ajuda <strong style="color:#fbbf24">demais</strong>!
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

/* ═══════════ LOJA — SKINS PAGAS COM CONFIRMAÇÃO ═══════════ */
let TRIONDA_ART = null;
(function(){ const im = new Image(); im.onload = () => { TRIONDA_ART = "img/flags/bolacopa.png"; }; im.src = "img/flags/bolacopa.png"; })();
function readList(k){ try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch (_){ return []; } }
function writeList(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (_){} }
const isBought = (id) => readList("qa_paid").includes(id);
const hasPending = (id) => readList("qa_pending").includes(id);
const WHATS_ZAP = "5561993148848"; // ← TROQUE pelo seu: 55 + DDD + número (só dígitos)

function openBuyModal(it){
  const pixKey = "theragearenaa@gmail.com";
  const payload = pixPayload(pixKey, "PEDRO KAUA", "PLANALTINA", it.price || 1);
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=2&data=" + encodeURIComponent(payload);
  openModal("⚽ " + it.name + " — R$ " + (it.price || 1).toFixed(2), [
       { label: "📤 Enviar comprovante no WhatsApp", onClick: async () => {
        const r = await requestPurchase(it.id);
        const pend = readList("qa_pending");
        if (!pend.includes(it.id)) pend.push(it.id);
        writeList("qa_pending", pend);
        const nome = getSession()?.user?.user_metadata?.name || "Jogador";
        const msg = "🏆 THE RAGE ARENA — compra da skin " + it.name + " (R$ " + (it.price || 1).toFixed(2) + ")\n👤 Nome no jogo: " + nome + "\n💸 Acabei de pagar o PIX! Segue o comprovante 👇";
        window.open("https://wa.me/" + WHATS_ZAP + "?text=" + encodeURIComponent(msg), "_blank");
        toast(r?.error ? "Erro ao registrar pedido." : "📨 Pedido registrado! Envie o comprovante no WhatsApp.");
        renderSkins(it.cat);
      } },
    { label: "Agora não", onClick: null }
  ], '<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:6px 0">' +
     (TRIONDA_ART ? '<img src="' + TRIONDA_ART + '" style="width:110px;height:110px;border-radius:50%;box-shadow:0 8px 24px #0008;object-fit:cover">' : '') +
     '<p style="margin:0;font-size:13px;line-height:1.5;color:#cbd5e1;text-align:center">🔥 <b>LANÇAMENTO MUNDIAL!</b> A bola da Copa 2026 na sua bolinha — por só <b style="color:#22c55e">R$ 1,00</b>! 🏆<br><span style="font-size:11px;color:#94a3b8">Pague o PIX e envie o <b>COMPROVANTE</b> no WhatsApp 📲<br>A skin é liberada após a confirmação ✔️</span></p>' +
     '<div style="background:#fff;padding:8px;border-radius:12px"><img src="' + qrUrl + '" style="width:170px;height:170px;display:block;border-radius:6px"></div>' +
     '<p style="margin:0;font-size:11px;color:#94a3b8">Escaneie o PIX de R$ 1,00, pague e envie o comprovante no WhatsApp 🙏</p></div>');
  const cp = document.createElement("button");
  cp.textContent = "📄 Copiar PIX copia-e-cola";
  cp.style.cssText = "margin:8px auto 0;display:block;background:#0ea5e9;color:#fff;border:none;padding:10px 18px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer";
  cp.onclick = async () => { try { await navigator.clipboard.writeText(payload); cp.textContent = "✅ Copiado!"; } catch (_){ prompt("Copie:", payload); } };
  $("modalBody").appendChild(cp);
}

function maybeShowLaunch(){
  if (isBought("p-bolacopa") || hasPending("p-bolacopa")) return;
  const it = SKIN_CATALOG.find((i) => i.id === "p-bolacopa");
  if (!it) return;
  setTimeout(() => openModal("🚀 LANÇAMENTO — Trionda 2026!", [
    { label: "⚽ Quero por R$ 1,00!", onClick: () => openBuyModal(it) },
    { label: "Depois", onClick: null }
  ], '<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:6px 0">' +
     '<img src="' + (TRIONDA_ART || "img/trionda.png") + '" onerror="this.onerror=null;this.src=&quot;img/flags/bolacopa.png&quot;" style="width:120px;height:120px;border-radius:50%;box-shadow:0 10px 30px #0009;object-fit:cover">' +
     '<p style="margin:0;font-size:14px;line-height:1.55;color:#cbd5e1;text-align:center">A <b style="color:#F5F7FA">bola oficial da Copa 2026</b> aterrissou no The Rage Arena! ⚽✨<br>Jogue com a <b>Trionda</b> e deixe os rivais no chão — por apenas <b style="color:#22c55e">R$ 1,00</b>! 😱🏆</p></div>'), 1500);
}

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
    myColor: null, oppPiece: null, oppProfile: null, oppId: null,
    oppSeen: false, ghostTimer: null
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
      f: s.frame || "f-none",
      i: getSession()?.user?.id || ""
    }));
  } catch (_){}
}
function handleSkinMsg(raw){
  if (!S || S.mode !== "online" || !raw) return;
  S.oppSeen = true; if (S.ghostTimer){ clearTimeout(S.ghostTimer); S.ghostTimer = null; }
  if (String(raw).charAt(0) === "{"){
    try {
      const d = JSON.parse(raw);
      S.oppProfile = d;
      if (d.i) S.oppId = d.i;
      if (d.p) applyOppSkin(d.p);
      updateHUD();
      return;
    } catch (_){}
  }
  applyOppSkin(raw);
}

export function startGame(opts){
  try { hideVictory(); } catch (_){}
  endSession(false);
  S = freshSession(opts.mode, opts.level);
  S.race = !!opts.race;
  if (opts.state){ S.state = opts.state; S.seconds = opts.seconds || 0; }
  else if (S.race){ S.state = newGameRace(); }
  else if (opts.set && opts.set.size){ S.state = newGameCustom(opts.set.size, opts.set.walls ?? 10); }
  if (opts.myColor) S.myColor = opts.myColor;
  S.private = !!opts.private;
  S.ranked = !!opts.ranked;
  S.matchId = null;
  if (S.ranked){
    setTimeout(() => toast("🏆 Ranqueada valendo RP!"), 2200);
    claimRankedMatch(opts.code).then((r) => {
      S.matchId = r?.match_id || null;
      if (!S.matchId){ S.ranked = false; toast("⚠️ Falha ao registrar a ranqueada — valendo só casual."); }
    }).catch(() => { S.matchId = null; S.ranked = false; });
  }
  if (S.private) setTimeout(() => toast("🏠 Sala privada vale Elo — farm com o mesmo rival não"), 2200);
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
  if (S.mode === "online"){
    S.ghostTimer = setTimeout(() => {
      if (!S || S.mode !== "online" || S.state.over || S.oppSeen) return;
      openModal("👻 Rival não conectou", [
        { label: "🔁 Buscar nova partida", onClick: () => {
            endSession(false);
            $("searchOverlay").classList.remove("hidden");
            net.startQueue((info) => {
              $("searchOverlay").classList.add("hidden");
              startGame({ mode: "online", ...info });
            });
          } },
        { label: "⏳ Esperar mais", onClick: null }
      ], '<p style="padding:8px 0;text-align:center">O rival dessa sala parece desconectado.<br>Busque outra partida ou aguarde mais um pouco.</p>');
    }, 15000);
  }
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
  if (tR) tR.textContent = cur === "red" ? Math.max(0, Math.ceil(S.turnLeft)) + "s" : "";
  if (tB) tB.textContent = cur === "blue" ? Math.max(0, Math.ceil(S.turnLeft)) + "s" : "";
}
function resetTurnTimer(){ if (S){ S.turnLeft = TURN_SECONDS; paintTimer(); } }
function stopTurnTimer(){ if (S?.turnInt) clearInterval(S.turnInt); if (S) S.turnInt = null; }
function startTurnTimer(){
  stopTurnTimer();
  S.turnInt = setInterval(() => {
    if (!S || S.state.over){ stopTurnTimer(); return; }
    const mine = humanTurn();
    if (S.mode === "online" && !mine){
      S.turnLeft -= 0.25;
      if (S.turnLeft <= -10){
        toast("⏱ Rival estourou o tempo — vez passada!");
        doSkip();
        return;
      }
      paintTimer();
      return;
    }
    if (!mine){ S.turnLeft = TURN_SECONDS; paintTimer(); return; }
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
  S.oppSeen = true; if (S.ghostTimer){ clearTimeout(S.ghostTimer); S.ghostTimer = null; }
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
    S.state.abandoned = true;
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

async function endGame(){
  stopTimer();
  stopTurnTimer();
  const w = S.state.winner;
  /* VITÓRIA ÉPICA */
  try {
    const flash = $("victoryFlash");
    if (flash){ flash.classList.remove("active"); void flash.offsetWidth; flash.classList.add("active"); setTimeout(()=>flash.classList.remove("active"), 800); }
    document.body.classList.add("screen-shake");
    setTimeout(()=>document.body.classList.remove("screen-shake"), 450);
  } catch (_){}
  confetti(w);
  SFX.win();
  setLastReplay(S.state.replay);

  const humanColor = S.mode === "ai" ? "red" : (S.mode === "online" ? S.myColor : w);
  const humanWon = humanColor === w;
  try {
    const oppC = humanColor === "red" ? "blue" : "red";
    const myPiece = getSettings().piece || "p-classic";
    const oppPiece = S.oppProfile?.piece || S.oppPiece || "p-classic";
    saveClip({ id: Date.now(), date: Date.now(), events: S.state.replay, mode: S.mode,
      won: humanWon, myColor: humanColor,
      oppName: S.oppProfile?.username || NAMES[oppC],
      nameRed: humanColor === "red" ? "Você" : (S.oppProfile?.username || NAMES[oppC]),
      nameBlue: humanColor === "blue" ? "Você" : (S.oppProfile?.username || NAMES[oppC]),
      skinRed: humanColor === "red" ? myPiece : oppPiece,
      skinBlue: humanColor === "blue" ? myPiece : oppPiece });
  } catch (_){}
  const extra = JSON.parse(localStorage.getItem("qa_extra") || "{}");
  if (humanWon){
    if (S.mode === "online") extra.onlineWins = (extra.onlineWins||0)+1;
    if (S.mode === "ai" && S.level === "expert") extra.iaExpertWins = (extra.iaExpertWins||0)+1;
  }
  if (S.private) extra.privateGames = (extra.privateGames||0)+1;
  localStorage.setItem("qa_extra", JSON.stringify(extra));

  let repeated = false;
  if (S.mode === "online" && !S.private && S.oppId && getSession()){
    try {
      repeated = (await pairCount(S.oppId)) >= 3;
      if (!repeated) await logMatch(S.oppId);
    } catch (_){}
  }
  if (repeated) toast("🔁 Muitas partidas contra o mesmo rival hoje — Elo pausado");

  const res = S.mode === "online"
    ? recordMatch({
        mode: S.mode, winner: w, myColor: humanColor,
        durationSec: S.seconds,
        wallsUsed: S.state.stats.walls[humanColor],
        movesUsed: S.state.stats.moves[humanColor],
        wasBehind: S.state.stats.wasBehind[humanColor],
        abandoned: !!S.state.abandoned,
        repeated
      })
    : { xp: 0, eloDelta: 0, unlocked: [] };
  $("winText").textContent = NAMES[w] + " venceu!";
  $("winSub").textContent = `+${res.xp} XP` + (res.eloDelta ? ` · ${res.eloDelta > 0 ? "+" : ""}${res.eloDelta} Elo` : "");
  for (const key of res.unlocked) toast("🏅 Conquista: " + ACHIEVEMENTS.find((a) => a.key === key)?.name);
  $("overlayCard").className = "overlay-card " + w;
  /* animação épica via CSS */
  $("btnRematch").classList.toggle("hidden", S.mode === "online");
  $("overlay").classList.remove("hidden");
  clearSnapshot();
  if (S.ranked && S.mode === "online" && S.matchId){
    const st = S.state, my = S.myColor, mid = S.matchId, won = humanWon, sec = S.seconds;
    (async () => {
      try {
        const impacts = analyzeWallImpacts(st, my);
        let rr = await submitRankedResult({ matchId: mid, iWon: won, abandoned: !!st.abandoned,
          impacts, wallsUsed: st.stats.walls[my], wallsLeft: st.players[my].walls, durationSec: sec });
        for (let i = 0; i < 32 && rr?.status === "pending"; i++){
          await new Promise(r2 => setTimeout(r2, 3000));
          rr = await getRankedResult(mid);
        }
        if (rr?.status === "pending") rr = await autoWinRanked(mid);
        if (rr?.status === "processed" && rr.me){
          const b = rr.me;
          const t0 = rankOf(b.rp_before), t1 = rankOf(b.rp_after);
          $("winSub").textContent += " · 🏆 " + (b.d_total >= 0 ? "+" : "") + b.d_total + " RP (" +
            b.rp_before.toLocaleString("pt-BR") + " → " + b.rp_after.toLocaleString("pt-BR") + ")";
          $("winSub").textContent += " | base " + (b.d_base > 0 ? "+" : "") + b.d_base +
            " · mmr " + (b.d_mmr > 0 ? "+" : "") + b.d_mmr + " · ef " + (b.d_eff > 0 ? "+" : "") + b.d_eff;
          if (t1.name !== t0.name) toast(t1.min > t0.min ? "🎉 PROMOÇÃO! Bem-vindo à " + t1.name + "!" : "📉 Rebaixado para " + t1.name + ".");
        }
      } catch (_){}
    })();
  }
}

export function endSession(goHome = true){
  stopTimer();
  stopTurnTimer();
  if (S?.aiTimer) clearTimeout(S.aiTimer);
  if (S?.ghostTimer) clearTimeout(S.ghostTimer);
  if (S?.mode === "online" && S.state && !S.state.over){
    try {
      net.sendAction({ t: "resign" });
      const other = S.myColor === "red" ? "blue" : "red";
      recordMatch({
        mode: "online", winner: other, myColor: S.myColor,
        durationSec: S.seconds,
        wallsUsed: S.state.stats.walls[S.myColor],
        movesUsed: S.state.stats.moves[S.myColor],
        wasBehind: S.state.stats.wasBehind[S.myColor],
        abandoned: true
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

const RP = { events: [], idx: 0, playing: false, timer: null, state: null };

export function openReplay(events, meta){
  if (!events?.length){ toast("Nenhum replay disponível."); return; }
  RP.events = events; RP.idx = 0; RP.playing = false; RP.state = newGame();
  if (replayBoard) replayBoard.destroy();
  replayBoard = createBoard($("replayBoard"), null, false);
  replayBoard.sync(RP.state);
  $("btnReplayPlay").textContent = "▶";
  const cm = $("clipMeta");
  if (meta){
    try {
      replayBoard.setPieceColors({ red: pieceBgFor(meta.skinRed || "p-classic", "red", true), blue: pieceBgFor(meta.skinBlue || "p-classic", "blue", true) });
      if (cm) cm.innerHTML = clipMetaHtml(meta);
    } catch (_){}
  } else if (cm) cm.innerHTML = "";
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
     let salesN = 0;
  if (isAdmin()){ try { salesN = (await listPendingPurchases()).length; } catch (_){} }
  const n = (reqs || []).length + fresh.length + salesN;
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
    (isAdmin() ? '<button class="tab' + (bellTab === "sales" ? " active" : "") + '" data-belltab="sales">💰 Vendas</button>' : "") +
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
       if (isAdmin()){
      html += '<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">' +
        '<input id="annTitle" class="input" placeholder="Título do aviso">' +
        '<input id="annBody" class="input" placeholder="Mensagem pra todos os jogadores">' +
        '<button class="mini-btn" data-annsend="1">📤 Enviar pra todos</button></div>';
    }
    } else if (bellTab === "sales"){
    const rows = await listPendingPurchases();
    html += '<p class="hint">💰 Pedidos aguardando confirmação do PIX:</p>';
    html += rows?.length
      ? rows.map((r) => `
        <div class="friend-row" style="align-items:center;flex-wrap:wrap;gap:8px">
          <img class="rank-avatar" src="${r.avatar_url || "icons/icon.svg"}" alt="">
          <div style="min-width:0;flex:1">
            <div class="rank-name">${escapeHtml(r.username || "Jogador")} · ${r.elo ?? 0} Elo</div>
            <div class="hint" style="font-size:10px">⚽ ${r.skin_id} · R$ 1,00 ·  ${new Date(r.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
          </div>
          <button class="mini-btn" data-approve="${r.id}">✅</button>
          <button class="mini-btn" data-reject="${r.id}">❌</button>
        </div>`).join("")
      : '<p class="hint">nenhum pedido pendente 🎉</p>';
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
let skinQuery = "";
let pieceSub = "classic";
const extraStats = () => ({ ...getStats(), ...(JSON.parse(localStorage.getItem("qa_extra")||"{}")) });
function skinUnlocked(it){
  if (isAdmin() && localStorage.getItem("qa_admin") !== "0") return true;
  if (it.price) return isBought(it.id);
  if (it.free) return true;
  const s = extraStats();
  return it.unlock.cur(s, levelFromXp(s.xp)) >= it.unlock.target;
}
export function renderSkins(cat){
  skinCat = cat || skinCat;
  if (skinCat !== "piece") skinQuery = "";
  const ss = document.getElementById("skinSearch");
  if (ss){ ss.style.display = skinCat === "piece" ? "" : "none"; if (ss.value !== skinQuery) ss.value = skinQuery; }
  const equipped = getSettings()[CAT_KEY[skinCat]];
  let items = SKIN_CATALOG.filter((i)=>i.cat===skinCat && !i.hide);
  if (skinCat === "piece") items = items.filter((i)=>(i.sub || "classic") === pieceSub);
  const subTabs = skinCat === "piece"
    ? '<div style="display:flex;gap:8px;justify-content:center;margin:0 0 12px">' +
      [["classic","Clássicas"],["pais","Países"],["time","Times"]].map(([k,n]) =>
        '<button data-psub="' + k + '" style="padding:8px 16px;border-radius:999px;border:1px solid ' + (pieceSub===k?"#3b82f6":"var(--line,#2a2f3a)") + ';background:' + (pieceSub===k?"#3b82f622":"transparent") + ';color:' + (pieceSub===k?"#60a5fa":"var(--text,#eee)") + ';font-weight:700;font-size:12px;cursor:pointer">' + n + '</button>').join("") +
      '</div>'
    : "";
  let customCard = "";
  if (skinCat === "piece" && pieceSub === "classic"){
    const cc = getSettings().customColor || "#22c55e";
    const eq = getSettings().piece === "p-custom";
    customCard = '<button class="skin-card ' + (eq?"active":"") + '" data-skinid="p-custom">' +
      '<span class="skin-swatch" style="background:radial-gradient(circle at 35% 30%, ' + cc + ' 0%, ' + cc + ' 95%);border-radius:50%"></span>' +
      '<span class="skin-name">🎨 Personalize a cor</span>' +
      '<span class="skin-state">' + (eq?"✔ Equipada":"Livre") + '</span></button>';
  }
  $("skinsList").innerHTML = subTabs + customCard + items.map((it)=>{
    const un = skinUnlocked(it);
    return `<button class="skin-card ${equipped===it.id?"active":""} ${un?"":"locked"}" data-skinid="${it.id}">
            <span class="skin-swatch" style="background:${it.badge ? it.badge : 'linear-gradient(135deg,' + it.swatch[0] + ' 50%,' + it.swatch[1] + ' 50%)'};border-radius:50%"></span>
      <span class="skin-name">${it.name}</span>
      <span class="skin-state">${equipped===it.id?"✔ Equipada":un?"Livre":it.price?(hasPending(it.id)?"⏳ Aguardando":"R$ "+it.price.toFixed(2)):"🔒"}</span>
    </button>`;
  }).join("");
}
function clickSkin(id){
  if (id === "p-custom"){ openColorPicker(); return; }
  const it = SKIN_CATALOG.find((i)=>i.id===id);
  if (!it) return;
  if (!skinUnlocked(it)){
    if (it.price){ openBuyModal(it); return; }
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

function openColorPicker(){
  const cur = getSettings().customColor || "#22c55e";
  openModal("🎨 Personalize a cor", [
    { label: "✅ Confirmar", onClick: () => {
        const val = $("customColorInput").value;
        const st = getSettings();
        st.customColor = val;
        st.piece = "p-custom";
        setCustomColor(val);
        setSettings(st); applySettings(st);
        if (getSession()) updateProfile({ piece: "p-custom", customColor: val });
        renderSkins("piece");
        SFX.click();
        toast("🎨 Cor equipada!");
      } },
    { label: "Cancelar", onClick: null }
  ], '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:8px 0">' +
     '<div id="customColorPrev" style="width:70px;height:70px;border-radius:50%;background:radial-gradient(circle at 35% 30%, ' + cur + ' 0%, ' + cur + ' 95%);box-shadow:0 4px 14px #0006"></div>' +
     '<input type="color" id="customColorInput" value="' + cur + '" style="width:100%;height:48px;border:none;background:none;cursor:pointer">' +
     '<p class="hint">Escolha a cor da sua bolinha e confirme!</p></div>');
  const inp = $("customColorInput");
  inp.addEventListener("input", () => { $("customColorPrev").style.background = "radial-gradient(circle at 35% 30%, " + inp.value + " 0%, " + inp.value + " 95%)"; });
}

const escapeHtml = (s) => String(s ?? "").replace(/[<>&"]/g, (c) =>
  ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

export function initScreens(){
  registerUserSkins();
  applyUserBoard();
  applyUserFrames();
  setCustomColor(getSettings().customColor);
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
    t.classList.add("active"); if (t.dataset.cat === "piece") pieceSub = "classic"; renderSkins(t.dataset.cat);
  }));
  $("skinsList").addEventListener("click",(e)=>{
    const p = e.target.closest("[data-psub]");
    if (p){ pieceSub = p.dataset.psub; renderSkins(); return; }
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
    const set = window.QA_CUSTOM_SET || null;
    const code = await net.createRoom(false, set?.rush ? "race" : "classic", set);
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
    if (logged){
      await syncCloudData();
      applySettings(getSettings());
      applyUserBoard();
      applyUserFrames();
    }
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
       if (e.target.dataset.approve){ await approvePurchase(e.target.dataset.approve); toast("✅ Skin liberada! O jogador recebe no próximo login."); renderBellBody(); refreshBell(); return; }
    if (e.target.dataset.reject){ await rejectPurchase(e.target.dataset.reject); toast("❌ Pedido recusado."); renderBellBody(); refreshBell(); return; }
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

  (function reorgHome2(){
    if ($("qaAltBtn")) return;
    let grid = $("qaHomeGrid");
    if (!grid){
      grid = document.createElement("div");
      grid.id = "qaHomeGrid";
      grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0";
      ($("btnRankedHome") || $("btnOnline")).after(grid);
    }
    const small = (b) => { b.style.cssText += ";padding:12px 8px;font-size:13px;margin:0;width:100%"; };
    const alt = document.createElement("button");
    alt.className = "menu-btn"; alt.id = "qaAltBtn";
    alt.textContent = "🎮 Modos Alternativos";
    small(alt);
    alt.onclick = () => {
      SFX.click();
      openModal("🎮 Modos Alternativos", [
        { label: "🤖 Jogar vs IA", onClick: () => $("btnAI").click() },
        { label: "🛋️ Jogar Local", onClick: () => $("btnLocal").click() },
        { label: "Cancelar", onClick: null }
      ], '<div style="display:flex;flex-direction:column;gap:10px;padding:6px 0">' +
         '<p class="hint" style="margin:0;text-align:center">👥 Sala Personalizada</p>' +
         '<input id="qaRoomCode2" class="input" placeholder="🔑 Código da sala" style="text-transform:uppercase">' +
         '<button id="qaJoinCode2" class="menu-btn primary" style="width:100%;margin:0">🔑 Entrar com Código</button>' +
         '<button id="qaCreateRoom2" class="menu-btn" style="width:100%;margin:0">🏠 Criar Sala</button></div>');
      $("qaJoinCode2").onclick = async () => {
        const code = $("qaRoomCode2").value.trim().toUpperCase();
        if (!code){ toast("Digite o código da sala!"); return; }
        closeModal();
        if (!isConfigured()){ toast("Configure o Supabase em js/config.js."); return; }
        if (!getSession()){ const ok = await net.ensureAnon(); if (!ok){ toast("Entre na sua conta."); showScreen("auth"); return; } }
        net.joinRoom(code, (info) => startGame({ mode: "online", private: true, ...info }));
      };
      $("qaCreateRoom2").onclick = () => { closeModal(); openCustomRoom(); };
    };
    grid.appendChild(alt);
    if ($("btnRace")){ small($("btnRace")); if ($("btnRace").parentNode !== grid) grid.appendChild($("btnRace")); }
    for (const id of ["btnAI", "btnLocal", "btnRoomHome"]){
      const b = $(id); if (b) b.style.display = "none";
    }
    if ($("btnCreateRoomHome")) $("btnCreateRoomHome").style.display = "none";
    if ($("btnJoinCodeHome")) $("btnJoinCodeHome").style.display = "none";
  })();
  (function reorgLobby(){ return;
    const online = $("btnOnline");
    if (!online || $("qaLobby")) return;
    const parent = online.parentElement;
    const wrap = document.createElement("div");
    wrap.id = "qaLobby";
    wrap.style.cssText = "display:flex;flex-direction:column;gap:12px;width:100%;max-width:430px;margin:0 auto;box-sizing:border-box";
    parent.insertBefore(wrap, online);
    const big = (b, bg, fg) => { b.style.cssText = "width:100%;margin:0;padding:15px;font-size:16px;font-weight:800;border:none;border-radius:14px;cursor:pointer;color:" + (fg || "#fff") + ";" + bg; };
    const smallB = (b) => { b.style.cssText = "width:100%;margin:0;padding:13px 6px;font-size:13px;font-weight:700;border:1px solid var(--line,#16233C);border-radius:12px;background:var(--card,#0C1322);color:var(--text,#E9F2FF);cursor:pointer"; };
    const grid = $("qaHomeGrid");
    if (grid) grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0";
    const apoia = Array.from(parent.querySelectorAll("button")).find(b => (b.textContent || "").includes("Apoiar"));
    big($("btnOnline"), "background:linear-gradient(135deg,#246BCE,#63B8FF);box-shadow:0 6px 18px rgba(36,107,206,.35)");
    wrap.appendChild($("btnOnline"));
    if ($("btnRankedHome")){
      big($("btnRankedHome"), "background:linear-gradient(135deg,#8a5a2b,#F5C033);box-shadow:0 6px 18px rgba(245,192,51,.25)", "#1e293b");
      wrap.appendChild($("btnRankedHome"));
    }
    if (grid) wrap.appendChild(grid);
    Array.from(parent.querySelectorAll("button")).forEach(b => {
      if (b.parentElement === wrap || b.parentElement === grid) return;
      if (b === apoia) return;
      if (getComputedStyle(b).display === "none") return;
      smallB(b); wrap.appendChild(b);
    });
    if (apoia){
      apoia.style.cssText = "width:100%;margin:4px 0 0;padding:10px;background:transparent;border:1px dashed #fbbf2466;color:#fbbf24;font-weight:600;border-radius:12px;cursor:pointer;font-size:12px";
      wrap.appendChild(apoia);
    }
  })();
  (function reorgLobby2(){ return;
    const oldWrap = $("qaLobby");
    const online = $("btnOnline");
    if (!online) return;
    const parent = online.parentElement;
    if (oldWrap){ while (oldWrap.firstChild) parent.appendChild(oldWrap.firstChild); oldWrap.remove(); }
    for (const id of ["btnDismissBanner", "msgBubbleClose"]){ const b = $(id); if (b) b.style.display = "none"; }
    if ($("btnInstallBanner") && $("installBanner")) $("installBanner").appendChild($("btnInstallBanner"));
    const wrap = document.createElement("div");
    wrap.id = "qaLobby";
    wrap.style.cssText = "display:flex;flex-direction:column;gap:12px;width:100%;max-width:430px;margin:0 auto;box-sizing:border-box";
    parent.insertBefore(wrap, online);
    const big = (b, bg, fg) => { b.style.cssText = "width:100%;margin:0;padding:15px;font-size:16px;font-weight:800;border:none;border-radius:14px;cursor:pointer;color:" + (fg || "#fff") + ";" + bg; };
    const smallB = (b) => { b.style.cssText = "width:100%;margin:0;padding:12px 6px;font-size:12px;font-weight:700;border:1px solid var(--line,#16233C);border-radius:12px;background:var(--card,#0C1322);color:var(--text,#E9F2FF);cursor:pointer"; };
    big(online, "background:linear-gradient(135deg,#246BCE,#63B8FF);box-shadow:0 6px 18px rgba(36,107,206,.35)");
    wrap.appendChild(online);
    if ($("btnRankedHome")){ big($("btnRankedHome"), "background:linear-gradient(135deg,#8a5a2b,#F5C033);box-shadow:0 6px 18px rgba(245,192,51,.25)", "#1e293b"); wrap.appendChild($("btnRankedHome")); }
    let grid = $("qaHomeGrid");
    if (!grid){ grid = document.createElement("div"); grid.id = "qaHomeGrid"; }
    grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0";
    grid.innerHTML = "";
    wrap.appendChild(grid);
    if ($("btnRace")){ smallB($("btnRace")); grid.appendChild($("btnRace")); }
    if ($("qaAltBtn")){ smallB($("qaAltBtn")); grid.appendChild($("qaAltBtn")); }
    const nav = document.createElement("div");
    nav.id = "qaNavGrid";
    nav.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px";
    for (const id of ["btnProfile", "btnFriends", "btnSkins", "btnRanking", "btnSettings", "btnHowTo"]){
      const b = $(id); if (b){ smallB(b); nav.appendChild(b); }
    }
    wrap.appendChild(nav);
    const apoia = Array.from(parent.querySelectorAll("button")).find(b => (b.textContent || "").includes("Apoiar"));
    if (apoia){
      apoia.style.cssText = "width:100%;margin:4px 0 0;padding:10px;background:transparent;border:1px dashed #fbbf2466;color:#fbbf24;font-weight:600;border-radius:12px;cursor:pointer;font-size:12px";
      wrap.appendChild(apoia);
    }
    Array.from(parent.querySelectorAll("button")).forEach(b => {
      if (b.closest("#qaLobby")) return;
      if (getComputedStyle(b).display === "none") return;
      b.style.display = "none";
    });
  })();
  (function fixLobbyFinal(){ return;
    try {
      const online = $("btnOnline");
      if (!online || $("qaLobbyFinal")) return;
      const parent = online.parentElement;
      const oldWrap = $("qaLobby");
      if (oldWrap){ while (oldWrap.firstChild) parent.appendChild(oldWrap.firstChild); oldWrap.remove(); }
      const wrap = document.createElement("div");
      wrap.id = "qaLobbyFinal";
      wrap.style.cssText = "display:flex;flex-direction:column;gap:12px;width:100%;max-width:430px;margin:0 auto;box-sizing:border-box";
      parent.insertBefore(wrap, online);
      const big = (b, bg, fg) => { b.style.cssText = "width:100%;margin:0;padding:15px;font-size:16px;font-weight:800;border:none;border-radius:14px;cursor:pointer;color:" + (fg || "#fff") + ";" + bg; };
      const smallB = (b) => { b.style.cssText = "width:100%;margin:0;padding:12px 6px;font-size:12px;font-weight:700;border:1px solid var(--line,#16233C);border-radius:12px;background:var(--card,#0C1322);color:var(--text,#E9F2FF);cursor:pointer"; };
      big(online, "background:linear-gradient(135deg,#246BCE,#63B8FF);box-shadow:0 6px 18px rgba(36,107,206,.35)");
      wrap.appendChild(online);
      if ($("btnRankedHome")){ big($("btnRankedHome"), "background:linear-gradient(135deg,#8a5a2b,#F5C033);box-shadow:0 6px 18px rgba(245,192,51,.25)", "#1e293b"); wrap.appendChild($("btnRankedHome")); }
      const g1 = document.createElement("div");
      g1.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px";
      for (const id of ["qaAltBtn", "btnRace"]){ const b = $(id); if (b){ smallB(b); g1.appendChild(b); } }
      wrap.appendChild(g1);
      const g2 = document.createElement("div");
      g2.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px";
      for (const id of ["btnSkins", "btnRanking", "btnProfile", "btnFriends", "btnSettings", "btnHowTo"]){ const b = $(id); if (b){ smallB(b); g2.appendChild(b); } }
      wrap.appendChild(g2);
      const apoias = Array.from(parent.querySelectorAll("button")).filter(b => (b.textContent || "").includes("Apoiar") && !b.closest("#qaLobbyFinal"));
      apoias.forEach((b, i) => {
        if (i === 0){ b.style.cssText = "width:100%;margin:4px 0 0;padding:10px;background:transparent;border:1px dashed #fbbf2466;color:#fbbf24;font-weight:600;border-radius:12px;cursor:pointer;font-size:12px"; wrap.appendChild(b); }
        else b.style.display = "none";
      });
      Array.from(parent.querySelectorAll("button")).forEach(b => {
        if (b.closest("#qaLobbyFinal")) return;
        b.style.display = "none";
      });
    } catch (e){ console.warn("lobby fix ignorado:", e); }
  })();
  (function fixLobbyFinal2(){
    try {
      const parent = $("btnFindMatch")?.parentElement;
      if (!parent || $("qaLobbyFinal2")) return;
      for (const wid of ["qaLobby", "qaLobbyFinal"]){
        const w = $(wid);
        if (w){ while (w.firstChild) parent.appendChild(w.firstChild); w.remove(); }
      }
      const clean = (b) => { if (b) b.style.cssText = ""; };
      const firstMode = $("btnFindMatch");
      for (const id of ["btnSidebarOpen", "btnBell", "homeUserChip", "btnLogin"]){
        const b = $(id); if (b){ clean(b); parent.insertBefore(b, firstMode); }
      }
      const back = (id, dest) => { const b = $(id); if (b && dest){ clean(b); dest.appendChild(b); } };
      back("btnBellClose", document.querySelector(".bell-head"));
      back("btnSidebarClose", document.querySelector(".sidebar-head"));
      back("msgBubbleClose", $("msgBubble"));
      back("btnInstallBanner", $("installBanner"));
      back("btnDismissBanner", $("installBanner"));
      const sb = $("sidebar");
      for (const id of ["btnProfile", "btnFriends", "btnSkins", "btnRanking", "btnSettings", "btnHowTo", "btnInstall", "btnLogout", "btnDonateSide"]){
        const b = $(id); if (b){ clean(b); sb.appendChild(b); }
      }
      for (const id of ["btnCreateRoomHome", "btnJoinCodeHome", "btnLocal", "btnAI", "btnOnline"]){
        const b = $(id); if (b) b.style.display = "none";
      }
      const wrap = document.createElement("div");
      wrap.id = "qaLobbyFinal2";
      wrap.style.cssText = "display:flex;flex-direction:column;gap:12px;width:100%;max-width:430px;margin:0 auto;box-sizing:border-box";
      parent.insertBefore(wrap, $("installBanner"));
      const big = (b, bg, fg) => { b.style.cssText = "width:100%;margin:0;padding:15px;font-size:16px;font-weight:800;border:none;border-radius:14px;cursor:pointer;color:" + (fg || "#fff") + ";" + bg; };
      const smallB = (b) => { b.style.cssText = "width:100%;margin:0;padding:13px 6px;font-size:13px;font-weight:700;border:1px solid var(--line,#16233C);border-radius:12px;background:var(--card,#0C1322);color:var(--text,#E9F2FF);cursor:pointer"; };
      big($("btnFindMatch"), "background:linear-gradient(135deg,#246BCE,#63B8FF);box-shadow:0 6px 18px rgba(36,107,206,.35)");
      wrap.appendChild($("btnFindMatch"));
      if ($("btnRankedHome")){ big($("btnRankedHome"), "background:linear-gradient(135deg,#8a5a2b,#F5C033);box-shadow:0 6px 18px rgba(245,192,51,.25)", "#1e293b"); wrap.appendChild($("btnRankedHome")); }
      const g1 = document.createElement("div");
      g1.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px";
      for (const id of ["qaAltBtn", "btnRace"]){ const b = $(id); if (b){ smallB(b); g1.appendChild(b); } }
      wrap.appendChild(g1);
      if ($("btnDonateLobby")){
        $("btnDonateLobby").style.cssText = "width:100%;margin:4px 0 0;padding:10px;background:transparent;border:1px dashed #fbbf2466;color:#fbbf24;font-weight:600;border-radius:12px;cursor:pointer;font-size:12px";
        wrap.appendChild($("btnDonateLobby"));
      }
      const og = $("qaHomeGrid"); if (og && !og.children.length) og.remove();
    } catch (e){ console.warn("lobby final2 ignorado:", e); }
  })();
  (function fixApoioLast(){
    try {
      const wrap = $("qaLobbyFinal2");
      const apoia = $("btnDonateLobby");
      const banner = $("installBanner");
      if (!wrap || !apoia) return;
      wrap.appendChild(apoia);
      if (banner && banner.parentElement === wrap.parentNode) wrap.parentNode.insertBefore(banner, wrap);
    } catch (e){ console.warn("apoio-last ignorado:", e); }
  })();
  /* chip alinhado via CSS .chip-right */
  (function fixOrder4(){
    try {
      const apoia = $("btnDonateLobby");
      const grid = $("qaHomeGrid");
      const ranked = $("btnRankedHome");
      const online = $("btnFindMatch");
      if (!apoia) return;
      const anchor = grid || ranked || online;
      if (anchor) anchor.after(apoia);
      apoia.style.cssText = "display:block;width:100%;max-width:430px;margin:12px auto 0;padding:10px;background:transparent;border:1px dashed #fbbf2466;color:#fbbf24;font-weight:600;border-radius:12px;cursor:pointer;font-size:12px";
    } catch (e){ console.warn("ordem4 ignorado:", e); }
  })();
  (function fixLobbyWidths(){
    try {
      const W = "width:100%;max-width:460px;margin:0 auto 12px;box-sizing:border-box";
      const online = $("btnFindMatch");
      const ranked = $("btnRankedHome");
      const grid = $("qaHomeGrid");
      const apoia = $("btnDonateLobby");
      if (online) online.style.cssText = W + ";display:block;padding:15px;font-size:16px;font-weight:800;border:none;border-radius:14px;cursor:pointer;color:#fff;background:linear-gradient(135deg,#246BCE,#63B8FF);box-shadow:0 6px 18px rgba(36,107,206,.35)";
      if (ranked) ranked.style.cssText = W + ";display:block;padding:15px;font-size:16px;font-weight:800;border:none;border-radius:14px;cursor:pointer;color:#1e293b;background:linear-gradient(135deg,#8a5a2b,#F5C033);box-shadow:0 6px 18px rgba(245,192,51,.25)";
      if (grid) grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px;" + W;
      for (const id of ["qaAltBtn", "btnRace"]){
        const b = $(id);
        if (b) b.style.cssText = "width:100%;margin:0;padding:13px 6px;font-size:13px;font-weight:700;border:1px solid var(--line,#16233C);border-radius:12px;background:var(--card,#0C1322);color:var(--text,#E9F2FF);cursor:pointer;box-sizing:border-box";
      }
      if (apoia) apoia.style.cssText = "display:block;width:100%;max-width:460px;margin:0 auto;padding:10px;background:transparent;border:1px dashed #fbbf2466;color:#fbbf24;font-weight:600;border-radius:12px;cursor:pointer;font-size:12px;box-sizing:border-box";
    } catch (e){ console.warn("lobby-widths ignorado:", e); }
  })();
  (function fixGap6(){
    try {
      const grid = $("qaHomeGrid");
      if (grid) grid.style.cssText += ";margin-top:16px !important";
      const ranked = $("btnRankedHome");
      if (ranked) ranked.style.cssText += ";margin-bottom:16px !important";
      const online = $("btnFindMatch");
      if (online) online.style.cssText += ";margin-bottom:12px !important";
    } catch (e){ console.warn("gap6 ignorado:", e); }
  })();
  (function fixOrder8(){
    try {
      const ranked = $("btnRankedHome");
      const online = $("btnFindMatch");
      if (ranked && online) online.before(ranked);
    } catch (e){ console.warn("ordem8 ignorado:", e); }
  })();
  (function fixOrder9(){
    setTimeout(() => {
      try {
        const ranked = $("btnRankedHome");
        const online = $("btnFindMatch");
        const grid = $("qaHomeGrid");
        const apoia = $("btnDonateLobby");
        if (!ranked || !online) return;
        online.before(ranked);
        if (grid) online.after(grid);
        if (apoia && grid) grid.after(apoia);
        const W = "width:100%;max-width:460px;margin:0 auto 12px;box-sizing:border-box";
        ranked.style.cssText = W + ";display:block;padding:15px;font-size:16px;font-weight:800;border:none;border-radius:14px;cursor:pointer;color:#1e293b;background:linear-gradient(135deg,#8a5a2b,#F5C033);box-shadow:0 6px 18px rgba(245,192,51,.25)";
        online.style.cssText = W + ";display:block;padding:15px;font-size:16px;font-weight:800;border:none;border-radius:14px;cursor:pointer;color:#fff;background:linear-gradient(135deg,#246BCE,#63B8FF);box-shadow:0 6px 18px rgba(36,107,206,.35)";
        if (grid) grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px;" + W;
      } catch (e){ console.warn("ordem9 ignorado:", e); }
    }, 80);
  })();
  net.onStatus((on) => $("reconnect").classList.toggle("hidden", on));
  buildArenaHud();
  initWorkshop();
  maybeShowLaunch();
  setTimeout(maybeShowNews, 1500);
  setTimeout(cleanupPendingRanked, 2500);
  (function buildRanked(){
    if (!$("rankedScreen")){
      const scr = document.createElement("div");
      scr.className = "screen"; scr.dataset.screen = "ranked"; scr.id = "rankedScreen";
      scr.innerHTML = '<div style="max-width:640px;margin:0 auto;padding:14px">' +
        '<button class="mini-btn" data-back="home">← Voltar</button>' +
        '<h2 style="text-align:center;margin:10px 0 12px">🏆 Modo Ranqueado</h2>' +
        '<div id="rankedCard"></div>' +
        '<button id="btnRankedQueue" class="menu-btn primary" style="width:100%;margin:14px 0;padding:14px">⚔️ Buscar Partida Ranqueada</button>' +
        '<h3 style="text-align:center;margin:6px 0">🏅 Top Ranqueados</h3>' +
        '<ul id="rankedList" style="list-style:none;padding:0;margin:0"></ul></div>';
      document.body.appendChild(scr);
    }
    if ($("btnOnline") && !$("btnRankedHome")){
      const hb = document.createElement("button");
      hb.className = "menu-btn primary"; hb.id = "btnRankedHome";
      hb.style.background = "linear-gradient(135deg,#246BCE,#63B8FF)";
      hb.textContent = "🏆 Ranqueada";
      $("btnOnline").after(hb);
      hb.onclick = () => { SFX.click(); showScreen("ranked"); };
    }
    const rq = $("btnRankedQueue");
    if (rq) rq.onclick = async () => {
      SFX.click();
      if (!isConfigured()){ toast("Configure o Supabase em js/config.js."); return; }
      if (!getSession()){ const ok = await net.ensureAnon(); if (!ok){ toast("Entre na sua conta."); showScreen("auth"); return; } }
      $("searchOverlay").classList.remove("hidden");
      const myR = await getMyRanked().catch(() => null);
      net.startQueue((info) => { $("searchOverlay").classList.add("hidden"); startGame({ mode: "online", ...info }); }, "ranked", myR?.mmr ?? 1000);
    };
    document.querySelectorAll("#rankedScreen [data-back]").forEach((b) =>
      b.addEventListener("click", () => { SFX.click(); showScreen(b.dataset.back); }));
  })();
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
async function refreshRanked(){
  const card = $("rankedCard");
  if (card) card.innerHTML = '<p class="hint">carregando…</p>';
  const p = await getProfile();
  const rp = p?.elo_ranked ?? 1000;
  const games = p?.ranked_games ?? 0;
  const rk = rankOf(rp), nx = nextRank(rp);
  const pct = nx ? Math.max(0, Math.min(100, ((rp - rk.min) / (nx.min - rk.min)) * 100)) : 100;
  if (card) card.innerHTML =
    '<div style="background:var(--card,#0C1322);border:1px solid var(--line,#16233C);border-radius:16px;padding:18px;text-align:center">' +
    '<div style="font-size:56px">' + rk.icon + '</div>' +
    '<div style="font-size:20px;font-weight:800;margin:4px 0">' + rk.name + '</div>' +
    '<div style="font-size:13px;color:#63B8FF;font-weight:700">' + rp + ' PR · ' + games + ' partidas ranqueadas</div>' +
    '<div style="height:8px;background:rgba(255,255,255,.1);border-radius:5px;margin:12px 0 4px;overflow:hidden"><i style="display:block;height:100%;width:' + pct + '%;background:linear-gradient(90deg,#246BCE,#63B8FF);border-radius:5px"></i></div>' +
    '<div style="font-size:10px;color:#7E93B4">' + (nx ? "Faltam " + (nx.min - rp) + " PR pra " + nx.icon + " " + nx.name : "🏆 Patente máxima!") + '</div></div>';
  const list = $("rankedList");
  if (list) list.innerHTML = '<p class="hint">carregando…</p>';
  const rows = await getRankedRanking();
  const meId = getSession()?.user?.id;
  if (!rows?.length){ if (list) list.innerHTML = '<p class="hint">Ninguém jogou ranqueada ainda — seja o primeiro! 🏆</p>'; return; }
  if (list) list.innerHTML = rows.slice(0, 20).map((r, i) => {
    const rk2 = rankOf(r.elo_ranked);
    return '<li class="rank-item ' + (r.id === meId ? "me" : "") + '" style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--line,#16233C);border-radius:12px;margin-bottom:6px">' +
      '<span class="rank-pos">' + (i + 1) + '</span>' +
      '<img class="rank-avatar" src="' + (r.avatar_url || "icons/icon.svg") + '" alt="" style="width:34px;height:34px;border-radius:50%">' +
      '<span class="rank-name" style="flex:1">' + rk2.icon + " " + escapeHtml(r.username) + '</span>' +
      '<span class="rank-elo">' + r.elo_ranked + ' PR</span></li>';
  }).join("");
}

function openCustomRoom(){
  const MAXW = { 8: 10, 9: 14, 10: 20 };
  let size = 9, walls = 10;
  openModal("🎛️ Sala Personalizada", [
    { label: "🏠 Criar Sala", onClick: () => {
        window.QA_CUSTOM_SET = size === "rush" ? { rush: true } : { size, walls };
        $("btnCreateRoomHome").click();
      } },
    { label: "Cancelar", onClick: null }
  ], '<div style="display:flex;flex-direction:column;gap:12px;padding:6px 0">' +
     '<p class="hint" style="margin:0;text-align:center">📐 Tamanho do tabuleiro</p>' +
     '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">' +
     [8, 9, 10].map(n => '<button class="mini-btn qa-size" data-size="' + n + '" style="padding:10px 0">' + n + "×" + n + "</button>").join("") +
     '<button class="mini-btn qa-size" data-size="rush" style="padding:10px 0">🏁 RUSH</button></div>' +
     '<p class="hint" style="margin:0;text-align:center">🧱 Barreiras por jogador</p>' +
     '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">' +
     [5, 10, 15, 20].map(n => '<button class="mini-btn qa-walls" data-walls="' + n + '" style="padding:10px 0">' + n + "</button>").join("") + "</div>" +
     '<input id="qaWallsCustom" class="input" type="number" min="1" max="20" placeholder="✏️ Ou digite o número de barreiras">' +
     '<p id="qaWallWarn" class="hint" style="margin:0;text-align:center;color:#63B8FF"></p></div>');
  const warn = () => {
    const w = $("qaWallWarn");
    if (!w) return;
    w.textContent = size === "rush"
      ? "🏁 RUSH usa a pista de corrida (14×9 · 14 barreiras fixas)"
      : "📐 Tabuleiro " + size + "×" + size + " · máximo permitido: " + MAXW[size] + " barreiras por jogador";
  };
  const mark = () => {
    document.querySelectorAll(".qa-size").forEach(b => { b.style.background = (b.dataset.size == size) ? "#246BCE" : ""; b.style.color = (b.dataset.size == size) ? "#fff" : ""; });
    document.querySelectorAll(".qa-walls").forEach(b => { b.style.background = (+b.dataset.walls === walls) ? "#246BCE" : ""; b.style.color = (+b.dataset.walls === walls) ? "#fff" : ""; });
    const inp = $("qaWallsCustom"); if (inp) inp.value = walls;
  };
  document.querySelectorAll(".qa-size").forEach(b => b.onclick = () => {
    size = b.dataset.size === "rush" ? "rush" : +b.dataset.size;
    if (size !== "rush") walls = Math.min(walls, MAXW[size]);
    mark(); warn();
  });
  document.querySelectorAll(".qa-walls").forEach(b => b.onclick = () => {
    if (size === "rush"){ toast("🏁 RUSH tem barreiras fixas!"); return; }
    walls = Math.min(+b.dataset.walls, MAXW[size]);
    mark(); warn();
  });
  const inp = $("qaWallsCustom");
  if (inp) inp.oninput = () => {
    if (size === "rush") return;
    const v = parseInt(inp.value, 10);
    if (!v || v < 1) return;
    if (v > MAXW[size]){ walls = MAXW[size]; toast("⚠️ Pra esse tabuleiro o máximo são " + MAXW[size] + " barreiras!"); }
    else walls = v;
    mark(); warn();
  };
  mark(); warn();
}

async function refreshRanked2(){
  const card = $("rankedCard"), list = $("rankedList");
  if (card) card.innerHTML = '<p class="hint">carregando…</p>';
  if (list) list.innerHTML = '<p class="hint">carregando…</p>';
  const [meR, board, hist] = await Promise.all([
    getMyRanked().catch(() => null), getRankedBoard().catch(() => null), getRankedHistory().catch(() => null)
  ]);
  const rp = meR?.rp ?? 0;
  const t = rankOf(rp), nx = nextRank(rp);
  const wins = meR?.wins ?? 0, losses = meR?.losses ?? 0, games = wins + losses;
  const wr = games ? Math.round((wins / games) * 100) : 0;
  const pct = nx ? Math.max(0, Math.min(100, ((rp - t.min) / (nx.min - t.min)) * 100)) : 100;
  const meId = getSession()?.user?.id;
  const pos = (board || []).findIndex((r) => r.user_id === meId) + 1;
  const placing = (meR?.placement ?? 0) < 5;
  if (card) card.innerHTML =
    '<div style="background:var(--card,#0C1322);border:1px solid var(--line,#16233C);border-radius:16px;padding:18px;text-align:center">' +
    '<div>' + tierIconHtml(t, 72) + '</div>' +
    '<div style="font-size:20px;font-weight:800;margin:4px 0">' + t.name + '</div>' +
    '<div style="font-size:13px;color:#63B8FF;font-weight:700">' + rp.toLocaleString("pt-BR") + ' RP' +
      (t.name === "Cósmico" && pos > 0 ? ' · 🌌 TOP #' + pos : '') + '</div>' +
    '<div style="height:8px;background:rgba(255,255,255,.1);border-radius:5px;margin:12px 0 4px;overflow:hidden"><i style="display:block;height:100%;width:' + pct + '%;background:linear-gradient(90deg,#246BCE,#63B8FF);border-radius:5px"></i></div>' +
    '<div style="font-size:10px;color:#7E93B4">' + (nx ? "Faltam " + (nx.min - rp).toLocaleString("pt-BR") + " RP pra " + nx.icon + " " + nx.name : "🌌 Patente máxima — dispute o TOP 1!") + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px;font-size:11px;color:#7E93B4">' +
    '<span>✅ ' + wins + ' V · ❌ ' + losses + ' D</span><span>🎯 ' + wr + '% vitória</span>' +
    '<span>🔥 seq. ' + (meR?.streak ?? 0) + ' (rec. ' + (meR?.best_streak ?? 0) + ')</span><span>📈 maior RP ' + (meR?.best_rp ?? 0).toLocaleString("pt-BR") + '</span>' +
    '<span>🧱 méd. ' + (meR?.eff_games ? (meR.walls_sum / meR.eff_games).toFixed(1) : "0") + ' barreiras</span><span>🏅 posição #' + (pos > 0 ? pos : "—") + '</span>' +
    '</div>' +
    (placing ? '<p style="margin:10px 0 0;font-size:12px;color:#F5C033;font-weight:700">🎯 Colocação: ' + (meR?.placement ?? 0) + '/5</p>' : '') +
    '</div>';
  const active = (r) => (Date.now() - new Date(r.last_active).getTime()) < 30 * 864e5;
  const top1 = (board || []).find(active);
  let html = "";
  if (top1) html += '<div style="background:linear-gradient(135deg,#3b2b00,#1a1200);border:1px solid #F5C033;border-radius:14px;padding:12px;margin-bottom:10px;text-align:center">' +
    '<div style="font-size:11px;color:#F5C033;font-weight:800">👑 TOP 1 GLOBAL</div>' +
    '<div style="font-size:16px;font-weight:800;margin:2px 0">' + escapeHtml(top1.profiles?.username || "Jogador") + '</div>' +
    '<div style="font-size:12px;color:#63B8FF">' + tierIconHtml(rankOf(top1.rp), 20) + " " + rankOf(top1.rp).name + " · " + top1.rp.toLocaleString("pt-BR") + ' RP</div></div>';
  html += (board || []).slice(0, 10).map((r, i) => {
    const tk = rankOf(r.rp);
    return '<li style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--line,#16233C);border-radius:12px;margin-bottom:6px;' + (r.user_id === meId ? "background:rgba(36,107,206,.15);" : "") + '">' +
      '<span style="width:26px;font-weight:800">' + (i + 1) + '</span>' +
      '<img src="' + (r.profiles?.avatar_url || "img/logo.png") + '" onerror="this.onerror=null;this.src=&quot;img/logo.png&quot;" alt="" style="width:34px;height:34px;border-radius:50%;object-fit:cover;background:var(--card,#0C1322);border:1px solid var(--line,#16233C);flex-shrink:0">' +
      '<span style="flex:1;font-weight:700">' + tierIconHtml(tk, 20) + " " + escapeHtml(r.profiles?.username || "Jogador") + (active(r) ? "" : " 💤") + '</span>' +
      '<span style="color:#63B8FF;font-weight:700">' + r.rp.toLocaleString("pt-BR") + '</span></li>';
  }).join("");
  if (!board?.length) html = '<p class="hint">Nenhuma partida ranqueada ainda — seja o primeiro TOP 1! 👑</p>' + html;
  if (hist?.length){
    html += '<h3 style="text-align:center;margin:14px 0 8px">📜 Últimas partidas</h3>';
    html += hist.map((h) => '<li style="display:flex;justify-content:space-between;padding:6px 8px;border:1px solid var(--line,#16233C);border-radius:10px;margin-bottom:4px;font-size:12px">' +
      '<span>' + (h.won ? "✅" : "❌") + (h.abandoned ? " 🏳️" : "") + '</span>' +
      '<span style="color:#7E93B4">' + new Date(h.created_at).toLocaleDateString("pt-BR") + '</span>' +
      '<span style="font-weight:700;color:' + (h.rp_after >= h.rp_before ? "#4ADE80" : "#F87171") + '">' + (h.rp_after - h.rp_before >= 0 ? "+" : "") + (h.rp_after - h.rp_before) + ' RP</span></li>').join("");
  }
  if (list) list.innerHTML = html;
}

function showCustomNews(){
  localStorage.setItem("qa_news_custom", "1");
  setTimeout(() => openModal("🎛️ Sala Personalizada turbinada!", [
    { label: "🎛️ Criar sala agora", onClick: () => openCustomRoom() },
    { label: "Depois", onClick: null }
  ], '<div style="text-align:center;padding:6px 0;display:flex;flex-direction:column;gap:8px">' +
     '<div style="font-size:40px">📐🏁</div>' +
     '<p style="margin:0"><b>Tabuleiros 8×8 · 9×9 · 10×10 · RUSH!</b></p>' +
     '<p style="margin:0">Escolha quantas <b>barreiras</b> cada jogador usa (5/10/15/20 ou digite o número) — com aviso do limite por tamanho!</p>' +
     '<p style="margin:0;color:#7E93B4;font-size:12px">Quem entra com o código recebe as mesmas configurações. Acesse em 🎮 Modos Alternativos → 🏠 Criar Sala.</p></div>'), 650);
}
function maybeShowNews(){
  if (!localStorage.getItem("qa_news_ranked")){
    localStorage.setItem("qa_news_ranked", "1");
    openModal("🏆 RANQUEADA CHEGOU!", [
      { label: "⚔️ Conhecer a Ranqueada", onClick: () => { showScreen("ranked"); setTimeout(() => { if (!localStorage.getItem("qa_news_custom")) showCustomNews(); }, 700); } },
      { label: "Depois", onClick: () => { if (!localStorage.getItem("qa_news_custom")) showCustomNews(); } }
    ], '<div style="text-align:center;padding:6px 0;display:flex;flex-direction:column;gap:8px">' +
       '<div style="display:flex;justify-content:center;gap:6px;flex-wrap:wrap">' + ["bronze","prata","ouro","platina","esmeralda","mestre","lendario","cosmico"].map((f) => '<img src="img/ranks/' + f + '.png" alt="" style="width:36px;height:36px;object-fit:contain">').join("") + '</div>' +
       '<p style="margin:0"><b>8 patentes</b> — do Bronze ao Cósmico!</p>' +
       '<p style="margin:0">Ganhe <b>RP</b> por vitória, matchmaking por <b>MMR</b>, partidas de <b>colocação</b> e leaderboard com <b>TOP 1</b>!</p>' +
       '<p style="margin:0;color:#7E93B4;font-size:12px">Vitória vale +25 RP (até +40 com bônus) · barreiras estratégicas dão bônus de eficiência!</p></div>');
    return;
  }
  if (!localStorage.getItem("qa_news_custom")) showCustomNews();
}

function tierIconHtml(t, size){
  const file = { Bronze: "bronze", Prata: "prata", Ouro: "ouro", Platina: "platina",
    Esmeralda: "esmeralda", Mestre: "mestre", "Lendário": "lendario", "Cósmico": "cosmico" }[t.name] || "bronze";
  return '<img src="img/ranks/' + file + '.png" alt="' + t.name + '" style="width:' + size + 'px;height:' + size +
    'px;object-fit:contain;vertical-align:middle;display:inline-block" onerror="this.outerHTML=\'' + t.icon + '\'">';
}

async function cleanupPendingRanked(){
  try {
    for (let i = 0; i < 6; i++){
      const pend = await listPendingRanked();
      if (!pend.length) return;
      for (const m of pend.slice(0, 5)) await autoWinRanked(m.id);
      await new Promise((r) => setTimeout(r, 20000));
    }
  } catch (_){}
}

function clipMetaHtml(meta){
  const sk = (id) => SKIN_CATALOG.find((i) => i.id === id)?.name || "Clássica";
  const card = (name, skinId, color) => '<div style="flex:1;display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap">' +
    '<span style="width:18px;height:18px;border-radius:50%;background:' + pieceBgFor(skinId, color, true) + ';display:inline-block;border:1px solid #0006"></span>' +
    '<span style="font-weight:700">' + escapeHtml(name) + '</span>' +
    '<span style="color:#7E93B4;font-size:11px">🎨 ' + sk(skinId) + '</span></div>';
  return '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:6px;flex-wrap:wrap">' +
    card(meta.nameRed || "Vermelho", meta.skinRed || "p-classic", "red") +
    card(meta.nameBlue || "Azul", meta.skinBlue || "p-classic", "blue") + '</div>' +
    '<p style="text-align:center;margin:0 0 8px;font-size:12px;color:#7E93B4">' + (meta.won ? "✅ Vitória" : "❌ Derrota") + " · " + new Date(meta.date).toLocaleString("pt-BR") + '</p>';
}
function downloadClip(c){
  const blob = new Blob([JSON.stringify(c)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "clip-rage-" + c.id + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  toast("💾 Clipe salvo no aparelho!");
}
function openClip(c){ openReplay(c.events, c); }
function refreshClips(){
  const list = $("clipsList");
  if (!list) return;
  const arr = getClips();
  if (!arr.length){ list.innerHTML = '<p class="hint">Sem clipes ainda — termine uma partida pra gravar o primeiro! 🎬</p>'; return; }
  list.innerHTML = "";
  arr.forEach((c) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:8px;padding:10px;border:1px solid var(--line,#16233C);border-radius:12px;margin-bottom:8px;background:var(--card,#0C1322)";
    row.innerHTML = '<span style="font-size:18px">' + (c.won ? "✅" : "❌") + '</span>' +
      '<span style="flex:1;font-size:12px;font-weight:700">vs ' + escapeHtml(c.oppName || "Rival") + '<br><span style="color:#7E93B4;font-weight:400">' + new Date(c.date).toLocaleString("pt-BR") + '</span></span>';
    const bW = document.createElement("button"); bW.textContent = "▶"; bW.className = "mini-btn";
    bW.onclick = () => openClip(c);
    const bS = document.createElement("button"); bS.textContent = "💾"; bS.className = "mini-btn";
    bS.onclick = () => downloadClip(c);
    const bD = document.createElement("button"); bD.textContent = "🗑️"; bD.className = "mini-btn";
    bD.onclick = () => { deleteClip(c.id); refreshClips(); toast("🗑️ Clipe excluído."); };
    row.append(bW, bS, bD);
    list.appendChild(row);
  });
}
(function buildClipsScreen(){
  if ($("screenClips")) return;
  const sec = document.createElement("section");
  sec.id = "screenClips"; sec.className = "screen"; sec.dataset.screen = "clips";
  sec.innerHTML = '<div style="max-width:520px;margin:0 auto;padding:16px">' +
    '<h2 style="text-align:center;margin:8px 0 12px">📼 Meus Clipes</h2>' +
    '<div id="clipsList"></div>' +
    '<button id="btnClipsBack" class="menu-btn" style="width:100%;margin-top:10px">⬅️ Voltar</button></div>';
  document.body.appendChild(sec);
  setTimeout(() => { const b = $("btnClipsBack"); if (b) b.onclick = () => showScreen("home"); }, 0);
  const cm = document.createElement("div");
  cm.id = "clipMeta";
  const rb = $("replayBoard");
  if (rb) rb.parentNode.insertBefore(cm, rb);
  const sb = $("sidebar");
  if (sb){
    const item = document.createElement("button");
    item.textContent = "📼 Meus Clipes";
    item.style.cssText = "width:100%;text-align:left;padding:12px;border:none;background:transparent;color:var(--text,#E9F2FF);font-weight:700;cursor:pointer;font-size:14px";
    item.onclick = () => { sb.classList.remove("open"); const bd = $("sidebarBackdrop"); if (bd) bd.classList.add("hidden"); showScreen("clips"); };
    sb.appendChild(item);
  }
})();

let VF = null, vfTimers = [];
function buildVictory(){
  if (VF) return VF;
  VF = document.createElement("div");
  VF.id = "victoryFx"; VF.className = "hidden";
  VF.innerHTML = '<div class="vf-bg"></div><div class="vf-ring r1"></div><div class="vf-ring r2"></div><div class="vf-ring r3"></div>' +
    '<div class="vf-emoji" id="vfEmoji">🏆</div><h1 class="vf-title" id="vfTitle"></h1>' +
    '<p class="vf-sub" id="vfSub"></p><div class="vf-actions" id="vfActions"></div>';
  document.body.appendChild(VF);
  return VF;
}
function hideVictory(){
  if (!VF) return;
  VF.classList.add("hidden");
  vfTimers.forEach(clearInterval); vfTimers = [];
  VF.querySelectorAll(".vf-spark,.vf-float").forEach((n) => n.remove());
}
function showVictory(w, humanWon, res){
  const fx = buildVictory();
  vfTimers.forEach(clearInterval); vfTimers = [];
  const c1 = humanWon ? (w === "red" ? "#e0453a" : "#2f7fd6") : "#64748b";
  const c2 = humanWon ? (w === "red" ? "#7f1d1d" : "#1e3a8a") : "#1e293b";
  fx.style.setProperty("--vfc1", c1);
  fx.style.setProperty("--vfc2", c2);
  $("vfEmoji").textContent = humanWon ? "🏆" : "😞";
  const txt = humanWon ? "VITÓRIA!" : "DERROTA";
  $("vfTitle").innerHTML = [...txt].map((ch, i) => '<span style="animation-delay:' + (0.15 + i * 0.07) + 's,' + (0.9 + i * 0.07) + 's">' + ch + '</span>').join("");
  $("vfSub").textContent = "+" + res.xp + " XP" + (res.eloDelta ? " · " + (res.eloDelta > 0 ? "+" : "") + res.eloDelta + " Elo" : "");
  const act = $("vfActions"); act.innerHTML = "";
  ["btnRematch", "btnReplayWatch", "btnExitToHome"].forEach((id, i) => {
    const b = $(id); if (b){ b.style.animationDelay = (1.1 + i * 0.15) + "s"; act.appendChild(b); }
  });
  fx.classList.remove("hidden");
  if (document.documentElement.dataset.animations !== "off"){
    vfTimers.push(setInterval(() => {
      const x = 10 + Math.random() * 80, y = 10 + Math.random() * 60;
      const col = [c1, "#ffd166", "#ffffff"][Math.floor(Math.random() * 3)];
      for (let i = 0; i < 14; i++){
        const sp = document.createElement("span"); sp.className = "vf-spark";
        const a = (Math.PI * 2 * i) / 14, d = 40 + Math.random() * 70;
        sp.style.left = x + "%"; sp.style.top = y + "%"; sp.style.background = col;
        sp.style.setProperty("--tx", Math.cos(a) * d + "px");
        sp.style.setProperty("--ty", Math.sin(a) * d + "px");
        fx.appendChild(sp); setTimeout(() => sp.remove(), 950);
      }
    }, 650));
    vfTimers.push(setInterval(() => {
      const f = document.createElement("span"); f.className = "vf-float";
      f.textContent = ["🎉", "⭐", "🏆", "⚽", "🔥"][Math.floor(Math.random() * 5)];
      f.style.left = Math.random() * 95 + "%";
      f.style.animationDuration = (3 + Math.random() * 2) + "s";
      fx.appendChild(f); setTimeout(() => f.remove(), 5200);
    }, 420));
  }
}
