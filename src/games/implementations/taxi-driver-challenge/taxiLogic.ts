/**
 * Pure "Taxi Driver Challenge" logic. Drive around the 2D city to pick up
 * passengers and drop them at their destination before the clock runs out.
 * No RN dependencies.
 */

export interface Point {
  x: number;
  y: number;
}

export interface TaxiState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  carrying: boolean;
  pickup: Point;
  dropoff: Point;
  delivered: number;
  score: number;
  timeLeft: number;
  status: 'ready' | 'playing' | 'over';
}

export const ACCEL = 1.4;
export const DRAG = 3.2;
export const MAX_SPEED = 0.7;
export const PICKUP_RADIUS = 0.08;
export const TIME_LIMIT = 45;

function randPoint(): Point {
  return { x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.7 };
}

export function createTaxi(): TaxiState {
  return {
    x: 0.5,
    y: 0.5,
    vx: 0,
    vy: 0,
    carrying: false,
    pickup: randPoint(),
    dropoff: randPoint(),
    delivered: 0,
    score: 0,
    timeLeft: TIME_LIMIT,
    status: 'ready',
  };
}

export function startTaxi(state: TaxiState): TaxiState {
  if (state.status !== 'ready') return state;
  return { ...state, status: 'playing' };
}

export function stepTaxi(state: TaxiState, dt: number, input: Point): TaxiState {
  if (state.status !== 'playing') return state;
  const d = Math.max(0, Math.min(0.05, dt));

  let vx = state.vx + input.x * ACCEL * d;
  let vy = state.vy + input.y * ACCEL * d;
  vx -= DRAG * vx * d;
  vy -= DRAG * vy * d;
  vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, vx));
  vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, vy));

  const x = Math.max(0.05, Math.min(0.95, state.x + vx * d));
  const y = Math.max(0.05, Math.min(0.95, state.y + vy * d));
  const timeLeft = state.timeLeft - d;

  let carrying = state.carrying;
  let pickup = state.pickup;
  let dropoff = state.dropoff;
  let delivered = state.delivered;
  let score = state.score;

  if (!carrying) {
    if (Math.hypot(x - pickup.x, y - pickup.y) < PICKUP_RADIUS) {
      carrying = true;
      dropoff = randPoint();
    }
  } else if (Math.hypot(x - dropoff.x, y - dropoff.y) < PICKUP_RADIUS) {
    carrying = false;
    delivered += 1;
    score += 100 + Math.round(timeLeft * 2);
    pickup = randPoint();
  }

  const next: TaxiState = { ...state, x, y, vx, vy, carrying, pickup, dropoff, delivered, score, timeLeft };
  if (timeLeft <= 0) return { ...next, status: 'over' };
  return next;
}
