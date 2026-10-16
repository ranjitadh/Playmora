import {
  CELLS,
  canPlace,
  conflicts,
  countSolutions,
  createSudoku,
  isComplete,
  solve,
} from '../src/games/implementations/sudoku/sudokuLogic';

const SOLVED = [
  5, 3, 4, 6, 7, 8, 9, 1, 2,
  6, 7, 2, 1, 9, 5, 3, 4, 8,
  1, 9, 8, 3, 4, 2, 5, 6, 7,
  8, 5, 9, 7, 6, 1, 4, 2, 3,
  4, 2, 6, 8, 5, 3, 7, 9, 1,
  7, 1, 3, 9, 2, 4, 8, 5, 6,
  9, 6, 1, 5, 3, 7, 2, 8, 4,
  2, 8, 7, 4, 1, 9, 6, 3, 5,
  3, 4, 5, 2, 8, 6, 1, 7, 9,
];

describe('Sudoku — validation', () => {
  it('detects row, column and box conflicts', () => {
    const g = new Array<number>(CELLS).fill(0);
    g[0] = 5;
    expect(canPlace(g, 1, 5)).toBe(false); // same row
    expect(canPlace(g, 9, 5)).toBe(false); // same column
    expect(canPlace(g, 10, 5)).toBe(false); // same box
    expect(canPlace(g, 40, 5)).toBe(true); // elsewhere
  });

  it('reports a fully solved grid as complete', () => {
    expect(isComplete(SOLVED)).toBe(true);
    expect(conflicts(SOLVED).size).toBe(0);
  });

  it('flags duplicates', () => {
    const g = SOLVED.slice();
    g[1] = 5; // duplicate of g[0] in the row
    expect(conflicts(g).size).toBeGreaterThan(0);
    expect(isComplete(g)).toBe(false);
  });
});

describe('Sudoku — solving', () => {
  it('solves a grid with blanks', () => {
    const g = SOLVED.slice();
    g[0] = 0;
    g[40] = 0;
    g[80] = 0;
    const solved = solve(g);
    expect(solved).not.toBeNull();
    expect(isComplete(solved as number[])).toBe(true);
    expect((solved as number[])[0]).toBe(5);
  });

  it('counts a unique solution', () => {
    const g = SOLVED.slice();
    g[0] = 0;
    expect(countSolutions(g, 3)).toBe(1);
  });
});

describe('Sudoku — generation', () => {
  it('produces a uniquely solvable puzzle that keeps givens', () => {
    const { puzzle, solution } = createSudoku(40);
    expect(puzzle).toHaveLength(CELLS);
    expect(solution).toHaveLength(CELLS);
    expect(isComplete(solution)).toBe(true);
    expect(puzzle.filter((v) => v === 0).length).toBeGreaterThanOrEqual(30);
    for (let i = 0; i < CELLS; i++) {
      if (puzzle[i] !== 0) expect(puzzle[i]).toBe(solution[i]);
    }
    expect(countSolutions(puzzle, 2)).toBe(1);
  });

  it('generates different boards across runs', () => {
    const a = createSudoku(40);
    const b = createSudoku(40);
    expect(a.solution.join('')).not.toBe(b.solution.join(''));
  });
});
