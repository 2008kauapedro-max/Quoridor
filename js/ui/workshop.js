/* =============================================================
   Quoridor Arena — ui/workshop.js
   OFICINA por aba: peça · tabuleiro · moldura (+ barreiras/título/conjuntos)
   Interface tipo editor (preview + ferramentas), como na referência.
   ============================================================= */
import { SKIN_CATALOG, pieceBgFor } from "../core/constants.js";
import { getSettings, setSettings } from "../services/storage.js";
import { toast, SFX } from "./effects.js";

const LS_ITEMS = "qa_ws_items";
const LS_SETS  = "qa_ws_sets";
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (_){ return d; } };
export function getItems(){ return Object.assign({ pieces: [], walls: [], boards: [], frames: [] }, load(LS_ITEMS, {})); }
const saveItems = (d) => localStorage.setItem(LS_ITEMS, JSON.stringify(d));
export const getSets = () => load(LS_SETS, []);
const saveSets = (s) => localStorage.setItem(LS_SETS, JSON.stringify(s));
const uid = (p) => p + Date.now().toString(36);
const esc = (s) => String(s ?? "").replace(/[<>&"]/g, (c) => ({ "<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;" }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = (id) => document.getElementById(id);

/* ═══════════ TÍTULOS ═══════════ */
export const TITLES = [
  { id: "novato", name: "Novato" }, { id: "aprendiz", name: "Aprendiz" },
  { id: "veterano", name: "Veterano", style: "color:#38bdf8" },
  { id: "tatico", name: "Tático", style: "color:#a78bfa" },
  { id: "elite", name: "Elite", style: "color:#a78bfa" },
  { id: "pro", name: "Pro Player", style: "color:#f472b6" },
  { id: "mestre", name: "Mestre das Barreiras", style: "color:#fbbf24" },
  { id: "lenda", name: "Lenda", style: "color:#fbbf24;text-shadow:0 0 10px rgba(251,191,36,.55)" }
];
export const titleOf = (id) => TITLES.find((t) => t.id === id) || null;

/* ═══════════ SÍMBOLOS (SVG inline — sem arquivos) ═══════════ */
function svg(inner, vb){ return 'url("data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (vb||"0 0 24 24") + '">' + inner + '</svg>') + '")'; }
const SYMS = [
  { n: "Círculo",   v: svg('<circle cx="12" cy="12" r="9" fill="%23000"/>') },
  { n: "Argola",    v: svg('<circle cx="12" cy="12" r="8" fill="none" stroke="%23000" stroke-width="3"/>') },
  { n: "Estrela",   v: svg('<path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" fill="%23000"/>') },
  { n: "Triângulo", v: svg('<path d="M12 3l9 16H3z" fill="%23000"/>') },
  { n: "Coração",   v: svg('<path d="M12 21s-7-4.6-9.3-9C1 8.5 2.6 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.4 0 5 3.5 3.3 7-2.3 4.4-9.3 9-9.3 9z" fill="%23000"/>') },
  { n: "Raio",      v: svg('<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="%23000"/>') },
  { n: "Coroa",     v: svg('<path d="M3 7l4 4 5-7 5 7 4-4-2 12H5z" fill="%23000"/>') },
  { n: "Escudo",    v: svg('<path d="M12 2l8 3v6c0 5-3.5 8-8 11-4.5-3-8-6-8-11V5z" fill="%23000"/>') },
  { n: "Espada",    v: svg('<path d="M14 2l8 8-7 7-2-2-3 3-2-2 3-3-2-2z M5 17l2 2-3 3-2-2z" fill="%23000"/>') },
  { n: "Fogo",      v: svg('<path d="M12 2c1 3-1 4-2 6-1 2 0 3 0 3s-2-1-2-3c-2 2-3 4-3 6a7 7 0 0014 0c0-4-3-6-4-9-1 2-2 2-3 1z" fill="%23000"/>') },
  { n: "Bola",      v: svg('<circle cx="12" cy="12" r="9" fill="%23fff" stroke="%23000" stroke-width="1.5"/><path d="M12 7l4 3-1.5 5h-5L8 10z" fill="%23000"/>') },
  { n: "X",         v: svg('<path d="M5 5l14 14M19 5L5 19" stroke="%23000" stroke-width="3" stroke-linecap="round"/>') },
  { n: "Mais",      v: svg('<path d="M12 4v16M4 12h16" stroke="%23000" stroke-width="3" stroke-linecap="round"/>') },
  { n: "Seta ▲",    v: svg('<path d="M12 5l8 12H4z" fill="%23000"/>') },
  { n: "Losango",   v: svg('<path d="M12 2l8 10-8 10-8-10z" fill="%23000"/>') },
  { n: "Lua",       v: svg('<path d="M16 3a9 9 0 100 18 7 7 0 010-18z" fill="%23000"/>') }
];

/* ═══════════ BANDEIRAS (coloque seus PNGs em img/flags/) ═══════════
   Para adicionar uma bandeira nova: só junte o arquivo em img/flags/
   com o nome abaixo (ex: img/flags/brasil.png) — aparece sozinha.   */
const FLAGS = [
  { n: "Brasil",      f: "img/flags/brasil.png" },
  { n: "Argentina",   f: "img/flags/argentina.png" },
  { n: "Uruguai",     f: "img/flags/uruguai.png" },
  { n: "Portugal",    f: "img/flags/portugal.png" },
  { n: "Espanha",     f: "img/flags/espanha.png" },
  { n: "Alemanha",    f: "img/flags/alemanha.png" },
  { n: "França",      f: "img/flags/franca.png" },
  { n: "Inglaterra",  f: "img/flags/inglaterra.png" },
  { n: "Itália",      f: "img/flags/italia.png" },
  { n: "EUA",         f: "img/flags/eua.png" },
  { n: "Japão",       f: "img/flags/japao.png" },
  { n: "México",      f: "img/flags/mexico.png" }
];

/* ═══════════ BUILDERS VISUAIS ═══════════ */
function layersCss(L){
  const parts = [];
  for (const l of L){
    if (l.t === "grad") parts.push("linear-gradient(" + l.a + "deg," + l.c1 + "," + l.c2 + ")");
    else if (l.t === "solid") parts.push("linear-gradient(" + l.c1 + "," + l.c1 + ")");
    else {
      const filt = l.col && l.col !== "#000000" ? "" : "";
      parts.push(l.src + " " + l.x + "% " + l.y + "% / " + l.s + "% no-repeat");
    }
  }
  return parts.join(", ") || "radial-gradient(circle at 35% 30%, #ef4444, #7f1d1d)";
}
/* cor de destaque de uma camada (para filtros) */
function layerWithColor(src, x, y, s, col){
  /* aplica cor via máscara não é simples inline; usamos o SVG já colorido quando possível */
  return src + " " + x + "% " + y + "% / " + s + "% no-repeat";
}

export function pieceCss(cfg){
  const L = cfg.layers || [{ t: "grad", c1: cfg.c1 || "#ef4444", c2: cfg.c2 || "#7f1d1d", a: 135 }];
  let bg = layersCss(L);
  if (cfg.text){
    const tcol = encodeURIComponent(cfg.tcol || "#ffffff");
    const tsvg = svg('<text x="12" y="16" font-size="13" font-family="Arial Black,Arial" font-weight="900" text-anchor="middle" fill="' + tcol + '">' +
      cfg.text.replace(/</g, "").slice(0, 4) + '</text>');
    bg = tsvg + " center/60% no-repeat, " + bg;
  }
  const radius = (cfg.shape === "square") ? "18%" : (cfg.shape === "hex" ? "25%" : "50%");
  const border = cfg.bw ? (cfg.bw + "px solid " + (cfg.bc || "#000")) : "none";
  const glow = cfg.glow ? ("0 0 " + (cfg.glow) + "px " + (cfg.c1 || "#fff")) : "none";
  return { background: bg, borderRadius: radius, border: border, boxShadow: glow, transform: "rotate(" + (cfg.rot || 0) + "deg)" };
}
export function wallCss(cfg){
  const L = cfg.layers || [{ t: "grad", c1: cfg.c1 || "#8a5a2e", c2: cfg.c2 || "#5b3a1c", a: 180 }];
  return { background: layersCss(L), borderRadius: "4px", boxShadow: cfg.glow ? ("0 0 " + cfg.glow + "px " + (cfg.c1 || "#fff")) : "none" };
}
export function boardCssObj(cfg){
  return { bg: cfg.bg || "#b98a5a", cell: cfg.cell || "#e9d7b7", border: cfg.border || "#8a5a2e", gap: cfg.gap || "#00000000" };
}
export function frameCssObj(cfg){
  return { c1: cfg.c1 || "#fbbf24", c2: cfg.c2 || "#92400e", w: cfg.w || 3, glow: cfg.glow || 0 };
}

/* compatibilidade com o resto do jogo */
export function pieceBg(c){ return pieceCss(c).background; }
export function wallBg(c){ return wallCss(c).background; }

function styleTag(id, css){
  let st = document.getElementById(id);
  if (!st){ st = document.createElement("style"); st.id = id; document.head.appendChild(st); }
  st.textContent = css;
}
export function applyUserBoard(){
  const b = getItems().boards.find((x) => x.id === getSettings().skin);
  const c = b ? boardCssObj(b.cfg) : null;
  styleTag("wsBoardCss", c ? ("#board{background:" + c.bg + "!important;border-color:" + c.border + "!important}#board .cell{background:" + c.cell + "!important}") : "");
}
export function applyUserFrames(){
  styleTag("wsFrameCss", getItems().frames.map((f) => {
    const c = frameCssObj(f.cfg);
    return ".frm-" + f.id + "{border:" + c.w + "px solid " + c.c1 + "!important;box-shadow:0 0 " + c.glow + "px " + c.c2 + "!important}";
  }).join(""));
}
export function registerUserSkins(){
  for (let i = SKIN_CATALOG.length - 1; i >= 0; i--) if (SKIN_CATALOG[i].user) SKIN_CATALOG.splice(i, 1);
  const it = getItems();
  for (const p of it.pieces) SKIN_CATALOG.push({ id: p.id, cat: "piece", name: p.name, swatch: [p.cfg.c1 || "#ef4444", p.cfg.c2 || "#7f1d1d"], badge: pieceBg(p.cfg), free: true, user: true });
  for (const b of it.boards) SKIN_CATALOG.push({ id: b.id, cat: "board", name: b.name, swatch: [b.cfg.cell || "#e9d7b7", b.cfg.bg || "#b98a5a"], free: true, user: true });
  for (const f of it.frames) SKIN_CATALOG.push({ id: f.id, cat: "frame", name: f.name, swatch: [f.cfg.c1 || "#fbbf24", f.cfg.c2 || "#92400e"], free: true, user: true });
  for (const w of it.walls)  SKIN_CATALOG.push({ id: w.id, cat: "wall",  name: w.name, swatch: [w.cfg.c1 || "#8a5a2e", w.cfg.c2 || "#5b3a1c"], free: true, user: true });
  applyUserBoard(); applyUserFrames();
}
export function mainColorFor(id, color, online){
  const u = getItems().pieces.find((p) => p.id === id);
  if (u) return (online || color === "red") ? (u.cfg.c1 || "#ef4444") : "#3b82f6";
  const it = SKIN_CATALOG.find((i) => i.cat === "piece" && i.id === id);
  if (it && it.badge && !online && color === "blue") return "#3b82f6";
  if (it && it.swatch) return it.swatch[color === "red" ? 0 : 1];
  return color === "red" ? "#ef4444" : "#3b82f6";
}
export function userWallBg(id){ const w = getItems().walls.find((x) => x.id === id); return w ? wallBg(w.cfg) : null; }

export function equip(kind, id){
  const s = getSettings();
  if (kind === "piece") s.piece = id;
  if (kind === "board") s.skin = id;
  if (kind === "frame") s.frame = id;
  if (kind === "wall")  s.wall = id;
  if (kind === "title") s.title = id;
  setSettings(s);
  if (kind === "board") applyUserBoard();
  if (kind === "frame") applyUserFrames();
  SFX.click();
}

/* ═══════════ CSS ═══════════ */
styleTag("wsCss", `
.ws-person{display:block;width:100%;margin:14px 0 6px;padding:13px;border-radius:14px;border:none;background:linear-gradient(135deg,var(--accent,#2f7fd6),#7c3aed);color:#fff;font-size:14px;font-weight:800;box-shadow:0 6px 18px rgba(0,0,0,.25);cursor:pointer}
#wsOv{position:fixed;inset:0;z-index:97;background:var(--bg,#0f1218);display:flex;flex-direction:column;overflow:hidden}
#wsOv .ws-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line,#2a2f3a)}
#wsOv .ws-head h2{margin:0;font-size:17px;flex:1}
#wsOv .ws-body{flex:1;overflow-y:auto;padding:12px 14px 24px}
#wsOv .ws-stage{display:flex;justify-content:center;padding:6px 0 14px}
#wsOv .ws-ball{width:150px;height:150px;transition:all .15s}
#wsOv .ws-wallprev{display:flex;gap:14px;align-items:center}
#wsOv .ws-wallprev .wh{width:120px;height:16px}
#wsOv .ws-wallprev .wv{width:16px;height:120px}
#wsOv .ws-boardprev{width:150px;height:150px;border-radius:12px;border:3px solid;padding:7px;display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
#wsOv .ws-boardprev i{border-radius:6px}
#wsOv .ws-frameprev{width:96px;height:96px;border-radius:50%;display:flex;align-items:center;justify-content:center}
#wsOv .ws-frameprev img{width:74px;height:74px;border-radius:50%}
#wsOv .ws-tools{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:12px}
#wsOv .ws-tool{width:46px;height:46px;border-radius:12px;border:1px solid var(--line,#2a2f3a);background:var(--card,#161b26);color:var(--text,#eee);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center}
#wsOv .ws-tool.on{border-color:var(--accent,#2f7fd6);box-shadow:0 0 0 2px var(--accent,#2f7fd6)}
#wsOv .ws-sec{font-size:11px;letter-spacing:.12em;opacity:.65;margin:14px 2px 8px;text-transform:uppercase}
#wsOv .ws-strip{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none}
#wsOv .ws-strip::-webkit-scrollbar{display:none}
#wsOv .ws-chip{flex:0 0 auto;width:42px;height:42px;border-radius:10px;border:1px solid var(--line,#2a2f3a);background:var(--card,#161b26);cursor:pointer;display:flex;align-items:center;justify-content:center;overflow:hidden}
#wsOv .ws-chip img{width:100%;height:100%;object-fit:cover}
#wsOv .ws-chip.on{border-color:var(--accent,#2f7fd6);box-shadow:0 0 0 2px var(--accent,#2f7fd6)}
#wsOv .ws-row{display:flex;gap:10px;align-items:center;font-size:12px;margin:8px 0;color:var(--text,#eee)}
#wsOv .ws-row label{min-width:62px;opacity:.8}
#wsOv .ws-row input[type=color]{width:38px;height:30px;border:none;background:none;padding:0}
#wsOv .ws-row input[type=range]{flex:1}
#wsOv .ws-row input[type=text]{flex:1;padding:8px;border-radius:8px;border:1px solid var(--line,#2a2f3a);background:transparent;color:var(--text,#eee)}
#wsOv .ws-btn{padding:11px;border-radius:11px;border:none;background:var(--accent,#2f7fd6);color:#fff;font-size:13px;font-weight:700;cursor:pointer}
#wsOv .ws-btn.ghost{background:transparent;border:1px solid var(--line,#2a2f3a);color:var(--text,#eee)}
#wsOv .ws-actions{display:flex;gap:8px;margin-top:14px}
#wsOv .ws-actions .ws-btn{flex:1}
#wsOv .ws-saved{margin-top:18px}
#wsOv .ws-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line,#2a2f3a);border-radius:12px;margin-bottom:8px;background:var(--card,#161b26)}
#wsOv .ws-item .pv{width:34px;height:34px;border-radius:50%;flex:0 0 auto}
#wsOv .ws-item .nm{flex:1;font-size:13px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#wsOv .ws-item .eq{font-size:10px;color:var(--accent,#2f7fd6);font-weight:700}
#wsOv .ws-dots{position:relative}
#wsOv .ws-dots button{width:34px;height:34px;border-radius:8px;border:1px solid var(--line,#2a2f3a);background:transparent;color:var(--text,#eee);font-size:16px;cursor:pointer}
#wsOv .ws-menu{position:absolute;right:0;top:40px;background:var(--card,#161b26);border:1px solid var(--line,#2a2f3a);border-radius:10px;padding:4px;z-index:5;min-width:120px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
#wsOv .ws-menu div{padding:8px 10px;font-size:12px;border-radius:7px;cursor:pointer;color:var(--text,#eee)}
#wsOv .ws-menu div:hover{background:var(--accent,#2f7fd6);color:#fff}
`);

/* ═══════════ ESTADO ═══════════ */
let ov = null, mode = "piece", draft = null, openMenu = null;

/* botões "Personalizar" embaixo de cada aba */
export function initWorkshop(){
  const scr = document.querySelector('[data-screen="skins"]');
  if (!scr || scr.dataset.wsReady) return;
  scr.dataset.wsReady = "1";
  const mk = (cat, label) => {
    const b = document.createElement("button");
    b.className = "ws-person";
    b.textContent = "🎨 Personalizar " + label;
    b.onclick = () => openEditor(cat);
    return b;
  };
  const list = $("skinsList");
  const inject = () => {
    scr.querySelectorAll(".ws-person").forEach((x) => x.remove());
    const cat = scr.querySelector(".skin-tabs .tab.active")?.dataset?.cat || "piece";
    const lab = { piece: "Peça", board: "Tabuleiro", frame: "Moldura" }[cat] || "Peça";
    const target = (cat === "piece" || cat === "board" || cat === "frame") ? cat : "piece";
    (list?.parentElement || scr).appendChild(mk(target, lab));
  };
  scr.querySelectorAll(".skin-tabs .tab").forEach((t) => t.addEventListener("click", () => setTimeout(inject, 30)));
  inject();
}

export function openEditor(startMode){
  registerUserSkins();
  closeEditor();
  mode = startMode || "piece";
  ov = document.createElement("div");
  ov.id = "wsOv";
  ov.innerHTML =
    '<div class="ws-head"><button class="mini-btn" id="wsBack">←</button><h2 id="wsTitle">🎨 Personalizar</h2>' +
    '<button class="ws-btn ghost" id="wsTabsBtn" style="padding:6px 12px">Abas</button></div>' +
    '<div class="ws-body" id="wsBody"></div>';
  document.body.appendChild(ov);
  ov.querySelector("#wsBack").onclick = closeEditor;
  ov.querySelector("#wsTabsBtn").onclick = () => {
    const order = ["piece", "board", "frame", "wall", "title", "sets"];
    mode = order[(order.indexOf(mode) + 1) % order.length];
    draft = null; render();
  };
  document.addEventListener("pointerdown", outsideMenu);
  newDraft();
  render();
}
export function closeEditor(){ const o = document.getElementById("wsOv"); if (o) o.remove(); ov = null; document.removeEventListener("pointerdown", outsideMenu); }
function outsideMenu(e){ if (openMenu && !e.target.closest(".ws-dots")){ openMenu.remove(); openMenu = null; } }

function newDraft(){
  if (mode === "piece") draft = { c1: "#ef4444", c2: "#7f1d1d", layers: [{ t: "grad", c1: "#ef4444", c2: "#7f1d1d", a: 135 }], shape: "circle", bw: 0, bc: "#000000", glow: 0, rot: 0, text: "", tcol: "#ffffff", sel: 0 };
  else if (mode === "wall") draft = { c1: "#8a5a2e", c2: "#5b3a1c", layers: [{ t: "grad", c1: "#8a5a2e", c2: "#5b3a1c", a: 180 }], glow: 0, sel: 0 };
  else if (mode === "board") draft = { bg: "#b98a5a", cell: "#e9d7b7", border: "#8a5a2e", gap: "#00000000" };
  else if (mode === "frame") draft = { c1: "#fbbf24", c2: "#92400e", w: 3, glow: 6 };
}

function render(){
  const titles = { piece: "🎨 Peça", wall: "🧱 Barreira", board: "🏟️ Tabuleiro", frame: "🖼️ Moldura", title: "🏅 Título", sets: "📦 Conjuntos" };
  ov.querySelector("#wsTitle").textContent = "Personalizar · " + (titles[mode] || "");
  const body = ov.querySelector("#wsBody");
  if (mode === "piece") body.innerHTML = viewPiece();
  else if (mode === "wall") body.innerHTML = viewWall();
  else if (mode === "board") body.innerHTML = viewBoard();
  else if (mode === "frame") body.innerHTML = viewFrame();
  else if (mode === "title") body.innerHTML = viewTitle();
  else if (mode === "sets") body.innerHTML = viewSets();
  bind();
}

/* ═══════════ VIEWS ═══════════ */
function viewPiece(){
  const d = draft, st = pieceCss(d);
  let h = '<div class="ws-stage"><div class="ws-ball" id="pvBall"></div></div>';
  h += '<div class="ws-tools">' +
    toolBtn("🎨", "cor", "Cores/Gradiente") +
    toolBtn("✏️", "texto", "Texto") +
    toolBtn("⬛", "sim", "Símbolos") +
    toolBtn("🖼️", "img", "Imagem/Bandeira") +
    toolBtn("⭕", "forma", "Forma/Borda") +
    toolBtn("↔️", "pos", "Mover/Zoom") +
    toolBtn("🔄", "rot", "Girar") +
    toolBtn("✨", "fx", "Brilho") +
    '</div>';
  h += panelFor(d.tool || "cor");
  h += savedList("pieces");
  return h;
}
function toolBtn(ic, k, title){ return '<button class="ws-tool' + ((draft.tool || "cor") === k ? " on" : "") + '" data-tool="' + k + '" title="' + title + '">' + ic + "</button>"; }

function panelFor(tool){
  const d = draft, L = d.layers, cur = L[d.sel] || L[0];
  let h = "";
  if (tool === "cor"){
    h += sec("Camadas");
    h += '<div class="ws-strip">' + L.map((l, i) =>
      '<div class="ws-chip' + (i === d.sel ? " on" : "") + '" data-sellayer="' + i + '" style="background:' +
      (l.t === "grad" ? "linear-gradient(" + l.a + "deg," + l.c1 + "," + l.c2 + ")" : (l.t === "solid" ? l.c1 : "#444")) + '"></div>').join("") +
      '<div class="ws-chip" data-addlayer="grad" title="Gradiente">＋</div>' +
      '<div class="ws-chip" data-addlayer="solid" title="Cor sólida">●</div></div>';
    h += row("Tipo", '<select id="fType" style="flex:1;padding:8px;border-radius:8px"><option value="grad"' + (cur.t === "grad" ? " selected" : "") + '>Gradiente</option><option value="solid"' + (cur.t === "solid" ? " selected" : "") + '>Cor sólida</option></select>');
    h += row("Cor 1", '<input type="color" id="fC1" value="' + (cur.c1 || "#ef4444") + '">');
    if (cur.t === "grad"){
      h += row("Cor 2", '<input type="color" id="fC2" value="' + (cur.c2 || "#7f1d1d") + '">');
      h += row("Ângulo", '<input type="range" id="fA" min="0" max="360" value="' + (cur.a || 135) + '">');
    }
    if (L.length > 1) h += row("", '<button class="ws-btn ghost" id="fDelLayer">🗑 Remover camada</button>');
  } else if (tool === "texto"){
    h += row("Texto", '<input type="text" id="fText" maxlength="4" placeholder="Ex: 10" value="' + esc(d.text || "") + '">');
    h += row("Cor", '<input type="color" id="fTcol" value="' + (d.tcol || "#ffffff") + '">');
  } else if (tool === "sim"){
    h += sec("Símbolos");
    h += '<div class="ws-strip">' + SYMS.map((s, i) =>
      '<div class="ws-chip" data-sym="' + i + '" title="' + s.n + '" style="background:' + s.v + ' center/70% no-repeat,#222"></div>').join("") + "</div>";
  } else if (tool === "img"){
    h += sec("Sua imagem");
    h += row("", '<input type="file" id="fFile" accept="image/*" style="font-size:12px">');
    h += sec("Bandeiras");
    h += '<div class="ws-strip">' + FLAGS.map((fl, i) =>
      '<div class="ws-chip" data-flag="' + i + '" title="' + fl.n + '"><img src="' + fl.f + '" alt="' + fl.n + '" onerror="this.style.opacity=.25"></div>').join("") + "</div>";
  } else if (tool === "forma"){
    h += row("Formato", '<select id="fShape" style="flex:1;padding:8px;border-radius:8px"><option value="circle"' + (d.shape === "circle" ? " selected" : "") + '>Redondo</option><option value="square"' + (d.shape === "square" ? " selected" : "") + '>Quadrado</option><option value="hex"' + (d.shape === "hex" ? " selected" : "") + '>Arredondado</option></select>');
    h += row("Borda", '<input type="range" id="fBw" min="0" max="12" value="' + (d.bw || 0) + '">');
    h += row("Cor borda", '<input type="color" id="fBc" value="' + (d.bc || "#000000") + '">');
  } else if (tool === "pos"){
    const c = cur;
    h += row("Zoom", '<input type="range" id="fS" min="10" max="200" value="' + (c.s || 60) + '">');
    h += row("↔", '<input type="range" id="fX" min="0" max="100" value="' + (c.x || 50) + '">');
    h += row("↕", '<input type="range" id="fY" min="0" max="100" value="' + (c.y || 50) + '">');
  } else if (tool === "rot"){
    h += row("Girar", '<input type="range" id="fRot" min="-180" max="180" value="' + (d.rot || 0) + '">');
  } else if (tool === "fx"){
    h += row("Brilho", '<input type="range" id="fGlow" min="0" max="30" value="' + (d.glow || 0) + '">');
  }
  h += '<div class="ws-actions"><button class="ws-btn ghost" id="fReset">↺ Padrão</button><button class="ws-btn" id="fSave">💾 Salvar peça</button></div>';
  return h;
}

function viewWall(){
  const d = draft, st = wallCss(d);
  let h = '<div class="ws-stage"><div class="ws-wallprev"><div class="wh" id="pvWh"></div><div class="wv" id="pvWv"></div></div></div>';
  h += '<div class="ws-tools">' + toolBtn("🎨", "cor", "Cores") + toolBtn("✨", "fx", "Brilho") + "</div>";
  const L = d.layers, cur = L[d.sel] || L[0];
  if ((d.tool || "cor") === "cor"){
    h += row("Cor 1", '<input type="color" id="wC1" value="' + (cur.c1 || "#8a5a2e") + '">');
    h += row("Cor 2", '<input type="color" id="wC2" value="' + (cur.c2 || "#5b3a1c") + '">');
    h += row("Ângulo", '<input type="range" id="wA" min="0" max="360" value="' + (cur.a || 180) + '">');
  } else {
    h += row("Brilho", '<input type="range" id="wGlow" min="0" max="30" value="' + (d.glow || 0) + '">');
  }
  h += '<div class="ws-actions"><button class="ws-btn" id="wSave">💾 Salvar barreira</button></div>';
  h += savedList("walls");
  return h;
}

function viewBoard(){
  const d = draft, c = boardCssObj(d);
  let h = '<div class="ws-stage"><div class="ws-boardprev" id="pvBoard" style="background:' + c.bg + ';border-color:' + c.border + '">' +
    Array.from({ length: 9 }, () => '<i style="background:' + c.cell + '"></i>').join("") + "</div></div>";
  h += row("Fundo", '<input type="color" id="bBg" value="' + c.bg + '">');
  h += row("Casas", '<input type="color" id="bCell" value="' + c.cell + '">');
  h += row("Borda", '<input type="color" id="bBorder" value="' + c.border + '">');
  h += row("Nome", '<input type="text" id="bName" placeholder="Meu tabuleiro">');
  h += '<div class="ws-actions"><button class="ws-btn" id="bSave">💾 Salvar tabuleiro</button></div>';
  h += savedList("boards");
  return h;
}

function viewFrame(){
  const d = draft, c = frameCssObj(d);
  let h = '<div class="ws-stage"><div class="ws-frameprev" style="border:' + c.w + 'px solid ' + c.c1 + ';box-shadow:0 0 ' + c.glow + 'px ' + c.c2 + '"><img src="icons/icon.svg" alt=""></div></div>';
  h += row("Cor", '<input type="color" id="frC1" value="' + c.c1 + '">');
  h += row("Brilho cor", '<input type="color" id="frC2" value="' + c.c2 + '">');
  h += row("Espessura", '<input type="range" id="frW" min="1" max="8" value="' + c.w + '">');
  h += row("Glow", '<input type="range" id="frGlow" min="0" max="20" value="' + c.glow + '">');
  h += row("Nome", '<input type="text" id="frName" placeholder="Minha moldura">');
  h += '<div class="ws-actions"><button class="ws-btn" id="frSave">💾 Salvar moldura</button></div>';
  h += savedList("frames");
  return h;
}

function viewTitle(){
  const s = getSettings();
  let h = sec("Escolha seu título");
  h += '<div class="ws-strip" style="flex-wrap:wrap">' + TITLES.map((t) =>
    '<div class="ws-chip' + (s.title === t.id ? " on" : "") + '" data-title="' + t.id + '" style="width:auto;padding:0 12px;font-size:12px;' + (t.style || "") + '">' + t.name + "</div>").join("") + "</div>";
  return h;
}

function viewSets(){
  const sets = getSets(), items = getItems();
  let h = '<button class="ws-btn" id="newSet" style="width:100%">＋ Criar conjunto com o visual atual</button>';
  h += sec("Meus conjuntos");
  h += sets.map((st) => {
    const up = items.pieces.find((p) => p.id === st.piece);
    return '<div class="ws-item"><span class="pv" style="background:' + (up ? pieceBg(up.cfg) : pieceBgFor(st.piece || "p-classic", "red", false)) + '"></span>' +
      '<span class="nm">' + esc(st.name) + '</span><span class="eq" data-eqset="' + st.id + '">Equipar</span>' +
      '<span class="ws-dots"><button data-dots="set:' + st.id + '">⋮</button></span></div>';
  }).join("");
  return h;
}

function savedList(kind){
  const items = getItems()[kind], s = getSettings();
  const equipped = { pieces: s.piece, walls: s.wall, boards: s.skin, frames: s.frame }[kind];
  let h = '<div class="ws-saved">' + sec("Minhas criações");
  h += items.map((it) => {
    let pv = "";
    if (kind === "pieces") pv = 'style="background:' + pieceBg(it.cfg) + ';border-radius:' + (pieceCss(it.cfg).borderRadius) + '"';
    else if (kind === "walls") pv = 'style="background:' + wallBg(it.cfg) + ';border-radius:4px"';
    else if (kind === "boards") pv = 'style="background:' + it.cfg.cell + ';border:2px solid ' + it.cfg.border + '"';
    else if (kind === "frames") pv = 'style="border:3px solid ' + it.cfg.c1 + ';box-shadow:0 0 6px ' + it.cfg.c2 + '"';
    return '<div class="ws-item"><span class="pv" ' + pv + '></span><span class="nm">' + esc(it.name) +
      (equipped === it.id ? ' <span class="eq">• equipada</span>' : "") + '</span>' +
      '<span class="eq" data-eq="' + kind + ':' + it.id + '">Equipar</span>' +
      '<span class="ws-dots"><button data-dots="' + kind + ":" + it.id + '">⋮</button></span></div>';
  }).join("");
  if (!items.length) h += '<p class="hint" style="font-size:12px;opacity:.6">Nenhuma criação ainda — personalize e salve!</p>';
  return h + "</div>";
}

function sec(t){ return '<div class="ws-sec">' + t + "</div>"; }
function row(label, ctrl){ return '<div class="ws-row"><label>' + label + "</label>" + ctrl + "</div>"; }

/* ═══════════ BIND ═══════════ */
function bind(){
  if (!ov) return;
  const $q = (s) => ov.querySelector(s);
  paintPreview();

  ov.querySelectorAll("[data-tool]").forEach((b) => b.onclick = () => { draft.tool = b.dataset.tool; render(); });
  ov.querySelectorAll("[data-sellayer]").forEach((b) => b.onclick = () => { draft.sel = +b.dataset.sellayer; render(); });

  /* peça */
  if ($q("#fType")) $q("#fType").onchange = (e) => { const c = curLayer(); c.t = e.target.value; if (c.t === "solid") c.s = c.s || 100; render(); };
  if ($q("#fC1")) $q("#fC1").oninput = (e) => { const c = curLayer(); c.c1 = e.target.value; if (draft.layers.length === 1 && c.t !== "img") draft.c1 = e.target.value; paintPreview(); };
  if ($q("#fC2")) $q("#fC2").oninput = (e) => { curLayer().c2 = e.target.value; if (draft.layers.length === 1) draft.c2 = e.target.value; paintPreview(); };
  if ($q("#fA"))  $q("#fA").oninput  = (e) => { curLayer().a = +e.target.value; paintPreview(); };
  if ($q("#fDelLayer")) $q("#fDelLayer").onclick = () => { draft.layers.splice(draft.sel, 1); draft.sel = 0; render(); };
  if ($q("#fAddLayer")) $q("#fAddLayer").onclick = () => { draft.layers.push({ t: "grad", c1: "#22d3ee", c2: "#0e7490", a: 135, x: 50, y: 50, s: 60 }); draft.sel = draft.layers.length - 1; render(); };
  ov.querySelectorAll("[data-addlayer]").forEach((b) => b.onclick = () => { draft.layers.push({ t: b.dataset.addlayer, c1: "#22d3ee", c2: "#0e7490", a: 135, x: 50, y: 50, s: 100 }); draft.sel = draft.layers.length - 1; render(); });
  if ($q("#fText")) $q("#fText").oninput = (e) => { draft.text = e.target.value; paintPreview(); };
  if ($q("#fTcol")) $q("#fTcol").oninput = (e) => { draft.tcol = e.target.value; paintPreview(); };
  ov.querySelectorAll("[data-sym]").forEach((b) => b.onclick = () => addImgLayer(SYMS[+b.dataset.sym].v, 60));
  ov.querySelectorAll("[data-flag]").forEach((b) => b.onclick = () => addImgLayer(FLAGS[+b.dataset.flag].f, 70));
  if ($q("#fFile")) $q("#fFile").onchange = (e) => readFile(e, (src) => addImgLayer(src, 70));
  if ($q("#fShape")) $q("#fShape").onchange = (e) => { draft.shape = e.target.value; paintPreview(); };
  if ($q("#fBw")) $q("#fBw").oninput = (e) => { draft.bw = +e.target.value; paintPreview(); };
  if ($q("#fBc")) $q("#fBc").oninput = (e) => { draft.bc = e.target.value; paintPreview(); };
  if ($q("#fS")) $q("#fS").oninput = (e) => { curLayer().s = +e.target.value; paintPreview(); };
  if ($q("#fX")) $q("#fX").oninput = (e) => { curLayer().x = +e.target.value; paintPreview(); };
  if ($q("#fY")) $q("#fY").oninput = (e) => { curLayer().y = +e.target.value; paintPreview(); };
  if ($q("#fRot")) $q("#fRot").oninput = (e) => { draft.rot = +e.target.value; paintPreview(); };
  if ($q("#fGlow")) $q("#fGlow").oninput = (e) => { draft.glow = +e.target.value; paintPreview(); };
  if ($q("#fReset")) $q("#fReset").onclick = () => { newDraft(); render(); };
  if ($q("#fSave")) $q("#fSave").onclick = savePiece;

  /* parede */
  if ($q("#wC1")) $q("#wC1").oninput = (e) => { curLayer().c1 = e.target.value; draft.c1 = e.target.value; paintPreview(); };
  if ($q("#wC2")) $q("#wC2").oninput = (e) => { curLayer().c2 = e.target.value; draft.c2 = e.target.value; paintPreview(); };
  if ($q("#wA"))  $q("#wA").oninput  = (e) => { curLayer().a = +e.target.value; paintPreview(); };
  if ($q("#wGlow")) $q("#wGlow").oninput = (e) => { draft.glow = +e.target.value; paintPreview(); };
  if ($q("#wSave")) $q("#wSave").onclick = saveWall;

  /* tabuleiro */
  if ($q("#bBg")) $q("#bBg").oninput = (e) => { draft.bg = e.target.value; paintPreview(); };
  if ($q("#bCell")) $q("#bCell").oninput = (e) => { draft.cell = e.target.value; paintPreview(); };
  if ($q("#bBorder")) $q("#bBorder").oninput = (e) => { draft.border = e.target.value; paintPreview(); };
  if ($q("#bSave")) $q("#bSave").onclick = saveBoard;

  /* moldura */
  if ($q("#frC1")) $q("#frC1").oninput = (e) => { draft.c1 = e.target.value; paintPreview(); };
  if ($q("#frC2")) $q("#frC2").oninput = (e) => { draft.c2 = e.target.value; paintPreview(); };
  if ($q("#frW")) $q("#frW").oninput = (e) => { draft.w = +e.target.value; paintPreview(); };
  if ($q("#frGlow")) $q("#frGlow").oninput = (e) => { draft.glow = +e.target.value; paintPreview(); };
  if ($q("#frSave")) $q("#frSave").onclick = saveFrame;

  /* título */
  ov.querySelectorAll("[data-title]").forEach((b) => b.onclick = () => { equip("title", b.dataset.title); toast("Título equipado! 🏅"); render(); });

  /* conjuntos */
  if ($q("#newSet")) $q("#newSet").onclick = () => {
    const s = getSettings(), n = prompt("Nome do conjunto:", "Meu conjunto");
    if (!n) return;
    saveSets(getSets().concat([{ id: uid("set"), name: n, piece: s.piece, wall: s.wall, board: s.skin, frame: s.frame, title: s.title }]));
    toast("Conjunto salvo! 📦"); render();
  };
  ov.querySelectorAll("[data-eqset]").forEach((b) => b.onclick = () => {
    const st = getSets().find((x) => x.id === b.dataset.eqset); if (!st) return;
    if (st.piece) equip("piece", st.piece); if (st.wall) equip("wall", st.wall);
    if (st.board) equip("board", st.board); if (st.frame) equip("frame", st.frame);
    if (st.title) equip("title", st.title);
    toast("Conjunto equipado! ✨");
  });

  /* equipar criação */
  ov.querySelectorAll("[data-eq]").forEach((b) => b.onclick = () => {
    const [k, id] = b.dataset.eq.split(":");
    equip(k === "pieces" ? "piece" : k === "walls" ? "wall" : k === "boards" ? "board" : "frame", id);
    toast("Equipado! ✔"); render();
  });

  /* menu 3 pontinhos */
  ov.querySelectorAll("[data-dots]").forEach((b) => b.onclick = (ev) => {
    ev.stopPropagation();
    if (openMenu) openMenu.remove();
    const [k, id] = b.dataset.dots.split(":");
    const m = document.createElement("div");
    m.className = "ws-menu";
    const isSet = k === "set";
    m.innerHTML =
      '<div data-m="rename">✏️ Nomear</div>' +
      (isSet ? "" : '<div data-m="edit">🎨 Editar</div>') +
      '<div data-m="dup">⧉ Duplicar</div>' +
      '<div data-m="del">🗑 Apagar</div>';
    b.parentElement.appendChild(m);
    openMenu = m;
    m.querySelector('[data-m="rename"]').onclick = () => renameItem(k, id);
    const ed = m.querySelector('[data-m="edit"]'); if (ed) ed.onclick = () => editItem(k, id);
    m.querySelector('[data-m="dup"]').onclick = () => dupItem(k, id);
    m.querySelector('[data-m="del"]').onclick = () => delItem(k, id);
  });
}

function curLayer(){ const L = draft.layers; return L[draft.sel] || L[0]; }
function addImgLayer(src, s){
  draft.layers.push({ t: "img", src: src, x: 50, y: 50, s: s, col: "#000000" });
  draft.sel = draft.layers.length - 1;
  draft.tool = "pos";
  render();
}
function readFile(e, cb){
  const f = e.target.files && e.target.files[0];
  if (!f || !f.type.startsWith("image/")){ toast("Arquivo inválido."); return; }
  if (f.size > 3 * 1024 * 1024){ toast("Imagem muito grande (máx 3MB)."); return; }
  const rd = new FileReader();
  rd.onload = () => { const im = new Image(); im.onload = () => {
    const cv = document.createElement("canvas"); cv.width = 160; cv.height = 160;
    const cx = cv.getContext("2d"); const m = Math.min(im.width, im.height);
    cx.drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, 160, 160);
    cb(cv.toDataURL("image/png"));
  }; im.src = rd.result; };
  rd.readAsDataURL(f);
}

function paintPreview(){
  if (!ov) return;
  if (mode === "piece"){
    const el = ov.querySelector("#pvBall"); if (!el) return;
    const st = pieceCss(draft);
    el.style.background = st.background; el.style.borderRadius = st.borderRadius;
    el.style.border = st.border; el.style.boxShadow = st.boxShadow; el.style.transform = st.transform;
  } else if (mode === "wall"){
    const st = wallCss(draft);
    const wh = ov.querySelector("#pvWh"), wv = ov.querySelector("#pvWv");
    if (wh){ wh.style.background = st.background; wh.style.boxShadow = st.boxShadow; }
    if (wv){ wv.style.background = st.background; wv.style.boxShadow = st.boxShadow; }
  } else if (mode === "board"){
    const bd = ov.querySelector("#pvBoard"); if (!bd) return;
    const c = boardCssObj(draft);
    bd.style.background = c.bg; bd.style.borderColor = c.border;
    bd.querySelectorAll("i").forEach((i) => i.style.background = c.cell);
  } else if (mode === "frame"){
    const fr = ov.querySelector(".ws-frameprev"); if (!fr) return;
    const c = frameCssObj(draft);
    fr.style.border = c.w + "px solid " + c.c1; fr.style.boxShadow = "0 0 " + c.glow + "px " + c.c2;
  }
}

/* ═══════════ SALVAR / EDITAR / APAGAR ═══════════ */
function cleanCfg(d){
  return {
    c1: d.c1, c2: d.c2, shape: d.shape, bw: d.bw, bc: d.bc, glow: d.glow, rot: d.rot,
    text: d.text, tcol: d.tcol,
    layers: (d.layers || []).map((l) => l.t === "img"
      ? { t: "img", src: l.src, x: l.x, y: l.y, s: l.s }
      : { t: l.t, c1: l.c1, c2: l.c2, a: l.a })
  };
}
function savePiece(){
  const name = prompt("Nome da peça:", "Minha peça"); if (!name) return;
  const items = getItems();
  const obj = { id: draft.id || uid("p"), name, cfg: cleanCfg(draft) };
  const i = items.pieces.findIndex((p) => p.id === draft.id);
  if (i >= 0) items.pieces[i] = obj; else items.pieces.push(obj);
  saveItems(items); registerUserSkins(); equip("piece", obj.id);
  toast("Peça salva! ⚽"); draft = null; mode = "piece"; render();
}
function saveWall(){
  const name = prompt("Nome da barreira:", "Minha barreira"); if (!name) return;
  const items = getItems();
  const obj = { id: draft.id || uid("w"), name, cfg: { c1: draft.c1, c2: draft.c2, glow: draft.glow, layers: draft.layers.map((l) => ({ t: l.t, c1: l.c1, c2: l.c2, a: l.a })) } };
  const i = items.walls.findIndex((w) => w.id === draft.id);
  if (i >= 0) items.walls[i] = obj; else items.walls.push(obj);
  saveItems(items); registerUserSkins(); equip("wall", obj.id);
  toast("Barreira salva! 🧱"); draft = null; render();
}
function saveBoard(){
  const name = (ov.querySelector("#bName")?.value.trim()) || prompt("Nome do tabuleiro:", "Meu tabuleiro"); if (!name) return;
  const items = getItems();
  const obj = { id: draft.id || uid("b"), name, cfg: { bg: draft.bg, cell: draft.cell, border: draft.border } };
  const i = items.boards.findIndex((b) => b.id === draft.id);
  if (i >= 0) items.boards[i] = obj; else items.boards.push(obj);
  saveItems(items); registerUserSkins(); equip("board", obj.id);
  toast("Tabuleiro salvo! 🏟️"); draft = null; render();
}
function saveFrame(){
  const name = (ov.querySelector("#frName")?.value.trim()) || prompt("Nome da moldura:", "Minha moldura"); if (!name) return;
  const items = getItems();
  const obj = { id: draft.id || uid("f"), name, cfg: { c1: draft.c1, c2: draft.c2, w: draft.w, glow: draft.glow } };
  const i = items.frames.findIndex((f) => f.id === draft.id);
  if (i >= 0) items.frames[i] = obj; else items.frames.push(obj);
  saveItems(items); registerUserSkins(); applyUserFrames(); equip("frame", obj.id);
  toast("Moldura salva! 🖼️"); draft = null; render();
}

function findList(k){ return k === "set" ? null : getItems()[k]; }
function renameItem(k, id){
  if (openMenu) openMenu.remove();
  if (k === "set"){ const st = getSets().find((x) => x.id === id); const n = prompt("Novo nome:", st.name); if (n){ st.name = n; saveSets(getSets()); } }
  else { const list = findList(k), it = list.find((x) => x.id === id); const n = prompt("Novo nome:", it.name); if (n){ it.name = n; saveItems(getItems()); } }
  render();
}
function editItem(k, id){
  if (openMenu) openMenu.remove();
  const list = findList(k), it = list.find((x) => x.id === id); if (!it) return;
  mode = k === "pieces" ? "piece" : k === "walls" ? "wall" : k === "boards" ? "board" : "frame";
  draft = JSON.parse(JSON.stringify(it.cfg)); draft.id = it.id; draft._name = it.name;
  if (!draft.layers) draft.layers = [{ t: "grad", c1: draft.c1, c2: draft.c2, a: mode === "wall" ? 180 : 135, x: 50, y: 50, s: 60 }];
  draft.sel = 0; draft.tool = "cor";
  render();
}
function dupItem(k, id){
  if (openMenu) openMenu.remove();
  if (k === "set"){ const st = getSets().find((x) => x.id === id); saveSets(getSets().concat([Object.assign({}, st, { id: uid("set"), name: st.name + " (cópia)" })])); }
  else { const list = findList(k), it = list.find((x) => x.id === id); list.push({ id: uid(k[0]), name: it.name + " (cópia)", cfg: JSON.parse(JSON.stringify(it.cfg)) }); saveItems(getItems()); registerUserSkins(); }
  render();
}
function delItem(k, id){
  if (openMenu) openMenu.remove();
  if (!confirm("Apagar esta criação?")) return;
  if (k === "set") saveSets(getSets().filter((x) => x.id !== id));
  else { const items = getItems(); items[k] = items[k].filter((x) => x.id !== id); saveItems(items); registerUserSkins(); }
  render();
}