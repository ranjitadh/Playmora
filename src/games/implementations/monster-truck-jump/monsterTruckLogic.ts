/**
 * Pure "Monster Truck Jump" logic (side view). The truck rolls to the right and
 * must jump the gaps carved out of the road. Jump too late (or not at all) and
 * it drops into the gap. No RN dependencies.
 */

export interface MonsterState {
  x: number;
  y: number;
  vy: number;
  airborne: boolean;
  cleared: number;
  speed: number;
  score: number;
  status: 'ready' | 'playing' | 'over';
}

export const GRAVITY = 2.4;
export const JUMP_V = 0.9;
export const BASE_SPEED = 0.55;
export const MAX_SPEED = 1.1;
export const SPACING = 0.6;
export const GAP_START = 0.45;
export const GAP_WIDTH = 0.12;

export function overGap(x: number): boolean {
  if (x < GAP_START) return false;
  const local = (x - GAP_START) % SPACING;
  return local >= 0 && local < GAP_WIDTH;
}

export function createMonster(): MonsterState {
  return { x: 0, y: 0, vy: 0, airborne: false, cleared: 0, speed: BASE_SPEED, score: 0, status: 'ready' };
}

export function startMonster(state: MonsterState): MonsterState {
  if (state.status !== 'ready') return state;
  return { ...state, status: 'playing' };
}

export function stepMonster(state: MonsterState, dt: number, jump: boolean): MonsterState {
  if (state.status !== 'playing') return state;
  const d = Math.max(0, Math.min(0.05, dt));

  const speed = Math.min(MAX_SPEED, BASE_SPEED + state.x * 0.02);
  const x = state.x + speed * d;
  let y = state.y;
  let vy = state.vy;
  let airborne = state.airborne;
  let cleared = state.cleared;

  if (jump && !airborne) {
    vy = JUMP_V;
    airborne = true;
  }

  if (airborne) {
    vy -= GRAVITY * d;
    y += vy * d;
    if (y <= 0) {
      y = 0;
      if (overGap(x)) {
        const next: MonsterState = { ...state, x, y, vy: 0, airborne: false, speed, cleared };
        return { ...next, status: 'over', score: Math.floor(x * 100) + cleared * 50 };
      }
      airborne = false;
      vy = 0;
      cleared += 1;
    }
  } else if (overGap(x)) {
    const next: MonsterState = { ...state, x, y, vy, airborne, speed, cleared };
    return { ...next, status: 'over', score: Math.floor(x * 100) + cleared * 50 };
  }

  return { ...state, x, y, vy, airborne, speed, cleared, score: Math.floor(x * 100) + cleared * 50 };
}
