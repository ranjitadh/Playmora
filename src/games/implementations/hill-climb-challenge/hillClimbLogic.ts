/**
 * Pure "Hill Climb" logic (side view). The car drives right over rolling hills;
 * hold throttle to climb, ease off to descend. Too steep a slope flips the car.
 * Terrain is a deterministic function of distance, so runs are reproducible.
 */

export interface Coin {
  x: number;
  taken: boolean;
}

export interface HillState {
  x: number;
  speed: number;
  fuel: number;
  slope: number;
  coins: Coin[];
  collected: number;
  score: number;
  status: 'ready' | 'playing' | 'over';
  nextCoinX: number;
  stallTime: number;
}

export const ACCEL = 0.9;
export const FRICTION = 0.6;
export const GRAVITY_PULL = 1.1;
export const MAX_SPEED = 0.85;
export const MAX_SLOPE = 0.8;
export const FUEL_DRAIN = 5;
export const COIN_SPACING = 0.7;
export const STALL_TIMEOUT = 1.5; // seconds before we end the run if stalled out of fuel on gentle slope.

/** Terrain height in 0..1 (larger = higher ground). Deterministic. */
export function terrainHeight(x: number): number {
  return (
    0.55 +
    0.12 * Math.sin(x * 2.1) +
    0.07 * Math.sin(x * 4.7 + 1.3) +
    0.04 * Math.sin(x * 9.3)
  );
}

export function slopeAt(x: number): number {
  const dx = 0.002;
  return (terrainHeight(x + dx) - terrainHeight(x - dx)) / (2 * dx);
}

export function createHillState(): HillState {
  return {
    x: 0,
    speed: 0,
    fuel: 100,
    slope: slopeAt(0),
    coins: [],
    collected: 0,
    score: 0,
    status: 'ready',
    nextCoinX: 1.2,
    stallTime: 0,
  };
}

export function startHill(state: HillState): HillState {
  if (state.status !== 'ready') return state;
  return { ...state, status: 'playing' };
}

export function stepHill(state: HillState, dt: number, throttle: boolean): HillState {
  if (state.status !== 'playing') return state;
  const d = Math.max(0, Math.min(0.05, dt));

  const slope = slopeAt(state.x);
  let fuel = state.fuel;
  const canThrottle = throttle && fuel > 0;
  if (canThrottle) fuel = Math.max(0, fuel - FUEL_DRAIN * d);

  let speed = state.speed;
  speed += (canThrottle ? ACCEL : 0) * d;
  speed -= slope * GRAVITY_PULL * d;
  speed -= FRICTION * speed * d;
  speed = Math.max(0, Math.min(MAX_SPEED, speed));

  const x = state.x + speed * d;

  let coins = state.coins;
  let collected = state.collected;
  let nextCoinX = state.nextCoinX;
  if (x >= nextCoinX - 0.1) {
    coins = [...coins, { x: nextCoinX, taken: false }];
    nextCoinX += COIN_SPACING;
  }
  coins = coins.map((c) => {
    if (!c.taken && x >= c.x) {
      collected += 1;
      return { ...c, taken: true };
    }
    return c;
  });
  coins = coins.filter((c) => !c.taken || c.x > x - 0.3);

  const score = Math.floor(x * 100) + collected * 25;

  let stallTime = state.stallTime;
  if (fuel <= 0 && speed <= 0.0001) {
    stallTime = Math.max(0, stallTime + d);
  } else {
    stallTime = 0;
  }

  const next: HillState = { ...state, x, speed, fuel, slope, coins, collected, score, nextCoinX, stallTime };
  if (Math.abs(slope) > MAX_SLOPE) return { ...next, status: 'over' };
  if (stallTime >= STALL_TIMEOUT) return { ...next, status: 'over' };
  return next;
}
