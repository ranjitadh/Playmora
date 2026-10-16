/**
 * Pure "Drift Challenge" logic. The kart circles a ring track; centrifugal
 * force pushes it outward, so the player steers inward to hold the drift line.
 * Points accrue while on the track; leave the track (or run out of time) and
 * the run ends. No RN dependencies.
 */

export interface DriftState {
  angle: number;
  r: number;
  steer: number;
  speed: number;
  score: number;
  timeLeft: number;
  status: 'ready' | 'playing' | 'over';
}

export const CENTER = 0.5;
export const R0 = 0.32;
export const BAND = 0.06;
export const RADIAL_RATE = 0.55;
export const OUTWARD = 0.4;
export const DRIFT_RATE = 40;
export const TIME_LIMIT = 30;

export function createDrift(): DriftState {
  return { angle: 0, r: R0, steer: 0, speed: 0.9, score: 0, timeLeft: TIME_LIMIT, status: 'ready' };
}

export function startDrift(state: DriftState): DriftState {
  if (state.status !== 'ready') return state;
  return { ...state, status: 'playing' };
}

export function onTrack(r: number): boolean {
  return Math.abs(r - R0) <= BAND;
}

export function stepDrift(state: DriftState, dt: number, steer: number): DriftState {
  if (state.status !== 'playing') return state;
  const d = Math.max(0, Math.min(0.05, dt));
  const s = steer < 0 ? -1 : steer > 0 ? 1 : 0;

  const angle = state.angle + state.speed * d;
  let r = state.r + s * RADIAL_RATE * d + state.speed * OUTWARD * d;
  r = Math.max(0.05, Math.min(0.48, r));

  const timeLeft = state.timeLeft - d;
  const scoring = onTrack(r);
  const score = scoring ? state.score + DRIFT_RATE * d * (1 + state.speed) : state.score;

  const next: DriftState = { ...state, angle, r, steer: s, score: Math.floor(score), timeLeft };
  if (!scoring) return { ...next, status: 'over' };
  if (timeLeft <= 0) return { ...next, status: 'over' };
  return next;
}
