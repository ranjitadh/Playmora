/**
 * Pure Pong logic using normalized 0..1 court coordinates.
 * No React Native dependencies — safe for unit testing.
 *
 * x grows to the right: 0 = player (left) side, 1 = AI (right) side.
 * y grows downward: 0 = top, 1 = bottom.
 */

export type Side = 'player' | 'ai';

export interface PongState {
  ballX: number;
  ballY: number;
  vx: number;
  vy: number;
  playerY: number;
  aiY: number;
  playerScore: number;
  aiScore: number;
  winner: Side | null;
}

export const BALL_RADIUS = 0.025;
export const PADDLE_HEIGHT = 0.22;
export const PADDLE_WIDTH = 0.022;
export const PADDLE_INSET = 0.04;
export const PLAYER_PADDLE_X = PADDLE_INSET;
export const AI_PADDLE_X = 1 - PADDLE_INSET - PADDLE_WIDTH;
export const BASE_SPEED = 0.82;
export const MAX_SPEED = 1.6;
export const AI_SPEED = 0.72;
export const WIN_SCORE = 7;
const MAX_DEFLECT = 0.62;

export function clampPaddle(y: number): number {
  const half = PADDLE_HEIGHT / 2;
  return Math.max(half, Math.min(1 - half, y));
}

export function createState(firstServe: Side = 'player'): PongState {
  const state: PongState = {
    ballX: 0.5,
    ballY: 0.5,
    vx: 0,
    vy: 0,
    playerY: 0.5,
    aiY: 0.5,
    playerScore: 0,
    aiScore: 0,
    winner: null,
  };
  return serve(state, firstServe);
}

/** Puts the ball at center heading toward the given side. */
export function serve(state: PongState, toward: Side): PongState {
  const angle = (Math.random() - 0.5) * (Math.PI / 3); // -30..30 degrees
  const dir = toward === 'player' ? -1 : 1;
  return {
    ...state,
    ballX: 0.5,
    ballY: 0.5,
    vx: dir * BASE_SPEED * Math.cos(angle),
    vy: BASE_SPEED * Math.sin(angle),
  };
}

export function movePlayer(state: PongState, y: number): PongState {
  return { ...state, playerY: clampPaddle(y) };
}

function deflect(ballY: number, paddleY: number): number {
  const offset = (ballY - paddleY) / (PADDLE_HEIGHT / 2);
  return Math.max(-1, Math.min(1, offset)) * MAX_DEFLECT;
}

/**
 * Advances the simulation by dt seconds.
 * Returns a new state (never mutates) and is a no-op after a winner.
 */
export function step(state: PongState, dt: number): PongState {
  if (state.winner) return state;
  const d = Math.max(0, Math.min(0.05, dt));

  // AI tracks the ball with a speed limit.
  let aiY = state.aiY;
  const diff = state.ballY - aiY;
  const maxMove = AI_SPEED * d;
  aiY += Math.max(-maxMove, Math.min(maxMove, diff));
  aiY = clampPaddle(aiY);

  let { ballX, ballY, vx, vy } = state;
  ballX += vx * d;
  ballY += vy * d;

  // Top / bottom walls.
  if (ballY < BALL_RADIUS) {
    ballY = BALL_RADIUS;
    vy = Math.abs(vy);
  } else if (ballY > 1 - BALL_RADIUS) {
    ballY = 1 - BALL_RADIUS;
    vy = -Math.abs(vy);
  }

  // Player (left) paddle.
  if (vx < 0 && ballX - BALL_RADIUS <= PLAYER_PADDLE_X + PADDLE_WIDTH && ballX > PLAYER_PADDLE_X - 0.05) {
    if (Math.abs(ballY - state.playerY) <= PADDLE_HEIGHT / 2 + BALL_RADIUS) {
      ballX = PLAYER_PADDLE_X + PADDLE_WIDTH + BALL_RADIUS;
      const speed = Math.min(MAX_SPEED, Math.abs(vx) * 1.04);
      vx = speed;
      vy = deflect(ballY, state.playerY) + vy * 0.25;
    }
  }

  // AI (right) paddle.
  if (vx > 0 && ballX + BALL_RADIUS >= AI_PADDLE_X && ballX < AI_PADDLE_X + PADDLE_WIDTH + 0.05) {
    if (Math.abs(ballY - aiY) <= PADDLE_HEIGHT / 2 + BALL_RADIUS) {
      ballX = AI_PADDLE_X - BALL_RADIUS;
      const speed = Math.min(MAX_SPEED, Math.abs(vx) * 1.04);
      vx = -speed;
      vy = deflect(ballY, aiY) + vy * 0.25;
    }
  }

  const next: PongState = { ...state, ballX, ballY, vx, vy, aiY };

  // Scoring.
  if (ballX + BALL_RADIUS < 0) {
    next.aiScore = state.aiScore + 1;
    const served = serve(next, 'player');
    return finishIfWon(served);
  }
  if (ballX - BALL_RADIUS > 1) {
    next.playerScore = state.playerScore + 1;
    const served = serve(next, 'ai');
    return finishIfWon(served);
  }
  return next;
}

function finishIfWon(state: PongState): PongState {
  if (state.playerScore >= WIN_SCORE) return { ...state, winner: 'player' };
  if (state.aiScore >= WIN_SCORE) return { ...state, winner: 'ai' };
  return state;
}
