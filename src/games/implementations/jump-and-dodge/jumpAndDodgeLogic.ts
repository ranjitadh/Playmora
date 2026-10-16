/**
 * Pure "Jump and Dodge" endless-runner logic (normalized coordinates).
 * Tap to jump; leap over scrolling obstacles. Collide and the run ends.
 */

export interface Obstacle {
  x: number;
  w: number;
  h: number;
  scored: boolean;
}

export interface RunnerState {
  y: number; // player centre
  vy: number;
  obstacles: Obstacle[];
  score: number;
  status: 'ready' | 'playing' | 'over';
  spawnTimer: number;
  speed: number;
}

export const PLAYER_X = 0.2;
export const PLAYER_W = 0.09;
export const PLAYER_H = 0.12;
export const GROUND = 0.9;
export const GRAVITY = 3.2;
export const JUMP_VELOCITY = -1.45;
export const MAX_FALL = 2.2;
export const BASE_SPEED = 0.62;
export const SPAWN_INTERVAL = 1.0;

export function playerCenterY(): number {
  return GROUND - PLAYER_H / 2;
}

export function createRunnerState(): RunnerState {
  return {
    y: playerCenterY(),
    vy: 0,
    obstacles: [],
    score: 0,
    status: 'ready',
    spawnTimer: 0.5,
    speed: BASE_SPEED,
  };
}

export function startRun(state: RunnerState): RunnerState {
  if (state.status !== 'ready') return state;
  return { ...state, status: 'playing' };
}

export function jump(state: RunnerState): RunnerState {
  if (state.status !== 'playing') return state;
  const grounded = state.y >= playerCenterY() - 1e-6;
  if (!grounded) return state;
  return { ...state, vy: JUMP_VELOCITY };
}

function collides(state: RunnerState): boolean {
  const left = PLAYER_X - PLAYER_W / 2;
  const right = PLAYER_X + PLAYER_W / 2;
  const top = state.y - PLAYER_H / 2;
  const bottom = state.y + PLAYER_H / 2;
  for (const o of state.obstacles) {
    const oTop = GROUND - o.h;
    if (right > o.x && left < o.x + o.w && bottom > oTop && top < GROUND) return true;
  }
  return false;
}

export function step(state: RunnerState, dt: number): RunnerState {
  if (state.status !== 'playing') return state;
  const d = Math.max(0, Math.min(0.05, dt));

  let vy = state.vy + GRAVITY * d;
  vy = Math.min(MAX_FALL, vy);
  let y = state.y + vy * d;
  const floor = playerCenterY();
  if (y >= floor) {
    y = floor;
    vy = 0;
  }

  let obstacles = state.obstacles.map((o) => ({ ...o, x: o.x - state.speed * d }));
  let spawnTimer = state.spawnTimer - d;
  if (spawnTimer <= 0) {
    obstacles.push({ x: 1.1, w: 0.06, h: 0.09 + Math.random() * 0.08, scored: false });
    spawnTimer = SPAWN_INTERVAL - Math.min(0.35, state.score * 0.01);
  }

  let score = state.score;
  for (const o of obstacles) {
    if (!o.scored && o.x + o.w < PLAYER_X - PLAYER_W / 2) {
      o.scored = true;
      score++;
    }
  }
  obstacles = obstacles.filter((o) => o.x > -0.2);

  const next: RunnerState = { ...state, y, vy, obstacles, score, spawnTimer, speed: BASE_SPEED + Math.min(0.5, score * 0.012) };
  if (collides(next)) return { ...next, status: 'over' };
  return next;
}
