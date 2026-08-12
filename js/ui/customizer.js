/* =============================================================
   Quoridor Arena — ui/customizer.js
   Personaliza a bolinha: cores, foto com zoom/posição e escudos
   ============================================================= */
import { getCustomPiece, pieceBgFrom, TEAM_LOGOS } from "../core/constants.js";
import { getSettings, setSettings } from "../services/storage.js";
import { toast } from "./effects.js";

let cfg = null;

export function initCustomizer(){
  const scr = document.querySelector('[data-screen="skins"]');
  if (!scr || document.getElementById("btnCustom")) return;
  const b = document.createElement("button");
  b.id = "btnCustom";
  b.className = "menu-btn primary";
  b.style.cssText = "margin:12px auto 0;display:block";
  b.textContent = "🎨 Personalizar bolinha";
  b.onclick = openCustom;
  scr.appendChild(b);
}

function closeCustom(){
  const old = document.getElementById("customOverlay");
  if (old) old.remove();
}

function openCustom(){
  cfg = getCustomPiece();
  closeCustom();
  const ov = document.createElement("div");
  ov.id = "customOverlay";
  ov.style.cssText = "position:fixed;inset:0;z-index:99;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px";
  ov.innerHTML =
    '<div style="background:var(--card,#fff);color:var(--text,#111);border-radius:16px;padding:16px;max-width:430px;width:100%;max-height:92vh;overflow:auto">' +
    '<h3 style="margin:0 0 10px">🎨 Sua bolinha</h3>' +
    '<div id="czPrev" style="width:110px;height:110px;border-radius:50%;margin:0 auto 12px;border:3px solid rgba(128,128,128,.4)"></div>' +
    '<div style="display:flex;gap:14px;justify-content:center;margin-bottom:12px;font-size:12px">' +
    '<label>Cor 1 <input id="czC1" type="color" value="' + cfg.c1 + '"></label>' +
    '<label>Cor 2 <input id="czC2" type="color" value="' + cfg.c2 + '"></label></div>' +
    '<label style="font-size:12px">Zoom da imagem: <b id="czZL">' + cfg.zoom + '%</b></label>' +
    '<input id="czZ" type="range" min="20" max="200" value="' + cfg.zoom + '" style="width:100%">' +
    '<label style="font-size:12px">Posição ↔ <b id="czXL">' + cfg.x + '%</b></label>' +
    '<input id="czX" type="range" min="0" max="100" value="' + cfg.x + '" style="width:100%">' +
    '<label style="font-size:12px">Posição ↕ <b id="czYL">' + cfg.y + '%</b></label>' +
    '<input id="czY" type="range" min="0" max="100" value="' + cfg.y + '" style="width:100%">' +
    '<div style="margin:10px 0 4px;font-size:12px">📷 Sua foto:</div>' +
    '<input id="czFile" type="file" accept="image/*" style="font-size:12px;width:100%">' +
    '<div style="margin:10px 0 4px;font-size:12px">⚽ Ou escolha um escudo:</div>' +
    '<div id="czLogos" style="display:flex;flex-wrap:wrap;gap:6px"></div>' +
    '<div style="display:flex;gap:8px;margin-top:14px">' +
    '<button id="czClear" class="mini-btn" style="flex:1">🚫 Sem imagem</button>' +
    '<button id="czSave" class="mini-btn" style="flex:1">💾 Salvar e equipar</button>' +
    '<button id="czClose" class="mini-btn" style="flex:1">Fechar</button></div></div>';
  document.body.appendChild(ov);

  const $q = (s) => ov.querySelector(s);
  const paint = () => { $q("#czPrev").style.background = pieceBgFrom(cfg); };

  const logos = $q("#czLogos");
  for (const t of TEAM_LOGOS){
    const im = document.createElement("img");
    im.src = "img/" + t.file + ".png";
    im.title = t.name;
    im.style.cssText = "width:40px;height:40px;object-fit:contain;background:#fff;border-radius:8px;padding:3px;cursor:pointer";
    im.onclick = () => { cfg.img = "img/" + t.file + ".png"; paint(); };
    logos.appendChild(im);
  }

  $q("#czC1").oninput = (e) => { cfg.c1 = e.target.value; paint(); };
  $q("#czC2").oninput = (e) => { cfg.c2 = e.target.value; paint(); };
  $q("#czZ").oninput = (e) => { cfg.zoom = +e.target.value; $q("#czZL").textContent = cfg.zoom + "%"; paint(); };
  $q("#czX").oninput = (e) => { cfg.x = +e.target.value; $q("#czXL").textContent = cfg.x + "%"; paint(); };
  $q("#czY").oninput = (e) => { cfg.y = +e.target.value; $q("#czYL").textContent = cfg.y + "%"; paint(); };
  $q("#czClear").onclick = () => { cfg.img = ""; paint(); };
  $q("#czClose").onclick = closeCustom;
  $q("#czFile").onchange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const cv = document.createElement("canvas");
        cv.width = 160; cv.height = 160;
        const cx = cv.getContext("2d");
        const m = Math.min(im.width, im.height);
        cx.drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, 160, 160);
        cfg.img = cv.toDataURL("image/png");
        paint();
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  };
  $q("#czSave").onclick = () => {
    try {
      localStorage.setItem("qa_custom_piece", JSON.stringify(cfg));
      const s = getSettings(); s.piece = "p-custom"; setSettings(s);
      toast("Bolinha personalizada equipada! ⚽");
      closeCustom();
    } catch (_){ toast("Imagem muito grande — use uma foto menor."); }
  };
  paint();
}