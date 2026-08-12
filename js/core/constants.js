// =============================================================
// Quoridor Arena — core/constants.js (skins prontas + bandeiras)
// =============================================================

export const SIZE = 9;
export const WALLS_PER_PLAYER = 10;
export const G = 0.19;
export const T = SIZE + (SIZE - 1) * G;

export const NAMES = { red: "Vermelho", blue: "Azul" };
export const GOAL = { red: 0, blue: SIZE - 1 };

export const CHAT_MESSAGES = [
  "👍", "", "😎", "Boa jogada!", "GG!", "Quase!", "Sua vez!", "Excelente!"
];

export const ELO_START = 0;
export const ELO_K = 32;

export const LEAGUES = [
  { key: "bronze",   icon: "🥉", name: "Bronze",    min: 0    },
  { key: "prata",    icon: "🥈", name: "Prata",     min: 100 },
  { key: "ouro",     icon: "🥇", name: "Ouro",      min: 300 },
  { key: "platina",  icon: "💠", name: "Platina",   min: 500 },
  { key: "diamante", icon: "💎", name: "Diamante",  min: 700 },
  { key: "mestre",   icon: "🔮", name: "Mestre",    min: 900 },
  { key: "lendario", icon: "🐉", name: "Lendário",  min: 1100 }
];

export function leagueOf(elo){
  let cur = LEAGUES[0];
  for (const l of LEAGUES) if (elo >= l.min) cur = l;
  return cur;
}

export const XP_WIN = 40;
export const XP_DRAW = 20;
export const XP_LOSS = 10;

export function levelFromXp(xp){
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100));
}
export function xpForLevel(level){
  return 100 * level * level;
}

export const AI_LEVELS = [
  { key: "easy",   icon: "🙂", name: "Fácil"        },
  { key: "medium", icon: "😼", name: "Médio"        },
  { key: "hard",   icon: "🧠", name: "Difícil"      },
  { key: "expert", icon: "👑", name: "Especialista" }
];

export const SKINS = [
  { key: "classic", name: "Clássica", swatch: ["#b07a42", "#fffdf6"] }
];

export const ACHIEVEMENTS = [
  { key: "first_win", icon: "🏅", name: "Primeira Vitória", desc: "Vença sua primeira partida",        xp: 20  },
  { key: "wins_10",   icon: "🏆", name: "Dez de Ouro",      desc: "Vença 10 partidas",                 xp: 50  },
  { key: "wins_50",   icon: "🎖️", name: "Estrategista",     desc: "Vença 50 partidas",                 xp: 120 },
  { key: "wins_100",  icon: "👑", name: "Centurião",        desc: "Vença 100 partidas",                xp: 250 },
  { key: "wins_500",  icon: "🐉", name: "Lenda Viva",       desc: "Vença 500 partidas",                xp: 900 },
  { key: "no_walls",  icon: "🕊️", name: "Pacifista",        desc: "Vença sem colocar barreiras",       xp: 60  },
  { key: "fast_win",  icon: "⚡", name: "Relâmpago",        desc: "Vença em menos de 2 minutos",       xp: 40  },
  { key: "comeback",  icon: "🔥", name: "Virada Épica",     desc: "Vença quando o rival estava na frente", xp: 50 }
];

export const TEXTS = {
  pt: {
    heroSub: "duelo de barreiras · estratégia pura",
    playOnline: "Jogar Online", playLocal: "Jogar Local", playAI: "Treinar contra IA",
    ranking: "Ranking", profile: "Perfil", howto: "Como Jogar", settings: "Configurações",
    login: "Entrar", authTitle: "Sua conta", tabLogin: "Entrar", tabRegister: "Criar conta",
    forgot: "Esqueci minha senha",
    theme: "Tema", lang: "Idioma", volume: "Volume", music: "Música ambiente",
    animations: "Animações", quality: "Qualidade gráfica", install: "Instalar aplicativo",
    logout: "Sair da conta",
    rankGlobal: "Global", rankWeekly: "Semanal", rankMonthly: "Mensal",
    achievements: "Conquistas", skins: "Skins", friends: "Amigos",
    lobby: "Jogar Online", queue: "Entrar na fila", createRoom: "Criar sala",
    joinRoom: "Entrar", lobbyHint: "Convide amigos pelo perfil → lista de amigos.",
    move: "Mover", wallH: "Barreira H", wallV: "Barreira V",
    replay: "Replay", reconnecting: "Reconectando…"
  },
  en: {
    heroSub: "wall duel · pure strategy",
    playOnline: "Play Online", playLocal: "Local Play", playAI: "Train vs AI",
    ranking: "Ranking", profile: "Profile", howto: "How to Play", settings: "Settings",
    login: "Sign in", authTitle: "Your account", tabLogin: "Sign in", tabRegister: "Sign up",
    forgot: "Forgot my password",
    theme: "Theme", lang: "Language", volume: "Volume", music: "Background music",
    animations: "Animations", quality: "Graphics quality", install: "Install app",
    logout: "Log out",
    rankGlobal: "Global", rankWeekly: "Weekly", rankMonthly: "Monthly",
    achievements: "Achievements", skins: "Skins", friends: "Friends",
    lobby: "Play Online", queue: "Join queue", createRoom: "Create room",
    joinRoom: "Join", lobbyHint: "Invite friends via profile → friends list.",
    move: "Move", wallH: "Wall H", wallV: "Wall V",
    replay: "Replay", reconnecting: "Reconnecting…"
  }
};

export const LS_PREFIX = "qa_";

/* ═══════════ CATÁLOGO DE SKINS ═══════════
   Bandeiras: coloque os PNGs em img/flags/ com estes nomes exatos:
   alemanha.png  argentina.png  brasil.png  franca.png
   holanda.png   inglaterra.png  paraguai.png  portugal.png
   (faltou alguma? ela simplesmente não aparece — sem quebrar) */
const flag = (file) => 'url("img/flags/' + file + '.png") center/cover no-repeat';

export const SKIN_CATALOG = [
  /* 🔴 bolinhas clássicas */
  { id: "p-classic", cat: "piece", name: "Clássica", swatch: ["#ef4444", "#3b82f6"], free: true },
  { id: "p-fire",    cat: "piece", name: "Fogo",     swatch: ["#fde047", "#f97316"], free: true },
  { id: "p-ice",     cat: "piece", name: "Gelo",     swatch: ["#a5f3fc", "#60a5fa"], free: true },
  { id: "p-galaxy",  cat: "piece", name: "Galáxia",  swatch: ["#c7d2fe", "#0f172a"],
    unlock: { desc: "Alcance o nível 5.", cur: (s, l) => l, target: 5 } },
  { id: "p-gold",    cat: "piece", name: "Dourada",  swatch: ["#fef08a", "#b45309"],
    unlock: { desc: "Vença a IA Especialista 1 vez.", cur: s => s.iaExpertWins || 0, target: 1 } },

  /* 🏁 bandeiras */
  { id: "p-brasil",      cat: "piece", name: "Brasil",      swatch: ["#22c55e", "#facc15"], badge: flag("brasil"),      free: true },
  { id: "p-argentina",   cat: "piece", name: "Argentina",   swatch: ["#7dd3fc", "#ffffff"], badge: flag("argentina"),   free: true },
  { id: "p-alemanha",    cat: "piece", name: "Alemanha",    swatch: ["#111111", "#facc15"], badge: flag("alemanha"),    free: true },
  { id: "p-franca",      cat: "piece", name: "França",      swatch: ["#2563eb", "#ef4444"], badge: flag("franca"),      free: true },
  { id: "p-holanda",     cat: "piece", name: "Holanda",     swatch: ["#f97316", "#2563eb"], badge: flag("holanda"),     free: true },
  { id: "p-inglaterra",  cat: "piece", name: "Inglaterra",  swatch: ["#ffffff", "#dc2626"], badge: flag("inglaterra"),  free: true },
  { id: "p-paraguai",    cat: "piece", name: "Paraguai",    swatch: ["#dc2626", "#2563eb"], badge: flag("paraguai"),    free: true },
  { id: "p-portugal",    cat: "piece", name: "Portugal",    swatch: ["#16a34a", "#dc2626"], badge: flag("portugal"),    free: true },

  /* 🧱 tabuleiro / 🖼️ moldura (base) */
  { id: "classic", cat: "board", name: "Clássico", swatch: ["#b98a5a", "#e9d7b7"], free: true },
  { id: "f-none",  cat: "frame", name: "Sem moldura", swatch: ["#888888", "#444444"], free: true }
];

export const ADMIN_EMAIL = "2008kauapedro@gmail.com";

const CLASSIC_BLUE = "radial-gradient(circle at 35% 30%, #60a5fa 0%, #2563eb 95%)";

export function pieceSwatch(id){
  const it = SKIN_CATALOG.find((i) => i.cat === "piece" && i.id === id);
  return it ? it.swatch : ["#ef4444", "#3b82f6"];
}
export function pieceColorFor(id, color, online = false){
  const sw = pieceSwatch(id);
  if (online && id !== "p-classic") return sw[0];
  return sw[color === "red" ? 0 : 1];
}
export function pieceBgFor(id, color, online = false){
  const it = SKIN_CATALOG.find((i) => i.cat === "piece" && i.id === id);
  if (it && it.badge)
    return (online || color === "red") ? it.badge : CLASSIC_BLUE;
  const sw = pieceSwatch(id);
  if (online && id !== "p-classic")
    return `radial-gradient(circle at 35% 30%, ${sw[0]} 0%, ${sw[1]} 95%)`;
  return sw[color === "red" ? 0 : 1];
}
export function pieceWallFor(id, color, online = false){
  const sw = pieceSwatch(id);
  return sw[color === "red" ? 0 : 1];
}

export const SIZE_RACE_R = 14;
export const SIZE_RACE_C = 9;
export const GOAL_RACE = 0;
export const WALLS_RACE = 14;