// =============================================================
// Quoridor Arena — core/constants.js
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

// ═══════════ ⚽ TIMES — ADICIONOU 1 LINHA = SKIN COMPLETA ═══════════
// formato: ["id", "Nome", "arquivo-em-img", cor1, cor2, [listra1, listra2, listra3]]
const TEAMS = [
  ["vasco",       "Vasco",         "vasco",       "#3a3a3a", "#000000", ["#000000", "#ffffff", "#000000"]],
  ["flamengo",    "Flamengo",      "flamengo",    "#c8102e", "#000000", ["#000000", "#c8102e", "#ffffff"]],
  ["palmeiras",   "Palmeiras",     "palmeiras",   "#0a7a45", "#003d21", ["#006437", "#ffffff", "#006437"]],
  ["corinthians", "Corinthians",   "corinthians", "#4a4a4a", "#000000", ["#000000", "#ffffff", "#000000"]],
  ["saopaulo",    "São Paulo",     "saopaulo",    "#d40000", "#1a1a1a", ["#d40000", "#ffffff", "#1a1a1a"]],
  ["fluminense",  "Fluminense",    "fluminense",  "#8a3346", "#0d3d27", ["#8a3346", "#ffffff", "#0d3d27"]],
  ["botafogo",    "Botafogo",      "botafogo",    "#5a5a5a", "#000000", ["#000000", "#ffffff", "#000000"]],
  ["gremio",      "Grêmio",        "gremio",      "#0d9fd4", "#00284a", ["#0d9fd4", "#000000", "#ffffff"]],
  ["inter",       "Internacional", "inter",       "#e2001a", "#7a000d", ["#e2001a", "#ffffff", "#e2001a"]],
  ["cruzeiro",    "Cruzeiro",      "cruzeiro",    "#2447a8", "#0d1f5c", ["#2447a8", "#ffffff", "#2447a8"]],
  ["atletico",    "Atlético-MG",   "atletico",    "#4a4a4a", "#000000", ["#000000", "#ffffff", "#000000"]],
  ["santos",      "Santos",        "santos",      "#f5f5f5", "#9a9a9a", ["#ffffff", "#000000", "#ffffff"]]
];
export const TEAM_LOGOS = TEAMS.map(([id, name, file]) => ({ id, name, file }));

const teamPiece = (file, g1, g2) =>
  'url("img/' + file + '.png") center/auto 72% no-repeat, ' +
  'radial-gradient(circle at 35% 30%, ' + g1 + ' 0%, ' + g2 + ' 95%)';
const teamWall = (w) =>
  'repeating-linear-gradient(45deg, ' + w[0] + ' 0 8px, ' + w[1] + ' 8px 10px, ' + w[2] + ' 10px 18px)';

const TEAM_PIECES = TEAMS.map(([id, name, file, g1, g2]) =>
  ({ id: "p-" + id, cat: "piece", name, swatch: [g1, g2], badge: teamPiece(file, g1, g2), free: true }));
const TEAM_BOARDS = TEAMS.map(([id, name, , g1, g2]) =>
  ({ id: "b-" + id, cat: "board", name: name + " ⚽", swatch: [g1, g2], free: true }));
const TEAM_WALLS = {};
TEAMS.forEach(([id, , , , , w]) => { TEAM_WALLS["p-" + id] = teamWall(w); });

// ═══════════ PERSONALIZADA (bolinha custom) ═══════════
export function getCustomPiece(){
  const d = { c1: "#ef4444", c2: "#7f1d1d", img: "", zoom: 70, x: 50, y: 50 };
  try { Object.assign(d, JSON.parse(localStorage.getItem("qa_custom_piece") || "{}")); } catch (_){}
  return d;
}
export function pieceBgFrom(d){
  const base = 'radial-gradient(circle at 35% 30%, ' + d.c1 + ' 0%, ' + d.c2 + ' 95%)';
  if (!d.img) return base;
  return 'url("' + d.img + '") ' + d.x + '% ' + d.y + '% / auto ' + d.zoom + '% no-repeat, ' + base;
}
export function customPieceBg(){ return pieceBgFrom(getCustomPiece()); }
export function customPieceWall(){
  const d = getCustomPiece();
  return 'repeating-linear-gradient(45deg, ' + d.c2 + ' 0 8px, ' + d.c1 + ' 8px 16px, #ffffff 16px 18px)';
}

// ═══════════ CATÁLOGO DE SKINS ═══════════
export const SKIN_CATALOG = [
  { id: "p-classic", cat: "piece", name: "Clássica", swatch: ["#ef4444", "#3b82f6"], free: true },
  { id: "p-fire",    cat: "piece", name: "Fogo",     swatch: ["#fde047", "#f97316"], free: true },
  { id: "p-ice",     cat: "piece", name: "Gelo",     swatch: ["#a5f3fc", "#60a5fa"], free: true },
  { id: "p-custom",  cat: "piece", name: "Personalizada", swatch: ["#ef4444", "#7f1d1d"], free: true },
  { id: "p-gold",    cat: "piece", name: "Dourada",  swatch: ["#fef08a", "#b45309"],
    unlock: { desc: "Vença a IA Especialista 1 vez.", cur: s => s.iaExpertWins || 0, target: 1 } },
  { id: "p-galaxy",  cat: "piece", name: "Galáxia",  swatch: ["#c7d2fe", "#0f172a"],
    unlock: { desc: "Alcance o nível 5.", cur: (s, l) => l, target: 5 } },

  ...TEAM_PIECES,

  { id: "classic", cat: "board", name: "Clássico", swatch: ["#b98a5a", "#e9d7b7"], free: true },
  { id: "neon",    cat: "board", name: "Neon",     swatch: ["#22d3ee", "#a78bfa"], free: true },
  { id: "pastel",  cat: "board", name: "Pastel",   swatch: ["#f9a8d4", "#93c5fd"], free: true },
  { id: "ocean",   cat: "board", name: "Oceano",   swatch: ["#0ea5e9", "#082f49"],
    unlock: { desc: "Vença 10 partidas no ⚡ Encontrar Partida.", cur: s => s.onlineWins || 0, target: 10 } },
  { id: "sunset",  cat: "board", name: "Pôr do Sol", swatch: ["#f97316", "#431407"],
    unlock: { desc: "Vença 20 partidas (qualquer modo).", cur: s => s.wins, target: 20 } },
  { id: "mono",    cat: "board", name: "Monocromo", swatch: ["#e5e7eb", "#111827"],
    unlock: { desc: "Faça uma sequência de 3 vitórias.", cur: s => s.bestWinStreak, target: 3 } },

  ...TEAM_BOARDS,

  { id: "f-none", cat: "frame", name: "Sem moldura", swatch: ["#888888", "#444444"], free: true },
  { id: "f-wood", cat: "frame", name: "Madeira",     swatch: ["#8a5a2e", "#5b3a1c"], free: true },
  { id: "f-blue", cat: "frame", name: "Azul",        swatch: ["#2f7fd6", "#1f5fae"], free: true },
  { id: "f-champ",  cat: "frame", name: "Campeão",  swatch: ["#fbbf24", "#f59e0b"],
    unlock: { desc: "Faça uma sequência de 5 vitórias.", cur: s => s.bestWinStreak, target: 5 } },
  { id: "f-friend", cat: "frame", name: "Amizade",  swatch: ["#22c55e", "#15803d"],
    unlock: { desc: "Jogue 5 partidas com amigos (Criar Sala / convite).", cur: s => s.privateGames || 0, target: 5 } }
];

export const ADMIN_EMAIL = "2008kauapedro@gmail.com";

// ═══════════ CORES DAS PEÇAS / BARREIRAS ═══════════
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
  if (id === "p-custom")
    return (online || color === "red") ? customPieceBg() : CLASSIC_BLUE;
  const it = SKIN_CATALOG.find((i) => i.cat === "piece" && i.id === id);
  if (it && it.badge)
    return (online || color === "red") ? it.badge : CLASSIC_BLUE;
  const sw = pieceSwatch(id);
  if (online && id !== "p-classic")
    return `radial-gradient(circle at 35% 30%, ${sw[0]} 0%, ${sw[1]} 95%)`;
  return sw[color === "red" ? 0 : 1];
}
export function pieceWallFor(id, color, online = false){
  if (id === "p-custom")
    return (online || color === "red") ? customPieceWall() : "#3b82f6";
  if (TEAM_WALLS[id] && (online || color === "red")) return TEAM_WALLS[id];
  const sw = pieceSwatch(id);
  return sw[color === "red" ? 0 : 1];
}

// ═══════════ MODO CORRIDA ═══════════
export const SIZE_RACE_R = 14;
export const SIZE_RACE_C = 9;
export const GOAL_RACE = 0;
export const WALLS_RACE = 14;