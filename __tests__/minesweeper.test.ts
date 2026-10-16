import {
  createEmptyBoard,
  createGame,
  neighbors,
  placeMines,
  revealCell,
  toggleFlag,
} from '../src/games/implementations/minesweeper/minesweeperLogic';

describe('Minesweeper — board generation', () => {
  it('creates an empty board of the right size', () => {
    const b = createEmptyBoard(5, 7);
    expect(b.length).toBe(5);
    expect(b[0].length).toBe(7);
    expect(b.flat().every((c) => !c.mine && !c.revealed)).toBe(true);
  });

  it('places the requested number of mines', () => {
    const b = placeMines(createEmptyBoard(9, 9), 10, 4, 4);
    expect(b.flat().filter((c) => c.mine).length).toBe(10);
  });

  it('never places a mine on or next to the safe cell', () => {
    for (let i = 0; i < 50; i++) {
      const b = placeMines(createEmptyBoard(9, 9), 10, 4, 4);
      expect(b[4][4].mine).toBe(false);
      for (const [r, c] of neighbors(4, 4, 9, 9)) expect(b[r][c].mine).toBe(false);
    }
  });

  it('is always winnable-safe on the first move', () => {
    const g = createGame(9, 9, 10, 0, 0);
    const after = revealCell(g, 0, 0);
    expect(after.status).toBe('playing');
    expect(after.board[0][0].revealed).toBe(true);
  });
});

describe('Minesweeper — revealing', () => {
  it('flood-fills connected empty regions', () => {
    const g = createGame(9, 9, 10, 4, 4);
    const after = revealCell(g, 4, 4);
    expect(after.revealedCount).toBeGreaterThan(1);
  });

  it('loses when a mine is revealed', () => {
    const g = createGame(9, 9, 10, 4, 4);
    let minePos: [number, number] = [-1, -1];
    g.board.forEach((row, r) => row.forEach((cell, c) => { if (cell.mine) minePos = [r, c]; }));
    const after = revealCell(g, minePos[0], minePos[1]);
    expect(after.status).toBe('lost');
    expect(after.board.flat().filter((c) => c.mine).every((c) => c.revealed)).toBe(true);
  });

  it('cannot reveal a flagged cell', () => {
    const g = createGame(9, 9, 10, 4, 4);
    const flagged = toggleFlag(g, 1, 1);
    const after = revealCell(flagged, 1, 1);
    expect(after.board[1][1].revealed).toBe(false);
  });

  it('ignores input after the game is over', () => {
    const g = { ...createGame(9, 9, 10, 4, 4), status: 'won' as const };
    expect(revealCell(g, 0, 0)).toBe(g);
    expect(toggleFlag(g, 0, 0)).toBe(g);
  });
});

describe('Minesweeper — flags and win', () => {
  it('toggles a flag on and off', () => {
    const g = createGame(9, 9, 10, 4, 4);
    const on = toggleFlag(g, 2, 2);
    expect(on.board[2][2].flagged).toBe(true);
    expect(on.flagCount).toBe(1);
    const off = toggleFlag(on, 2, 2);
    expect(off.board[2][2].flagged).toBe(false);
    expect(off.flagCount).toBe(0);
  });

  it('wins when every non-mine cell is revealed', () => {
    let g = createGame(3, 3, 1, 0, 0);
    // Reveal every non-mine cell.
    g.board.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!cell.mine) g = revealCell(g, r, c);
      })
    );
    expect(g.status).toBe('won');
  });
});
