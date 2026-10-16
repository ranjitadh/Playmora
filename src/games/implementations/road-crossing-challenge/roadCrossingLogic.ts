/**
 * Pure "Road Crossing" logic. Hop upward lane by lane while dodging horizontally
 * scrolling traffic. Reaching the top lane recycles the road endlessly.
 * No React Native dependencies.
 */

export interface Car {
  x: number;
  dir: 1 | -1;
  speed: number;
}

export interface CrossLane {
  cars: Car[];
}

export interface CrossState {
  x: number;
  lane: number;
  lanes: CrossLane[];
  score: number;
  crossings: number;
  status: 'ready' | 'playing' | 'over';
}

export const LANE_COUNT = 7;
export const PLAYER_W = 0.1;
export const CAR_W = 0.14;

function makeLane(): CrossLane {
  const count = 1 + Math.floor(Math.random() * 2);
  const cars: Car[] = [];
  for (let i = 0; i < count; i++) {
    cars.push({
      x: Math.random(),
      dir: Math.random() < 0.5 ? 1 : -1,
      speed: 0.25 + Math.random() * 0.35,
    });
  }
  return { cars };
}

export function createCross(): CrossState {
  const lanes: CrossLane[] = [];
  for (let i = 0; i < LANE_COUNT; i++) lanes.push(makeLane());
  return { x: 0.5, lane: 0, lanes, score: 0, crossings: 0, status: 'ready' };
}

export function startCross(state: CrossState): CrossState {
  if (state.status !== 'ready') return state;
  return { ...state, status: 'playing' };
}

export function moveCross(state: CrossState, dir: 'up' | 'down' | 'left' | 'right'): CrossState {
  if (state.status !== 'playing') return state;
  const half = PLAYER_W / 2;
  if (dir === 'left') return { ...state, x: Math.max(half, state.x - 0.12) };
  if (dir === 'right') return { ...state, x: Math.min(1 - half, state.x + 0.12) };
  if (dir === 'down') return { ...state, lane: Math.max(0, state.lane - 1) };

  // Up
  if (state.lane < LANE_COUNT - 1) {
    return { ...state, lane: state.lane + 1, score: state.score + 1 };
  }
  // Reached the top: recycle a fresh road and start again from the bottom.
  const lanes: CrossLane[] = [];
  for (let i = 0; i < LANE_COUNT; i++) lanes.push(makeLane());
  return { ...state, lane: 0, lanes, score: state.score + 1, crossings: state.crossings + 1 };
}

function playerHit(state: CrossState): boolean {
  const lane = state.lanes[state.lane];
  if (!lane) return false;
  for (const car of lane.cars) {
    const carLeft = car.x - CAR_W / 2;
    const carRight = car.x + CAR_W / 2;
    const pLeft = state.x - PLAYER_W / 2;
    const pRight = state.x + PLAYER_W / 2;
    if (pRight > carLeft && pLeft < carRight) return true;
  }
  return false;
}

export function stepCross(state: CrossState, dt: number): CrossState {
  if (state.status !== 'playing') return state;
  const d = Math.max(0, Math.min(0.05, dt));

  const lanes = state.lanes.map((lane) => ({
    cars: lane.cars.map((car) => {
      let x = car.x + car.dir * car.speed * d;
      if (x > 1.15) x = -0.15;
      if (x < -0.15) x = 1.15;
      return { ...car, x };
    }),
  }));

  const next: CrossState = { ...state, lanes };
  if (playerHit(next)) return { ...next, status: 'over' };
  return next;
}
