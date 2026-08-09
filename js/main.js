/* =============================================================
   Quoridor Arena — js/main.js (BOOT + auto-update)
   ============================================================= */
import { initScreens, showScreen, openModal, startGame } from "./ui/screens.js";
import { hasSnapshot, getSnapshot, clearSnapshot } from "./services/storage.js";
import { unlockAudio, toast } from "./ui/effects.js";
import { onAuthChange } from "./services/supabase.js";
import { bindSession, joinRoom, net } from "./services/realtime.js";

/* ═══════════ PWA (SW desligado p/ testes — sempre código fresco) ═══════════ */
if ("serviceWorker" in navigator){
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
}

/* Botão instalar */
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

/* Áudio no 1º gesto */
window.addEventListener("pointerdown", unlockAudio, { once: true });
window.addEventListener("keydown",   unlockAudio, { once: true });

/* Toasts da rede */
window.addEventListener("qa-toast", (e) => toast(e.detail));

/* Convites ao vivo */
onAuthChange((session) => {
  bindSession(session?.user?.id || null, {
    onInvite: ({ code, from }) => openModal(`${from} te convidou para uma partida! ⚔️`, [
      { label: "✅ Aceitar", onClick: () =>
                    joinRoom(code, (info) => startGame({ mode: "online", private: true, ...info })) },
      { label: "Agora não", onClick: null }
    ])
  });
});

/* Quem convida também entra na partida quando o amigo aceita */
net.onMatch((info) => startGame({ mode: "online", ...info }));

/* ═══════════ AUTO-UPDATE (mesma versão em todos os aparelhos) ═══════════
   Compara o código NO SERVIDOR com o que está na memória.
   Se estiver velho: limpa cache + recarrega UMA vez. */
(async () => {
  try {
    const live = await fetch("/js/realtime.js", { cache: "no-store" }).then((r) => r.text());
    const servidorTem = live.includes("onMatch");          // marca da versão nova
    const memoriaTem  = typeof net.onMatch === "function"; // o que carregou agora
    if (servidorTem && !memoriaTem && !sessionStorage.getItem("qa_updating")){
      sessionStorage.setItem("qa_updating", "1");
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.unregister();
      location.reload();
      return;
    }
    sessionStorage.removeItem("qa_updating");
  } catch (_) { /* sem rede: segue o boot normal */ }
  boot();
})();

/* ═══════════ BOOT ═══════════ */
function boot(){
  initScreens();
  setTimeout(() => {
    showScreen("home");
    if (hasSnapshot()){
      openModal("Deseja continuar sua última partida?", [
        { label: "▶️ Continuar", onClick: () => {
            const snap = getSnapshot();
            if (snap) startGame({ mode: snap.mode, level: snap.level, state: snap.state, seconds: snap.seconds });
          } },
        { label: "🗑️ Começar do zero", onClick: () => clearSnapshot() }
      ]);
    }
  }, 900);
}
