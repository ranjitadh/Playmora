/**
 * Pure Classic Pinball logic. No RN dependencies.
 *
 * A single silver ball is integrated with gravity inside a unit-square table.
 * It bounces off the side walls and top, rebounds off circular bumpers for
 * points, and is kicked back up by the two flippers when they are held. Letting
 * the ball slip past the flippers drains it; three drains end the run.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Bumper {
  x: number;
  y: number;
  r: number;
  points: number;
}

export interface Ball extends Vec2 {
  vx: number;
  vy: number;
}

export interface Flippers {
  left: boolean;
  right: boolean;
}

export interface PinballState {
  ball: Ball;
  bumpers: Bumper[];
  score: number;
  lives: number;
  hits: number;
  outcome: 'in_progress' | 'over';
}

export const BALL_R = 0.022;
export const GRAVITY = 1.6;
export const WALL_REST = 0.86;
export const BUMP_REST = 1.05;
export const MAX_SPEED = 2.0;
export const DRAIN_Y = 1.08;
export const FLIPPER_R = 0.11;
export const FLIP_KICK = 0.55;
export const LEFT_FLIPPER: Vec2 = { x: 0.28, y: 0.9 };
export const RIGHT_FLIPPER: Vec2 = { x: 0.72, y: 0.9 };

export const DEFAULT_BUMPERS: Bumper[] = [
  { x: 0.28, y: 0.26, r: 0.06, points: 100 },
  { x: 0.72, y: 0.26, r: 0.06, points: 100 },
  { x: 0.5, y: 0.48, r: 0.055, points: 150 },
  { x: 0.2, y: 0.56, r: 0.05, points: 50 },
  { x: 0.8, y: 0.56, r: 0.05, points: 50 },
];

export function resetBall(): Ball {
  return { x: 0.5, y: 0.14, vx: 0.12, vy: 0.32 };
}

export function createPinball(): PinballState {
  return {
    ball: resetBall(),
    bumpers: DEFAULT_BUMPERS.map((b) => ({ ...b })),
    score: 0,
    lives: 3,
    hits: 0,
    outcome: 'in_progress',
  };
}

function clampSpeed(ball: Ball): Ball {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed <= MAX_SPEED || speed === 0) return ball;
  const k = MAX_SPEED / speed;
  return { ...ball, vx: ball.vx * k, vy: ball.vy * k };
}

function hitBumper(ball: Ball, bumper: Bumper): Ball | null {
  const dx = ball.x - bumper.x;
  const dy = ball.y - bumper.y;
  const dist = Math.hypot(dx, dy);
  const min = BALL_R + bumper.r;
  if (dist >= min || dist === 0) return null;
  const nx = dx / dist;
  const ny = dy / dist;
  const dot = ball.vx * nx + ball.vy * ny;
  const vx = (ball.vx - 2 * dot * nx) * BUMP_REST;
  const vy = (ball.vy - 2 * dot * ny) * BUMP_REST;
  return { x: bumper.x + nx * min, y: bumper.y + ny * min, vx, vy };
}

function underFlipper(ball: Ball, flip: boolean, pos: Vec2): Ball | null {
  if (!flip) return null;
  const dist = Math.hypot(ball.x - pos.x, ball.y - pos.y);
  if (dist >= FLIPPER_R + BALL_R) return null;
  return { ...ball, vx: (0.5 - ball.x) * 1.6, vy: -Math.max(Math.abs(ball.vy), 0.5) - FLIP_KICK };
}

function drain(state: PinballState): PinballState {
  const lives = state.lives - 1;
  const next: PinballState = { ...state, lives, ball: resetBall() };
  return lives <= 0 ? { ...next, lives: 0, outcome: 'over' } : next;
}

/** Advances the ball one frame. `dt` defaults to a 60fps step. */
export function step(state: PinballState, flip: Flippers, dt = 1 / 60): PinballState {
  if (state.outcome !== 'in_progress') return state;

  let ball: Ball = { ...state.ball };
  ball.vy += GRAVITY * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x < BALL_R) {
    ball.x = BALL_R;
    ball.vx = Math.abs(ball.vx) * WALL_REST;
  } else if (ball.x > 1 - BALL_R) {
    ball.x = 1 - BALL_R;
    ball.vx = -Math.abs(ball.vx) * WALL_REST;
  }
  if (ball.y < BALL_R) {
    ball.y = BALL_R;
    ball.vy = Math.abs(ball.vy) * WALL_REST;
  }

  let score = state.score;
  let hits = state.hits;
  for (const bumper of state.bumpers) {
    const bounced = hitBumper(ball, bumper);
    if (bounced) {
      ball = bounced;
      score += bumper.points;
      hits += 1;
    }
  }

  const left = underFlipper(ball, flip.left, LEFT_FLIPPER);
  if (left) ball = left;
  const right = underFlipper(ball, flip.right, RIGHT_FLIPPER);
  if (right) ball = right;

  ball = clampSpeed(ball);

  if (ball.y > DRAIN_Y) {
    return drain({ ...state, score, hits });
  }

  return { ...state, ball, score, hits };
}
