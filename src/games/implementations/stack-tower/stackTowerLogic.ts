/**
 * Pure "Stack Tower" logic. A block slides side to side; dropping it stacks it on
 * the tower, trimming to the overlap. Miss entirely and the run ends.
 */

export interface Block {
  x: number; // left edge, 0..1
  w: number; // width
}

export interface StackState {
  blocks: Block[];
  movingX: number;
  movingW: number;
  dir: 1 | -1;
  speed: number;
  score: number;
  status: 'ready' | 'playing' | 'over';
}

export const BASE_W = 0.42;
export const BASE_SPEED = 0.62;
export const SPEED_STEP = 0.03;
export const PERFECT_EPSILON = 0.012;

export function createStackState(): StackState {
  const base: Block = { x: (1 - BASE_W) / 2, w: BASE_W };
  return {
    blocks: [base],
    movingX: base.x,
    movingW: BASE_W,
    dir: 1,
    speed: BASE_SPEED,
    score: 0,
    status: 'ready',
  };
}

export function startStack(state: StackState): StackState {
  if (state.status !== 'ready') return state;
  return { ...state, status: 'playing' };
}

export function updateMotion(state: StackState, dt: number): StackState {
  if (state.status !== 'playing') return state;
  const d = Math.max(0, Math.min(0.05, dt));
  let x = state.movingX + state.dir * state.speed * d;
  let dir = state.dir;
  const maxX = 1 - state.movingW;
  if (x <= 0) {
    x = 0;
    dir = 1;
  } else if (x >= maxX) {
    x = maxX;
    dir = -1;
  }
  return { ...state, movingX: x, dir };
}

/** Drops the moving block. Returns the new state; status becomes 'over' on a complete miss. */
export function dropBlock(state: StackState, startX = 0.05): StackState {
  if (state.status !== 'playing') return state;
  const prev = state.blocks[state.blocks.length - 1];
  const left = Math.max(prev.x, state.movingX);
  const right = Math.min(prev.x + prev.w, state.movingX + state.movingW);
  const overlap = right - left;

  if (overlap <= 0) {
    return { ...state, status: 'over' };
  }

  const perfect = Math.abs(state.movingX - prev.x) <= PERFECT_EPSILON;
  const newBlock: Block = { x: left, w: perfect ? prev.w : overlap };

  return {
    ...state,
    blocks: [...state.blocks, newBlock],
    movingX: startX,
    movingW: newBlock.w,
    dir: 1,
    speed: state.speed + SPEED_STEP,
    score: state.score + 1,
  };
}
