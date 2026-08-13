// =============================================================
// The Rage Arena — core/constants.js
// =============================================================
export const SIZE = 9;
export const WALLS_PER_PLAYER = 10;
export const G = 0.19;
export const T = SIZE + (SIZE - 1) * G;
export const NAMES = { red: "Vermelho", blue: "Azul" };
export const GOAL = { red: 0, blue: SIZE - 1 };

export const CHAT_MESSAGES = ["👍", "", "😎", "Boa jogada!", "GG!", "Quase!", "Sua vez!", "Excelente!"];

export const ELO_START = 0;
export const ELO_K = 32;
export const LEAGUES = [
  { key: "bronze", icon: "🥉", name: "Bronze", min: 0 },
  { key: "prata", icon: "🥈", name: "Prata", min: 100 },
  { key: "ouro", icon: "🥇", name: "Ouro", min: 300 },
  { key: "platina", icon: "💠", name: "Platina", min: 500 },
  { key: "diamante", icon: "💎", name: "Diamante", min: 700 },
  { key: "mestre", icon: "🔮", name: "Mestre", min: 900 },
  { key: "lendario", icon: "🐉", name: "Lendário", min: 1100 }
];
export function leagueOf(elo){ let c = LEAGUES[0]; for (const l of LEAGUES) if (elo >= l.min) c = l; return c; }

export const XP_WIN = 40, XP_DRAW = 20, XP_LOSS = 10;
export function levelFromXp(xp){ return Math.floor(Math.sqrt(Math.max(0, xp) / 100)); }
export function xpForLevel(l){ return 100 * l * l; }

export const AI_LEVELS = [
  { key: "easy", icon: "🙂", name: "Fácil" },
  { key: "medium", icon: "😼", name: "Médio" },
  { key: "hard", icon: "🧠", name: "Difícil" },
  { key: "expert", icon: "👑", name: "Especialista" }
];

export const SKINS = [{ key: "classic", name: "Clássica", swatch: ["#b07a42", "#fffdf6"] }];

export const ACHIEVEMENTS = [
  { key: "first_win", icon: "🏅", name: "Primeira Vitória", desc: "Vença sua primeira partida", xp: 20 },
  { key: "wins_10", icon: "🏆", name: "Dez de Ouro", desc: "Vença 10 partidas", xp: 50 },
  { key: "wins_50", icon: "🎖️", name: "Estrategista", desc: "Vença 50 partidas", xp: 120 },
  { key: "wins_100", icon: "👑", name: "Centurião", desc: "Vença 100 partidas", xp: 250 },
  { key: "wins_500", icon: "🐉", name: "Lenda Viva", desc: "Vença 500 partidas", xp: 900 },
  { key: "no_walls", icon: "🕊️", name: "Pacifista", desc: "Vença sem barreiras", xp: 60 },
  { key: "fast_win", icon: "⚡", name: "Relâmpago", desc: "Vença em menos de 2 min", xp: 40 },
  { key: "comeback", icon: "🔥", name: "Virada Épica", desc: "Vença estando atrás", xp: 50 }
];

export const TEXTS = {
  pt: { heroSub:"duelo de barreiras · estratégia pura", playOnline:"Jogar Online", playLocal:"Jogar Local", playAI:"Treinar contra IA", ranking:"Ranking", profile:"Perfil", howto:"Como Jogar", settings:"Configurações", login:"Entrar", authTitle:"Sua conta", tabLogin:"Entrar", tabRegister:"Criar conta", forgot:"Esqueci minha senha", theme:"Tema", lang:"Idioma", volume:"Volume", music:"Música ambiente", animations:"Animações", quality:"Qualidade gráfica", install:"Instalar aplicativo", logout:"Sair da conta", rankGlobal:"Global", rankWeekly:"Semanal", rankMonthly:"Mensal", achievements:"Conquistas", skins:"Skins", friends:"Amigos", lobby:"Jogar Online", queue:"Entrar na fila", createRoom:"Criar sala", joinRoom:"Entrar", lobbyHint:"Convide amigos pelo perfil.", move:"Mover", wallH:"Barreira H", wallV:"Barreira V", replay:"Replay", reconnecting:"Reconectando…" },
  en: { heroSub:"wall duel · pure strategy", playOnline:"Play Online", playLocal:"Local Play", playAI:"Train vs AI", ranking:"Ranking", profile:"Profile", howto:"How to Play", settings:"Settings", login:"Sign in", authTitle:"Your account", tabLogin:"Sign in", tabRegister:"Sign up", forgot:"Forgot password", theme:"Theme", lang:"Language", volume:"Volume", music:"Music", animations:"Animations", quality:"Quality", install:"Install app", logout:"Log out", rankGlobal:"Global", rankWeekly:"Weekly", rankMonthly:"Monthly", achievements:"Achievements", skins:"Skins", friends:"Friends", lobby:"Play Online", queue:"Join queue", createRoom:"Create room", joinRoom:"Join", move:"Move", wallH:"Wall H", wallV:"Wall V", replay:"Replay", reconnecting:"Reconnecting…" }
};
export const LS_PREFIX = "qa_";

/* ═══════════ SKINS — zoom + fundo colorido pra ficar TUDO padrão ═══════════ */
const P = (f, c1, c2, z, wall) => ({
  img: "img/flags/" + f + ".png",
badge: "url('img/flags/" + f + ".png') center / " + z + "% no-repeat, radial-gradient(circle at 35% 30%, " + c1 + " 0%, " + c2 + " 95%)",
  wall
});

export const SKIN_CATALOG = [
  { id:"p-classic", cat:"piece", name:"Clássica", swatch:["#ef4444","#3b82f6"], free:true },
  { id:"p-fire",    cat:"piece", name:"Fogo",     swatch:["#fde047","#f97316"], free:true },
  { id:"p-ice",     cat:"piece", name:"Gelo",     swatch:["#a5f3fc","#60a5fa"], free:true },
  { id:"p-galaxy",  cat:"piece", name:"Galáxia",  swatch:["#c7d2fe","#0f172a"], unlock:{desc:"Alcance o nível 5.",cur:(s,l)=>l,target:5} },
  { id:"p-gold",    cat:"piece", name:"Dourada",  swatch:["#fef08a","#b45309"], ...P("dourada","#f59e0b","#b45309",135,"repeating-linear-gradient(45deg,#fef08a 0 8px,#f59e0b 8px 16px,#b45309 16px 24px)"), unlock:{desc:"Vença a IA Especialista 1 vez.",cur:s=>s.iaExpertWins||0,target:1} },

  /* 🌍 PAÍSES */
  { id:"p-brasil", sub:"pais",     cat:"piece", name:"Brasil",     swatch:["#22c55e","#facc15"], ...P("brasil","#009c3b","#002776",118,"repeating-linear-gradient(45deg,#009c3b 0 8px,#ffdf00 8px 11px,#002776 11px 19px)"), unlock:{desc:"Vença 1 partida.",cur:s=>s.wins,target:1} },
  { id:"p-argentina", sub:"pais",  cat:"piece", name:"Argentina",  swatch:["#7dd3fc","#ffffff"], ...P("argentina","#74acdf","#f6b40e",118,"repeating-linear-gradient(45deg,#74acdf 0 8px,#ffffff 8px 16px,#f6b40e 16px 19px)"), unlock:{desc:"Vença 2 partidas.",cur:s=>s.wins,target:2} },
  { id:"p-alemanha", sub:"pais",   cat:"piece", name:"Alemanha",   swatch:["#111111","#facc15"], ...P("alemanha","#dd0000","#ffce00",240,"repeating-linear-gradient(45deg,#000000 0 8px,#dd0000 8px 16px,#ffce00 16px 24px)"), unlock:{desc:"Vença 3 partidas.",cur:s=>s.wins,target:3} },
  { id:"p-franca", sub:"pais",     cat:"piece", name:"França",     swatch:["#2563eb","#ef4444"], ...P("franca","#0055a4","#ef4135",140,"repeating-linear-gradient(45deg,#0055a4 0 8px,#ffffff 8px 16px,#ef4135 16px 24px)"), unlock:{desc:"Vença 1 partida online.",cur:s=>s.onlineWins||0,target:1} },
  { id:"p-holanda", sub:"pais",    cat:"piece", name:"Holanda",    swatch:["#f97316","#2563eb"], ...P("holanda","#ae1c28","#21468b",125,"repeating-linear-gradient(45deg,#ae1c28 0 8px,#ffffff 8px 16px,#21468b 16px 24px)"), unlock:{desc:"Vença 2 partidas online.",cur:s=>s.onlineWins||0,target:2} },
  { id:"p-inglaterra", sub:"pais", cat:"piece", name:"Inglaterra", swatch:["#ffffff","#dc2626"], ...P("inglaterra","#ce1124","#ffffff",125,"repeating-linear-gradient(45deg,#ffffff 0 8px,#ce1124 8px 16px)"), unlock:{desc:"Alcance o nível 3.",cur:(s,l)=>l,target:3} },
  { id:"p-paraguai", sub:"pais",   cat:"piece", name:"Paraguai",   swatch:["#dc2626","#2563eb"], ...P("paraguai","#d52b1e","#0038a8",180,"repeating-linear-gradient(45deg,#d52b1e 0 8px,#ffffff 8px 16px,#0038a8 16px 24px)"), unlock:{desc:"Vença 1 partida vs IA.",cur:s=>s.wins,target:1} },
  { id:"p-portugal", sub:"pais",   cat:"piece", name:"Portugal",   swatch:["#16a34a","#dc2626"], ...P("portugal","#046a38","#da291c",115,"repeating-linear-gradient(45deg,#046a38 0 8px,#da291c 8px 16px)"), unlock:{desc:"Sequência de 2 vitórias.",cur:s=>s.bestWinStreak,target:2} },

  /* ⚽ TIMES */
  { id:"p-flamengo", sub:"time", cat:"piece", name:"Flamengo", swatch:["#c8102e","#000000"], ...P("flamengo","#c8102e","#000000",160,"repeating-linear-gradient(45deg,#c8102e 0 8px,#000000 8px 16px)"), unlock:{desc:"Vença 1 partida.",cur:s=>s.wins,target:1} },
  { id:"p-vasco", sub:"time",    cat:"piece", name:"Vasco",    swatch:["#000000","#ffffff"], ...P("vasco","#3a3a3a","#000000",145,"repeating-linear-gradient(45deg,#000000 0 8px,#ffffff 8px 16px)"), unlock:{desc:"Vença 2 partidas.",cur:s=>s.wins,target:2} },
  { id:"p-paysandu", sub:"time", cat:"piece", name:"Paysandu", swatch:["#003da5","#ffffff"], ...P("paysandu","#003da5","#00205b",165,"repeating-linear-gradient(45deg,#003da5 0 8px,#ffffff 8px 16px)"), unlock:{desc:"Alcance o nível 2.",cur:(s,l)=>l,target:2} },
  { id:"p-corinthians", cat:"piece", name:"Corinthians", sub:"time", swatch:["#000000","#ffffff"], ...P("corinthians","#3a3a3a","#000000",145,"repeating-linear-gradient(45deg,#000000 0 8px,#ffffff 8px 16px)"), unlock:{desc:"Vença 3 partidas.",cur:s=>s.wins,target:3} },

  { id:"classic", cat:"board", name:"Clássico", swatch:["#b98a5a","#e9d7b7"], free:true },
  { id:"f-none",  cat:"frame", name:"Sem moldura", swatch:["#888","#444"], free:true }
];

export const ADMIN_EMAIL = "2008kauapedro@gmail.com";

export function pieceSwatch(id){ const i=SKIN_CATALOG.find(x=>x.cat==="piece"&&x.id===id); return i?i.swatch:["#ef4444","#3b82f6"]; }
export function pieceColorFor(id,color,online=false){ const s=pieceSwatch(id); if(online&&id!=="p-classic")return s[0]; return s[color==="red"?0:1]; }

export function pieceBgFor(id, color, online = false){
  const it = SKIN_CATALOG.find((i) => i.cat === "piece" && i.id === id);
  if (it && it.badge) return (online || color === "red") ? it.badge : "radial-gradient(circle at 35% 30%, #60a5fa 0%, #2563eb 95%)";
  const sw = pieceSwatch(id);
  if (online && id !== "p-classic") return `radial-gradient(circle at 35% 30%, ${sw[0]} 0%, ${sw[1]} 95%)`;
  return sw[color === "red" ? 0 : 1];
}
export function pieceWallFor(id,color,online=false){
  const it = SKIN_CATALOG.find((i) => i.cat === "piece" && i.id === id);
  if (it && it.wall && (online || color === "red")) return it.wall;
  const s = pieceSwatch(id);
  return s[color === "red" ? 0 : 1];
}

export const SIZE_RACE_R = 14, SIZE_RACE_C = 9, GOAL_RACE = 0, WALLS_RACE = 14;