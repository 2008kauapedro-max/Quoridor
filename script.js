/* ═══════════════════════════════════════════════════════════════════
   THE RAGE — lógica completa em JavaScript puro (versão final)
   ═══════════════════════════════════════════════════════════════════ */
"use strict";

/* ═══════════════ 1. CONSTANTES E GEOMETRIA ═══════════════ */
const SIZE = 9;
const WALLS_PER_PLAYER = 10;
const G = 0.19;
const T = SIZE + (SIZE - 1) * G;

const NAMES = { red: "Vermelho", blue: "Azul" };
const GOAL  = { red: 0, blue: SIZE - 1 };

const uPct  = u => (u / T) * 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function cellGeom(r, c){
  return { left: uPct(c * (1 + G)), top: uPct(r * (1 + G)), size: uPct(1) };
}
function wallRect(type, r, c){
  if (type === "h")
    return { left: uPct(c * (1 + G)), top: uPct(r * (1 + G) + 1), width: uPct(2 + G), height: uPct(G) };
  return { left: uPct(c * (1 + G) + 1), top: uPct(r * (1 + G)), width: uPct(G), height: uPct(2 + G) };
}

/* ═══════════════ 2. ESTADO ═══════════════ */
function grid(rows, cols, v){
  return Array.from({ length: rows }, () => Array(cols).fill(v));
}
function freshState(){
  return {
    players: {
      red : { r: SIZE - 1, c: 4, walls: WALLS_PER_PLAYER },
      blue: { r: 0,        c: 4, walls: WALLS_PER_PLAYER },
    },
    turn: "red",
    mode: "move",
    walls: [],
    hWall: grid(SIZE - 1, SIZE - 1, false),
    vWall: grid(SIZE - 1, SIZE - 1, false),
    hSeg : grid(SIZE - 1, SIZE, false),
    vSeg : grid(SIZE, SIZE - 1, false),
    lastMove: null,
    over: false, winner: null,
    busy: false,
  };
}
let state = null;

/* DOM */
let boardEl, wallLayer, ghostEl;
let cellEls = [], pieceEls = {};
let turnPillEl, turnTextEl, currentBadgeEl, currentNameEl,
    wallsRedEl, wallsBlueEl, chipRedEl, chipBlueEl,
    btnMove, btnWallH, btnWallV, resetBtn, soundBtn,
    overlayEl, overlayCardEl, winTextEl, winEmojiEl, playAgainBtn,
    toastEl, confettiEl, mainEl, stageEl;

let dragging = false, activePointer = null, currentSlot = null, lastSlotKey = null;

/* ═══════════════ 3. CRIAÇÃO E RENDERIZAÇÃO ═══════════════ */
function createBoard(){
  boardEl.innerHTML = "";
  cellEls = [];
  for (let r = 0; r < SIZE; r++){
    cellEls[r] = [];
    for (let c = 0; c < SIZE; c++){
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = r; cell.dataset.c = c;
      const g = cellGeom(r, c);
      Object.assign(cell.style, { left: g.left + "%", top: g.top + "%", width: g.size + "%", height: g.size + "%" });
      boardEl.appendChild(cell);
      cellEls[r][c] = cell;
    }
  }
  wallLayer = document.createElement("div");
  wallLayer.id = "wallLayer";
  boardEl.appendChild(wallLayer);

  ghostEl = document.createElement("div");
  ghostEl.id = "ghost";
  boardEl.appendChild(ghostEl);

  pieceEls = {};
  for (const id of ["red", "blue"]){
    const el = document.createElement("div");
    el.className = "piece " + id;
    el.innerHTML = '<div class="core"></div>';
    boardEl.appendChild(el);
    pieceEls[id] = el;
  }
}

function renderBoard(){
  positionPiece("red");
  positionPiece("blue");
  wallLayer.innerHTML = "";
  state.walls.forEach(w => wallLayer.appendChild(makeWallEl(w, false)));
  updateTargets();
  updateHUD();
}

function positionPiece(id){
  const p = state.players[id], g = cellGeom(p.r, p.c), el = pieceEls[id];
  el.style.left = g.left + "%"; el.style.top = g.top + "%";
  el.style.width = g.size + "%"; el.style.height = g.size + "%";
}

function makeWallEl(w, animate){
  const el = document.createElement("div");
  el.className = "wall " + (w.type === "h" ? "wh" : "wv") + " by-" + w.owner + (animate ? "" : " no-anim");
  const rc = wallRect(w.type, w.r, w.c);
  Object.assign(el.style, { left: rc.left + "%", top: rc.top + "%", width: rc.width + "%", height: rc.height + "%" });
  return el;
}

function updateTargets(){
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      cellEls[r][c].classList.remove("target", "last");

  if (!state.over && state.mode === "move"){
    const p = state.players[state.turn];
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const nr = p.r + dr, nc = p.c + dc;
      if (nr >= 0 && nc >= 0 && nr < SIZE && nc < SIZE && canMoveTo(p.r, p.c, nr, nc))
        cellEls[nr][nc].classList.add("target");
    }
  }
  if (state.lastMove)
    cellEls[state.lastMove.r][state.lastMove.c].classList.add("last");
}

function updateHUD(){
  const cur = state.turn;
  turnTextEl.textContent = "Vez do " + NAMES[cur];
  turnPillEl.classList.toggle("is-red",  cur === "red");
  turnPillEl.classList.toggle("is-blue", cur === "blue");

  currentNameEl.textContent = NAMES[cur];
  currentBadgeEl.classList.toggle("is-red",  cur === "red");
  currentBadgeEl.classList.toggle("is-blue", cur === "blue");

  wallsRedEl.textContent  = state.players.red.walls;
  wallsBlueEl.textContent = state.players.blue.walls;
  chipRedEl.classList.toggle("is-turn",  cur === "red");
  chipBlueEl.classList.toggle("is-turn", cur === "blue");

  btnMove.classList.toggle("active",  state.mode === "move");
  btnWallH.classList.toggle("active", state.mode === "h");
  btnWallV.classList.toggle("active", state.mode === "v");
  const semBarreira = state.players[cur].walls <= 0;
  btnWallH.disabled = semBarreira;
  btnWallV.disabled = semBarreira;

  boardEl.classList.toggle("turn-red",  cur === "red");
  boardEl.classList.toggle("turn-blue", cur === "blue");
  boardEl.classList.toggle("mode-wall", state.mode !== "move");

  pieceEls.red.classList.toggle("active",  cur === "red"  && !state.over);
  pieceEls.blue.classList.toggle("active", cur === "blue" && !state.over);
}

/* ═══════════════ 4. MOVIMENTAÇÃO ═══════════════ */
function canMoveTo(r, c, nr, nc){
  if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE) return false;
  const dr = nr - r, dc = nc - c;
  if (Math.abs(dr) + Math.abs(dc) !== 1) return false;
  if (dr === -1 && state.hSeg[r - 1][c]) return false;
  if (dr ===  1 && state.hSeg[r][c])     return false;
  if (dc === -1 && state.vSeg[r][c - 1]) return false;
  if (dc ===  1 && state.vSeg[r][c])     return false;
  const foe = state.turn === "red" ? "blue" : "red";
  if (state.players[foe].r === nr && state.players[foe].c === nc) return false;
  return true;
}

function movePlayer(r, c){
  if (state.over || state.busy) return;
  const p = state.players[state.turn];
  if (!canMoveTo(p.r, p.c, r, c)){
    denyCell(r, c);
    SFX.deny();
    return;
  }
  state.busy = true;
  p.r = r; p.c = c;
  state.lastMove = { r, c };
  positionPiece(state.turn);
  SFX.move();

  if (checkVictory()){
    updateHUD(); updateTargets();
    setTimeout(showWin, 420);
    return;
  }
  switchTurn();
  setTimeout(() => { state.busy = false; }, 300);
}

function denyCell(r, c){
  const el = cellEls[r][c];
  el.classList.remove("deny"); void el.offsetWidth;
  el.classList.add("deny");
  setTimeout(() => el.classList.remove("deny"), 450);
}

/* ═══════════════ 5. BARREIRAS ═══════════════ */
function setWallSegments(type, r, c, on){
  if (type === "h"){ state.hSeg[r][c] = on; state.hSeg[r][c + 1] = on; }
  else             { state.vSeg[r][c] = on; state.vSeg[r + 1][c] = on; }
}

function validateWall(type, r, c){
  if (r < 0 || c < 0 || r > SIZE - 2 || c > SIZE - 2)
    return { ok: false, reason: "fora" };

  if (type === "h"){
    const overlap = state.hWall[r][c] ||
                    (c > 0        && state.hWall[r][c - 1]) ||
                    (c < SIZE - 2 && state.hWall[r][c + 1]);
    const cross   = state.vWall[r][c];
    if (overlap || cross) return { ok: false, reason: "sobreposicao" };
  } else {
    const overlap = state.vWall[r][c] ||
                    (r > 0        && state.vWall[r - 1][c]) ||
                    (r < SIZE - 2 && state.vWall[r + 1][c]);
    const cross   = state.hWall[r][c];
    if (overlap || cross) return { ok: false, reason: "sobreposicao" };
  }

  setWallSegments(type, r, c, true);
  const redOk  = findPathBFS(state.players.red.r,  state.players.red.c,  GOAL.red);
  const blueOk = findPathBFS(state.players.blue.r, state.players.blue.c, GOAL.blue);
  setWallSegments(type, r, c, false);

  if (!redOk || !blueOk) return { ok: false, reason: "caminho" };
  return { ok: true };
}

function placeWall(type, r, c){
  const v = validateWall(type, r, c);
  if (!v.ok){
    if (v.reason === "caminho")
      showToast("Você não pode bloquear completamente o caminho.");
    else if (v.reason === "sobreposicao")
      showToast("As barreiras não podem se sobrepor ou se cruzar.");
    else
      showToast("Barreira fora do tabuleiro.");
    ghostFail();
    SFX.deny();
    return false;
  }
  const owner = state.turn;
  if (type === "h") state.hWall[r][c] = true; else state.vWall[r][c] = true;
  setWallSegments(type, r, c, true);
  state.walls.push({ type, r, c, owner });
  state.players[owner].walls--;

  wallLayer.appendChild(makeWallEl({ type, r, c, owner }, true));
  popCount(owner === "red" ? wallsRedEl : wallsBlueEl);
  SFX.wall();
  hideGhost();
  switchTurn();
  return true;
}

/* ═══════════════ 6. BFS ═══════════════ */
function findPathBFS(startR, startC, goalRow){
  const seen = grid(SIZE, SIZE, false);
  const queue = [[startR, startC]];
  seen[startR][startC] = true;
  let head = 0;
  while (head < queue.length){
    const [r, c] = queue[head++];
    if (r === goalRow) return true;
    if (r > 0        && !state.hSeg[r - 1][c] && !seen[r - 1][c]){ seen[r - 1][c] = true; queue.push([r - 1, c]); }
    if (r < SIZE - 1 && !state.hSeg[r][c]     && !seen[r + 1][c]){ seen[r + 1][c] = true; queue.push([r + 1, c]); }
    if (c > 0        && !state.vSeg[r][c - 1] && !seen[r][c - 1]){ seen[r][c - 1] = true; queue.push([r, c - 1]); }
    if (c < SIZE - 1 && !state.vSeg[r][c]     && !seen[r][c + 1]){ seen[r][c + 1] = true; queue.push([r, c + 1]); }
  }
  return false;
}

/* ═══════════════ 7. TURNOS E VITÓRIA ═══════════════ */
function switchTurn(){
  state.turn = state.turn === "red" ? "blue" : "red";
  if (state.players[state.turn].walls <= 0 && state.mode !== "move") state.mode = "move";
  hideGhost();
  updateTargets();
  updateHUD();
}

function checkVictory(){
  if (state.players.red.r  === GOAL.red){  state.over = true; state.winner = "red";  return true; }
  if (state.players.blue.r === GOAL.blue){ state.over = true; state.winner = "blue"; return true; }
  return false;
}

function showWin(){
  if (!state.over) return;
  winTextEl.textContent = NAMES[state.winner] + " venceu!";
  overlayCardEl.classList.toggle("red",  state.winner === "red");
  overlayCardEl.classList.toggle("blue", state.winner === "blue");
  overlayEl.classList.remove("hidden");
  winEmojiEl.classList.remove("bounce"); void winEmojiEl.offsetWidth;
  winEmojiEl.classList.add("bounce");
  launchConfetti(state.winner);
  SFX.win();
}

/* ═══════════════ 8. FANTASMA + PONTEIROS ═══════════════ */
function slotFromEvent(e){
  const rect = boardEl.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width)  * T;
  const y = ((e.clientY - rect.top)  / rect.height) * T;
  let r, c;
  if (state.mode === "h"){
    r = Math.round((y - 1 - G / 2) / (1 + G));
    c = Math.round(x - 1);
  } else {
    r = Math.round(y - 1);
    c = Math.round((x - 1 - G / 2) / (1 + G));
  }
  const inBoard = r >= 0 && r <= SIZE - 2 && c >= 0 && c <= SIZE - 2;
  return { type: state.mode, r: clamp(r, 0, SIZE - 2), c: clamp(c, 0, SIZE - 2), inBoard };
}

function updateGhost(e){
  if (state.over || state.busy || state.mode === "move"){ hideGhost(); return; }
  const s = slotFromEvent(e);
  currentSlot = s;
  const key = s.type + "," + s.r + "," + s.c + "," + s.inBoard;
  if (key !== lastSlotKey){
    lastSlotKey = key;
    const v = s.inBoard ? validateWall(s.type, s.r, s.c) : { ok: false };
    ghostEl.classList.toggle("invalid", !v.ok);
  }
  const rc = wallRect(s.type, s.r, s.c);
  Object.assign(ghostEl.style, { left: rc.left + "%", top: rc.top + "%", width: rc.width + "%", height: rc.height + "%" });
  ghostEl.classList.add("show");
}

function hideGhost(){
  ghostEl.classList.remove("show", "shake");
  currentSlot = null; lastSlotKey = null;
}

function ghostFail(){
  ghostEl.classList.remove("shake"); void ghostEl.offsetWidth;
  ghostEl.classList.add("shake");
  setTimeout(() => ghostEl.classList.remove("shake"), 330);
}

function bindBoardEvents(){
  boardEl.addEventListener("pointerdown", e => {
    e.preventDefault();
    initAudio();
    if (state.over || state.busy) return;
    if (state.mode === "move"){
      const cell = e.target.closest(".cell");
      if (cell) movePlayer(+cell.dataset.r, +cell.dataset.c);
      return;
    }
    if (activePointer !== null) return;
    activePointer = e.pointerId;
    dragging = true;
    try { boardEl.setPointerCapture(e.pointerId); } catch (_) {}
    updateGhost(e);
  });

  boardEl.addEventListener("pointermove", e => {
    if (state.mode === "move") return;
    if (dragging || e.pointerType === "mouse") updateGhost(e);
  });

  boardEl.addEventListener("pointerup", e => {
    if (e.pointerId !== activePointer && e.pointerType !== "mouse") return;
    if (state.mode !== "move" && (dragging || e.pointerType === "mouse")){
      updateGhost(e);
      const s = currentSlot;
      if (s){
        if (!s.inBoard){ showToast("Barreira fora do tabuleiro."); ghostFail(); SFX.deny(); }
        else placeWall(s.type, s.r, s.c);
      }
    }
    dragging = false; activePointer = null;
    if (e.pointerType !== "mouse") hideGhost();
  });

  boardEl.addEventListener("pointerleave", e => {
    if (e.pointerType === "mouse" && !dragging) hideGhost();
  });
  boardEl.addEventListener("pointercancel", () => { dragging = false; activePointer = null; hideGhost(); });
  boardEl.addEventListener("contextmenu", e => e.preventDefault());
}

/* ═══════════════ 9. MODOS, BOTÕES, TECLADO ═══════════════ */
function setMode(mode){
  if (state.over) return;
  if (mode !== "move" && state.players[state.turn].walls <= 0){
    showToast(NAMES[state.turn] + " não tem mais barreiras.");
    mode = "move";
  }
  state.mode = mode;
  SFX.select();
  hideGhost();
  updateTargets();
  updateHUD();
}

function bindUI(){
  btnMove .addEventListener("click", () => { initAudio(); setMode("move"); });
  btnWallH.addEventListener("click", () => { initAudio(); setMode("h"); });
  btnWallV.addEventListener("click", () => { initAudio(); setMode("v"); });
  resetBtn.addEventListener("click", () => { initAudio(); resetGame(); });
  playAgainBtn.addEventListener("click", () => { initAudio(); resetGame(); });

  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? "🔊" : "🔇";
    if (soundOn){ initAudio(); SFX.select(); }
  });

  window.addEventListener("keydown", e => {
    initAudio();
    if (!overlayEl.classList.contains("hidden")){
      if (e.key === "Enter" || e.key === " " || e.key.toLowerCase() === "r") resetGame();
      return;
    }
    const dirs = {
      ArrowUp:[-1,0], ArrowDown:[1,0], ArrowLeft:[0,-1], ArrowRight:[0,1],
      w:[-1,0], W:[-1,0], s:[1,0], S:[1,0], a:[0,-1], A:[0,-1], d:[0,1], D:[0,1]
    };
    if (dirs[e.key]){
      e.preventDefault();
      if (state.mode !== "move") setMode("move");
      const p = state.players[state.turn];
      const nr = p.r + dirs[e.key][0], nc = p.c + dirs[e.key][1];
      if (nr >= 0 && nc >= 0 && nr < SIZE && nc < SIZE) movePlayer(nr, nc);
      else SFX.deny();
      return;
    }
    const k = e.key.toLowerCase();
    if (e.key === "1" || k === "m") setMode("move");
    else if (e.key === "2" || k === "h") setMode("h");
    else if (e.key === "3" || k === "v") setMode("v");
    else if (k === "r") resetGame();
  });
}

/* ═══════════════ 10. REINÍCIO ═══════════════ */
function resetGame(){
  state = freshState();
  dragging = false; activePointer = null; currentSlot = null; lastSlotKey = null;
  overlayEl.classList.add("hidden");
  confettiEl.innerHTML = "";
  createBoard();
  renderBoard();
  fitBoard();
  showToast("Novo jogo! Vez do Vermelho.");
  SFX.select();
}

/* ═══════════════ 11. EFEITOS ═══════════════ */
let audioCtx = null, soundOn = true;

function initAudio(){
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch (_) {}
}
function tone(freq, dur = 0.09, type = "sine", vol = 0.12, when = 0){
  if (!soundOn || !audioCtx) return;
  const t = audioCtx.currentTime + when;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audioCtx.destination);
  o.start(t); o.stop(t + dur + 0.03);
}
const SFX = {
  move  () { tone(560, .08, "triangle", .12); },
  wall  () { tone(190, .12, "square", .08); tone(330, .06, "triangle", .07, .04); },
  deny  () { tone(140, .12, "sawtooth", .06); },
  select() { tone(720, .05, "sine", .06); },
  win   () { [523, 659, 784, 1047].forEach((f, i) => tone(f, .2, "triangle", .12, i * .13)); },
};

let toastTimer = null;
function showToast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
}
function popCount(el){
  el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
}
function launchConfetti(winner){
  const palette = winner === "red"
    ? ["#e0453a", "#ff8a7a", "#ffd166", "#ffffff"]
    : ["#2f7fd6", "#7ec1ff", "#ffd166", "#ffffff"];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 110; i++){
    const s = document.createElement("span");
    s.className = "conf";
    s.style.left = (Math.random() * 100) + "vw";
    s.style.background = palette[i % palette.length];
    s.style.width  = (6 + Math.random() * 7) + "px";
    s.style.height = (8 + Math.random() * 8) + "px";
    s.style.borderRadius = Math.random() < .4 ? "50%" : "2px";
    s.style.setProperty("--dx",  (Math.random() * 160 - 80) + "px");
    s.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
    s.style.animationDuration = (2.4 + Math.random() * 1.8) + "s";
    s.style.animationDelay    = (Math.random() * .7) + "s";
    frag.appendChild(s);
  }
  confettiEl.appendChild(frag);
  setTimeout(() => { confettiEl.innerHTML = ""; }, 5200);
}

/* ═══════════════ 12. TAMANHO RESPONSIVO (anti-overlap) ═══════════════ */
/* Mede o espaço REAL que sobra no <main> e dimensiona o palco do jogo.
   Como <main> é flex:1, clientHeight já desconta header + controles reais. */
function fitBoard(){
  if (!mainEl || !stageEl) return;
  const availW = mainEl.clientWidth  - 24;  // paddings laterais
  const availH = mainEl.clientHeight - 64;  // faixas de meta + folgas
  const size = Math.max(140, Math.min(availW, availH, 680));
  stageEl.style.width = size + "px";
}

/* ═══════════════ 13. INICIALIZAÇÃO ═══════════════ */
function init(){
  boardEl        = document.getElementById("board");
  turnPillEl     = document.getElementById("turnPill");
  turnTextEl     = document.getElementById("turnText");
  currentBadgeEl = document.getElementById("currentBadge");
  currentNameEl  = document.getElementById("currentName");
  wallsRedEl     = document.getElementById("wallsRed");
  wallsBlueEl    = document.getElementById("wallsBlue");
  chipRedEl      = document.getElementById("chipRed");
  chipBlueEl     = document.getElementById("chipBlue");
  btnMove        = document.getElementById("modeMove");
  btnWallH       = document.getElementById("modeWallH");
  btnWallV       = document.getElementById("modeWallV");
  resetBtn       = document.getElementById("resetBtn");
  soundBtn       = document.getElementById("soundBtn");
  overlayEl      = document.getElementById("overlay");
  overlayCardEl  = document.getElementById("overlayCard");
  winTextEl      = document.getElementById("winText");
  winEmojiEl     = document.getElementById("winEmoji");
  playAgainBtn   = document.getElementById("playAgainBtn");
  toastEl        = document.getElementById("toast");
  confettiEl     = document.getElementById("confetti");
  mainEl         = document.querySelector("main");
  stageEl        = document.getElementById("stage");

  bindUI();
  bindBoardEvents();

  state = freshState();
  createBoard();
  renderBoard();
  fitBoard();

  window.addEventListener("resize", fitBoard);
  window.addEventListener("orientationchange", fitBoard);
  window.addEventListener("load", fitBoard);

  showToast("🔴 começa! Toque numa casa marcada para mover.");
}

init();