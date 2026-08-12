/* =============================================================
   Quoridor Arena — ui/workshop.js (stub — personalização desativada)
   Mantém as funções que o screens.js importa, sem adicionar UI.
   ============================================================= */
import { SKIN_CATALOG } from "../core/constants.js";

export function registerUserSkins(){ /* sem skins custom por enquanto */ }
export function mainColorFor(id, color, online){
  const it = SKIN_CATALOG.find((i) => i.cat === "piece" && i.id === id);
  if (it && it.badge && !online && color === "blue") return "#3b82f6";
  if (it && it.swatch) return it.swatch[color === "red" ? 0 : 1];
  return color === "red" ? "#ef4444" : "#3b82f6";
}
export function userWallBg(){ return null; }
export function applyUserBoard(){}
export function applyUserFrames(){}
export function getItems(){ return { pieces: [], walls: [], boards: [], frames: [] }; }
export const getSets = () => [];
export const TITLES = [];
export const titleOf = () => null;
export function initWorkshop(){ /* sem botão de personalizar */ }