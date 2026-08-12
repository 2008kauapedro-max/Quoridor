/* =============================================================
   Quoridor Arena — ui/workshop.js
   OFICINA: peça · barreiras · tabuleiro · moldura · título · conjuntos
   ============================================================= */
import { SKIN_CATALOG, pieceBgFor } from "../core/constants.js";
import { getSettings, setSettings } from "../services/storage.js";
import { toast, SFX } from "./effects.js";

const LS_ITEMS = "qa_ws_items";
const LS_SETS  = "qa_ws_sets";
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (_){ return d; } };
export function getItems(){
  return Object.assign({ pieces: [], walls: [], boards: [], frames: [] }, load(LS_ITEMS, {}));
}
const saveItems = (d) => localStorage.setItem(LS_ITEMS, JSON.stringify(d));
export const getSets = () => load(LS_SETS, []);
const saveSets = (s) => localStorage.setItem(LS_SETS, JSON.stringify(s));
const uid = (p) => p + Date.now().toString(36);
const esc = (s) => String(s ?? "").replace(/[<>&"]/g, (c) => ({ "<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;" }[c]));

/* ═══════════ TÍTULOS ═══════════ */
export const TITLES = [
  { id: "novato",   name: "Novato" },
  { id: "aprendiz", name: "Aprendiz" },
  { id: "veterano", name: "Veterano",             style: "color:#38bdf8" },
  { id: "tatico",   name: "Tático",               style: "color:#a78bfa" },
  { id: "elite",    name: "Elite",                style: "color:#a78bfa" },
  { id: "pro",      name: "Pro Player",           style: "color:#f472b6" },
  { id: "mestre",   name: "Mestre das Barreiras", style: "color:#fbbf24" },
  { id: "lenda",    name: "Lenda",                style: "color:#fbbf24;text-shadow:0 0 10px rgba(251,191,36,.55)" }
];
export const titleOf = (id) => TITLES.find((t) => t.id === id) || null;

/* ═══════════ PRESETS DA OFICINA ═══════════ */
const WALL_PRESETS = [
  { name: "Clássica", cfg: { c1: "#8a5a2e", c2: "#5b3a1c", style: "degrade" } },
  { name: "Neon",     cfg: { c1: "#22d3ee", c2: "#0e7490", style: "neon" } },
  { name: "Fogo",     cfg: { c1: "#f97316", c2: "#7c2d12", style: "degrade" } },
  { name: "Sombra",   cfg: { c1: "#334155", c2: "#0f172a", style: "degrade" } },
  { name: "Ouro",     cfg: { c1: "#fbbf24", c2: "#92400e", style: "neon" } },
  { name: "Listrada", cfg: { c1: "#000000", c2: "#ffffff", style: "listrado" } }
];
const BOARD_PRESETS = [
  { name: "Clássico", cfg: { bg: "#b98a5a", cell: "#e9d7b7", border: "#8a5a2e" } },
  { name: "Neon",     cfg: { bg: "#1d2330", cell: "#273041", border: "#38bdf8" } },
  { name: "Dark",     cfg: { bg: "#111827", cell: "#1f2937", border: "#4b5563" } },
  { name: "Rubro",    cfg: { bg: "#1a0505", cell: "#2b0a0a", border: "#ef4444" } },
  { name: "Azul",     cfg: { bg: "#04101f", cell: "#0a1a2f", border: "#3b82f6" } },
  { name: "Roxo",     cfg: { bg: "#150a24", cell: "#221336", border: "#a78bfa" } },
  { name: "Cyber",    cfg: { bg: "#0f172a", cell: "#16233d", border: "#22d3ee" } },
  { name: "Ouro",     cfg: { bg: "#221a05", cell: "#332a0d", border: "#fbbf24" } },
  { name: "Gelo",     cfg: { bg: "#0a2530", cell: "#10374a", border: "#a5f3fc" } },
  { name: "Floresta", cfg: { bg: "#07230f", cell: "#0d3319", border: "#4ade80" } }
];

/* ═══════════ BUILDERS VISUAIS ═══════════ */
export function pieceBg(c){
  const base = "radial-gradient(circle at 35% 30%, " + c.c1 + " 0%, " + c.c2 + " 95%)";
  if (!c.img) return base;
  return 'url("' + c.img + '") ' + c.x + "% " + c.y + "% / auto " + c.zoom + "% no-repeat, " + base;
}
export function wallBg(c){
  if (c.style === "listrado")
    return "repeating-linear-gradient(45deg," + c.c1 + " 0 8px," + c.c2 + " 8px 16px)";
  return "linear-gradient(180deg," + c.c1 + "," + c.c2 + ")";
}
function styleTag(id, css){
  let st = document.getElementById(id);
  if (!st){ st = document.createElement("style"); st.id = id; document.head.appendChild(st); }
  st.textContent = css;
}
export function applyUserBoard(){
  const b = getItems().boards.find((x) => x.id === getSettings().skin);
  styleTag("wsBoardCss", b ? "#board{background:" + b.cfg.bg + "!important;border-color:" + b.cfg.border + "!important}#board .cell{background:" + b.cfg.cell + "!important}" : "");
}
export function applyUserFrames(){
  styleTag("wsFrameCss", getItems().frames.map((f) =>
    ".frm-" + f.id + "{border:3px solid " + f.cfg.c1 + "!important;box-shadow:0 0 6px " + f.cfg.c2 + "!important}").join(""));
}
export function registerUserSkins(){
  for (let i = SKIN_CATALOG.length - 1; i >= 0; i--) if (SKIN_CATALOG[i].user) SKIN_CATALOG.splice(i, 1);
  const it = getItems();
  for (const p of it.pieces) SKIN_CATALOG.push({ id: p.id, cat: "piece", name: p.name, swatch: [p.cfg.c1, p.cfg.c2], badge: pieceBg(p.cfg), free: true, user: true });
  for (const b of it.boards) SKIN_CATALOG.push({ id: b.id, cat: "board", name: b.name, swatch: [b.cfg.cell, b.cfg.bg], free: true, user: true });
  for (const f of it.frames) SKIN_CATALOG.push({ id: f.id, cat: "frame", name: f.name, swatch: [f.cfg.c1, f.cfg.c2], free: true, user: true });
  applyUserBoard(); applyUserFrames();
}
export function mainColorFor(id, color, online){
  const u = getItems().pieces.find((p) => p.id === id);
  if (u) return (online || color === "red") ? u.cfg.c1 : "#3b82f6";
  const it = SKIN_CATALOG.find((i) => i.cat === "piece" && i.id === id);
  if (it && it.badge && !online && color === "blue") return "#3b82f6";
  if (it && it.swatch) return it.swatch[color === "red" ? 0 : 1];
  return color === "red" ? "#ef4444" : "#3b82f6";
}
export function userWallBg(id){
  const w = getItems().walls.find((x) => x.id === id);
  return w ? wallBg(w.cfg) : null;
}

/* ═══════════ EQUIPAR ═══════════ */
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

/* ═══════════ CSS DA OFICINA ═══════════ */
styleTag("wsCss", `
#btnWorkshop{position:sticky;top:8px;z-index:6;display:block;margin:10px auto 12px;width:min(94%,360px);padding:13px;border-radius:14px;border:none;background:linear-gradient(135deg,var(--accent,#2f7fd6),#7c3aed);color:#fff;font-size:14px;font-weight:800;letter-spacing:.03em;box-shadow:0 6px 18px rgba(0,0,0,.28);cursor:pointer}
#wsOv{position:fixed;inset:0;z-index:97;background:var(--bg,#0f1218);display:flex;flex-direction:column;overflow:hidden}
#wsOv .ws-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line,#2a2f3a)}
#wsOv .ws-head h2{margin:0;font-size:17px;flex:1}
#wsOv .ws-prev{padding:10px 14px 4px;display:flex;gap:14px;align-items:center;justify-content:center}
#wsOv .ws-board{position:relative;width:132px;height:132px;border-radius:12px;border:3px solid;padding:6px;display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
#wsOv .ws-board i{border-radius:6px;display:block}
#wsOv .ws-board .wp{position:absolute;width:30px;height:30px;border-radius:50%}
#wsOv .ws-board .wh{position:absolute;height:8px;width:52px;border-radius:4px}
#wsOv .ws-board .wv{position:absolute;width:8px;height:52px;border-radius:4px}
#wsOv .ws-prof{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px}
#wsOv .ws-tabs{display:flex;gap:6px;overflow-x:auto;padding:10px 14px;scrollbar-width:none}
#wsOv .ws-tabs::-webkit-scrollbar{display:none}
#wsOv .ws-tab{flex:0 0 auto;padding:8px 14px;border-radius:999px;border:1px solid var(--line,#2a2f3a);background:transparent;color:var(--text,#eee);font-size:13px;cursor:pointer}
#wsOv .ws-tab.on{background:var(--accent,#2f7fd6);border-color:transparent;color:#fff}
#wsOv .ws-body{flex:1;overflow-y:auto;padding:4px 14px 20px}
#wsOv .ws-sec{font-size:11px;letter-spacing:.12em;opacity:.65;margin:14px 2px 8px;text-transform:uppercase}
#wsOv .ws-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
#wsOv .ws-card{position:relative;border:1px solid var(--line,#2a2f3a);border-radius:12px;padding:10px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;background:var(--card,#161b26);cursor:pointer;font-size:12px;color:var(--text,#eee)}
#wsOv .ws-card.on{border-color:var(--accent,#2f7fd6);box-shadow:0 0 0 2px var(--accent,#2f7fd6)}
#wsOv .ws-dot{width:34px;height:34px;border-radius:50%}
#wsOv .ws-bar{width:52px;height:10px;border-radius:4px}
#wsOv .ws-sq{width:34px;height:34px;border-radius:8px;border:2px solid}
#wsOv .ws-mine{margin:16px 0 8px;border:1px dashed var(--accent,#2f7fd6);border-radius:14px;padding:12px;display:flex;align-items:center;gap:10px;cursor:pointer}
#wsOv .ws-mine b{font-size:13px}
#wsOv .ws-mine span{font-size:11px;opacity:.7;display:block}
#wsOv .ws-mine .go{margin-left:auto;font-size:12px}
#wsOv .ws-acts{display:flex;gap:4px}
#wsOv .ws-acts button{font-size:10px;padding:4px 6px;border-radius:6px;border:1px solid var(--line,#2a2f3a);background:transparent;color:var(--text,#eee);cursor:pointer}
#wsOv .ws-ed{border:1px solid var(--line,#2a2f3a);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:10px;background:var(--card,#161b26)}
#wsOv .ws-row{display:flex;gap:10px;align-items:center;font-size:12px}
#wsOv .ws-row input[type=color]{width:40px;height:30px;border:none;background:none;padding:0}
#wsOv .ws-row input[type=range]{flex:1}
#wsOv .ws-row input[type=text]{flex:1;padding:8px;border-radius:8px;border:1px solid var(--line,#2a2f3a);background:transparent;color:var(--text,#eee)}
#wsOv .ws-btn{padding:10px;border-radius:10px;border:none;background:var(--accent,#2f7fd6);color:#fff;font-size:13px;cursor:pointer}
#wsOv .ws-btn.ghost{background:transparent;border:1px solid var(--line,#2a2f3a);color:var(--text,#eee)}
`);

/* ═══════════ BOTÃO FIXO NO TOPO + ABERTURA ═══════════ */
let ov = null, tab = "piece", editing = null, editKind = null;

export function initWorkshop(){
  const scr = document.querySelector('[data-screen="skins"]');
  if (!scr || document.getElementById("btnWorkshop")) return;
  const b = document.createElement("button");
  b.id = "btnWorkshop";
  b.textContent = "🎨 Personalizar";
  b.onclick = () => {
    const active = scr.querySelector(".skin-tabs .tab.active");
    const cat = active?.dataset?.cat;
    openWorkshop(cat === "board" ? "board" : cat === "frame" ? "frame" : "piece");
  };
  scr.prepend(b);
}

export function openWorkshop(startTab){
  registerUserSkins();
  closeWorkshop();
  ov = document.createElement("div");
  ov.id = "wsOv";
  ov.innerHTML =
    '<div class="ws-head"><button class="mini-btn" id="wsBack">←</button><h2>🎨 Oficina</h2></div>' +
    '<div class="ws-prev" id="wsPrev"></div>' +
    '<div class="ws-tabs" id="wsTabs"></div>' +
    '<div class="ws-body" id="wsBody"></div>';
  document.body.appendChild(ov);
  ov.querySelector("#wsBack").onclick = closeWorkshop;
  setTab(startTab || "piece");
}
export function closeWorkshop(){ const o = document.getElementById("wsOv"); if (o) o.remove(); ov = null; }

function setTab(t){
  tab = t; editing = null;
  const tabs = [["piece","Peça"],["wall","Barreiras"],["board","Tabuleiro"],["frame","Moldura"],["title","Título"],["sets","Conjuntos"]];
  ov.querySelector("#wsTabs").innerHTML = tabs.map(([k, n]) =>
    '<button class="ws-tab' + (k === t ? " on" : "") + '" data-t="' + k + '">' + n + "</button>").join("");
  ov.querySelectorAll(".ws-tab").forEach((b) => b.onclick = () => setTab(b.dataset.t));
  renderPrev(); renderBody();
}

function curCfg(){
  const s = getSettings();
  const it = getItems();
  const up = it.pieces.find((p) => p.id === s.piece);
  const uw = it.walls.find((w) => w.id === s.wall);
  const ub = it.boards.find((b) => b.id === s.skin);
  const uf = it.frames.find((f) => f.id === s.frame);
  return {
    piece: up ? pieceBg(up.cfg) : pieceBgFor(s.piece || "p-classic", "red", false),
    piece2: "#3b82f6",
    wall: uw ? wallBg(uw.cfg) : "linear-gradient(180deg,#8a5a2e,#5b3a1c)",
    board: ub ? ub.cfg : BOARD_PRESETS[0].cfg,
    frame: uf ? uf.cfg : null,
    title: titleOf(s.title)
  };
}

function renderPrev(){
  const c = curCfg();
  const b = c.board;
  ov.querySelector("#wsPrev").innerHTML =
    '<div class="ws-board" style="background:' + b.bg + ';border-color:' + b.border + '">' +
    Array.from({ length: 9 }, () => '<i style="background:' + b.cell + '"></i>').join("") +
    '<span class="wp" style="left:10px;top:10px;background:' + c.piece + '"></span>' +
    '<span class="wp" style="right:10px;bottom:10px;background:' + c.piece2 + '"></span>' +
    '<span class="wh" style="left:40px;top:52px;background:' + c.wall + '"></span>' +
    '<span class="wv" style="left:62px;top:40px;background:' + c.wall + '"></span></div>' +
    '<div class="ws-prof"><img class="rank-avatar' + (c.frame ? " frm-" + getSettings().frame : "") + '" src="icons/icon.svg" style="width:44px;height:44px">' +
    '<span style="' + (c.title?.style || "") + '">' + (c.title?.name || "Sem título") + "</span></div>";
}

function cardHtml(id, name, inner, on, acts){
  return '<div class="ws-card' + (on ? " on" : "") + '" data-id="' + id + '">' + inner +
    "<span>" + esc(name) + "</span>" +
    (acts ? '<div class="ws-acts">' + acts + "</div>" : "") + "</div>";
}

function renderBody(){
  const body = ov.querySelector("#wsBody");
  const s = getSettings();
  const items = getItems();
  let h = "";

  if (tab === "piece"){
    const official = SKIN_CATALOG.filter((i) => i.cat === "piece" && !i.user && !i.hide);
    if (official.length){
      h += '<div class="ws-sec">Skins do jogo</div><div class="ws-grid">';
      h += official.map((i) =>
        cardHtml(i.id, i.name, '<span class="ws-dot" style="background:' + pieceBgFor(i.id, "red", false) + '"></span>', s.piece === i.id)).join("");
      h += "</div>";
    }
    h += mineBanner("pieces", "Minhas peças");
    h += '<div class="ws-grid">' + items.pieces.map((p) =>
      cardHtml(p.id, p.name, '<span class="ws-dot" style="background:' + pieceBg(p.cfg) + '"></span>', s.piece === p.id,
        '<button data-a="ed">✏️</button><button data-a="dup">⧉</button><button data-a="del">🗑</button>')).join("") + "</div>";
    if (editing && editKind === "piece") h += pieceEditor();
  }

  if (tab === "wall"){
    h += '<div class="ws-sec">Estilos prontos</div><div class="ws-grid">';
    h += WALL_PRESETS.map((w, i) =>
      cardHtml("wp" + i, w.name, '<span class="ws-bar" style="background:' + wallBg(w.cfg) + '"></span>', false,
        '<button data-a="use">Usar</button>')).join("");
    h += "</div>" + mineBanner("walls", "Minhas barreiras");
    h += '<div class="ws-grid">' + items.walls.map((w) =>
      cardHtml(w.id, w.name, '<span class="ws-bar" style="background:' + wallBg(w.cfg) + '"></span>', s.wall === w.id,
        '<button data-a="ed">✏️</button><button data-a="dup">⧉</button><button data-a="del">🗑</button>')).join("") + "</div>";
    if (editing && editKind === "wall") h += wallEditor();
  }

  if (tab === "board"){
    h += '<div class="ws-sec">Temas prontos</div><div class="ws-grid">';
    h += BOARD_PRESETS.map((b, i) =>
      cardHtml("bp" + i, b.name, '<span class="ws-sq" style="background:' + b.cfg.cell + ';border-color:' + b.cfg.border + '"></span>', false,
        '<button data-a="use">Usar</button>')).join("");
    h += "</div>" + mineBanner("boards", "Meus tabuleiros");
    h += '<div class="ws-grid">' + items.boards.map((b) =>
      cardHtml(b.id, b.name, '<span class="ws-sq" style="background:' + b.cfg.cell + ';border-color:' + b.cfg.border + '"></span>', s.skin === b.id,
        '<button data-a="ed">✏️</button><button data-a="dup">⧉</button><button data-a="del">🗑</button>')).join("") + "</div>";
    if (editing && editKind === "board") h += boardEditor();
  }

  if (tab === "frame"){
    const official = SKIN_CATALOG.filter((i) => i.cat === "frame" && !i.user && !i.hide);
    if (official.length){
      h += '<div class="ws-sec">Molduras do jogo</div><div class="ws-grid">';
      h += official.map((i) =>
        cardHtml(i.id, i.name, '<img class="rank-avatar frm-' + i.id + '" src="icons/icon.svg" style="width:36px;height:36px">', s.frame === i.id)).join("");
      h += "</div>";
    }
    h += mineBanner("frames", "Minhas molduras");
    h += '<div class="ws-grid">' + items.frames.map((f) =>
      cardHtml(f.id, f.name, '<img class="rank-avatar frm-' + f.id + '" src="icons/icon.svg" style="width:36px;height:36px">', s.frame === f.id,
        '<button data-a="ed">✏️</button><button data-a="dup">⧉</button><button data-a="del">🗑</button>')).join("") + "</div>";
    if (editing && editKind === "frame") h += frameEditor();
  }

  if (tab === "title"){
    h += '<div class="ws-sec">Escolha seu título</div><div class="ws-grid">';
    h += TITLES.map((t) =>
      '<div class="ws-card' + (s.title === t.id ? " on" : "") + '" data-id="' + t.id + '"><span style="font-size:13px;' + (t.style || "") + '">' + t.name + "</span></div>").join("");
    h += "</div>";
  }

  if (tab === "sets"){
    const sets = getSets();
    h += '<button class="ws-btn" data-a="newset">＋ Criar conjunto com o visual atual</button>';
    h += '<div class="ws-sec">Meus conjuntos</div><div class="ws-grid">';
    h += sets.map((st) => {
      const up = items.pieces.find((p) => p.id === st.piece);
      return cardHtml(st.id, st.name,
        '<span class="ws-dot" style="background:' + (up ? pieceBg(up.cfg) : pieceBgFor(st.piece || "p-classic", "red", false)) + '"></span>',
        false,
        '<button data-a="use">Equipar</button><button data-a="dup">⧉</button><button data-a="ren">✏️</button><button data-a="del">🗑</button>');
    }).join("") + "</div>";
  }

  body.innerHTML = h;
  body.querySelectorAll(".ws-card").forEach((cd) => cd.addEventListener("click", (e) => onCard(e, cd)));
  body.querySelectorAll("[data-a]").forEach((b) => { if (!b.closest(".ws-card")) b.addEventListener("click", () => onAction(b.dataset.a)); });
}

function mineBanner(key, label){
  const n = getItems()[key].length;
  return '<div class="ws-mine" data-a="new:' + key + '"><div><b>✨ ' + label + '</b><span>' + n +
    ' criaç' + (n === 1 ? "ão" : "ões") + ' salva' + (n === 1 ? "" : "s") + '</span></div><span class="go">＋ criar →</span></div>';
}

function onCard(e, cd){
  const id = cd.dataset.id;
  const a = e.target.dataset.a;
  if (tab === "title"){ equip("title", id); setTab(tab); return; }
  if (tab === "sets"){
    const st = getSets().find((x) => x.id === id);
    if (!st) return;
    if (a === "use"){ equipSet(st); toast("Conjunto equipado! ✨"); setTab(tab); return; }
    if (a === "del"){ saveSets(getSets().filter((x) => x.id !== id)); setTab(tab); return; }
    if (a === "dup"){ saveSets(getSets().concat([Object.assign({}, st, { id: uid("set"), name: st.name + " (cópia)" })])); setTab(tab); return; }
    if (a === "ren"){ const n = prompt("Novo nome:", st.name); if (n){ st.name = n; saveSets(getSets()); setTab(tab); } return; }
    return;
  }
  const kind = { piece: "pieces", wall: "walls", board: "boards", frame: "frames" }[tab];
  const items = getItems();
  const mine = items[kind].find((x) => x.id === id);
  if (a === "ed" && mine){ editKind = tab; editing = JSON.parse(JSON.stringify(mine.cfg)); editing.id = mine.id; editing._name = mine.name; renderBody(); return; }
  if (a === "del" && mine){ items[kind] = items[kind].filter((x) => x.id !== id); saveItems(items); registerUserSkins(); setTab(tab); return; }
  if (a === "dup" && mine){ items[kind].push({ id: uid(tab[0]), name: mine.name + " (cópia)", cfg: JSON.parse(JSON.stringify(mine.cfg)) }); saveItems(items); registerUserSkins(); setTab(tab); return; }
  if (a === "use"){
    if (tab === "wall"){ startEdit("wall", JSON.parse(JSON.stringify(WALL_PRESETS[+id.slice(2)].cfg)), WALL_PRESETS[+id.slice(2)].name); return; }
    if (tab === "board"){ startEdit("board", JSON.parse(JSON.stringify(BOARD_PRESETS[+id.slice(2)].cfg)), BOARD_PRESETS[+id.slice(2)].name); return; }
    return;
  }
  equip(tab, id);
  setTab(tab);
}

function onAction(a){
  if (a === "newset"){
    const s = getSettings();
    const n = prompt("Nome do conjunto:", "Meu conjunto");
    if (!n) return;
    saveSets(getSets().concat([{ id: uid("set"), name: n, piece: s.piece, wall: s.wall, board: s.skin, frame: s.frame, title: s.title }]));
    toast("Conjunto salvo! 📦"); setTab("sets"); return;
  }
  const m = a.split(":");
  if (m[0] === "new"){
    const kind = { pieces: "piece", walls: "wall", boards: "board", frames: "frame" }[m[1]];
    startEdit(kind, null, "");
  }
}
function equipSet(st){
  if (st.piece) equip("piece", st.piece);
  if (st.wall) equip("wall", st.wall);
  if (st.board) equip("board", st.board);
  if (st.frame) equip("frame", st.frame);
  if (st.title) equip("title", st.title);
}
function startEdit(kind, cfg, name){
  editKind = kind;
  editing = cfg || (kind === "piece" ? { c1: "#ef4444", c2: "#7f1d1d", img: "", zoom: 70, x: 50, y: 50 }
    : kind === "wall" ? { c1: "#ef4444", c2: "#000000", style: "listrado" }
    : kind === "board" ? { bg: "#111827", cell: "#1f2937", border: "#4b5563" }
    : { c1: "#fbbf24", c2: "#92400e" });
  editing._name = editing._name || name;
  renderBody(); renderPrev();
}

/* ═══════════ EDITORES ═══════════ */
function pieceEditor(){
  const c = editing;
  setTimeout(() => {
    if (!ov || editKind !== "piece") return;
    const $q = (s) => ov.querySelector(s);
    const live = () => { const p = ov.querySelector("#wsPrev .wp"); if (p) p.style.background = pieceBg(c); };
    $q("#edC1").oninput = (e) => { c.c1 = e.target.value; live(); };
    $q("#edC2").oninput = (e) => { c.c2 = e.target.value; live(); };
    $q("#edZ").oninput = (e) => { c.zoom = +e.target.value; live(); };
    $q("#edX").oninput = (e) => { c.x = +e.target.value; live(); };
    $q("#edY").oninput = (e) => { c.y = +e.target.value; live(); };
    $q("#edNoImg").onclick = () => { c.img = ""; live(); };
    $q("#edReset").onclick = () => { Object.assign(c, { zoom: 70, x: 50, y: 50 }); live(); };
    $q("#edFile").onchange = (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f || !f.type.startsWith("image/")){ toast("Arquivo inválido."); return; }
      if (f.size > 3 * 1024 * 1024){ toast("Imagem muito grande (máx 3MB)."); return; }
      const rd = new FileReader();
      rd.onload = () => { const im = new Image(); im.onload = () => {
        const cv = document.createElement("canvas"); cv.width = 160; cv.height = 160;
        const cx = cv.getContext("2d"); const m = Math.min(im.width, im.height);
        cx.drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, 160, 160);
        c.img = cv.toDataURL("image/png"); live();
      }; im.src = rd.result; };
      rd.readAsDataURL(f);
    };
    $q("#edCancel").onclick = () => { editing = null; renderBody(); renderPrev(); };
    $q("#edSave").onclick = () => {
      const name = $q("#edName").value.trim() || "Minha peça";
      const items = getItems();
      const obj = { id: c.id || uid("p"), name, cfg: { c1: c.c1, c2: c.c2, img: c.img || "", zoom: c.zoom, x: c.x, y: c.y } };
      const i = items.pieces.findIndex((p) => p.id === c.id);
      if (i >= 0) items.pieces[i] = obj; else items.pieces.push(obj);
      saveItems(items); registerUserSkins(); equip("piece", obj.id);
      editing = null; toast("Peça salva! ⚽"); setTab("piece");
    };
  }, 0);
  return '<div class="ws-ed" style="margin-top:12px">' +
    '<div class="ws-row"><input type="text" id="edName" placeholder="Nome da peça" value="' + esc(c._name || "") + '"></div>' +
    '<div class="ws-row">Cor 1 <input type="color" id="edC1" value="' + c.c1 + '"> Cor 2 <input type="color" id="edC2" value="' + c.c2 + '"></div>' +
    '<div class="ws-row">Zoom <input type="range" id="edZ" min="20" max="200" value="' + (c.zoom || 70) + '"></div>' +
    '<div class="ws-row">↔ <input type="range" id="edX" min="0" max="100" value="' + (c.x || 50) + '"></div>' +
    '<div class="ws-row">↕ <input type="range" id="edY" min="0" max="100" value="' + (c.y || 50) + '"></div>' +
    '<div class="ws-row"><input type="file" id="edFile" accept="image/*"></div>' +
    '<div class="ws-row"><button class="ws-btn ghost" id="edNoImg">🚫 Sem imagem</button><button class="ws-btn ghost" id="edReset">↺ Padrão</button></div>' +
    '<div class="ws-row"><button class="ws-btn" id="edSave">💾 Salvar peça</button><button class="ws-btn ghost" id="edCancel">Cancelar</button></div></div>';
}

function wallEditor(){
  const c = editing;
  setTimeout(() => {
    if (!ov || editKind !== "wall") return;
    const $q = (s) => ov.querySelector(s);
    const live = () => ov.querySelectorAll("#wsPrev .wh, #wsPrev .wv").forEach((el) => el.style.background = wallBg(c));
    $q("#wC1").oninput = (e) => { c.c1 = e.target.value; live(); };
    $q("#wC2").oninput = (e) => { c.c2 = e.target.value; live(); };
    $q("#wSt").onchange = (e) => { c.style = e.target.value; live(); };
    $q("#wCancel").onclick = () => { editing = null; renderBody(); };
    $q("#wSave").onclick = () => {
      const name = $q("#wName").value.trim() || "Minha barreira";
      const items = getItems();
      const obj = { id: c.id || uid("w"), name, cfg: { c1: c.c1, c2: c.c2, style: c.style } };
      const i = items.walls.findIndex((w) => w.id === c.id);
      if (i >= 0) items.walls[i] = obj; else items.walls.push(obj);
      saveItems(items); registerUserSkins(); equip("wall", obj.id);
      editing = null; toast("Barreira salva! 🧱"); setTab("wall");
    };
  }, 0);
  return '<div class="ws-ed" style="margin-top:12px">' +
    '<div class="ws-row"><input type="text" id="wName" placeholder="Nome da barreira" value="' + esc(c._name || "") + '"></div>' +
    '<div class="ws-row">Cor 1 <input type="color" id="wC1" value="' + c.c1 + '"> Cor 2 <input type="color" id="wC2" value="' + c.c2 + '"></div>' +
    '<div class="ws-row">Estilo <select id="wSt" style="flex:1;padding:8px;border-radius:8px"><option value="listrado"' + (c.style === "listrado" ? " selected" : "") + '>Listrado</option><option value="degrade"' + (c.style === "degrade" ? " selected" : "") + '>Degradê</option><option value="neon"' + (c.style === "neon" ? " selected" : "") + '>Neon</option></select></div>' +
    '<div class="ws-row"><button class="ws-btn" id="wSave">💾 Salvar barreira</button><button class="ws-btn ghost" id="wCancel">Cancelar</button></div></div>';
}

function boardEditor(){
  const c = editing;
  setTimeout(() => {
    if (!ov || editKind !== "board") return;
    const $q = (s) => ov.querySelector(s);
    const live = () => {
      const bd = ov.querySelector("#wsPrev .ws-board");
      if (!bd) return;
      bd.style.background = c.bg; bd.style.borderColor = c.border;
      bd.querySelectorAll("i").forEach((i) => i.style.background = c.cell);
    };
    $q("#bBg").oninput = (e) => { c.bg = e.target.value; live(); };
    $q("#bCell").oninput = (e) => { c.cell = e.target.value; live(); };
    $q("#bBorder").oninput = (e) => { c.border = e.target.value; live(); };
    $q("#bCancel").onclick = () => { editing = null; renderBody(); };
    $q("#bSave").onclick = () => {
      const name = $q("#bName").value.trim() || "Meu tabuleiro";
      const items = getItems();
      const obj = { id: c.id || uid("b"), name, cfg: { bg: c.bg, cell: c.cell, border: c.border } };
      const i = items.boards.findIndex((b) => b.id === c.id);
      if (i >= 0) items.boards[i] = obj; else items.boards.push(obj);
      saveItems(items); registerUserSkins(); equip("board", obj.id);
      editing = null; toast("Tabuleiro salvo! 🏟️"); setTab("board");
    };
  }, 0);
  return '<div class="ws-ed" style="margin-top:12px">' +
    '<div class="ws-row"><input type="text" id="bName" placeholder="Nome do tabuleiro" value="' + esc(c._name || "") + '"></div>' +
    '<div class="ws-row">Fundo <input type="color" id="bBg" value="' + c.bg + '"></div>' +
    '<div class="ws-row">Casas <input type="color" id="bCell" value="' + c.cell + '"></div>' +
    '<div class="ws-row">Borda <input type="color" id="bBorder" value="' + c.border + '"></div>' +
    '<div class="ws-row"><button class="ws-btn" id="bSave">💾 Salvar tabuleiro</button><button class="ws-btn ghost" id="bCancel">Cancelar</button></div></div>';
}

function frameEditor(){
  const c = editing;
  setTimeout(() => {
    if (!ov || editKind !== "frame") return;
    const $q = (s) => ov.querySelector(s);
    $q("#fC1").oninput = (e) => { c.c1 = e.target.value; };
    $q("#fC2").oninput = (e) => { c.c2 = e.target.value; };
    $q("#fCancel").onclick = () => { editing = null; renderBody(); };
    $q("#fSave").onclick = () => {
      const name = $q("#fName").value.trim() || "Minha moldura";
      const items = getItems();
      const obj = { id: c.id || uid("f"), name, cfg: { c1: c.c1, c2: c.c2 } };
      const i = items.frames.findIndex((f) => f.id === c.id);
      if (i >= 0) items.frames[i] = obj; else items.frames.push(obj);
      saveItems(items); registerUserSkins(); applyUserFrames(); equip("frame", obj.id);
      editing = null; toast("Moldura salva! 🖼️"); setTab("frame");
    };
  }, 0);
  return '<div class="ws-ed" style="margin-top:12px">' +
    '<div class="ws-row"><input type="text" id="fName" placeholder="Nome da moldura" value="' + esc(c._name || "") + '"></div>' +
    '<div class="ws-row">Cor <input type="color" id="fC1" value="' + c.c1 + '"> Brilho <input type="color" id="fC2" value="' + c.c2 + '"></div>' +
    '<div class="ws-row"><button class="ws-btn" id="fSave">💾 Salvar moldura</button><button class="ws-btn ghost" id="fCancel">Cancelar</button></div></div>';
}