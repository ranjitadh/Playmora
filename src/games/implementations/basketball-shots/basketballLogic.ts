/**
 * Pure Basketball Shots logic. No RN dependencies.
 *
 * Court coordinates are normalised (x right, y down). The player flicks a ball
 * which arcs under gravity. A basket counts when the ball crosses the rim line
 * downward while between the rim edges; the backboard and rim edges deflect it.
 * A global shot clock counts down while misses cost lives.
 */

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export interface ShotState {
  ball: Ball;
  phase: 'ready' | 'flying';
  score: number;
  makes: number;
  misses: number;
  lives: number;
  timeLeft: number;
  outcome: 'in_progress' | 'over';
}

export const BALL_R = 0.035;
export const HOOP_Y = 0.34;
export const HOOP_X = 0.76;
export const RIM_R = 0.075;
export const RIM_LEFT = HOOP_X - RIM_R;
export const RIM_RIGHT = HOOP_X + RIM_R;
export const BACKBOARD_X = 0.9;
export const BACKBOARD_TOP = 0.18;
export const BACKBOARD_BOTTOM = 0.44;
export const GRAVITY = 1.6;
export const START = { x: 0.16, y: 0.8 };

export function createShotGame(lives = 3, timeLeft = 60): ShotState {
  return {
    ball: { x: START.x, y: START.y, vx: 0, vy: 0, r: BALL_R },
    phase: 'ready',
    score: 0,
    makes: 0,
    misses: 0,
    lives,
    timeLeft,
    outcome: 'in_progress',
  };
}

/** Launches the ball with the flick's velocity. */
export function shoot(state: ShotState, vx: number, vy: number): ShotState {
  if (state.outcome !== 'in_progress' || state.phase === 'flying') return state;
  return {
    ...state,
    phase: 'flying',
    ball: { ...state.ball, x: START.x, y: START.y, vx, vy },
  };
}

function insideRim(x: number): boolean {
  return x >= RIM_LEFT && x <= RIM_RIGHT;
}

/** Advances one frame: integrates, scores baskets and resolves misses. */
export function stepShot(state: ShotState, dt: number): ShotState {
  if (state.outcome !== 'in_progress') return state;

  const timeLeft = Math.max(0, state.timeLeft - dt);

  if (state.phase !== 'flying') {
    const outcome = timeLeft <= 0 ? 'over' : state.outcome;
    return { ...state, timeLeft, outcome };
  }

  const b = state.ball;
  const vy = b.vy + GRAVITY * dt;
  let x = b.x + b.vx * dt;
  let y = b.y + vy * dt;
  let vx = b.vx;

  // Basket: crossed the rim line downward while over the rim opening.
  if (b.y < HOOP_Y && y >= HOOP_Y && vy > 0 && insideRim(x)) {
    const makes = state.makes + 1;
    return {
      ...state,
      score: state.score + 2,
      makes,
      timeLeft,
      phase: 'ready',
      ball: { x: START.x, y: START.y, vx: 0, vy: 0, r: BALL_R },
      outcome: timeLeft <= 0 ? 'over' : state.outcome,
    };
  }

  // Backboard deflection.
  if (x + b.r >= BACKBOARD_X && y > BACKBOARD_TOP && y < BACKBOARD_BOTTOM && vx > 0) {
    x = BACKBOARD_X - b.r;
    vx = -Math.abs(vx) * 0.7;
  }

  const next: ShotState = { ...state, ball: { x, y, vx, vy, r: b.r }, timeLeft };

  // Missed: ball fell out of play below or off to the right.
  if (y - b.r > 1.05 || x > 1.15) {
    const misses = state.misses + 1;
    const lives = state.lives - 1;
    return {
      ...next,
      phase: 'ready',
      misses,
      lives,
      ball: { x: START.x, y: START.y, vx: 0, vy: 0, r: BALL_R },
      outcome: lives <= 0 || timeLeft <= 0 ? 'over' : state.outcome,
    };
  }

  return { ...next, outcome: timeLeft <= 0 ? 'over' : next.outcome };
}
