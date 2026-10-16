import {
  BASE_W,
  StackState,
  createStackState,
  dropBlock,
  startStack,
  updateMotion,
} from '../src/games/implementations/stack-tower/stackTowerLogic';

const playing = (): StackState => startStack(createStackState());

describe('Stack Tower — motion', () => {
  it('starts with a single base block', () => {
    const s = createStackState();
    expect(s.blocks.length).toBe(1);
    expect(s.blocks[0].w).toBeCloseTo(BASE_W, 5);
  });

  it('moves and bounces within bounds', () => {
    let s: StackState = { ...playing(), movingX: 0.99, dir: 1, movingW: 0.1 };
    s = updateMotion(s, 0.05);
    expect(s.movingX).toBeLessThanOrEqual(1 - s.movingW + 1e-9);
    expect(s.dir).toBe(-1);
  });
});

describe('Stack Tower — dropping', () => {
  it('keeps full width on a perfect drop', () => {
    const s = { ...playing(), movingX: s0base(), movingW: BASE_W };
    const after = dropBlock(s);
    expect(after.blocks.length).toBe(2);
    expect(after.blocks[1].w).toBeCloseTo(BASE_W, 5);
    expect(after.score).toBe(1);
  });

  it('trims width to the overlap on a partial drop', () => {
    const base = (1 - BASE_W) / 2; // 0.29
    const s = { ...playing(), movingX: base + 0.1, movingW: BASE_W };
    const after = dropBlock(s);
    expect(after.blocks[1].w).toBeCloseTo(BASE_W - 0.1, 5);
  });

  it('ends the run on a complete miss', () => {
    const s = { ...playing(), movingX: 0.95, movingW: BASE_W };
    expect(dropBlock(s).status).toBe('over');
  });

  it('increases speed after each drop', () => {
    const s = { ...playing(), movingX: s0base(), movingW: BASE_W };
    expect(dropBlock(s).speed).toBeGreaterThan(s.speed);
  });
});

function s0base(): number {
  return (1 - BASE_W) / 2;
}
