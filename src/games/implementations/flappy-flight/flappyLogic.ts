/**
 * Pure "Flappy Flight" logic (normalized 0..1 coordinates).
 * Tap to flap; glide through gaps between scrolling pipes. No RN dependencies.
 */

export interface Pipe {
  x: number;
  gapY: number;
  gapH: number;
  scored: boolean;
}

export interface FlappyState {
  y: number;
  vy: number;
  pipes: Pipe[];
  score: number;
  status: 'ready' | 'playing' | 'over';
  spawnTimer: number;
  ground: number;
}

export const BIRD_X = 0.26;
export const BIRD_R = 0.045;
export const GRAVITY = 1.9;
export const FLAP_VELOCITY = -0.72;
export const MAX_FALL = 1.9;
export const GAP_H = 0.3;
export const PIPE_W = 0.11;
export const GROUND = 0.94;
export const BASE_SPEED = 0.55;
export const SPAWN_INTERVAL = 1.05;

export function createFlappyState(): FlappyState {
  return { y: 0.45, vy: 0, pipes: [], score: 0, status: 'ready', spawnTimer: 0.3, ground: GROUND };
}

/** Top edge of the bird's circular hitbox (normalized). */
export function birdTop(y: number): number {
  return y - BIRD_R;
}

/** Bottom edge of the bird's circular hitbox (normalized); the death plane. */
export function birdBottom(y: number): number {
  return y + BIRD_R;
}

/**
 * On-screen half-extents (px) of the bird's hitbox for an arena of size w x h.
 * The rendered sprite MUST use these so the drawn bird matches what collides.
 */
export function birdHitbox(w: number, h: number): { halfW: number; halfH: number } {
  return { halfW: BIRD_R * w, halfH: BIRD_R * h };
}

export function startFlappy(state: FlappyState): FlappyState {
  if (state.status !== 'ready') return state;
  return { ...state, status: 'playing' };
}

export function flap(state: FlappyState): FlappyState {
  if (state.status !== 'playing') return state;
  return { ...state, vy: FLAP_VELOCITY };
}

function hits(state: FlappyState): boolean {
  if (state.y - BIRD_R <= 0) return true;
  if (state.y + BIRD_R >= state.ground) return true;
  for (const p of state.pipes) {
    if (Math.abs(p.x - BIRD_X) < BIRD_R + PIPE_W / 2) {
      const top = p.gapY - p.gapH / 2;
      const bottom = p.gapY + p.gapH / 2;
      if (state.y - BIRD_R < top || state.y + BIRD_R > bottom) return true;
    }
  }
  return false;
}

export function step(state: FlappyState, dt: number): FlappyState {
  if (state.status !== 'playing') return state;
  const d = Math.max(0, Math.min(0.05, dt));

  const vy = Math.min(MAX_FALL, state.vy + GRAVITY * d);
  const y = state.y + vy * d;

  let pipes = state.pipes.map((p) => ({ ...p, x: p.x - BASE_SPEED * d }));
  let spawnTimer = state.spawnTimer - d;
  if (spawnTimer <= 0) {
    const gapH = Math.max(0.22, GAP_H - Math.min(0.06, state.score * 0.004));
    pipes.push({ x: 1.1, gapY: 0.25 + Math.random() * 0.45, gapH, scored: false });
    spawnTimer = SPAWN_INTERVAL;
  }

  let score = state.score;
  for (const p of pipes) {
    if (!p.scored && p.x + PIPE_W / 2 < BIRD_X - BIRD_R) {
      p.scored = true;
      score++;
    }
  }
  pipes = pipes.filter((p) => p.x > -0.3);

  const next: FlappyState = { ...state, y, vy, pipes, score, spawnTimer };
  if (hits(next)) return { ...next, status: 'over' };
  return next;
}
