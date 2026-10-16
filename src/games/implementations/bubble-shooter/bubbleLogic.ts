/**
 * Pure Bubble Shooter logic. No RN dependencies.
 *
 * The board is an offset hex grid: even rows sit flush, odd rows are shifted
 * half a cell to the right. A shot travels up the board until it meets an
 * occupied cell, landing in the free cell it came from. Landing three or more
 * of a colour pops them, then any bubbles no longer hanging from the top drop
 * away. A run of fruitless shots pushes a fresh row down from the top; the run
 * ends when the bottom row fills up.
 */

export const COLS = 11;
export const ROWS = 12;
export const COLORS = 5;
export const MISS_LIMIT = 4;

export type Cell = number | null;
export type Grid = Cell[][];

export interface BubbleState {
  grid: Grid;
  score: number;
  misses: number;
  shots: number;
  current: number;
  next: number;
  outcome: 'in_progress' | 'over';
}

const randColor = (): number => Math.floor(Math.random() * COLORS);

function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => new Array<Cell>(COLS).fill(null));
}

/** Fills the top `fill` rows with random colours to start from. */
export function createBoard(fill = 3): Grid {
  const g = emptyGrid();
  for (let r = 0; r < fill; r++) for (let c = 0; c < COLS; c++) g[r][c] = randColor();
  return g;
}

export function createBubbles(fill = 3): BubbleState {
  return {
    grid: createBoard(fill),
    score: 0,
    misses: 0,
    shots: 0,
    current: randColor(),
    next: randColor(),
    outcome: 'in_progress',
  };
}

export function offsetOf(r: number): number {
  return r % 2 === 1 ? 0.5 : 0;
}

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

/** The six hex neighbours for the even/odd offset layout. */
export function neighbors(r: number, c: number): [number, number][] {
  const out: [number, number][] = [
    [r, c - 1],
    [r, c + 1],
  ];
  const dy = r % 2 === 1 ? 1 : -1;
  if (r % 2 === 1) {
    out.push([r + 1, c], [r + 1, c + 1], [r - 1, c], [r - 1, c + 1]);
  } else {
    out.push([r + 1, c - 1], [r + 1, c], [r - 1, c - 1], [r - 1, c]);
  }
  void dy;
  return out.filter(([rr, cc]) => inBounds(rr, cc));
}

/** All cells connected to (r,c) sharing its colour. */
export function floodFill(grid: Grid, r: number, c: number): [number, number][] {
  const color = grid[r]?.[c];
  if (color === null || color === undefined) return [];
  const seen = new Set<string>([`${r},${c}`]);
  const out: [number, number][] = [[r, c]];
  const queue: [number, number][] = [[r, c]];
  while (queue.length) {
    const [cr, cc] = queue.pop() as [number, number];
    for (const [nr, nc] of neighbors(cr, cc)) {
      const key = `${nr},${nc}`;
      if (seen.has(key)) continue;
      if (grid[nr][nc] === color) {
        seen.add(key);
        out.push([nr, nc]);
        queue.push([nr, nc]);
      }
    }
  }
  return out;
}

/** Occupied cells not reachable from the top row (they drop away). */
export function findFloating(grid: Grid): [number, number][] {
  const reachable = new Set<string>();
  const queue: [number, number][] = [];
  for (let c = 0; c < COLS; c++) {
    if (grid[0][c] !== null) {
      reachable.add(`0,${c}`);
      queue.push([0, c]);
    }
  }
  while (queue.length) {
    const [cr, cc] = queue.pop() as [number, number];
    for (const [nr, nc] of neighbors(cr, cc)) {
      const key = `${nr},${nc}`;
      if (reachable.has(key)) continue;
      if (grid[nr][nc] !== null) {
        reachable.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  const floating: [number, number][] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] !== null && !reachable.has(`${r},${c}`)) floating.push([r, c]);
    }
  }
  return floating;
}

export function bottomFilled(grid: Grid): boolean {
  return grid[ROWS - 1].some((cell) => cell !== null);
}

export interface ResolveResult {
  grid: Grid;
  matched: number;
  floating: number;
}

/** Pops the cluster at (r,c) if it reaches three, then drops anything loose. */
export function resolveLanding(grid: Grid, r: number, c: number): ResolveResult {
  const group = floodFill(grid, r, c);
  if (group.length < 3) return { grid, matched: 0, floating: 0 };
  const g = grid.map((row) => row.slice());
  for (const [gr, gc] of group) g[gr][gc] = null;
  const loose = findFloating(g);
  for (const [fr, fc] of loose) g[fr][fc] = null;
  return { grid: g, matched: group.length, floating: loose.length };
}

/** Adds a fresh row at the top and pushes everything else down. */
export function pushRow(grid: Grid): Grid {
  const g = grid.map((row) => row.slice());
  g.pop();
  g.unshift(new Array<Cell>(COLS).fill(null).map(() => randColor()));
  return g;
}

/**
 * Marches the shot from (startX,startY) in direction (dx,dy) until it meets an
 * occupied cell or the edge, returning the free cell it should settle in.
 */
export function simulateShot(
  grid: Grid,
  startX: number,
  startY: number,
  dx: number,
  dy: number
): [number, number] | null {
  const len = Math.hypot(dx, dy) || 1;
  const stepX = (dx / len) * 0.06;
  const stepY = (dy / len) * 0.06;
  let x = startX;
  let y = startY;
  let last: [number, number] | null = null;

  for (let i = 0; i < 800; i++) {
    x += stepX;
    y += stepY;
    if (y < 0) break;
    const r = Math.round(y);
    if (r >= ROWS) continue;
    const c = Math.round(x - offsetOf(r));
    if (c < 0 || c >= COLS) break;
    if (grid[r][c] !== null) return last;
    last = [r, c];
  }
  return last;
}

/** Fires the current bubble: lands it, resolves matches and advances the queue. */
export function fire(state: BubbleState, dirX: number, dirY: number): BubbleState {
  if (state.outcome !== 'in_progress') return state;
  const start = { x: (COLS - 1) / 2, y: ROWS - 0.5 };
  const landing = simulateShot(state.grid, start.x, start.y, dirX, dirY);
  if (!landing) return state;
  const [r, c] = landing;

  const grid = state.grid.map((row) => row.slice());
  grid[r][c] = state.current;
  const res = resolveLanding(grid, r, c);

  const matched = res.matched;
  const floating = res.floating;
  let misses = matched === 0 ? state.misses + 1 : 0;

  let g = res.grid;
  if (misses >= MISS_LIMIT) {
    g = pushRow(g);
    misses = 0;
  }

  const score = state.score + matched * 10 + floating * 20;
  const over = bottomFilled(g);

  return {
    grid: g,
    score,
    misses,
    shots: state.shots + 1,
    current: state.next,
    next: randColor(),
    outcome: over ? 'over' : state.outcome,
  };
}
