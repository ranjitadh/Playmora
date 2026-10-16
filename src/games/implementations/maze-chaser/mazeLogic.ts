/**
 * Pure Maze Chaser logic (Pac-Man style). No RN dependencies.
 *
 * A fixed symmetric maze is parsed once into wall / dot / pellet grids. The
 * player advances one cell per tick in its current direction when the next cell
 * is open, eating dots (+10) and power pellets (+50, which frightens ghosts for
 * a while). Ghosts chase the player, preferring not to reverse; while
 * frightened they flee and can be eaten for a bonus. Contact with a
 * non-frightened ghost costs a life; losing all lives ends the run. Clearing
 * every dot and pellet wins.
 */

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface Vec {
  r: number;
  c: number;
}

export interface Ghost extends Vec {
  dir: Dir;
  start: Vec;
}

export interface MazeState {
  dots: boolean[][];
  pellets: boolean[][];
  player: Vec;
  dir: Dir;
  ghosts: Ghost[];
  score: number;
  lives: number;
  eaten: number;
  total: number;
  frightened: number;
  outcome: 'in_progress' | 'won' | 'over';
}

export const MAZE: string[] = [
  '###############',
  '#.............#',
  '#.###.###.###.#',
  '#.............#',
  '#.###.###.###.#',
  '#.............#',
  '#.###.###.###.#',
  '#.............#',
  '#.###.###.###.#',
  '#.............#',
  '#.###.###.###.#',
  '#.............#',
  '#.###.###.###.#',
  '#.............#',
  '###############',
];

export const ROWS = MAZE.length;
export const COLS = MAZE[0].length;
export const FRIGHT_TICKS = 40;

export const PELLET_CELLS: Vec[] = [
  { r: 1, c: 1 },
  { r: 1, c: 13 },
  { r: 13, c: 1 },
  { r: 13, c: 13 },
];
export const PLAYER_START: Vec = { r: 13, c: 7 };
export const GHOST_STARTS: Vec[] = [
  { r: 1, c: 5 },
  { r: 1, c: 9 },
];

export const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

export function delta(dir: Dir): Vec {
  if (dir === 'up') return { r: -1, c: 0 };
  if (dir === 'down') return { r: 1, c: 0 };
  if (dir === 'left') return { r: 0, c: -1 };
  return { r: 0, c: 1 };
}

export function opposite(dir: Dir): Dir {
  if (dir === 'up') return 'down';
  if (dir === 'down') return 'up';
  if (dir === 'left') return 'right';
  return 'left';
}

export function isWall(r: number, c: number): boolean {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
  return MAZE[r][c] === '#';
}

function isPelletCell(r: number, c: number): boolean {
  return PELLET_CELLS.some((p) => p.r === r && p.c === c);
}

export function createMaze(): MazeState {
  const dots: boolean[][] = [];
  const pellets: boolean[][] = [];
  for (let r = 0; r < ROWS; r++) {
    dots.push([]);
    pellets.push([]);
    for (let c = 0; c < COLS; c++) {
      const wall = MAZE[r][c] === '#';
      const pellet = !wall && isPelletCell(r, c);
      dots[r].push(!wall && !pellet);
      pellets[r].push(pellet);
    }
  }
  const total = dots.flat().filter(Boolean).length + pellets.flat().filter(Boolean).length;
  return {
    dots,
    pellets,
    player: { ...PLAYER_START },
    dir: 'left',
    ghosts: GHOST_STARTS.map((s) => ({ ...s, start: { ...s }, dir: 'left' as Dir })),
    score: 0,
    lives: 3,
    eaten: 0,
    total,
    frightened: 0,
    outcome: 'in_progress',
  };
}

export function setDirection(state: MazeState, dir: Dir): MazeState {
  return { ...state, dir };
}

/** Advances the player one cell in its facing direction when possible. */
export function stepPlayer(state: MazeState): MazeState {
  if (state.outcome !== 'in_progress') return state;
  const d = delta(state.dir);
  const nr = state.player.r + d.r;
  const nc = state.player.c + d.c;
  if (isWall(nr, nc)) return state;

  const dots = state.dots.map((row) => row.slice());
  const pellets = state.pellets.map((row) => row.slice());
  let { score, eaten, frightened } = state;

  if (dots[nr][nc]) {
    dots[nr][nc] = false;
    score += 10;
    eaten += 1;
  }
  if (pellets[nr][nc]) {
    pellets[nr][nc] = false;
    score += 50;
    eaten += 1;
    frightened = FRIGHT_TICKS;
  }
  const won = eaten === state.total;
  return {
    ...state,
    player: { r: nr, c: nc },
    dots,
    pellets,
    score,
    eaten,
    frightened,
    outcome: won ? 'won' : state.outcome,
  };
}

function manhattan(a: Vec, b: Vec): number {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

function stepGhost(ghost: Ghost, player: Vec, frightened: boolean): Ghost {
  const options = DIRS.filter((d) => {
    const dd = delta(d);
    return !isWall(ghost.r + dd.r, ghost.c + dd.c);
  });
  const forward = options.filter((d) => d !== opposite(ghost.dir));
  const pool = forward.length > 0 ? forward : options;
  if (pool.length === 0) return ghost;

  let best = pool[0];
  let bestScore = frightened ? -Infinity : Infinity;
  for (const d of pool) {
    const dd = delta(d);
    const dist = manhattan({ r: ghost.r + dd.r, c: ghost.c + dd.c }, player);
    if (frightened ? dist > bestScore : dist < bestScore) {
      bestScore = dist;
      best = d;
    }
  }
  const dd = delta(best);
  return { ...ghost, r: ghost.r + dd.r, c: ghost.c + dd.c, dir: best };
}

export function stepGhosts(state: MazeState): Ghost[] {
  const frightened = state.frightened > 0;
  return state.ghosts.map((g) => stepGhost(g, state.player, frightened));
}

export function collides(state: MazeState): boolean {
  return state.ghosts.some((g) => g.r === state.player.r && g.c === state.player.c);
}

function resetAfterDeath(state: MazeState, lives: number): MazeState {
  return {
    ...state,
    lives,
    player: { ...PLAYER_START },
    dir: 'left',
    ghosts: GHOST_STARTS.map((s) => ({ ...s, start: { ...s }, dir: 'left' as Dir })),
    frightened: 0,
  };
}

/** Resolves player/ghost contact: eats a frightened ghost, else costs a life. */
export function resolveCollision(state: MazeState): MazeState {
  if (!collides(state)) return state;
  if (state.frightened > 0) {
    const ghosts = state.ghosts.map((g) =>
      g.r === state.player.r && g.c === state.player.c ? { ...g, r: g.start.r, c: g.start.c, dir: 'left' as Dir } : g
    );
    return { ...state, ghosts, score: state.score + 200 };
  }
  const lives = state.lives - 1;
  const next = resetAfterDeath(state, lives);
  return lives <= 0 ? { ...next, outcome: 'over' } : next;
}

/** One game tick: player moves, ghosts move, then contact is resolved. */
export function tick(state: MazeState): MazeState {
  if (state.outcome !== 'in_progress') return state;
  let next = stepPlayer(state);
  next = { ...next, ghosts: stepGhosts(next) };
  next = resolveCollision(next);
  next = { ...next, frightened: Math.max(0, next.frightened - 1) };
  return next;
}
