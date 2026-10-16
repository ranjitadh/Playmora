/**
 * Pure "Parking Master" logic. Top-down car with simple car-like kinematics:
 * throttle drives forward/back, steering turns proportional to speed. Win by
 * parking inside the bay (position + heading + stopped). No RN dependencies.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ParkingState {
  x: number;
  y: number;
  angle: number;
  speed: number;
  target: { x: number; y: number; angle: number };
  obstacles: Rect[];
  timeLeft: number;
  status: 'ready' | 'playing' | 'won' | 'over';
}

export const ACCEL = 0.6;
export const MAX_SPEED = 0.35;
export const DRAG = 1.6;
export const TURN = 2.2;
export const CAR_RADIUS = 0.05;
export const TIME_LIMIT = 45;

export function createParking(): ParkingState {
  return {
    x: 0.5,
    y: 0.75,
    angle: -Math.PI / 2,
    speed: 0,
    target: { x: 0.5, y: 0.24, angle: -Math.PI / 2 },
    obstacles: [
      { x: 0.33, y: 0.16, w: 0.11, h: 0.24 },
      { x: 0.56, y: 0.16, w: 0.11, h: 0.24 },
    ],
    timeLeft: TIME_LIMIT,
    status: 'ready',
  };
}

export function startParking(state: ParkingState): ParkingState {
  if (state.status !== 'ready') return state;
  return { ...state, status: 'playing' };
}

function normalizeAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
}

function circleHitsRect(cx: number, cy: number, r: number, rect: Rect): boolean {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function isParked(state: ParkingState): boolean {
  const dx = state.x - state.target.x;
  const dy = state.y - state.target.y;
  const dist = Math.hypot(dx, dy);
  const angleDiff = Math.abs(normalizeAngle(state.angle - state.target.angle));
  return dist < 0.07 && angleDiff < 0.35 && Math.abs(state.speed) < 0.06;
}

export function stepParking(
  state: ParkingState,
  dt: number,
  controls: { throttle: number; steer: number }
): ParkingState {
  if (state.status !== 'playing') return state;
  const d = Math.max(0, Math.min(0.05, dt));

  let speed = state.speed + controls.throttle * ACCEL * d;
  speed -= DRAG * speed * d;
  speed = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, speed));

  const angle = state.angle + controls.steer * TURN * speed * d;
  const x = state.x + Math.cos(angle) * speed * d;
  const y = state.y + Math.sin(angle) * speed * d;
  const timeLeft = state.timeLeft - d;

  const next: ParkingState = { ...state, x, y, angle, speed, timeLeft };

  if (x < 0.03 || x > 0.97 || y < 0.03 || y > 0.97) return { ...next, status: 'over' };
  for (const rect of next.obstacles) {
    if (circleHitsRect(x, y, CAR_RADIUS, rect)) return { ...next, status: 'over' };
  }
  if (isParked(next)) return { ...next, status: 'won' };
  if (timeLeft <= 0) return { ...next, status: 'over' };
  return next;
}
