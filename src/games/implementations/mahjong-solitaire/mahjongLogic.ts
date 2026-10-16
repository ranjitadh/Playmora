/**
 * Pure Mahjong Solitaire logic. No RN dependencies.
 *
 * Tiles sit on an integer grid with a layer height. A tile is "free" when
 * nothing rests directly on top of it and at least one horizontal side is
 * open. Two free tiles with the same symbol can be matched and removed.
 */

export interface MTile {
  id: number;
  x: number;
  y: number;
  layer: number;
  symbol: number;
  removed: boolean;
}

export interface MahjongState {
  tiles: MTile[];
  selected: number | null;
  outcome: 'in_progress' | 'win';
}

// 44 tiles (22 pairs): a solid 8x4 slab with a raised 6x2 crown.
const LAYOUT: { x: number; y: number; layer: number }[] = [
  ...Array.from({ length: 4 }, (_, y) => Array.from({ length: 8 }, (_, x) => ({ x, y, layer: 0 }))).flat(),
  ...Array.from({ length: 2 }, (_, y) => Array.from({ length: 6 }, (_, x) => ({ x: x + 1, y: y + 1, layer: 1 }))).flat(),
];

function shuffled<T>(a: T[]): T[] {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function symbolsFor(count: number): number[] {
  const pairs = count / 2;
  const out: number[] = [];
  for (let i = 0; i < pairs; i++) out.push(i, i);
  return out;
}

export function createMahjong(): MahjongState {
  const symbols = shuffled(symbolsFor(LAYOUT.length));
  const tiles = LAYOUT.map((pos, id) => ({ id, ...pos, symbol: symbols[id], removed: false }));
  const state: MahjongState = { tiles, selected: null, outcome: 'in_progress' };
  return hasMoves(state.tiles) ? state : reshuffle(state);
}

export function liveTiles(tiles: MTile[]): MTile[] {
  return tiles.filter((t) => !t.removed);
}

function occupied(tiles: MTile[], x: number, y: number, layer: number): boolean {
  return tiles.some((t) => !t.removed && t.x === x && t.y === y && t.layer === layer);
}

/** A tile is free when uncovered and open on at least one side. */
export function isFree(tiles: MTile[], tile: MTile): boolean {
  if (tile.removed) return false;
  if (occupied(tiles, tile.x, tile.y, tile.layer + 1)) return false;
  const left = occupied(tiles, tile.x - 1, tile.y, tile.layer);
  const right = occupied(tiles, tile.x + 1, tile.y, tile.layer);
  return !left || !right;
}

export function freeTiles(tiles: MTile[]): MTile[] {
  return liveTiles(tiles).filter((t) => isFree(tiles, t));
}

export function hasMoves(tiles: MTile[]): boolean {
  const free = freeTiles(tiles);
  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      if (free[i].symbol === free[j].symbol) return true;
    }
  }
  return false;
}

/** Taps a tile: selects, deselects, or matches and removes a free pair. */
export function selectTile(state: MahjongState, id: number): MahjongState {
  if (state.outcome !== 'in_progress') return state;
  const tile = state.tiles.find((t) => t.id === id);
  if (!tile || tile.removed || !isFree(state.tiles, tile)) return state;

  if (state.selected === id) return { ...state, selected: null };

  const prev = state.selected === null ? undefined : state.tiles.find((t) => t.id === state.selected);
  if (prev && !prev.removed && prev.symbol === tile.symbol) {
    const tiles = state.tiles.map((t) => (t.id === id || t.id === prev.id ? { ...t, removed: true } : t));
    const win = liveTiles(tiles).length === 0;
    return { tiles, selected: null, outcome: win ? 'win' : 'in_progress' };
  }
  return { ...state, selected: id };
}

/** Reassigns symbols among the remaining tiles so a move always exists. */
export function reshuffle(state: MahjongState): MahjongState {
  const live = liveTiles(state.tiles);
  const symbols = shuffled(live.map((t) => t.symbol));
  let tiles = state.tiles.map((t) => {
    if (t.removed) return t;
    return { ...t, symbol: symbols[live.findIndex((l) => l.id === t.id)] };
  });
  let guard = 0;
  while (!hasMoves(tiles) && guard < 50) {
    const s2 = shuffled(symbols);
    tiles = tiles.map((t) => (t.removed ? t : { ...t, symbol: s2[live.findIndex((l) => l.id === t.id)] }));
    guard++;
  }
  return { tiles, selected: null, outcome: state.outcome };
}

export function remaining(state: MahjongState): number {
  return liveTiles(state.tiles).length;
}
