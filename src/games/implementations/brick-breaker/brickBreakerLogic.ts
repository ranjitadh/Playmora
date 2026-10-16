/**
 * Pure "Brick Breaker" logic using normalized 0..1 coordinates.
 * No React Native dependencies.
 */

export interface Brick {
  row: number;
  col: number;
  alive: boolean;
}

export interface BrickState {
  ballX: number;
  ballY: number;
  vx: number;
  vy: number;
  paddleX: number;
  bricks: Brick[];
  score: number;
  lives: number;
  status: 'ready' | 'playing' | 'won' | 'lost';
}

export const BALL_R = 0.018;
export const PADDLE_W = 0.22;
export const PADDLE_H = 0.028;
export const PADDLE_Y = 0.94;
export const BRICK_ROWS = 5;
export const BRICK_COLS = 8;
export const BRICK_PAD = 0.03;
export const BRICK_TOP = 0.08;
export const BRICK_H = 0.045;
export const BRICK_GAP = 0.01;
export const BRICK_W = (1 - 2 * BRICK_PAD) / BRICK_COLS;
export const BALL_SPEED = 0.55;
export const START_LIVES = 3;
export const POINTS_PER_BRICK = 10;

export function brickTop(row: number): number {
  return BRICK_TOP + row * (BRICK_H + BRICK_GAP);
}

export function brickLeft(col: number): number {
  return BRICK_PAD + col * BRICK_W;
}

export function clampPaddleX(x: number): number {
  return Math.max(PADDLE_W / 2, Math.min(1 - PADDLE_W / 2, x));
}

export function createBrickState(): BrickState {
  const bricks: Brick[] = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) bricks.push({ row, col, alive: true });
  }
  return {
    ballX: 0.5,
    ballY: PADDLE_Y - BALL_R - 0.02,
    vx: 0,
    vy: 0,
    paddleX: 0.5,
    bricks,
    score: 0,
    lives: START_LIVES,
    status: 'ready',
  };
}

function launchVelocity(): { vx: number; vy: number } {
  const angle = (Math.random() * 0.5 - 0.25) + Math.PI / 2; // mostly upward, slight tilt
  return { vx: Math.cos(angle) * BALL_SPEED, vy: -Math.abs(Math.sin(angle) * BALL_SPEED) };
}

export function launch(state: BrickState): BrickState {
  if (state.status !== 'ready') return state;
  const { vx, vy } = launchVelocity();
  return { ...state, status: 'playing', vx, vy };
}

export function movePaddle(state: BrickState, x: number): BrickState {
  const paddleX = clampPaddleX(x);
  if (state.status === 'ready') {
    return { ...state, paddleX, ballX: paddleX };
  }
  return { ...state, paddleX };
}

function resetBall(state: BrickState): BrickState {
  const { vx, vy } = launchVelocity();
  return { ...state, ballX: state.paddleX, ballY: PADDLE_Y - BALL_R - 0.02, vx, vy };
}

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function hitRect(state: BrickState, rect: Rect): boolean {
  const nearestX = Math.max(rect.left, Math.min(state.ballX, rect.right));
  const nearestY = Math.max(rect.top, Math.min(state.ballY, rect.bottom));
  const dx = state.ballX - nearestX;
  const dy = state.ballY - nearestY;
  return dx * dx + dy * dy < BALL_R * BALL_R;
}

export function step(state: BrickState, dt: number): BrickState {
  if (state.status === 'ready') return { ...state, ballX: state.paddleX };
  if (state.status !== 'playing') return state;
  const d = Math.max(0, Math.min(0.05, dt));

  let { ballX, ballY, vx, vy } = state;
  ballX += vx * d;
  ballY += vy * d;

  // Side + top walls.
  if (ballX < BALL_R) {
    ballX = BALL_R;
    vx = Math.abs(vx);
  } else if (ballX > 1 - BALL_R) {
    ballX = 1 - BALL_R;
    vx = -Math.abs(vx);
  }
  if (ballY < BALL_R) {
    ballY = BALL_R;
    vy = Math.abs(vy);
  }

  let { score, lives } = state;
  let bricks = state.bricks;

  // Paddle.
  if (vy > 0 && ballY + BALL_R >= PADDLE_Y && ballY < PADDLE_Y + PADDLE_H + BALL_R) {
    if (Math.abs(ballX - state.paddleX) <= PADDLE_W / 2 + BALL_R) {
      ballY = PADDLE_Y - BALL_R;
      vy = -Math.abs(vy);
      vx += ((ballX - state.paddleX) / (PADDLE_W / 2)) * 0.25;
      vx = Math.max(-0.9, Math.min(0.9, vx));
    }
  }

  // Bricks (one collision per step).
  let hit = false;
  for (const brick of bricks) {
    if (!brick.alive) continue;
    const rect: Rect = {
      left: brickLeft(brick.col),
      right: brickLeft(brick.col) + BRICK_W,
      top: brickTop(brick.row),
      bottom: brickTop(brick.row) + BRICK_H,
    };
    if (hitRect({ ...state, ballX, ballY }, rect)) {
      const cx = (rect.left + rect.right) / 2;
      const cy = (rect.top + rect.bottom) / 2;
      const overlapX = BRICK_W / 2 + BALL_R - Math.abs(ballX - cx);
      const overlapY = BRICK_H / 2 + BALL_R - Math.abs(ballY - cy);
      if (overlapX < overlapY) vx = ballX < cx ? -Math.abs(vx) : Math.abs(vx);
      else vy = ballY < cy ? -Math.abs(vy) : Math.abs(vy);
      bricks = bricks.map((b) => (b === brick ? { ...b, alive: false } : b));
      score += POINTS_PER_BRICK;
      hit = true;
      break;
    }
  }

  const next: BrickState = { ...state, ballX, ballY, vx, vy, bricks, score, lives };

  if (bricks.every((b) => !b.alive)) {
    return { ...next, status: 'won' };
  }

  // Missed the ball.
  if (ballY - BALL_R > 1) {
    lives -= 1;
    if (lives <= 0) return { ...next, lives: 0, status: 'lost' };
    return resetBall({ ...next, lives });
  }

  return next;
}
