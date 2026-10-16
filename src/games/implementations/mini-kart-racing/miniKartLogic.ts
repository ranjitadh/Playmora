/**
 * Pure "Mini Kart Racing" logic. The kart auto-accelerates down a road whose
 * centre gently slaloms; steer left/right to hold the racing line. Leaving the
 * road slows the kart and eventually spins it out. Laps count as distance
 * accrues. No RN dependencies.
 */

export interface KartState {
  x: number;
  distance: number;
  speed: number;
  steer: number;
  laps: number;
  offTime: number;
  score: number;
  timeLeft: number;
  status: 'ready' | 'playing' | 'over';
}

export const STEER_RATE = 0.9;
export const MAX_SPEED = 0.9;
export const RAMP = 0.06;
export const ROI = 0.17;
export const OFF_GRACE = 0.9;
export const LAP_LEN = 20;
export const TIME_LIMIT = 40;

export function roadCenter(d: number): number {
  return 0.5 + 0.25 * Math.sin(d * 1.1);
}

export function createKart(): KartState {
  return { x: 0.5, distance: 0, speed: 0.3, steer: 0, laps: 0, offTime: 0, score: 0, timeLeft: TIME_LIMIT, status: 'ready' };
}

export function startKart(state: KartState): KartState {
  if (state.status !== 'ready') return state;
  return { ...state, status: 'playing' };
}

export function stepKart(state: KartState, dt: number, steer: number): KartState {
  if (state.status !== 'playing') return state;
  const d = Math.max(0, Math.min(0.05, dt));
  const s = steer < 0 ? -1 : steer > 0 ? 1 : 0;

  const off = Math.abs(state.x - roadCenter(state.distance)) > ROI;
  let speed = Math.min(MAX_SPEED, state.speed + RAMP * d);
  if (off) speed = Math.max(0.1, speed - 2 * d);

  const distance = state.distance + speed * d;
  const x = Math.max(0.03, Math.min(0.97, state.x + s * STEER_RATE * d));
  const offTime = off ? state.offTime + d : 0;
  const laps = Math.floor(distance / LAP_LEN);
  const timeLeft = state.timeLeft - d;
  const score = Math.floor(distance * 10) + laps * 100;

  const next: KartState = { ...state, x, distance, speed, steer: s, laps, offTime, score, timeLeft };
  if (offTime > OFF_GRACE) return { ...next, status: 'over' };
  if (timeLeft <= 0) return { ...next, status: 'over' };
  return next;
}
