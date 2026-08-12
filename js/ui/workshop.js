/* =============================================================
   Quoridor Arena — ui/workshop.js
   PERSONALIZAÇÃO DA BOLINHA (versão limpa e estável)
   ============================================================= */
import { SKIN_CATALOG } from "../core/constants.js";
import { getSettings, setSettings } from "../services/storage.js";
import { toast, SFX } from "./effects.js";

const $ = (id) => document.getElementById(id);
const LS = "qa_ws_pieces";
const load = () => { try { return JSON.parse(localStorage.getItem(LS)) || []; } catch (_){ return []; } };
const save = (d) => localStorage.setItem(LS, JSON.stringify(d));
const uid = () => "p" + Date.now().toString(36);
const esc = (s) => String(s ?? "").replace(/[<>&"]/g, (c) => ({ "<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;" }[c]));

/* ── símbolos SVG ── */
function svg(inner){ return 'url("data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' + inner + '</svg>') + '")'; }
const SYMS = [
  svg('<circle cx="12" cy="12" r="9" fill="%23fff"/>'),
  svg('<circle cx="12" cy="12" r="8" fill="none" stroke="%23fff" stroke-width="3"/>'),
  svg('<path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" fill="%23fff"/>'),
  svg('<path d="M12 3l9 16H3z" fill="%23fff"/>'),
  svg('<path d="M12 21s-7-4.6-9.3-9C1 8.5 2.6 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.4 0 5 3.5 3.3 7-2.3 4.4-9.3 9-9.3 9z" fill="%23fff"/>'),
  svg('<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="%23fff"/>'),
  svg('<path d="M3 7l4 4 5-7 5 7 4-4-2 12H5z" fill="%23fff"/>'),
  svg('<path d="M12 2l8 3v6c0 5-3.5 8-8 11-4.5-3-8-6-8-11V5z" fill="%23fff"/>'),
  svg('<path d="M12 2c1 3-1 4-2 6-1 2 0 3 0 3s-2-1-2-3c-2 2-3 4-3 6a7 7 0 0014 0c0-4-3-6-4-9-1 2-2 2-3 1z" fill="%23fff"/>'),
  svg('<path d="M5 5l14 14M19 5L5 19" stroke="%23fff" stroke-width="3" stroke-linecap="round"/>'),
  svg('<path d="M12 4v16M4 12h16" stroke="%23fff" stroke-width="3" stroke-linecap="round"/>'),
  svg('<path d="M12 2l8 10-8 10-8-10z" fill="%23fff"/>')
];

/* ── bandeiras (img/flags/*.png) ── */
const FLAGS = ["brasil","argentina","uruguai","portugal","espanha","alemanha","franca","inglaterra","italia","eua","japao","mexico"]
  .map((n) => "img/flags/" + n + ".png");

/* ── CSS da bolinha ── */
export function pieceCss(c){
  const parts = [];
  if (c.text){
    const t = svg('<text x="12" y="16" font-size="13" font-family="Arial Black,Arial" font-weight="900" text-anchor="middle" fill="' + encodeURIComponent(c.tcol || "#fff") + '">' + String(c.text).replace(/</g,"").slice(0,4) + '</text>');
    parts.push(t + " center/58% no-repeat");
  }
  for (const l of (c.layers || [])){
    if (l.t === "grad") parts.push("linear-gradient(" + (l.a||135) + "deg," + l.c1 + "," + l.c2 + ")");
    else if (l.t === "solid") parts.push(l.c1);
    else parts.push(l.src + " " + (l.x||50) + "% " + (l.y||50) + "% / " + (l.s||60) + "% no-repeat");
  }
  if (!parts.length) parts.push("linear-gradient(135deg," + (c.c1||"#ef4444") + "," + (c.c2||"#7f1d1d") + ")");
  const radius = c.shape === "square" ? "18%" : c.shape === "hex" ? "25%" : "50%";
  return {
    background: parts.join(", "),
    borderRadius: radius,
    border: c.bw ? (c.bw + "px solid " + (c.bc||"#000")) : "none",
    boxShadow: c.glow ? ("0 0 " + c.glow + "px " + (c.c1||"#fff")) : "none",
    transform: "rotate(" + (c.rot||0) + "deg)"
  };
}
export function pieceBg(c){ return pieceCss(c).background; }

/* ── compatibilidade com o jogo ── */
export function registerUserSkins(){
  for (let i = SKIN_CATALOG.length - 1; i >= 0; i--) if (SKIN_CATALOG[i].user) SKIN_CATALOG.splice(i, 1);
  for (const p of load())
    SKIN_CATALOG.push({ id: p.id, cat: "piece", name: p.name, swatch: [p.cfg.c1||"#ef4444", p.cfg.c2||"#7f1d1d"], badge: pieceBg(p.cfg), free: true, user: true });
}
export function mainColorFor(id, color, online){
  const u = load().find((p) => p.id === id);
  if (u) return (online || color === "red") ? (u.cfg.c1||"#ef4444") : "#3b82f6";
  const it = SKIN_CATALOG.find((i) => i.cat === "piece" && i.id === id);
  if (it && it.badge && !online && color === "blue") return "#3b82f6";
  if (it && it.swatch) return it.swatch[color === "red" ? 0 : 1];
  return color === "red" ? "#ef4444" : "#3b82f6";
}
export function userWallBg(){ return null; }
export function applyUserBoard(){}
export function applyUserFrames(){}
export function getItems(){ return { pieces: load(), walls: [], boards: [], frames: [] }; }
export const getSets = () => [];
export const TITLES = [];
export const titleOf = () => null;
export function equip(kind, id){
  if (kind !== "piece") return;
  const s = getSettings(); s.piece = id; setSettings(s); SFX.click();
}

/* ── CSS do editor ── */
(function(){
  let st = document.getElementById("wsCss");
  if (!st){ st = document.createElement("style"); st.id = "wsCss"; document.head.appendChild(st); }
  st.textContent = `
.ws-pbtn{display:block;width:100%;margin:14px 0 6px;padding:13px;border-radius:14px;border:none;background:linear-gradient(135deg,var(--accent,#2f7fd6),#7c3aed);color:#fff;font-size:14px;font-weight:800;box-shadow:0 6px 18px rgba(0,0,0,.25);cursor:pointer}
#wsOv{position:fixed;inset:0;z-index:97;background:var(--bg,#0f1218);display:flex;flex-direction:column;overflow:hidden}
#wsOv .ws-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line,#2a2f3a)}
#wsOv .ws-head h2{margin:0;font-size:17px;flex:1;color:var(--text,#eee)}
#wsOv .ws-body{flex:1;overflow-y:auto;padding:12px 14px 24px}
#wsOv .ws-stage{display:flex;justify-content:center;padding:4px 0 16px}
#wsOv .ws-ball{width:150px;height:150px;transition:all .12s}
#wsOv .ws-tools{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:14px}
#wsOv .ws-tool{width:48px;height:48px;border-radius:13px;border:1px solid var(--line,#2a2f3a);background:var(--card,#161b26);color:var(--text,#eee);font-size:19px;cursor:pointer;display:flex;align-items:center;justify-content:center}
#wsOv .ws-tool.on{border-color:var(--accent,#2f7fd6);box-shadow:0 0 0 2px var(--accent,#2f7fd6)}
#wsOv .ws-sec{font-size:11px;letter-spacing:.12em;opacity:.6;margin:14px 2px 8px;text-transform:uppercase;color:var(--text,#eee)}
#wsOv .ws-strip{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none}
#wsOv .ws-strip::-webkit-scrollbar{display:none}
#wsOv .ws-chip{flex:0 0 auto;width:44px;height:44px;border-radius:11px;border:1px solid var(--line,#2a2f3a);background:#222;cursor:pointer;display:flex;align-items:center;justify-content:center;overflow:hidden}
#wsOv .ws-chip img{width:100%;height:100%;object-fit:cover}
#wsOv .ws-chip.on{border-color:var(--accent,#2f7fd6);box-shadow:0 0 0 2px var(--accent,#2f7fd6)}
#wsOv .ws-row{display:flex;gap:10px;align-items:center;font-size:12px;margin:9px 0;color:var(--text,#eee)}
#wsOv .ws-row label{min-width:64px;opacity:.8}
#wsOv .ws-row input[type=color]{width:40px;height:32px;border:none;background:none;padding:0;cursor:pointer}
#wsOv .ws-row input[type=range]{flex:1}
#wsOv .ws-row input[type=text],#wsOv .ws-row select{flex:1;padding:9px;border-radius:9px;border:1px solid var(--line,#2a2f3a);background:var(--card,#161b26);color:var(--text,#eee);font-size:13px}
#wsOv .ws-btn{padding:12px;border-radius:12px;border:none;background:var(--accent,#2f7fd6);color:#fff;font-size:13px;font-weight:700;cursor:pointer}
#wsOv .ws-btn.ghost{background:transparent;border:1px solid var(--line,#2a2f3a);color:var(--text,#eee)}
#wsOv .ws-actions{display:flex;gap:8px;margin-top:16px}
#wsOv .ws-actions .ws-btn{flex:1}
#wsOv .ws-item{display:flex;align-items:center;gap:10px;padding:9px 11px;border:1px solid var(--line,#2a2f3a);border-radius:13px;margin-bottom:8px;background:var(--card,#161b26)}
#wsOv .ws-item .pv{width:36px;height:36px;flex:0 0 auto}
#wsOv .ws-item .nm{flex:1;font-size:13px;color:var(--text,#eee);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#wsOv .ws-item .eq{font-size:11px;color:var(--accent,#2f7fd6);font-weight:700;cursor:pointer}
#wsOv .ws-dots{position:relative}
#wsOv .ws-dots>button{width:36px;height:36px;border-radius:9px;border:1px solid var(--line,#2a2f3a);background:transparent;color:var(--text,#eee);font-size:17px;cursor:pointer}
#wsOv .ws-menu{position:absolute;right:0;top:42px;background:var(--card,#161b26);border:1px solid var(--line,#2a2f3a);border-radius:11px;padding:5px;z-index:9;min-width:128px;box-shadow:0 10px 28px rgba(0,0,0,.5)}
#wsOv .ws-menu div{padding:9px 11px;font-size:12px;border-radius:8px;cursor:pointer;color:var(--text,#eee)}
#wsOv .ws-menu div:hover{background:var(--accent,#2f7fd6);color:#fff}
`;
})();

/* ── estado ── */
let ov = null, draft = null, openMenu = null;

/* botão embaixo da aba peça */
export function initWorkshop(){
  const scr = document.querySelector('[data-screen="skins"]');
  if (!scr || scr.dataset.wsReady) return;
  scr.dataset.wsReady = "1";
  const inject = () => {
    scr.querySelectorAll(".ws-pbtn").forEach((x) => x.remove());
    const cat = scr.querySelector(".skin-tabs .tab.active")?.dataset?.cat;
    if (cat && cat !== "piece") return;
    const b = document.createElement("button");
    b.className = "ws-pbtn";
    b.textContent = "🎨 Personalizar Peça";
    b.onclick = () => openEditor();
    ($("skinsList")?.parentElement || scr).appendChild(b);
  };
  scr.querySelectorAll(".skin-tabs .tab").forEach((t) => t.addEventListener("click", () => setTimeout(inject, 30)));
  inject();
}

export function openEditor(editCfg){
  registerUserSkins();
  closeEditor();
  draft = editCfg || { c1:"#ef4444", c2:"#7f1d1d", layers:[{t:"grad",c1:"#ef4444",c2:"#7f1d1d",a:135}], shape:"circle", bw:0, bc:"#000000", glow:0, rot:0, text:"", tcol:"#ffffff", sel:0, tool:"cor" };
  ov = document.createElement("div");
  ov.id = "wsOv";
  ov.innerHTML = '<div class="ws-head"><button class="mini-btn" id="wsBack">← Voltar</button><h2>🎨 Personalizar Peça</h2></div><div class="ws-body" id="wsBody"></div>';
  document.body.appendChild(ov);
  $("wsBack").onclick = closeEditor;
  document.addEventListener("pointerdown", outside);
  render();
}
export function closeEditor(){ const o = document.getElementById("wsOv"); if (o) o.remove(); ov = null; document.removeEventListener("pointerdown", outside); }
function outside(e){ if (openMenu && !e.target.closest(".ws-dots")){ openMenu.remove(); openMenu = null; } }

function render(){
  const d = draft, st = pieceCss(d);
  let h = '<div class="ws-stage"><div class="ws-ball" id="pvBall"></div></div>';
  h += '<div class="ws-tools">' +
    tbtn("🎨","cor","Cores") + tbtn("✏️","txt","Texto") + tbtn("⬛","sym","Símbolos") +
    tbtn("🖼️","img","Imagem") + tbtn("⭕","form","Forma") + tbtn("↔️","pos","Mover") +
    tbtn("🔄","rot","Girar") + tbtn("✨","fx","Brilho") + '</div>';
  h += panel();
  h += saved();
  $("wsBody").innerHTML = h;
  const el = $("pvBall");
  if (el){ el.style.background = st.background; el.style.borderRadius = st.borderRadius; el.style.border = st.border; el.style.boxShadow = st.boxShadow; el.style.transform = st.transform; }
  bind();
}
function tbtn(ic,k,t){ return '<button class="ws-tool'+((draft.tool||"cor")===k?" on":"")+'" data-tool="'+k+'" title="'+t+'">'+ic+'</button>'; }

function panel(){
  const d = draft, L = d.layers, cur = L[d.sel] || L[0];
  const tool = d.tool || "cor";
  let h = "";
  if (tool === "cor"){
    h += sec("Camadas");
    h += '<div class="ws-strip">' + L.map((l,i)=>'<div class="ws-chip'+(i===d.sel?" on":"")+'" data-sellayer="'+i+'" style="background:'+(l.t==="grad"?"linear-gradient("+(l.a||135)+"deg,"+l.c1+","+l.c2+")":(l.t==="solid"?l.c1:"#444"))+'"></div>').join("") +
      '<div class="ws-chip" data-addlayer="grad" title="Nova camada">＋</div></div>';
    h += row("Tipo", '<select id="fType"><option value="grad"'+(cur.t==="grad"?" selected":"")+'>Gradiente</option><option value="solid"'+(cur.t==="solid"?" selected":"")+'>Cor sólida</option></select>');
    h += row("Cor 1", '<input type="color" id="fC1" value="'+(cur.c1||"#ef4444")+'">');
    if (cur.t === "grad"){ h += row("Cor 2", '<input type="color" id="fC2" value="'+(cur.c2||"#7f1d1d")+'">'); h += row("Ângulo", '<input type="range" id="fA" min="0" max="360" value="'+(cur.a||135)+'">'); }
    if (L.length > 1) h += row("", '<button class="ws-btn ghost" id="fDel">🗑 Remover camada</button>');
  } else if (tool === "txt"){
    h += row("Texto", '<input type="text" id="fText" maxlength="4" placeholder="Ex: 10" value="'+esc(d.text||"")+'">');
    h += row("Cor", '<input type="color" id="fTcol" value="'+(d.tcol||"#ffffff")+'">');
  } else if (tool === "sym"){
    h += sec("Símbolos");
    h += '<div class="ws-strip">' + SYMS.map((s,i)=>'<div class="ws-chip" data-sym="'+i+'" style="background:'+s+' center/72% no-repeat,#333"></div>').join("") + '</div>';
  } else if (tool === "img"){
    h += sec("Sua foto");
    h += row("", '<input type="file" id="fFile" accept="image/*" style="font-size:12px">');
    h += sec("Bandeiras");
    h += '<div class="ws-strip">' + FLAGS.map((f,i)=>'<div class="ws-chip" data-flag="'+i+'"><img src="'+f+'" alt="" onerror="this.style.opacity=.2"></div>').join("") + '</div>';
  } else if (tool === "form"){
    h += row("Formato", '<select id="fShape"><option value="circle"'+(d.shape==="circle"?" selected":"")+'>Redondo</option><option value="square"'+(d.shape==="square"?" selected":"")+'>Quadrado</option><option value="hex"'+(d.shape==="hex"?" selected":"")+'>Arredondado</option></select>');
    h += row("Borda", '<input type="range" id="fBw" min="0" max="12" value="'+(d.bw||0)+'">');
    h += row("Cor borda", '<input type="color" id="fBc" value="'+(d.bc||"#000000")+'">');
  } else if (tool === "pos"){
    h += row("Zoom", '<input type="range" id="fS" min="10" max="220" value="'+(cur.s||60)+'">');
    h += row("↔ pos", '<input type="range" id="fX" min="0" max="100" value="'+(cur.x||50)+'">');
    h += row("↕ pos", '<input type="range" id="fY" min="0" max="100" value="'+(cur.y||50)+'">');
  } else if (tool === "rot"){
    h += row("Girar", '<input type="range" id="fRot" min="-180" max="180" value="'+(d.rot||0)+'">');
  } else if (tool === "fx"){
    h += row("Brilho", '<input type="range" id="fGlow" min="0" max="30" value="'+(d.glow||0)+'">');
  }
  h += '<div class="ws-actions"><button class="ws-btn ghost" id="fReset">↺ Padrão</button><button class="ws-btn" id="fSave">💾 Salvar peça</button></div>';
  return h;
}
function saved(){
  const items = load(), eq = getSettings().piece;
  let h = '<div class="ws-sec">Minhas peças</div>';
  if (!items.length) h += '<p style="font-size:12px;opacity:.55;color:var(--text,#eee)">Nenhuma peça criada ainda.</p>';
  h += items.map((it)=>{
    const st = pieceCss(it.cfg);
    return '<div class="ws-item"><span class="pv" style="background:'+st.background+';border-radius:'+st.borderRadius+';border:'+st.border+';box-shadow:'+st.boxShadow+'"></span>'+
      '<span class="nm">'+esc(it.name)+(eq===it.id?' <span style="color:var(--accent,#2f7fd6)">• equipada</span>':'')+'</span>'+
      '<span class="eq" data-eq="'+it.id+'">Equipar</span>'+
      '<span class="ws-dots"><button data-dots="'+it.id+'">⋮</button></span></div>';
  }).join("");
  return h;
}
function sec(t){ return '<div class="ws-sec">'+t+'</div>'; }
function row(l,c){ return '<div class="ws-row"><label>'+l+'</label>'+c+'</div>'; }

function bind(){
  if (!ov) return;
  const q = (s) => $(s);
  const live = () => { const el=$("pvBall"); if(!el)return; const st=pieceCss(draft); el.style.background=st.background; el.style.borderRadius=st.borderRadius; el.style.border=st.border; el.style.boxShadow=st.boxShadow; el.style.transform=st.transform; };
  const cur = () => draft.layers[draft.sel] || draft.layers[0];

  ov.querySelectorAll("[data-tool]").forEach((b)=>b.onclick=()=>{ draft.tool=b.dataset.tool; render(); });
  ov.querySelectorAll("[data-sellayer]").forEach((b)=>b.onclick=()=>{ draft.sel=+b.dataset.sellayer; render(); });
  ov.querySelectorAll("[data-addlayer]").forEach((b)=>b.onclick=()=>{ draft.layers.push({t:b.dataset.addlayer,c1:"#22d3ee",c2:"#0e7490",a:135,x:50,y:50,s:60}); draft.sel=draft.layers.length-1; render(); });

  if (q("fType")) q("fType").onchange=(e)=>{ cur().t=e.target.value; render(); };
  if (q("fC1")) q("fC1").oninput=(e)=>{ cur().c1=e.target.value; if(draft.layers.length===1) draft.c1=e.target.value; live(); };
  if (q("fC2")) q("fC2").oninput=(e)=>{ cur().c2=e.target.value; if(draft.layers.length===1) draft.c2=e.target.value; live(); };
  if (q("fA"))  q("fA").oninput =(e)=>{ cur().a=+e.target.value; live(); };
  if (q("fDel")) q("fDel").onclick=()=>{ draft.layers.splice(draft.sel,1); draft.sel=0; render(); };
  if (q("fText")) q("fText").oninput=(e)=>{ draft.text=e.target.value; live(); };
  if (q("fTcol")) q("fTcol").oninput=(e)=>{ draft.tcol=e.target.value; live(); };
  ov.querySelectorAll("[data-sym]").forEach((b)=>b.onclick=()=>addLayer(SYMS[+b.dataset.sym],60));
  ov.querySelectorAll("[data-flag]").forEach((b)=>b.onclick=()=>addLayer(FLAGS[+b.dataset.flag],72));
  if (q("fFile")) q("fFile").onchange=(e)=>readFile(e,(src)=>addLayer(src,72));
  if (q("fShape")) q("fShape").onchange=(e)=>{ draft.shape=e.target.value; live(); };
  if (q("fBw")) q("fBw").oninput=(e)=>{ draft.bw=+e.target.value; live(); };
  if (q("fBc")) q("fBc").oninput=(e)=>{ draft.bc=e.target.value; live(); };
  if (q("fS")) q("fS").oninput=(e)=>{ cur().s=+e.target.value; live(); };
  if (q("fX")) q("fX").oninput=(e)=>{ cur().x=+e.target.value; live(); };
  if (q("fY")) q("fY").oninput=(e)=>{ cur().y=+e.target.value; live(); };
  if (q("fRot")) q("fRot").oninput=(e)=>{ draft.rot=+e.target.value; live(); };
  if (q("fGlow")) q("fGlow").oninput=(e)=>{ draft.glow=+e.target.value; live(); };
  if (q("fReset")) q("fReset").onclick=()=>{ draft={c1:"#ef4444",c2:"#7f1d1d",layers:[{t:"grad",c1:"#ef4444",c2:"#7f1d1d",a:135}],shape:"circle",bw:0,bc:"#000000",glow:0,rot:0,text:"",tcol:"#ffffff",sel:0,tool:"cor"}; render(); };
  if (q("fSave")) q("fSave").onclick=savePiece;

  ov.querySelectorAll("[data-eq]").forEach((b)=>b.onclick=()=>{ equip("piece",b.dataset.eq); toast("Peça equipada! ✔"); render(); });
  ov.querySelectorAll("[data-dots]").forEach((b)=>b.onclick=(ev)=>{
    ev.stopPropagation();
    if (openMenu) openMenu.remove();
    const id = b.dataset.dots;
    const m = document.createElement("div"); m.className = "ws-menu";
    m.innerHTML = '<div data-m="ren">✏️ Nomear</div><div data-m="ed">🎨 Editar</div><div data-m="dup">⧉ Duplicar</div><div data-m="del">🗑 Apagar</div>';
    b.parentElement.appendChild(m); openMenu = m;
    m.querySelector('[data-m="ren"]').onclick=()=>renameP(id);
    m.querySelector('[data-m="ed"]').onclick=()=>editP(id);
    m.querySelector('[data-m="dup"]').onclick=()=>dupP(id);
    m.querySelector('[data-m="del"]').onclick=()=>delP(id);
  });
}

function addLayer(src,s){ draft.layers.push({t:"img",src:src,x:50,y:50,s:s}); draft.sel=draft.layers.length-1; draft.tool="pos"; render(); }
function readFile(e,cb){
  const f=e.target.files&&e.target.files[0];
  if(!f||!f.type.startsWith("image/")){toast("Arquivo inválido.");return;}
  if(f.size>3*1024*1024){toast("Imagem muito grande (máx 3MB).");return;}
  const rd=new FileReader();
  rd.onload=()=>{const im=new Image();im.onload=()=>{const cv=document.createElement("canvas");cv.width=160;cv.height=160;const cx=cv.getContext("2d");const m=Math.min(im.width,im.height);cx.drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,160,160);cb(cv.toDataURL("image/png"));};im.src=rd.result;};
  rd.readAsDataURL(f);
}

function savePiece(){
  const name = prompt("Nome da peça:", draft._name || "Minha peça"); if (!name) return;
  const items = load();
  const cfg = { c1:draft.c1, c2:draft.c2, shape:draft.shape, bw:draft.bw, bc:draft.bc, glow:draft.glow, rot:draft.rot, text:draft.text, tcol:draft.tcol,
    layers: draft.layers.map((l)=> l.t==="img" ? {t:"img",src:l.src,x:l.x,y:l.y,s:l.s} : {t:l.t,c1:l.c1,c2:l.c2,a:l.a}) };
  const obj = { id: draft.id || uid(), name, cfg };
  const i = items.findIndex((p)=>p.id===draft.id);
  if (i>=0) items[i]=obj; else items.push(obj);
  save(items); registerUserSkins(); equip("piece", obj.id);
  toast("Peça salva! ⚽"); closeEditor();
}
function renameP(id){ if(openMenu)openMenu.remove(); const items=load(); const it=items.find((p)=>p.id===id); const n=prompt("Novo nome:",it.name); if(n){it.name=n; save(items);} render(); }
function editP(id){ if(openMenu)openMenu.remove(); const it=load().find((p)=>p.id===id); if(!it)return; draft=JSON.parse(JSON.stringify(it.cfg)); draft.id=it.id; draft._name=it.name; if(!draft.layers)draft.layers=[{t:"grad",c1:draft.c1,c2:draft.c2,a:135,x:50,y:50,s:60}]; draft.sel=0; draft.tool="cor"; render(); }
function dupP(id){ if(openMenu)openMenu.remove(); const items=load(),it=items.find((p)=>p.id===id); items.push({id:uid(),name:it.name+" (cópia)",cfg:JSON.parse(JSON.stringify(it.cfg))}); save(items); registerUserSkins(); render(); }
function delP(id){ if(openMenu)openMenu.remove(); if(!confirm("Apagar esta peça?"))return; const items=load().filter((p)=>p.id!==id); save(items); registerUserSkins(); render(); }