// =============================================================
// Quoridor Arena — core/constants.js
// Todos os DADOS e constantes do jogo.
// =============================================================

// ═══════════ TABULEIRO ═══════════
export const SIZE = 9;
export const WALLS_PER_PLAYER = 10;
export const G = 0.19;
export const T = SIZE + (SIZE - 1) * G;

export const NAMES = { red: "Vermelho", blue: "Azul" };
export const GOAL = { red: 0, blue: SIZE - 1 };

// ═══════════ CHAT RÁPIDO ═══════════
export const CHAT_MESSAGES = [
  "👍", "", "😎", "Boa jogada!", "GG!", "Quase!", "Sua vez!", "Excelente!"
];

// ═══════════ LIGAS (ELO) ═══════════
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

// ═══════════ XP & NÍVEIS ═══════════
export const XP_WIN = 40;
export const XP_DRAW = 20;
export const XP_LOSS = 10;

export function levelFromXp(xp){
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100));
}
export function xpForLevel(level){
  return 100 * level * level;
}

// ═══════════ NÍVEIS DA IA ═══════════
export const AI_LEVELS = [
  { key: "easy",   icon: "🙂", name: "Fácil"        },
  { key: "medium", icon: "😼", name: "Médio"        },
  { key: "hard",   icon: "🧠", name: "Difícil"      },
  { key: "expert", icon: "👑", name: "Especialista" }
];

// ═══════════ SKINS DE TEMA ═══════════
export const SKINS = [
  { key: "classic", name: "Clássica", swatch: ["#b07a42", "#fffdf6"] },
  { key: "neon",    name: "Neon",     swatch: ["#1d2330", "#38bdf8"] },
  { key: "pastel",  name: "Pastel",   swatch: ["#d9b183", "#f2766b"] }
];

// ═══════════ CONQUISTAS ═══════════
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

// ═══════════ TEXTOS (i18n) ═══════════
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

export const LS_PREFIX = "qa_";

// ═══════════ SKINS DE TIMES (escudo em img/ + fundo nas cores) ═══════════
function teamPiece(file, g1, g2){
  return 'url("img/' + file + '.png") center/82% no-repeat, ' +
         'radial-gradient(circle at 35% 30%, ' + g1 + ' 0%, ' + g2 + ' 95%)';
}

// ═══════════ CATÁLOGO DE SKINS ═══════════
export const SKIN_CATALOG = [
  // 🔴 BOLINHA (clássicas)
  { id: "p-classic", cat: "piece", name: "Clássica", swatch: ["#ef4444", "#3b82f6"], free: true },
  { id: "p-fire",    cat: "piece", name: "Fogo",     swatch: ["#fde047", "#f97316"], free: true },
  { id: "p-ice",     cat: "piece", name: "Gelo",     swatch: ["#a5f3fc", "#60a5fa"], free: true },
  { id: "p-gold",    cat: "piece", name: "Dourada",  swatch: ["#fef08a", "#b45309"],
    unlock: { desc: "Vença a IA Especialista 1 vez.", cur: s => s.iaExpertWins || 0, target: 1 } },
  { id: "p-galaxy",  cat: "piece", name: "Galáxia",  swatch: ["#c7d2fe", "#0f172a"],
    unlock: { desc: "Alcance o nível 5.", cur: (s, l) => l, target: 5 } },

  // ⚽ TIMES BRASILEIROS (escudo no meio + fundo na cor do brasão)
  { id: "p-vasco", cat: "piece", name: "Vasco", swatch: ["#000000", "#ffffff"],
    badge: teamPiece("vasco", "#3a3a3a", "#000000"), free: true },
  { id: "p-flamengo", cat: "piece", name: "Flamengo", swatch: ["#c8102e", "#000000"],
    badge: teamPiece("flamengo", "#c8102e", "#000000"), free: true },
  { id: "p-palmeiras", cat: "piece", name: "Palmeiras", swatch: ["#006437", "#ffffff"],
    badge: teamPiece("palmeiras", "#0a7a45", "#003d21"), free: true },
  { id: "p-corinthians", cat: "piece", name: "Corinthians", swatch: ["#000000", "#ffffff"],
    badge: teamPiece("corinthians", "#4a4a4a", "#000000"), free: true },
  { id: "p-saopaulo", cat: "piece", name: "São Paulo", swatch: ["#ff0000", "#000000"],
    badge: teamPiece("saopaulo", "#d40000", "#1a1a1a"), free: true },
  { id: "p-fluminense", cat: "piece", name: "Fluminense", swatch: ["#7b2d3f", "#135b3a"],
    badge: teamPiece("fluminense", "#8a3346", "#0d3d27"), free: true },
  { id: "p-botafogo", cat: "piece", name: "Botafogo", swatch: ["#000000", "#ffffff"],
    badge: teamPiece("botafogo", "#5a5a5a", "#000000"), free: true },
  { id: "p-gremio", cat: "piece", name: "Grêmio", swatch: ["#0092c8", "#000000"],
    badge: teamPiece("gremio", "#0d9fd4", "#00284a"), free: true },
  { id: "p-inter", cat: "piece", name: "Internacional", swatch: ["#e2001a", "#ffffff"],
    badge: teamPiece("inter", "#e2001a", "#7a000d"), free: true },
  { id: "p-cruzeiro", cat: "piece", name: "Cruzeiro", swatch: ["#1e3a8a", "#ffffff"],
    badge: teamPiece("cruzeiro", "#2447a8", "#0d1f5c"), free: true },
  { id: "p-atletico", cat: "piece", name: "Atlético-MG", swatch: ["#000000", "#ffffff"],
    badge: teamPiece("atletico", "#4a4a4a", "#000000"), free: true },
  { id: "p-santos", cat: "piece", name: "Santos", swatch: ["#ffffff", "#000000"],
    badge: teamPiece("santos", "#f5f5f5", "#9a9a9a"), free: true },

  // 🧱 TABULEIRO (clássicos)
  { id: "classic", cat: "board", name: "Clássico", swatch: ["#b98a5a", "#e9d7b7"], free: true },
  { id: "neon",    cat: "board", name: "Neon",     swatch: ["#22d3ee", "#a78bfa"], free: true },
  { id: "pastel",  cat: "board", name: "Pastel",   swatch: ["#f9a8d4", "#93c5fd"], free: true },
  { id: "ocean",   cat: "board", name: "Oceano",   swatch: ["#0ea5e9", "#082f49"],
    unlock: { desc: "Vença 10 partidas no ⚡ Encontrar Partida.", cur: s => s.onlineWins || 0, target: 10 } },
  { id: "sunset",  cat: "board", name: "Pôr do Sol", swatch: ["#f97316", "#431407"],
    unlock: { desc: "Vença 20 partidas (qualquer modo).", cur: s => s.wins, target: 20 } },
  { id: "mono",    cat: "board", name: "Monocromo", swatch: ["#e5e7eb", "#111827"],
    unlock: { desc: "Faça uma sequência de 3 vitórias.", cur: s => s.bestWinStreak, target: 3 } },

  // 🏟️ TABULEIROS TEMÁTICOS (cores dos times)
  { id: "b-vasco", cat: "board", name: "Vasco ⚽", swatch: ["#1a1a1a", "#000000"], free: true },
  { id: "b-flamengo", cat: "board", name: "Flamengo 🔴⚫", swatch: ["#c8102e", "#1a1a1a"], free: true },
  { id: "b-palmeiras", cat: "board", name: "Palmeiras 🟢", swatch: ["#006437", "#004d2a"], free: true },
  { id: "b-corinthians", cat: "board", name: "Corinthians ⚫⚪", swatch: ["#2a2a2a", "#000000"], free: true },
  { id: "b-saopaulo", cat: "board", name: "São Paulo 🔴⚫", swatch: ["#cc0000", "#1a1a1a"], free: true },

  // 🖼️ MOLDURA
  { id: "f-none", cat: "frame", name: "Sem moldura", swatch: ["#888888", "#444444"], free: true },
  { id: "f-wood", cat: "frame", name: "Madeira",     swatch: ["#8a5a2e", "#5b3a1c"], free: true },
  { id: "f-blue", cat: "frame", name: "Azul",        swatch: ["#2f7fd6", "#1f5fae"], free: true },
  { id: "f-champ",  cat: "frame", name: "Campeão",  swatch: ["#fbbf24", "#f59e0b"],
    unlock: { desc: "Faça uma sequência de 5 vitórias.", cur: s => s.bestWinStreak, target: 5 } },
  { id: "f-friend", cat: "frame", name: "Amizade",  swatch: ["#22c55e", "#15803d"],
    unlock: { desc: "Jogue 5 partidas com amigos (Criar Sala / convite).", cur: s => s.privateGames || 0, target: 5 } }
];

export const ADMIN_EMAIL = "2008kauapedro@gmail.com";

// ═══════════ COR DA BOLINHA / BARREIRA POR JOGADOR ═══════════
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
  if (it && it.badge) return it.badge;
  const sw = pieceSwatch(id);
  if (online && id !== "p-classic")
    return `radial-gradient(circle at 35% 30%, ${sw[0]} 0%, ${sw[1]} 95%)`;
  return sw[color === "red" ? 0 : 1];
}

// ═══════════ MODO CORRIDA ═══════════
export const SIZE_RACE_R = 14;
export const SIZE_RACE_C = 9;
export const GOAL_RACE = 0;
export const WALLS_RACE = 14;
