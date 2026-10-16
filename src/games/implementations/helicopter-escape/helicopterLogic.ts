/**
 * Pure "Helicopter Escape" logic using normalized 0..1 coordinates.
 * The helicopter sits at a fixed x and falls under gravity; tapping thrusts up.
 * Cave walls scroll in from the right with a gap to fly through.
 */

export interface Obstacle {
  x: number;
  gapY: number;
  gapH: number;
  scored: boolean;
}

export interface HeliState {
  y: number;
  vy: number;
  obstacles: Obstacle[];
  score: number;
  status: 'ready' | 'playing' | 'crashed';
  spawnTimer: number;
  speed: number;
}

export const PLAYER_X = 0.24;
export const PLAYER_H = 0.075;
export const PLAYER_W = 0.14;
export const OBST_W = 0.07;
/**
 * Gentler flight model: a single tap should lift the helicopter roughly a
 * third of a gap, not most of it, so the controls feel precise instead of
 * twitchy. Apex height for a tap is THRUST_VELOCITY^2 / (2 * GRAVITY)
 * (~0.15) versus a gap of ~0.34.
 */
export const GRAVITY = 1.1;
export const THRUST_VELOCITY = -0.58;
export const MAX_FALL = 1.15;
export const GAP_H = 0.34;
export const BASE_SPEED = 0.46;
export const SPAWN_INTERVAL = 1.0;

export function createHeliState(): HeliState {
  return {
    y: 0.5,
    vy: 0,
    obstacles: [],
    score: 0,
    status: 'ready',
    spawnTimer: 0.4,
    speed: BASE_SPEED,
  };
}

export function start(state: HeliState): HeliState {
  if (state.status !== 'ready') return state;
  return { ...state, status: 'playing' };
}

export function flap(state: HeliState): HeliState {
  if (state.status !== 'playing') return state;
  return { ...state, vy: THRUST_VELOCITY };
}

function collides(state: HeliState): boolean {
  const top = state.y - PLAYER_H / 2;
  const bottom = state.y + PLAYER_H / 2;
  if (top <= 0 || bottom >= 1) return true;
  for (const ob of state.obstacles) {
    if (Math.abs(ob.x - PLAYER_X) < PLAYER_W / 2 + OBST_W / 2) {
      const gapTop = ob.gapY - ob.gapH / 2;
      const gapBottom = ob.gapY + ob.gapH / 2;
      if (top < gapTop || bottom > gapBottom) return true;
    }
  }
  return false;
}

export function step(state: HeliState, dt: number): HeliState {
  if (state.status !== 'playing') return state;
  const d = Math.max(0, Math.min(0.05, dt));

  const vy = Math.min(MAX_FALL, state.vy + GRAVITY * d);
  const y = state.y + vy * d;

  let obstacles = state.obstacles.map((o) => ({ ...o, x: o.x - state.speed * d }));

  let spawnTimer = state.spawnTimer - d;
  if (spawnTimer <= 0) {
    const gapH = Math.max(0.26, GAP_H - Math.min(0.08, state.score * 0.006));
    obstacles.push({ x: 1.12, gapY: 0.25 + Math.random() * 0.5, gapH, scored: false });
    spawnTimer = SPAWN_INTERVAL;
  }

  let score = state.score;
  for (const o of obstacles) {
    if (!o.scored && o.x + OBST_W / 2 < PLAYER_X - PLAYER_W / 2) {
      o.scored = true;
      score++;
    }
  }
  obstacles = obstacles.filter((o) => o.x > -0.25);

  const next: HeliState = {
    ...state,
    y,
    vy,
    obstacles,
    score,
    spawnTimer,
    speed: BASE_SPEED + Math.min(0.5, score * 0.01),
  };

  if (collides(next)) {
    return { ...next, status: 'crashed' };
  }
  return next;
}
