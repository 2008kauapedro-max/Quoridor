/* =============================================================
   The Rage Arena — ui/effects.js
   -------------------------------------------------------------
   • Sons 100% sintetizados (Web Audio API) — nenhum asset.
   • Música ambiente opcional (pad suave gerado ao vivo).
   • Toasts e confete (DOM).
   • Respeita: volume, mudo, data-animations="off".
   ============================================================= */

/* ═══════════ ÁUDIO ═══════════ */
let ctx = null;          // AudioContext (criado só após gesto do usuário)
let master = null;       // ganho geral
let volume = 0.8;
let enabled = true;
let musicOn = false;
let musicTimer = null;

/* Cria/retoma o contexto — chame em qualquer gesto (clique/tecla) */
export function unlockAudio(){
  try {
    if (!ctx){
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.connect(ctx.destination);
      applyGain();
    }
    if (ctx.state === "suspended") ctx.resume();
  } catch (_) { /* sem áudio: o jogo segue mudo */ }
}

function applyGain(){
  if (master) master.gain.value = enabled ? volume : 0;
}
export function setVolume(v){ volume = Math.max(0, Math.min(1, v)); applyGain(); }
export function setEnabled(on){ enabled = !!on; applyGain(); }

/* Um bipe sintetizado */
function tone(freq, dur = 0.09, type = "sine", vol = 0.12, when = 0){
  if (!ctx || !enabled) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.03);
}

/* Efeitos sonoros do jogo */
export const SFX = {
  click () { tone(720, .05, "sine",   .06); },
  move  () { tone(560, .08, "triangle", .12); },
  wall  () { tone(190, .12, "square", .08); tone(330, .06, "triangle", .07, .04); },
  deny  () { tone(140, .12, "sawtooth", .06); try { navigator.vibrate?.(40); } catch (_){} },
  chat  () { tone(880, .06, "sine", .05); },
  win   () { [523, 659, 784, 1047].forEach((f, i) => tone(f, .2, "triangle", .12, i * .13)); }
};

/* ═══════════ MÚSICA AMBIENTE (pad gerado ao vivo) ═══════════ */
const CHORDS = [
  [220.0, 277.2, 329.6],   // A maior
  [196.0, 246.9, 293.7],   // G maior
  [174.6, 220.0, 261.6],   // F maior
  [164.8, 207.7, 246.9]    // E maior
];
let chordIdx = 0;

function playPad(){
  if (!ctx || !enabled) return;
  const t = ctx.currentTime;
  for (const f of CHORDS[chordIdx % CHORDS.length]){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = f / 2;      // uma oitava abaixo, bem suave
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.035, t + 1.2);  // ataque lento
    g.gain.linearRampToValueAtTime(0.0001, t + 3.8); // release longo
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 4);
  }
  chordIdx++;
}

export function setMusic(on){
  musicOn = !!on;
  if (musicOn && !musicTimer){
    unlockAudio();
    playPad();
    musicTimer = setInterval(playPad, 4000);
  }
  if (!musicOn && musicTimer){
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

/* ═══════════ TOAST ═══════════ */
let toastEl = null, toastTimer = null;

export function toast(msg){
  if (!toastEl) toastEl = document.getElementById("toast");
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
}

/* ═══════════ CONFETE ═══════════ */
export function confetti(winner, force){
  if (!force && document.documentElement.dataset.animations === "off") return;

  const box = document.getElementById("confetti");
  if (!box) return;
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
  box.appendChild(frag);
  setTimeout(() => { box.innerHTML = ""; }, 5200);   // limpa → sem vazamento
}