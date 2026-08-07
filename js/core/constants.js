/* =============================================================
   Quoridor Arena — core/constants.js
   -------------------------------------------------------------
   Todos os DADOS e constantes do jogo. Sem lógica de partida
   aqui (isso vive em rules.js / ai.js).
   ============================================================= */

/* ═══════════ TABULEIRO ═══════════ */
export const SIZE = 9;                    // 9x9 casas
export const WALLS_PER_PLAYER = 10;       // barreiras por jogador
export const G = 0.19;                    // vão entre casas (unidades de casa)
export const T = SIZE + (SIZE - 1) * G;   // tamanho total em unidades

export const NAMES = { red: "Vermelho", blue: "Azul" };
export const GOAL  = { red: 0, blue: SIZE - 1 }; // linha-objetivo de cada time

/* ═══════════ CHAT RÁPIDO ═══════════ */
export const CHAT_MESSAGES = [
  "👍", "😂", "😎", "Boa jogada!", "GG!", "Quase!", "Sua vez!", "Excelente!"
];

/* ═══════════ LIGAS (ELO) ═══════════ */
export const ELO_START = 1000;
export const ELO_K = 32;

export const LEAGUES = [
  { key: "bronze",   icon: "🥉", name: "Bronze",    min: 0    },
  { key: "prata",    icon: "🥈", name: "Prata",     min: 1100 },
  { key: "ouro",     icon: "🥇", name: "Ouro",      min: 1300 },
  { key: "platina",  icon: "💠", name: "Platina",   min: 1500 },
  { key: "diamante", icon: "💎", name: "Diamante",  min: 1700 },
  { key: "mestre",   icon: "🔮", name: "Mestre",    min: 1900 },
  { key: "lendario", icon: "🐉", name: "Lendário",  min: 2100 }
];

/* Liga de um Elo dado (a última cujo min <= elo) */
export function leagueOf(elo){
  let cur = LEAGUES[0];
  for (const l of LEAGUES) if (elo >= l.min) cur = l;
  return cur;
}

/* ═══════════ XP & NÍVEIS INFINITOS ═══════════
   level = floor(√(xp/100))  →  XP p/ próximo nível = 100·(level+1)² */
export const XP_WIN = 40;
export const XP_DRAW = 20;
export const XP_LOSS = 10;

export function levelFromXp(xp){
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100));
}
export function xpForLevel(level){
  return 100 * level * level;
}

/* ═══════════ NÍVEIS DA IA ═══════════ */
export const AI_LEVELS = [
  { key: "easy",   icon: "🙂", name: "Fácil"        },
  { key: "medium", icon: "😼", name: "Médio"        },
  { key: "hard",   icon: "🧠", name: "Difícil"      },
  { key: "expert", icon: "👑", name: "Especialista" }
];

/* ═══════════ SKINS (estrutura aberta p/ novas) ═══════════ */
export const SKINS = [
  { key: "classic", name: "Clássica", swatch: ["#b07a42", "#fffdf6"] },
  { key: "neon",    name: "Neon",     swatch: ["#1d2330", "#38bdf8"] },
  { key: "pastel",  name: "Pastel",   swatch: ["#d9b183", "#f2766b"] }
];

/* ═══════════ CONQUISTAS ═══════════ */
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

/* ═══════════ TEXTOS (i18n pt-BR / en) ═══════════
   Chaves = atributos data-i18n do index.html */
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
    goalRed: "🏁 meta do vermelho · topo", goalBlue: "🏁 meta do azul · base",
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
    goalRed: "🏁 red's goal · top", goalBlue: "🏁 blue's goal · base",
    replay: "Replay", reconnecting: "Reconnecting…"
  }
};

/* Prefixo único do localStorage (evita colidir com outros apps) */
export const LS_PREFIX = "qa_";