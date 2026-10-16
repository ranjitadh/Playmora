import {
  cloneGrid,
  countOn,
  createEmpty,
  createPuzzle,
  isSolved,
  toggleCell,
  Grid,
} from '../src/games/implementations/lights-out/lightsOutLogic';

/** Brute-force solver used only to prove generated puzzles are solvable. */
function isSolvable(grid: Grid): boolean {
  const size = grid.length;
  const cells = size * size;
  for (let mask = 0; mask < 1 << cells; mask++) {
    if (solutionMatches(grid, mask, size)) return true;
  }
  return false;
}

function solutionMatches(target: Grid, mask: number, size: number): boolean {
  // Reconstruct: applying the toggles in `mask` to the SOLVED board must yield `target`.
  let g = createEmpty(size);
  for (let i = 0; i < size * size; i++) {
    if (mask & (1 << i)) g = toggleCell(g, Math.floor(i / size), i % size);
  }
  return sameGrid(g, target);
}

function sameGrid(a: Grid, b: Grid): boolean {
  return a.every((row, r) => row.every((v, c) => v === b[r][c]));
}

describe('Lights Out — toggling', () => {
  it('flips the cell and its orthogonal neighbours', () => {
    const g = toggleCell(createEmpty(3), 1, 1);
    expect(g[1][1]).toBe(true);
    expect(g[0][1]).toBe(true);
    expect(g[2][1]).toBe(true);
    expect(g[1][0]).toBe(true);
    expect(g[1][2]).toBe(true);
    expect(g[0][0]).toBe(false); // diagonal untouched
  });

  it('ignores neighbours outside the board', () => {
    const g = toggleCell(createEmpty(3), 0, 0);
    expect(g[0][0]).toBe(true);
    expect(g[0][1]).toBe(true);
    expect(g[1][0]).toBe(true);
    expect(countOn(g)).toBe(3);
  });

  it('toggling the same cell twice is identity', () => {
    const start = createPuzzle(5, 6);
    const back = toggleCell(toggleCell(start, 2, 3), 2, 3);
    expect(sameGrid(start, back)).toBe(true);
  });

  it('does not mutate the input grid', () => {
    const start = createEmpty(3);
    const copy = cloneGrid(start);
    toggleCell(start, 1, 1);
    expect(sameGrid(start, copy)).toBe(true);
  });
});

describe('Lights Out — puzzles', () => {
  it('generates a non-solved puzzle', () => {
    const g = createPuzzle(5, 8);
    expect(isSolved(g)).toBe(false);
    expect(countOn(g)).toBeGreaterThan(0);
  });

  it('generates solvable puzzles', () => {
    for (let i = 0; i < 5; i++) {
      const g = createPuzzle(3, 4);
      expect(isSolvable(g)).toBe(true);
    }
  });
});
