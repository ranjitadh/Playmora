import {
  BubbleState,
  COLS,
  MIN_AIM_DISTANCE,
  MISS_LIMIT,
  ROWS,
  SHOT_ORIGIN_X,
  SHOT_ORIGIN_Y,
  bottomFilled,
  createBubbles,
  findFloating,
  fire,
  floodFill,
  isSignificantAim,
  neighbors,
  pushRow,
  resolveLanding,
  simulatePath,
  simulateShot,
} from '../src/games/implementations/bubble-shooter/bubbleLogic';
import { Grid } from '../src/games/implementations/bubble-shooter/bubbleLogic';

function build(rows: string[]): Grid {
  const g: Grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
  rows.forEach((line, r) => {
    line.split('').forEach((ch, c) => {
      g[r][c] = ch === '.' ? null : Number(ch);
    });
  });
  return g;
}

function pad(line: string): string {
  return line.padEnd(COLS, '.');
}

describe('bubble-shooter — hex grid', () => {
  test('even rows connect to shifted rows differently from odd rows', () => {
    expect(neighbors(4, 5)).toEqual(expect.arrayContaining([[4, 4], [4, 6], [5, 4], [5, 5], [3, 4], [3, 5]]));
    expect(neighbors(4, 5)).toHaveLength(6);
    expect(neighbors(5, 5)).toEqual(expect.arrayContaining([[5, 4], [5, 6], [6, 5], [6, 6], [4, 5], [4, 6]]));
    expect(neighbors(5, 5)).toHaveLength(6);
  });

  test('corner cells only report in-bounds neighbours', () => {
    expect(neighbors(0, 0)).toEqual([[0, 1], [1, 0]]);
    expect(neighbors(0, 0)).toHaveLength(2);
  });

  test('floodFill collects a same-colour cluster and stops at other colours', () => {
    const g = build([
      pad('010'),
      pad('010'),
      pad('000'),
    ]);
    expect(floodFill(g, 0, 0)).toHaveLength(7);
    expect(floodFill(g, 0, 1)).toHaveLength(2);
    expect(floodFill(g, 6, 6)).toHaveLength(0);
  });
});

describe('bubble-shooter — resolving shots', () => {
  test('pops a cluster of three', () => {
    const g = build([pad('000')]);
    const res = resolveLanding(g, 0, 0);
    expect(res.matched).toBe(3);
    expect(res.floating).toBe(0);
    expect(res.grid[0][0]).toBeNull();
    expect(res.grid[0][2]).toBeNull();
  });

  test('leaves a pair alone', () => {
    const g = build([pad('00')]);
    const res = resolveLanding(g, 0, 0);
    expect(res.matched).toBe(0);
    expect(res.grid[0][0]).toBe(0);
    expect(res.grid[0][1]).toBe(0);
  });

  test('drops bubbles left hanging by a pop', () => {
    const g = build([
      pad('111'),
      pad('4'),
    ]);
    const res = resolveLanding(g, 0, 0);
    expect(res.matched).toBe(3);
    expect(res.floating).toBe(1);
    expect(res.grid.flat().every((cell) => cell === null)).toBe(true);
  });

  test('findFloating only drops cells disconnected from the top row', () => {
    const g = build([
      pad('1'),
      pad('1'),
      Array.from({ length: COLS }, (_, i) => (i === 6 ? '3' : '.')).join(''),
    ]);
    const floating = findFloating(g);
    expect(floating).toEqual([[2, 6]]);
  });

  test('findFloating drops everything when no bubble hangs from the top', () => {
    const g = build(['...........', '....3......']);
    expect(findFloating(g)).toEqual([[1, 4]]);
  });
});

describe('bubble-shooter — rows and game over', () => {
  test('pushRow shifts everything down and fills a new top row', () => {
    const g = build(['2...........']);
    const pushed = pushRow(g);
    expect(pushed).toHaveLength(ROWS);
    expect(pushed[1][0]).toBe(2);
    expect(pushed[0].every((cell) => cell !== null)).toBe(true);
    expect(pushed[0]).toHaveLength(COLS);
  });

  test('bottomFilled detects a bubble resting on the floor', () => {
    const g = build([]);
    expect(bottomFilled(g)).toBe(false);
    g[ROWS - 1][4] = 2;
    expect(bottomFilled(g)).toBe(true);
  });
});

describe('bubble-shooter — shot simulation', () => {
  test('lands in the free cell below an obstacle', () => {
    const g = build([]);
    g[5][5] = 1;
    expect(simulateShot(g, (COLS - 1) / 2, ROWS - 0.5, 0, -1)).toEqual([6, 5]);
  });

  test('reaches the top when the path is clear', () => {
    const g = build([]);
    const landing = simulateShot(g, (COLS - 1) / 2, ROWS - 0.5, 0, -1);
    expect(landing).not.toBeNull();
    expect(landing![0]).toBe(0);
  });

  test('returns null for a degenerate direction', () => {
    const g = build([]);
    expect(simulateShot(g, (COLS - 1) / 2, ROWS - 0.5, 0, 0)).toBeNull();
  });
});

describe('bubble-shooter — full turn', () => {
  function stateWith(g: Grid, current: number, next: number): BubbleState {
    return { grid: g, score: 0, misses: 0, shots: 0, current, next, outcome: 'in_progress' };
  }

  test('a clear path counts as a miss and advances the queue', () => {
    const g = build([]);
    const s = stateWith(g, 0, 1);
    const out = fire(s, 0, -1);
    expect(out.shots).toBe(1);
    expect(out.misses).toBe(1);
    expect(out.score).toBe(0);
    expect(out.current).toBe(1);
    expect(out.grid.flat().filter((c) => c !== null)).toHaveLength(1);
    expect(out.outcome).toBe('in_progress');
  });

  test('a matching landing scores and resets the miss counter', () => {
    const g = build([pad('0'), pad('0')]);
    g[0][5] = 0;
    g[1][5] = 0;
    const s = stateWith(g, 0, 1);
    s.misses = 1;
    const out = fire(s, 0, -1);
    expect(out.misses).toBe(0);
    expect(out.score).toBe(30);
    expect(out.shots).toBe(1);
    expect(out.outcome).toBe('in_progress');
  });

  test('running out of patience pushes a fresh row down', () => {
    const g = build([]);
    let s = stateWith(g, 0, 0);
    s.misses = MISS_LIMIT - 1;
    const out = fire(s, 0, -1);
    expect(out.misses).toBe(0);
    expect(out.grid[0].every((cell) => cell !== null)).toBe(true);
  });

  test('a shot that fills the floor ends the run', () => {
    const g = build([]);
    g[ROWS - 2][5] = 1;
    const s = stateWith(g, 0, 1);
    const out = fire(s, 0, -1);
    expect(out.grid[ROWS - 1][5]).toBe(0);
    expect(out.outcome).toBe('over');
  });

  test('ignores shots once the game is over', () => {
    const s: BubbleState = { ...stateWith(build([]), 0, 1), outcome: 'over' };
    expect(fire(s, 0, -1)).toBe(s);
  });

  test('ignores an invalid aim', () => {
    const s = stateWith(build([]), 0, 1);
    expect(fire(s, 0, 0)).toBe(s);
  });

  test('createBubbles starts in progress with a full board', () => {
    const s = createBubbles(3);
    expect(s.outcome).toBe('in_progress');
    expect(s.grid).toHaveLength(ROWS);
    expect(s.shots).toBe(0);
    expect(s.grid[0].every((c) => c !== null)).toBe(true);
  });
});

describe('bubble-shooter — trajectory consistency', () => {
  test('the simulated path ends where the shot lands', () => {
    const g = build([]);
    g[5][5] = 1;
    const path = simulatePath(g, SHOT_ORIGIN_X, SHOT_ORIGIN_Y, 0, -1);
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual(simulateShot(g, SHOT_ORIGIN_X, SHOT_ORIGIN_Y, 0, -1));
    expect(path[path.length - 1]).toEqual([6, 5]);
  });

  test('a clear path walks from the floor to the top row', () => {
    const path = simulatePath(build([]), SHOT_ORIGIN_X, SHOT_ORIGIN_Y, 0, -1);
    expect(path[path.length - 1][0]).toBe(0);
    expect(path.every(([r]) => r >= 0 && r < ROWS)).toBe(true);
  });

  test('adjacent path cells are never duplicated', () => {
    const path = simulatePath(build([]), SHOT_ORIGIN_X, SHOT_ORIGIN_Y, 0.3, -0.95);
    for (let i = 1; i < path.length; i++) {
      expect(path[i]).not.toEqual(path[i - 1]);
    }
  });

  test('a degenerate direction yields no path', () => {
    expect(simulatePath(build([]), SHOT_ORIGIN_X, SHOT_ORIGIN_Y, 0, 0)).toEqual([]);
  });

  test('an origin can be placed off-centre', () => {
    expect(simulateShot(build([]), 1, ROWS - 0.5, 0, -1)).toEqual([0, 1]);
  });
});

describe('bubble-shooter — intentional-aim guard', () => {
  test('a short tap is below the significance threshold', () => {
    expect(isSignificantAim(3, 4)).toBe(false);
    expect(isSignificantAim(0, 0)).toBe(false);
  });

  test('a real drag clears the threshold', () => {
    expect(isSignificantAim(MIN_AIM_DISTANCE, 0)).toBe(true);
    expect(isSignificantAim(0, MIN_AIM_DISTANCE + 30)).toBe(true);
  });
});
