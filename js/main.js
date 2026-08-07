/* =============================================================
   Quoridor Arena — js/main.js (BOOT)
   -------------------------------------------------------------
   Ordem: PWA → botões globais → áudio → toasts da rede →
   convites → initScreens → loading → home (+ continuar partida).
   ============================================================= */
import { initScreens, showScreen, openModal, startGame } from "./ui/screens.js";
import { hasSnapshot, getSnapshot, clearSnapshot } from "./services/storage.js";
import { unlockAudio, toast } from "./ui/effects.js";
import { onAuthChange } from "./services/supabase.js";
import { bindSession, joinRoom } from "./services/realtime.js";

/* ═══════════ PWA (offline + instalável) ═══════════ */
if ("serviceWorker" in navigator && location.protocol === "https:"){
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

/* Botão "Instalar aplicativo" (aparece só se o navegador permitir) */
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("btnInstall")?.classList.remove("hidden");
});
document.getElementById("btnInstall")?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  document.getElementById("btnInstall")?.classList.add("hidden");
});

/* ═══════════ Áudio: destrava no 1º gesto do usuário ═══════════ */
window.addEventListener("pointerdown", unlockAudio, { once: true });
window.addEventListener("keydown",   unlockAudio, { once: true });

/* Toasts disparados pela camada de rede (salas cheias etc.) */
window.addEventListener("qa-toast", (e) => toast(e.detail));

/* ═══════════ Convites ao vivo (canal do usuário) ═══════════ */
onAuthChange((session) => {
  bindSession(session?.user?.id || null, {
    onInvite: ({ code, from }) => openModal(`${from} te convidou para uma partida! ⚔️`, [
      { label: "✅ Aceitar", onClick: () =>
          joinRoom(code, (info) => startGame({ mode: "online", ...info })) },
      { label: "Agora não", onClick: null }
    ])
  });
});

/* ═══════════ BOOT ═══════════ */
initScreens();

setTimeout(() => {
  showScreen("home");

  /* Salvamento automático: pergunta se quer continuar */
  if (hasSnapshot()){
    openModal("Deseja continuar sua última partida?", [
      { label: "▶️ Continuar", onClick: () => {
          const snap = getSnapshot();
          if (snap) startGame({
            mode: snap.mode, level: snap.level,
            state: snap.state, seconds: snap.seconds
          });
        } },
      { label: "🗑️ Começar do zero", onClick: () => clearSnapshot() }
    ]);
  }
}, 900);   // splash mínima p/ transição suave