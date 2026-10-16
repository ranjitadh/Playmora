/**
 * Pure Frog Road Crossing logic (Frogger style). No RN dependencies.
 *
 * The board is a 13x11 grid: goal row on top, five river lanes carrying logs,
 * a safe median, five road lanes carrying cars, and the starting bank. The frog
 * hops one cell at a time. Hopping into a road lane under a car is fatal;
 * hopping into the river is only safe on a log, and the log then carries the
 * frog sideways until it rides off the end. Reaching the goal row wins.
 */

export const ROWS = 13;
export const COLS = 11;
export const GOAL_ROW = 0;
export const MEDIAN_ROW = 6;
export const START_ROW = 12;
export const RIVER_ROWS = [1, 2, 3, 4, 5];
export const ROAD_ROWS = [7, 8, 9, 10, 11];

export type HopDir = 'up' | 'down' | 'left' | 'right';

export interface Lane {
  row: number;
  kind: 'road' | 'river';
  dir: 1 | -1;
  cells: boolean[];
}

export interface FrogState {
  frog: { r: number; c: number };
  lanes: Lane[];
  score: number;
  lives: number;
  frame: number;
  outcome: 'in_progress' | 'won' | 'over';
}

export function wrap(n: number, mod: number): number {
  return ((n % mod) + mod) % mod;
}

function makeLane(row: number, kind: 'road' | 'river'): Lane {
  const period = 5;
  const length = kind === 'river' ? 3 : 2;
  const phase = (row * 3) % period;
  const dir: 1 | -1 = row % 2 === 0 ? 1 : -1;
  const cells = Array.from({ length: COLS }, (_, c) => ((c + phase) % period) < length);
  return { row, kind, dir, cells };
}

export function createFrog(): FrogState {
  const lanes: Lane[] = [
    ...RIVER_ROWS.map((r) => makeLane(r, 'river')),
    ...ROAD_ROWS.map((r) => makeLane(r, 'road')),
  ];
  return {
    frog: { r: START_ROW, c: Math.floor(COLS / 2) },
    lanes,
    score: 0,
    lives: 3,
    frame: 0,
    outcome: 'in_progress',
  };
}

export function laneAt(state: FrogState, row: number): Lane | undefined {
  return state.lanes.find((l) => l.row === row);
}

export function shiftLane(cells: boolean[], dir: 1 | -1): boolean[] {
  const n = cells.length;
  return Array.from({ length: n }, (_, i) => cells[wrap(i - dir, n)]);
}

export function hopDelta(dir: HopDir): { dr: number; dc: number } {
  if (dir === 'up') return { dr: -1, dc: 0 };
  if (dir === 'down') return { dr: 1, dc: 0 };
  if (dir === 'left') return { dr: 0, dc: -1 };
  return { dr: 0, dc: 1 };
}

function loseLife(state: FrogState): FrogState {
  const lives = state.lives - 1;
  const reset: FrogState = { ...state, lives, frog: { r: START_ROW, c: Math.floor(COLS / 2) } };
  return lives <= 0 ? { ...reset, lives: 0, outcome: 'over' } : reset;
}

export function moveFrog(state: FrogState, dir: HopDir): FrogState {
  if (state.outcome !== 'in_progress') return state;
  const { dr, dc } = hopDelta(dir);
  const r = state.frog.r + dr;
  const c = state.frog.c + dc;
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return state;
  if (r === GOAL_ROW) return { ...state, frog: { r, c }, score: state.score + 100, outcome: 'won' };
  return { ...state, frog: { r, c } };
}

/** Applies road/river hazards for the frog's current cell. */
export function resolveEnvironment(state: FrogState): FrogState {
  if (state.outcome !== 'in_progress') return state;
  const { r, c } = state.frog;
  const lane = laneAt(state, r);
  if (!lane) return state;

  if (lane.kind === 'road') {
    return lane.cells[c] ? loseLife(state) : state;
  }
  if (!lane.cells[c]) return loseLife(state);
  const nc = wrap(c + lane.dir, COLS);
  if (!lane.cells[nc]) return loseLife(state);
  return { ...state, frog: { r, c: nc } };
}

export function hop(state: FrogState, dir: HopDir): FrogState {
  return resolveEnvironment(moveFrog(state, dir));
}

/** One tick: every lane slides, then hazards are resolved. */
export function tick(state: FrogState): FrogState {
  if (state.outcome !== 'in_progress') return state;
  const lanes = state.lanes.map((l) => ({ ...l, cells: shiftLane(l.cells, l.dir) }));
  return resolveEnvironment({ ...state, lanes, frame: state.frame + 1 });
}
