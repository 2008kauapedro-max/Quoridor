/* =============================================================
   Quoridor Arena — ui/board.js (v7 — corrida sem esticar + skins)
   ============================================================= */
import { SIZE, G } from "../core/constants.js";
import { legalMoves } from "../core/rules.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lat = (v) => Math.round((v - 1 - G / 2) / (1 + G));

export function createBoard(boardEl, controller = null, flipped = false, state = null){
  const rows = state?.rows || SIZE;
  const cols = state?.cols || SIZE;
  const tR = rows + (rows - 1) * G;
  const tC = cols + (cols - 1) * G;
  const px = (u) => (u / tC) * 100;
  const py = (u) => (u / tR) * 100;

  boardEl.innerHTML = "";
  const cellEls = [];
  for (let r = 0; r < rows; r++){
    cellEls[r] = [];
    for (let c = 0; c < cols; c++){
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = r; cell.dataset.c = c;
      const vr = flipped ? (rows - 1 - r) : r;
      Object.assign(cell.style, {
        left: px(c * (1 + G)) + "%", top: py(vr * (1 + G)) + "%",
        width: px(1) + "%", height: py(1) + "%"
      });
      boardEl.appendChild(cell);
      cellEls[r][c] = cell;
    }
  }

  const guideLayer = document.createElement("div");
  guideLayer.style.cssText = "position:absolute;inset:0;z-index:2;pointer-events:none";
  boardEl.appendChild(guideLayer);
  for (let i = 0; i < rows - 1; i++){
    const hl = document.createElement("div");
    hl.className = "guide h";
    hl.style.cssText = `left:0;width:100%;top:${py(i*(1+G)+1)}%;height:${py(G)}%`;
    guideLayer.appendChild(hl);
  }
  for (let i = 0; i < cols - 1; i++){
    const vl = document.createElement("div");
    vl.className = "guide v";
    vl.style.cssText = `top:0;height:100%;left:${px(i*(1+G)+1)}%;width:${px(G)}%`;
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

  /* ═══════════ SKINS (NÃO MEXER) ═══════════ */
  function colorFor(p){ return pieceColors[p] || null; }
  function paintPiece(id){
    const col = colorFor(id);
    const core = pieces[id].querySelector(".core");
    if (core && col) core.style.setProperty("background", col, "important");
  }
  function paintWalls(){
    for (const el of wallLayer.children){
      const p = el.classList.contains("by-red") ? "red" : "blue";
      const col = colorFor(p);
      if (col) el.style.setProperty("background", col, "important");
    }
  }
  function setPieceColors(colors){
    Object.assign(pieceColors, colors);
    paintPiece("red"); paintPiece("blue"); paintWalls();
  }
  /* ═══════════ FIM SKINS ═══════════ */

  function wallRect(type, r, c){
    const vr = flipped ? (rows - 2 - r) : r;
    if (type === "h")
      return { left: px(c*(1+G)), top: py(vr*(1+G)+1), width: px(2+G), height: py(G) };
    return { left: px(c*(1+G)+1), top: py(vr*(1+G)), width: px(G), height: py(2+G) };
  }

  /* ---------- ghost ---------- */
  function slotFromEvent(e){
    const rect = boardEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * tC;
    const y = ((e.clientY - rect.top)  / rect.height) * tR;
    let r = lat(y), c = lat(x);
    if (flipped) r = rows - 2 - r;
    const inBoard = r >= 0 && r <= rows - 2 && c >= 0 && c <= cols - 2;
    return { o: mode, r: clamp(r, 0, rows - 2), c: clamp(c, 0, cols - 2), inBoard };
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
    const rc = wallRect(s.o, s.r, s.c);
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
  function sync(st){
    boardEl.classList.toggle("turn-red",  st.turn === "red");
    boardEl.classList.toggle("turn-blue", st.turn === "blue");
    boardEl.classList.toggle("mode-wall", mode !== "move");
    for (const id of ["red", "blue"]){
      const p = st.players[id];
      const vr = flipped ? (rows - 1 - p.r) : p.r;
      Object.assign(pieces[id].style, {
        left: px(p.c * (1 + G)) + "%", top: py(vr * (1 + G)) + "%",
        width: px(1) + "%", height: py(1) + "%"
      });
      pieces[id].classList.toggle("active", st.turn === id && !st.over);
      paintPiece(id);
    }
    const gcol = colorFor(st.turn);
    if (gcol) ghost.style.background = gcol;
    const wallEvents = st.replay.filter((ev) => ev.t === "w");
    while (drawnWalls < wallEvents.length){
      const w = wallEvents[drawnWalls++];
      const el = document.createElement("div");
      el.className = "wall by-" + w.p;
      const wcol = colorFor(w.p);
      if (wcol) el.style.setProperty("background", wcol, "important");
      const rc = wallRect(w.o, w.r, w.c);
      Object.assign(el.style, { left: rc.left+"%", top: rc.top+"%", width: rc.width+"%", height: rc.height+"%" });
      wallLayer.appendChild(el);
    }
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        cellEls[r][c].classList.remove("target", "last");
    if (!st.over && mode === "move" && controller){
      for (const m of legalMoves(st, st.turn))
        cellEls[m.r][m.c].classList.add("target");
    }
    const lastM = [...st.replay].reverse().find((ev) => ev.t === "m");
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
        const availH = stageEl.clientHeight - (document.documentElement.dataset.race === "on" ? 30 : 64);
        const ratio = tC / tR;
        let h = Math.max(140, Math.min(availH, 680));
        let w = h * ratio;
        if (w > availW){ w = availW; h = Math.max(140, w / ratio); }
        frameEl.style.width  = Math.round(w) + "px";
        frameEl.style.height = Math.round(h) + "px";
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
