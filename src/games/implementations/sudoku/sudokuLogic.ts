/**
 * Pure Sudoku logic — generation, solving and validation. No RN dependencies.
 *
 * Grids are flat number arrays of length 81, row-major, 0 = empty.
 */

export type Grid = number[];

export interface Sudoku {
  puzzle: Grid;
  solution: Grid;
}

export const SIZE = 9;
export const CELLS = 81;

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** True when placing `value` at `index` breaks no row, column or box rule. */
export function canPlace(grid: Grid, index: number, value: number): boolean {
  if (value < 1 || value > 9) return false;
  const r = Math.floor(index / SIZE);
  const c = index % SIZE;
  for (let i = 0; i < SIZE; i++) {
    if (grid[r * SIZE + i] === value) return false;
    if (grid[i * SIZE + c] === value) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) {
      if (grid[rr * SIZE + cc] === value) return false;
    }
  }
  return true;
}

function fill(grid: Grid): boolean {
  const empty = grid.indexOf(0);
  if (empty === -1) return true;
  for (const n of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (canPlace(grid, empty, n)) {
      grid[empty] = n;
      if (fill(grid)) return true;
      grid[empty] = 0;
    }
  }
  return false;
}

/** Builds one random, fully solved grid. */
export function generateSolved(): Grid {
  const grid = new Array<number>(CELLS).fill(0);
  fill(grid);
  return grid;
}

/** Solves a grid in place on a copy; returns null when unsolvable. */
export function solve(grid: Grid): Grid | null {
  const g = grid.slice();
  return fill(g) ? g : null;
}

/** Counts solutions up to `cap` (default 2) — used to test uniqueness. */
export function countSolutions(grid: Grid, cap = 2): number {
  const g = grid.slice();
  let count = 0;
  const rec = (): void => {
    if (count >= cap) return;
    const empty = g.indexOf(0);
    if (empty === -1) {
      count++;
      return;
    }
    for (let n = 1; n <= 9; n++) {
      if (canPlace(g, empty, n)) {
        g[empty] = n;
        rec();
        g[empty] = 0;
        if (count >= cap) return;
      }
    }
  };
  rec();
  return count;
}

/** Creates a puzzle with a guaranteed-unique solution and `holes` blanks. */
export function createSudoku(holes = 40): Sudoku {
  const solution = generateSolved();
  const puzzle = solution.slice();
  let removed = 0;
  for (const i of shuffled(Array.from({ length: CELLS }, (_, k) => k))) {
    if (removed >= holes) break;
    const backup = puzzle[i];
    if (backup === 0) continue;
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) !== 1) puzzle[i] = backup;
    else removed++;
  }
  return { puzzle, solution };
}

/** Indices of every cell that repeats a value in its row, column or box. */
export function conflicts(grid: Grid): Set<number> {
  const bad = new Set<number>();
  for (let i = 0; i < CELLS; i++) {
    const v = grid[i];
    if (v === 0) continue;
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    for (let k = 0; k < SIZE; k++) {
      const rowIdx = r * SIZE + k;
      const colIdx = k * SIZE + c;
      if (rowIdx !== i && grid[rowIdx] === v) bad.add(i);
      if (colIdx !== i && grid[colIdx] === v) bad.add(i);
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++) {
      for (let cc = bc; cc < bc + 3; cc++) {
        const idx = rr * SIZE + cc;
        if (idx !== i && grid[idx] === v) bad.add(i);
      }
    }
  }
  return bad;
}

/** True when every cell is filled and no rule is broken. */
export function isComplete(grid: Grid): boolean {
  return grid.every((v) => v !== 0) && conflicts(grid).size === 0;
}
