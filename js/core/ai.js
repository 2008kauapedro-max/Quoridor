/* =============================================================
   Quoridor Arena — core/ai.js
   -------------------------------------------------------------
   Inteligência artificial LOCAL (nenhuma API paga).
   Técnicas: BFS (distâncias), ganância, busca 1–2 plies com poda.
   Retorna SEMPRE { type:"move", r, c } ou { type:"wall", o, r, c }.
   ============================================================= */
import { SIZE, GOAL } from "./constants.js";
import {
  legalMoves, validateWall, snapshot, applyMove, applyWall,
  bfsDistance, setWallSegments
} from "./rules.js";

const other = (p) => (p === "red" ? "blue" : "red");

/* Distâncias atuais até o objetivo de cada um */
function distances(state){
  return {
    red : bfsDistance(state, state.players.red.r,  state.players.red.c,  GOAL.red),
    blue: bfsDistance(state, state.players.blue.r, state.players.blue.c, GOAL.blue)
  };
}

/* Avaliação de um estado sob o ponto de vista de `me` (maior = melhor) */
function evalFor(state, me){
  const d = distances(state);
  const dMe = d[me], dFo = d[other(me)];
  if (dMe === 0) return 100000;                     // vitória imediata
  if (dFo === 0) return -100000;                    // derrota imediata
  return (dFo - dMe) * 10                           // corrida
       + (state.players[me].walls - state.players[other(me)].walls) * 2; // reserva
}

/* Aplica uma ação numa CÓPIA e devolve o estado simulado */
function simulate(state, action){
  const s = snapshot(state);
  if (action.type === "move") applyMove(s, action.r, action.c);
  else                        applyWall(s, action.o, action.r, action.c);
  return s;
}

/* Candidatos de barreira ranqueados: quanto ATRASAM o rival sem me travar */
function wallCandidates(state, me, cap){
  const foe = other(me);
  const d0 = distances(state);
  const list = [];
  for (const o of ["h", "v"]){
    for (let r = 0; r <= SIZE - 2; r++){
      for (let c = 0; c <= SIZE - 2; c++){
        if (!validateWall(state, o, r, c).ok) continue;
        // simula só as arestas (mais rápido que snapshot)
        setWallSegments(state, o, r, c, true);
        const dMe = bfsDistance(state, state.players[me].r,  state.players[me].c,  GOAL[me]);
        const dFo = bfsDistance(state, state.players[foe].r, state.players[foe].c, GOAL[foe]);
        setWallSegments(state, o, r, c, false);
        if (dMe < 0 || dFo < 0) continue;           // segurança extra
        list.push({ type: "wall", o, r, c, gain: dFo - d0[foe], hurt: dMe - d0[me] });
      }
    }
  }
  // atrasa muito o rival e quase não me atrapalha primeiro
  list.sort((a, b) => (b.gain - b.hurt) - (a.gain - a.hurt));
  return list.slice(0, cap);
}

/* Todas as ações de movimento como objetos */
function moveActions(state, me){
  return legalMoves(state, me).map((m) => ({ type: "move", r: m.r, c: m.c }));
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ═══════════ CÉREBRO PRINCIPAL ═══════════ */
export function chooseAiAction(state, level){
  const me = state.turn;
  const moves = moveActions(state, me);
  if (!moves.length) return null;

  const d = distances(state);
  const canWall = state.players[me].walls > 0;

  /* ---------- FÁCIL: quase aleatório, às vezes anda certo ---------- */
  if (level === "easy"){
    if (canWall && Math.random() < 0.15){
      const w = wallCandidates(state, me, 3);
      if (w.length && Math.random() < 0.5) return w[0];
    }
    return Math.random() < 0.45
      ? bestBy(moves, (a) => evalFor(simulate(state, a), me))
      : pick(moves);
  }

  /* ---------- MÉDIO: ganancioso + bloqueia quando o rival voa ---------- */
  if (level === "medium"){
    const foe = other(me);
    if (canWall && d[foe] <= 3 && Math.random() < 0.8){
      const w = wallCandidates(state, me, 4);
      if (w.length && w[0].gain > 0) return w[0];
    }
    return bestBy(moves, (a) => evalFor(simulate(state, a), me));
  }

  /* ---------- DIFÍCIL: 1 ply — compara movimentos E barreiras ---------- */
  if (level === "hard"){
    const actions = [...moves];
    if (canWall) actions.push(...wallCandidates(state, me, 6));
    return bestBy(actions, (a) => evalFor(simulate(state, a), me));
  }

  /* ---------- ESPECIALISTA: 2 plies (prevê a melhor resposta rival) ---------- */
  const actions = [
    ...bestN(moves, (a) => evalFor(simulate(state, a), me), 4),
    ...(canWall ? wallCandidates(state, me, 4) : [])
  ];
  let best = null, bestScore = -Infinity;
  for (const a of actions){
    const s1 = simulate(state, a);
    if (s1.over) return a;                          // vence agora? faz!
    // melhor resposta do rival (movimento ganancioso dele)
    const foeMoves = moveActions(s1, other(me));
    let score = evalFor(s1, me);
    if (foeMoves.length){
      const s2 = simulate(s1, bestBy(foeMoves, (m) => evalFor(simulate(s1, m), other(me))));
      score = evalFor(s2, me);
    }
    if (score > bestScore){ bestScore = score; best = a; }
  }
  return best || pick(moves);
}

/* ═══════════ helpers de seleção ═══════════ */
function bestBy(arr, scoreFn){
  let best = arr[0], bs = -Infinity;
  for (const item of arr){
    const s = scoreFn(item);
    if (s > bs){ bs = s; best = item; }
  }
  return best;
}
function bestN(arr, scoreFn, n){
  return arr.map((item) => ({ item, s: scoreFn(item) }))
            .sort((a, b) => b.s - a.s)
            .slice(0, n)
            .map((x) => x.item);
}