import {
  SHAPES,
  anyPlacement,
  canPlace,
  clearLines,
  createGrid,
  place,
} from '../src/games/implementations/block-puzzle/blockPuzzleLogic';

const shapeById = (id: string) => SHAPES.find((s) => s.id === id)!;

describe('Block Puzzle — placement', () => {
  it('creates an empty grid', () => {
    const g = createGrid(8);
    expect(g.length).toBe(8);
    expect(g.flat().every((v) => v === 0)).toBe(true);
  });

  it('allows placement on empty space', () => {
    const g = createGrid(8);
    expect(canPlace(g, shapeById('2x2'), 0, 0)).toBe(true);
  });

  it('rejects out-of-bounds placement', () => {
    const g = createGrid(8);
    expect(canPlace(g, shapeById('2x2'), 7, 7)).toBe(false);
    expect(canPlace(g, shapeById('1x4'), 0, 6)).toBe(false);
  });

  it('rejects overlapping placement', () => {
    const g = place(createGrid(8), shapeById('2x2'), 2, 2).grid;
    expect(canPlace(g, shapeById('1x1'), 2, 2)).toBe(false);
    expect(canPlace(g, shapeById('2x2'), 1, 1)).toBe(false);
  });
});

describe('Block Puzzle — line clears', () => {
  it('clears a completed row', () => {
    const g = createGrid(4);
    for (let c = 0; c < 4; c++) g[0][c] = 1;
    const { grid, cleared } = clearLines(g);
    expect(cleared).toBe(1);
    expect(grid[0].every((v) => v === 0)).toBe(true);
  });

  it('clears a completed column', () => {
    const g = createGrid(4);
    for (let r = 0; r < 4; r++) g[r][1] = 1;
    const { cleared } = clearLines(g);
    expect(cleared).toBe(1);
  });

  it('counts simultaneous row and column clears', () => {
    const g = createGrid(3);
    for (let c = 0; c < 3; c++) g[1][c] = 1; // row 1
    for (let r = 0; r < 3; r++) g[r][1] = 1; // col 1
    const { cleared } = clearLines(g);
    expect(cleared).toBe(2);
  });

  it('place clears lines created by the new shape', () => {
    const g = createGrid(3);
    for (let c = 0; c < 3; c++) g[0][c] = 1; // row 0 full except we clear then place
    // reset row 0 to two filled, place a 1x1 at the gap
    const partial = createGrid(3);
    partial[0][0] = 1;
    partial[0][1] = 1;
    const { cleared } = place(partial, shapeById('1x1'), 0, 2);
    expect(cleared).toBe(1);
    void g;
  });
});

describe('Block Puzzle — game over detection', () => {
  it('detects available placements on an empty board', () => {
    expect(anyPlacement(createGrid(8), SHAPES)).toBe(true);
  });

  it('detects no placement when the board is full', () => {
    const g = createGrid(2).map((row) => row.map(() => 1));
    expect(anyPlacement(g, SHAPES)).toBe(false);
  });
});
