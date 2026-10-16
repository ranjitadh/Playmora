import {
  COLS,
  FrogState,
  START_ROW,
  createFrog,
  hop,
  resolveEnvironment,
  shiftLane,
  tick,
} from '../src/games/implementations/frog-road-crossing/frogLogic';

function withLane(s: FrogState, row: number, cells: boolean[]): FrogState {
  return { ...s, lanes: s.lanes.map((l) => (l.row === row ? { ...l, cells } : l)) };
}
const off = () => new Array(COLS).fill(false);
const on = () => new Array(COLS).fill(true);

describe('frog-road-crossing — setup', () => {
  test('starts on the bank with three lives and ten lanes', () => {
    const s = createFrog();
    expect(s.frog).toEqual({ r: START_ROW, c: Math.floor(COLS / 2) });
    expect(s.lives).toBe(3);
    expect(s.lanes).toHaveLength(10);
    expect(s.lanes.filter((l) => l.kind === 'river')).toHaveLength(5);
    expect(s.lanes.filter((l) => l.kind === 'road')).toHaveLength(5);
    expect(s.outcome).toBe('in_progress');
  });

  test('a lane slides sideways as a whole and wraps around', () => {
    expect(shiftLane([true, false, false], 1)).toEqual([false, true, false]);
    expect(shiftLane([true, false, false], -1)).toEqual([false, false, true]);
  });
});

describe('frog-road-crossing — hopping', () => {
  test('hops one cell and cannot leave the board', () => {
    const s = withLane(createFrog(), 11, off());
    const up = hop(s, 'up');
    expect(up.frog).toEqual({ r: START_ROW - 1, c: Math.floor(COLS / 2) });
    expect(hop(s, 'down').frog).toEqual(s.frog);
  });

  test('reaching the goal row wins the crossing', () => {
    const s: FrogState = { ...createFrog(), frog: { r: 1, c: 5 } };
    const out = hop(s, 'up');
    expect(out.outcome).toBe('won');
    expect(out.score).toBe(100);
  });
});

describe('frog-road-crossing — hazards', () => {
  test('a car in the landing cell costs a life', () => {
    const s = withLane(createFrog(), 11, on());
    const out = hop(s, 'up');
    expect(out.lives).toBe(2);
    expect(out.frog).toEqual({ r: START_ROW, c: Math.floor(COLS / 2) });
  });

  test('water without a log drowns the frog', () => {
    const base = withLane(createFrog(), 5, off());
    const s: FrogState = { ...base, frog: { r: 6, c: 3 } };
    const out = hop(s, 'up');
    expect(out.lives).toBe(2);
    expect(out.outcome).toBe('in_progress');
  });

  test('landing on a log is safe and the log carries the frog', () => {
    const base = withLane(createFrog(), 5, on());
    const s: FrogState = { ...base, frog: { r: 6, c: 3 } };
    const out = hop(s, 'up');
    expect(out.lives).toBe(3);
    expect(out.frog.r).toBe(5);
    expect(out.frog.c).toBe(2);
  });

  test('the median is a safe rest row', () => {
    const s: FrogState = { ...createFrog(), frog: { r: 6, c: 3 } };
    expect(resolveEnvironment(s)).toBe(s);
  });

  test('losing the final life ends the run', () => {
    const s = withLane({ ...createFrog(), lives: 1 }, 11, on());
    const out = hop(s, 'up');
    expect(out.lives).toBe(0);
    expect(out.outcome).toBe('over');
  });
});

describe('frog-road-crossing — ticking', () => {
  test('the frog rides its log as lanes advance', () => {
    const base = withLane(createFrog(), 5, on());
    const s: FrogState = { ...base, frog: { r: 5, c: 3 } };
    const out = tick(s);
    expect(out.frog.c).toBe(2);
    expect(out.frame).toBe(1);
  });

  test('a river lane clearing under the frog drowns it', () => {
    const base = withLane(createFrog(), 5, off());
    const s: FrogState = { ...base, frog: { r: 5, c: 3 } };
    const out = tick(s);
    expect(out.lives).toBe(2);
  });
});
