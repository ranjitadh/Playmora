/**
 * Pure "Block Puzzle" logic. Place polyomino shapes on a grid; complete rows or
 * columns clear. No React Native dependencies.
 */

export type Grid = number[][]; // 0 = empty, >0 = filled

export interface Shape {
  id: string;
  cells: Array<[number, number]>; // [row, col] offsets
  w: number;
  h: number;
}

function shape(id: string, cells: Array<[number, number]>): Shape {
  const w = Math.max(...cells.map((c) => c[1])) + 1;
  const h = Math.max(...cells.map((c) => c[0])) + 1;
  return { id, cells, w, h };
}

export const SHAPES: Shape[] = [
  shape('1x1', [[0, 0]]),
  shape('1x2', [[0, 0], [0, 1]]),
  shape('2x1', [[0, 0], [1, 0]]),
  shape('1x3', [[0, 0], [0, 1], [0, 2]]),
  shape('3x1', [[0, 0], [1, 0], [2, 0]]),
  shape('1x4', [[0, 0], [0, 1], [0, 2], [0, 3]]),
  shape('4x1', [[0, 0], [1, 0], [2, 0], [3, 0]]),
  shape('2x2', [[0, 0], [0, 1], [1, 0], [1, 1]]),
  shape('L', [[0, 0], [1, 0], [2, 0], [2, 1]]),
  shape('J', [[0, 1], [1, 1], [2, 1], [2, 0]]),
  shape('S', [[0, 1], [0, 2], [1, 0], [1, 1]]),
  shape('T', [[0, 0], [0, 1], [0, 2], [1, 1]]),
  shape('3x3', [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]),
];

export function createGrid(size: number): Grid {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

export function canPlace(grid: Grid, s: Shape, r: number, c: number): boolean {
  const size = grid.length;
  for (const [dr, dc] of s.cells) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr < 0 || rr >= size || cc < 0 || cc >= size) return false;
    if (grid[rr][cc] !== 0) return false;
  }
  return true;
}

/** Clears any full rows and columns. Returns the new grid and how many lines cleared. */
export function clearLines(grid: Grid): { grid: Grid; cleared: number } {
  const size = grid.length;
  const fullRows = new Set<number>();
  const fullCols = new Set<number>();
  for (let r = 0; r < size; r++) if (grid[r].every((v) => v !== 0)) fullRows.add(r);
  for (let c = 0; c < size; c++) {
    let full = true;
    for (let r = 0; r < size; r++) if (grid[r][c] === 0) { full = false; break; }
    if (full) fullCols.add(c);
  }
  if (fullRows.size === 0 && fullCols.size === 0) return { grid, cleared: 0 };

  const next = grid.map((row) => [...row]);
  fullRows.forEach((r) => { for (let c = 0; c < size; c++) next[r][c] = 0; });
  fullCols.forEach((c) => { for (let r = 0; r < size; r++) next[r][c] = 0; });
  return { grid: next, cleared: fullRows.size + fullCols.size };
}

/** Places a shape (assuming canPlace) and clears lines. */
export function place(grid: Grid, s: Shape, r: number, c: number, color = 1): { grid: Grid; cleared: number } {
  const next = grid.map((row) => [...row]);
  for (const [dr, dc] of s.cells) next[r + dr][c + dc] = color;
  return clearLines(next);
}

export function anyPlacement(grid: Grid, shapes: Shape[]): boolean {
  for (const s of shapes) {
    for (let r = 0; r <= grid.length - s.h; r++) {
      for (let c = 0; c <= grid.length - s.w; c++) {
        if (canPlace(grid, s, r, c)) return true;
      }
    }
  }
  return false;
}
