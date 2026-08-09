import { SIZE, G, T } from "../core/constants.js";
import { legalMoves } from "../core/rules.js";

const uPct = (u) => (u / T) * 100;
const cellGeom = (r, c, flipped) => {
  const vr = flipped ? (SIZE - 1 - r) : r;
  return { left: uPct(c * (1 + G)), top: uPct(vr * (1 + G)), size: uPct(1) };
};
function wallRect(type, r, c, flipped){
  const vr = flipped ? (SIZE - 2 - r) : r;
  if (type === "h")
    return { left: uPct(c * (1 + G)), top: uPct(vr * (1 + G) + 1), width: uPct(2 + G), height: uPct(G) };
  return { left: uPct(c * (1 + G) + 1), top: uPct(vr * (1 + G)), width: uPct(G), height: uPct(2 + G) };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lat = (v) => Math.round((v - 1 - G / 2) / (1 + G));

export function createBoard(boardEl, controller = null, flipped = false){
  boardEl.innerHTML = "";
  const cellEls = [];

  for (let r = 0; r < SIZE; r++){
    cellEls[r] = [];
    for (let c = 0; c < SIZE; c++){
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = r; cell.dataset.c = c;
      const g = cellGeom(r, c, flipped);
      Object.assign(cell.style, { left: g.left+"%", top: g.top+"%", width: g.size+"%", height: g.size+"%" });
      boardEl.appendChild(cell);
      cellEls[r][c] = cell;
    }
  }

  const guideLayer = document.createElement("div");
  guideLayer.style.cssText = "position:absolute;inset:0;z-index:2;pointer-events:none";
  boardEl.appendChild(guideLayer);
  for (let i = 0; i < SIZE - 1; i++){
    const hl = document.createElement("div");
    hl.className = "guide h";
    hl.style.cssText = `left:0;width:100%;top:${uPct(i*(1+G)+1)}%;height:${uPct(G)}%`;
    guideLayer.appendChild(hl);
    const vl = document.createElement("div");
    vl.className = "guide v";
    vl.style.cssText = `top:0;height:100%;left:${uPct(i*(1+G)+1)}%;width:${uPct(G)}%`;
    guideLayer.appendChild(vl);
  }

  const wallLayer = document.createElement("div");
  wallLayer.style.cssText = "position:absolute;inset:0;z-index:3;pointer-events:none";
  boardEl.appendChild(wallLayer);
  const ghost = document.createElement("div");
  ghost.id = "ghost";
  boardEl.appendChild(ghost);
  const pieces = {};
  for (const id of ["red", "blue"]){
    const el = document.createElement("div");
    el.className = "piece " + id;
    el.innerHTML = '<div class="core"></div>';
    boardEl.appendChild(el);
    pieces[id] = el;
  }

  let mode = "move";
  let dragging = false, activePointer = null;
  let currentSlot = null, lastKey = null;
  let drawnWalls = 0;
  let fitCleanup = null;
  let pieceColors = { red: null, blue: null };

  /* ---------- cores por jogador (bolinha + barreiras) ---------- */
  function colorFor(p){ return pieceColors[p] || null; }
  function paintPiece(id){
    const col = colorFor(id);
    const core = pieces[id].querySelector(".core");
    if (core && col) core.style.background = col;
  }
  function paintWalls(){
    for (const el of wallLayer.children){
      const p = el.classList.contains("by-red") ? "red" : "blue";
      const col = colorFor(p);
      if (col) el.style.background = col;
    }
  }
  function setPieceColors(colors){
    Object.assign(pieceColors, colors);
    paintPiece("red"); paintPiece("blue"); paintWalls();
  }

  /* ---------- ghost ---------- */
  function slotFromEvent(e){
    const rect = boardEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * T;
    const y = ((e.clientY - rect.top)  / rect.height) * T;
    let r = lat(y), c = lat(x);
    if (flipped) r = SIZE - 2 - r;
    const inBoard = r >= 0 && r <= SIZE - 2 && c >= 0 && c <= SIZE - 2;
    return { o: mode, r: clamp(r, 0, SIZE - 2), c: clamp(c, 0, SIZE - 2), inBoard };
  }
  function updateGhost(e){
    if (!controller || mode === "move"){ hideGhost(); return; }
    const s = slotFromEvent(e);
    currentSlot = s;
    const key = s.o + s.r + s.c + s.inBoard;
    if (key !== lastKey){
      lastKey = key;
      const ok = s.inBoard && controller.canPlaceWall(s.o, s.r, s.c);
      ghost.classList.toggle("invalid", !ok);
    }
    const rc = wallRect(s.o, s.r, s.c, flipped);
    Object.assign(ghost.style, { left: rc.left+"%", top: rc.top+"%", width: rc.width+"%", height: rc.height+"%" });
    ghost.classList.add("show");
  }
  function hideGhost(){
    ghost.classList.remove("show", "shake");
    currentSlot = null; lastKey = null;
  }
  function ghostFail(){
    ghost.classList.remove("shake"); void ghost.offsetWidth;
    ghost.classList.add("shake");
    setTimeout(() => ghost.classList.remove("shake"), 330);
  }

  /* ---------- ponteiros ---------- */
  function onDown(e){
    if (!controller) return;
    e.preventDefault();
    if (mode === "move"){
      const cell = e.target.closest(".cell");
      if (cell) controller.handleMove(+cell.dataset.r, +cell.dataset.c);
      return;
    }
    if (activePointer !== null) return;
    activePointer = e.pointerId;
    dragging = true;
    try { boardEl.setPointerCapture(e.pointerId); } catch (_){}
    updateGhost(e);
  }
  function onMove(e){
    if (!controller || mode === "move") return;
    if (dragging || e.pointerType === "mouse") updateGhost(e);
  }
  function onUp(e){
    if (!controller) return;
    if (e.pointerId !== activePointer && e.pointerType !== "mouse") return;
    if (mode !== "move" && (dragging || e.pointerType === "mouse")){
      updateGhost(e);
      const s = currentSlot;
      if (s){
        const ok = controller.handleWall(s.o, s.r, s.c);
        if (!ok) ghostFail();
      }
    }
    dragging = false; activePointer = null;
    if (e.pointerType !== "mouse") hideGhost();
  }
  function onLeave(e){ if (e.pointerType === "mouse" && !dragging) hideGhost(); }
  function onCancel(){ dragging = false; activePointer = null; hideGhost(); }
  function onCtx(e){ e.preventDefault(); }

  boardEl.addEventListener("pointerdown", onDown);
  boardEl.addEventListener("pointermove", onMove);
  boardEl.addEventListener("pointerup", onUp);
  boardEl.addEventListener("pointerleave", onLeave);
  boardEl.addEventListener("pointercancel", onCancel);
  boardEl.addEventListener("contextmenu", onCtx);

  /* ---------- sincronização ---------- */
  function sync(state){
    boardEl.classList.toggle("turn-red",  state.turn === "red");
    boardEl.classList.toggle("turn-blue", state.turn === "blue");
    boardEl.classList.toggle("mode-wall", mode !== "move");
    for (const id of ["red", "blue"]){
      const p = state.players[id], g = cellGeom(p.r, p.c, flipped);
      Object.assign(pieces[id].style, { left: g.left+"%", top: g.top+"%", width: g.size+"%", height: g.size+"%" });
      pieces[id].classList.toggle("active", state.turn === id && !state.over);
      paintPiece(id);
    }
    const gcol = colorFor(state.turn);
    if (gcol) ghost.style.background = gcol;
    const wallEvents = state.replay.filter((ev) => ev.t === "w");
    while (drawnWalls < wallEvents.length){
      const w = wallEvents[drawnWalls++];
      const el = document.createElement("div");
      el.className = "wall by-" + w.p;
      const wcol = colorFor(w.p);
      if (wcol) el.style.background = wcol;
      const rc = wallRect(w.o, w.r, w.c, flipped);
      Object.assign(el.style, { left: rc.left+"%", top: rc.top+"%", width: rc.width+"%", height: rc.height+"%" });
      wallLayer.appendChild(el);
    }
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        cellEls[r][c].classList.remove("target", "last");
    if (!state.over && mode === "move" && controller){
      for (const m of legalMoves(state, state.turn))
        cellEls[m.r][m.c].classList.add("target");
    }
    const lastM = [...state.replay].reverse().find((ev) => ev.t === "m");
    if (lastM) cellEls[lastM.r][lastM.c].classList.add("last");
  }

  function setMode(m){
    mode = m;
    boardEl.classList.toggle("mode-wall", m !== "move");
    boardEl.classList.toggle("mode-h", m === "h");
    boardEl.classList.toggle("mode-v", m === "v");
    hideGhost();
  }

  function deny(r, c){
    const el = cellEls[r]?.[c];
    if (!el) return;
    el.classList.remove("deny"); void el.offsetWidth;
    el.classList.add("deny");
    setTimeout(() => el.classList.remove("deny"), 450);
  }

  function destroy(){
    fitCleanup?.();
    boardEl.removeEventListener("pointerdown", onDown);
    boardEl.removeEventListener("pointermove", onMove);
    boardEl.removeEventListener("pointerup", onUp);
    boardEl.removeEventListener("pointerleave", onLeave);
    boardEl.removeEventListener("pointercancel", onCancel);
    boardEl.removeEventListener("contextmenu", onCtx);
    boardEl.innerHTML = "";
  }

  return { sync, setMode, deny, ghostFail, destroy, hideGhost, setPieceColors,
    fit(stageEl, frameEl){
      const doFit = () => {
        if (!stageEl || !frameEl) return;
        const availW = stageEl.clientWidth  - 24;
        const availH = stageEl.clientHeight - 64;
        const size = Math.max(140, Math.min(availW, availH, 680));
        frameEl.style.width  = size + "px";
        frameEl.style.height = size + "px";
      };
      doFit();
      requestAnimationFrame(doFit);
      setTimeout(doFit, 80);
      window.addEventListener("resize", doFit);
      window.addEventListener("orientationchange", doFit);
      fitCleanup = () => {
        window.removeEventListener("resize", doFit);
        window.removeEventListener("orientationchange", doFit);
      };
    }
  };
}