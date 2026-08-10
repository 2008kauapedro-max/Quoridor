/* =============================================================
   Quoridor Arena — core/rules.js
   -------------------------------------------------------------
   Lógica PURA da partida (zero DOM). Suporta:
   - Modo clássico (9x9, 10 barreiras)
   - Modo corrida (14x9, 14 barreiras, ambos saem da base)
   ============================================================= */
import { SIZE, WALLS_PER_PLAYER, GOAL, SIZE_RACE_R, SIZE_RACE_C, WALLS_RACE, GOAL_RACE } from "./constants.js";

/* ═══════════ ESTRUTURAS ═══════════ */

export function grid(rows, cols, v){
  return Array.from({ length: rows }, () => Array(cols).fill(v));
}

/* Estado novo de uma partida CLÁSSICA (9x9) */
export function newGame(){
  return {
    mode: "classic",
    rows: SIZE,
    cols: SIZE,
    players: {
      red : { r: SIZE - 1, c: 4, walls: WALLS_PER_PLAYER },
      blue: { r: 0,        c: 4, walls: WALLS_PER_PLAYER }
    },
    turn: "red",
    hWall: grid(SIZE - 1, SIZE - 1, false),
    vWall: grid(SIZE - 1, SIZE - 1, false),
    hSeg: grid(SIZE - 1, SIZE, false),
    vSeg: grid(SIZE, SIZE - 1, false),
    stats: {
      moves: { red: 0, blue: 0 },
      walls: { red: 0, blue: 0 },
      wasBehind: { red: false, blue: false }
    },
    replay: [],
    startedAt: Date.now(),
    over: false,
    winner: null
  };
}

/* Estado novo de uma partida CORRIDA (14x9, ambos saem da base) */
export function newGameRace(){
  return {
    mode: "race",
    rows: SIZE_RACE_R,
    cols: SIZE_RACE_C,
    players: {
      red : { r: SIZE_RACE_R - 1, c: 3, walls: WALLS_RACE },
      blue: { r: SIZE_RACE_R - 1, c: 5, walls: WALLS_RACE }
    },
    turn: "red",
    hWall: grid(SIZE_RACE_R - 1, SIZE_RACE_C - 1, false),
    vWall: grid(SIZE_RACE_R - 1, SIZE_RACE_C - 1, false),
    hSeg: grid(SIZE_RACE_R - 1, SIZE_RACE_C, false),
    vSeg: grid(SIZE_RACE_R, SIZE_RACE_C - 1, false),
    stats: {
      moves: { red: 0, blue: 0 },
      walls: { red: 0, blue: 0 },
      wasBehind: { red: false, blue: false }
    },
    replay: [],
    startedAt: Date.now(),
    over: false,
    winner: null
  };
}

/* Cópia profunda p/ simulações da IA */
export function snapshot(state){
  return (typeof structuredClone === "function")
    ? structuredClone(state)
    : JSON.parse(JSON.stringify(state));
}

/* ═══════════ MOVIMENTO ═══════════ */

export function canMoveTo(state, r, c, nr, nc){
  const rows = state.rows || SIZE;
  const cols = state.cols || SIZE;
  if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) return false;
  const dr = nr - r, dc = nc - c;
  if (Math.abs(dr) + Math.abs(dc) !== 1) return false;
  if (dr === -1 && state.hSeg[r - 1][c]) return false;
  if (dr ===  1 && state.hSeg[r][c])     return false;
  if (dc === -1 && state.vSeg[r][c - 1]) return false;
  if (dc ===  1 && state.vSeg[r][c])     return false;
  const foe = state.turn === "red" ? "blue" : "red";
  if (state.players[foe].r === nr && state.players[foe].c === nc) return false;
  return true;
}

/* Lista de casas legais (IA + destaques de alvo) */
export function legalMoves(state, player){
  const rows = state.rows || SIZE;
  const cols = state.cols || SIZE;
  const p = state.players[player];
  const out = [];
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
    const nr = p.r + dr, nc = p.c + dc;
    if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
    if (dr === -1 && state.hSeg[p.r - 1][p.c]) continue;
    if (dr ===  1 && state.hSeg[p.r][p.c])     continue;
    if (dc === -1 && state.vSeg[p.r][p.c - 1]) continue;
    if (dc ===  1 && state.vSeg[p.r][p.c])     continue;
    const foe = player === "red" ? "blue" : "red";
    if (state.players[foe].r === nr && state.players[foe].c === nc) continue;
    out.push({ r: nr, c: nc });
  }
  return out;
}

/* Aplica movimento (validando). Retorna o evento ou null. */
export function applyMove(state, r, c){
  if (state.over) return null;
  const p = state.players[state.turn];
  if (!canMoveTo(state, p.r, p.c, r, c)) return null;
  p.r = r; p.c = c;
  state.stats.moves[state.turn]++;
  trackBehind(state);
  const ev = { t: "m", p: state.turn, r, c };
  state.replay.push(ev);
  checkVictory(state);
  if (!state.over) state.turn = state.turn === "red" ? "blue" : "red";
  return ev;
}

/* ═══════════ BARREIRAS ═══════════ */

export function setWallSegments(state, type, r, c, on){
  if (type === "h"){ state.hSeg[r][c] = on; state.hSeg[r][c + 1] = on; }
  else             { state.vSeg[r][c] = on; state.vSeg[r + 1][c] = on; }
}

/* Valida: limites · sobreposição · cruzamento · caminho p/ OS DOIS (BFS) */
export function validateWall(state, type, r, c){
  const rows = state.rows || SIZE;
  const cols = state.cols || SIZE;
  const goalRed = state.mode === "race" ? GOAL_RACE : GOAL.red;
  const goalBlue = state.mode === "race" ? GOAL_RACE : GOAL.blue;
  
  if (r < 0 || c < 0 || r > rows - 2 || c > cols - 2)
    return { ok: false, reason: "fora" };

  if (type === "h"){
    const overlap = state.hWall[r][c] ||
                    (c > 0        && state.hWall[r][c - 1]) ||
                    (c < cols - 2 && state.hWall[r][c + 1]);
    if (overlap || state.vWall[r][c]) return { ok: false, reason: "sobreposicao" };
  } else {
    const overlap = state.vWall[r][c] ||
                    (r > 0        && state.vWall[r - 1][c]) ||
                    (r < rows - 2 && state.vWall[r + 1][c]);
    if (overlap || state.hWall[r][c]) return { ok: false, reason: "sobreposicao" };
  }

  setWallSegments(state, type, r, c, true);
  const okRed  = findPathBFS(state, state.players.red.r,  state.players.red.c,  goalRed);
  const okBlue = findPathBFS(state, state.players.blue.r, state.players.blue.c, goalBlue);
  setWallSegments(state, type, r, c, false);

  if (!okRed || !okBlue) return { ok: false, reason: "caminho" };
  return { ok: true };
}

/* Aplica barreira (validando). Retorna o evento ou null. */
export function applyWall(state, type, r, c){
  if (state.over) return null;
  const cur = state.turn;
  if (state.players[cur].walls <= 0) return null;
  if (!validateWall(state, type, r, c).ok) return null;

  if (type === "h") state.hWall[r][c] = true; else state.vWall[r][c] = true;
  setWallSegments(state, type, r, c, true);
  state.players[cur].walls--;
  state.stats.walls[cur]++;
  trackBehind(state);
  const ev = { t: "w", p: cur, o: type, r, c };
  state.replay.push(ev);
  state.turn = cur === "red" ? "blue" : "red";
  return ev;
}

/* Aplica um evento vindo de fora (replay / rede) — sempre revalidando */
export function applyEvent(state, ev){
  if (!ev || typeof ev !== "object") return null;
  if (ev.t === "m") return applyMove(state, ev.r, ev.c);
  if (ev.t === "w") return applyWall(state, ev.o, ev.r, ev.c);
  return null;
}

/* ═══════════ BFS (caminho sempre existe?) ═══════════ */

export function findPathBFS(state, startR, startC, goalRow){
  return bfsDistance(state, startR, startC, goalRow) >= 0;
}

/* Distância mínima até a goalRow (-1 se inalcável) — usada tb pela IA */
export function bfsDistance(state, startR, startC, goalRow){
  const rows = state.rows || SIZE;
  const cols = state.cols || SIZE;
  const seen = grid(rows, cols, false);
  const queue = [[startR, startC, 0]];
  seen[startR][startC] = true;
  let head = 0;
  while (head < queue.length){
    const [r, c, d] = queue[head++];
    if (r === goalRow) return d;
    if (r > 0        && !state.hSeg[r - 1][c] && !seen[r - 1][c]){ seen[r-1][c]=true; queue.push([r-1,c,d+1]); }
    if (r < rows - 1 && !state.hSeg[r][c]     && !seen[r + 1][c]){ seen[r+1][c]=true; queue.push([r+1,c,d+1]); }
    if (c > 0        && !state.vSeg[r][c - 1] && !seen[r][c - 1]){ seen[r][c-1]=true; queue.push([r,c-1,d+1]); }
    if (c < cols - 1 && !state.vSeg[r][c]     && !seen[r][c + 1]){ seen[r][c+1]=true; queue.push([r,c+1,d+1]); }
  }
  return -1;
}

/* ═══════════ VITÓRIA & UTILIDADES ═══════════ */

export function checkVictory(state){
  const goalRed = state.mode === "race" ? GOAL_RACE : GOAL.red;
  const goalBlue = state.mode === "race" ? GOAL_RACE : GOAL.blue;
  if (state.players.red.r  === goalRed){  state.over = true; state.winner = "red";  }
  if (state.players.blue.r === goalBlue){ state.over = true; state.winner = "blue"; }
  return state.over;
}

/* Marca se o jogador estava ATRÁS em algum momento (conquista virada) */
function trackBehind(state){
  const rows = state.rows || SIZE;
  const goalRed = state.mode === "race" ? GOAL_RACE : GOAL.red;
  const goalBlue = state.mode === "race" ? GOAL_RACE : GOAL.blue;
  const redDist  = Math.abs(state.players.red.r - goalRed);
  const blueDist = Math.abs(state.players.blue.r - goalBlue);
  if (redDist  > blueDist) state.stats.wasBehind.red  = true;
  if (blueDist > redDist)  state.stats.wasBehind.blue = true;
}

/* Sorteio 50/50 de quem começa */
export function randomFirstTurn(){
  return Math.random() < 0.5 ? "red" : "blue";
}