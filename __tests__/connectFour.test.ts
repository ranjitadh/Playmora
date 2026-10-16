import {
  Board,
  COLS,
  ROWS,
  applyDrop,
  createEmptyBoard,
  createInitialState,
  evaluateBoard,
  getAvailableColumns,
  getLandingRow,
  getNextPlayer,
  getWinningLine,
  idx,
  isBoardFull,
  isColumnFull,
  isDraw,
  playMove,
  resetGame,
} from '../src/games/implementations/connect-four/connectFourLogic';

/**
 * Build a board from ASCII rows, top -> bottom.
 * '.' empty, 'R' red, 'Y' yellow.
 */
function boardFromRows(rows: string[]): Board {
  const board = createEmptyBoard();
  rows.forEach((line, r) => {
    for (let c = 0; c < COLS; c++) {
      const ch = line[c];
      board[idx(r, c)] = ch === 'R' ? 'red' : ch === 'Y' ? 'yellow' : null;
    }
  });
  return board;
}

describe('Connect Four — setup', () => {
  it('starts empty with red to move', () => {
    const state = createInitialState();
    expect(state.board).toHaveLength(ROWS * COLS);
    expect(state.board.every((c) => c === null)).toBe(true);
    expect(state.currentPlayer).toBe('red');
    expect(state.outcome).toBe('in_progress');
    expect(state.winner).toBeNull();
    expect(state.winningLine).toBeNull();
  });

  it('resetGame returns a fresh playable state', () => {
    const state = resetGame();
    expect(isBoardFull(state.board)).toBe(false);
    expect(getAvailableColumns(state.board)).toHaveLength(COLS);
  });
});

describe('Connect Four — dropping pieces', () => {
  it('drops to the lowest empty row and stacks upward', () => {
    let board = createEmptyBoard();
    expect(getLandingRow(board, 3)).toBe(ROWS - 1);

    board = applyDrop(board, 3, 'red');
    expect(board[idx(ROWS - 1, 3)]).toBe('red');
    expect(getLandingRow(board, 3)).toBe(ROWS - 2);

    board = applyDrop(board, 3, 'yellow');
    expect(board[idx(ROWS - 2, 3)]).toBe('yellow');
    expect(getLandingRow(board, 3)).toBe(ROWS - 3);
  });

  it('reports a full column and rejects drops into it', () => {
    let board = createEmptyBoard();
    for (let i = 0; i < ROWS; i++) board = applyDrop(board, 0, i % 2 ? 'yellow' : 'red');
    expect(isColumnFull(board, 0)).toBe(true);
    expect(getLandingRow(board, 0)).toBeNull();
    expect(applyDrop(board, 0, 'red')).toBe(board); // same reference
    expect(getAvailableColumns(board)).not.toContain(0);
  });

  it('ignores out-of-range columns', () => {
    const board = createEmptyBoard();
    expect(getLandingRow(board, -1)).toBeNull();
    expect(getLandingRow(board, COLS)).toBeNull();
    expect(applyDrop(board, COLS, 'red')).toBe(board);
  });
});

describe('Connect Four — win detection', () => {
  it('detects a horizontal four', () => {
    const board = boardFromRows([
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      'RRRR...',
    ]);
    const win = getWinningLine(board);
    expect(win?.winner).toBe('red');
    expect(win?.line).toHaveLength(4);
  });

  it('detects a vertical four', () => {
    const board = boardFromRows([
      '.......',
      '.......',
      '..R....',
      '..R....',
      '..R....',
      '..R....',
    ]);
    const win = getWinningLine(board);
    expect(win?.winner).toBe('red');
    expect(win?.line).toHaveLength(4);
  });

  it('detects a diagonal (down-right) four', () => {
    const board = boardFromRows([
      '.......',
      '.......',
      'R......',
      '.R.....',
      '..R....',
      '...R...',
    ]);
    const win = getWinningLine(board);
    expect(win?.winner).toBe('red');
    expect(win?.line).toHaveLength(4);
  });

  it('detects a diagonal (down-left) four', () => {
    const board = boardFromRows([
      '.......',
      '.......',
      '...R...',
      '..R....',
      '.R.....',
      'R......',
    ]);
    const win = getWinningLine(board);
    expect(win?.winner).toBe('red');
    expect(win?.line).toHaveLength(4);
  });

  it('does not report a win for only three in a row', () => {
    const board = boardFromRows([
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      'RRR....',
    ]);
    expect(getWinningLine(board)).toBeNull();
  });
});

describe('Connect Four — draws', () => {
  it('detects a draw on a full board with no four-in-a-row', () => {
    const board = boardFromRows([
      'YYYRYYY',
      'RYYYRRR',
      'RRRYRYY',
      'RYYYRRR',
      'YRRRYRY',
      'RYYRRRY',
    ]);
    expect(isBoardFull(board)).toBe(true);
    expect(getWinningLine(board)).toBeNull();
    expect(isDraw(board)).toBe(true);
    expect(evaluateBoard(board).outcome).toBe('draw');
  });

  it('is not a draw when a winner exists', () => {
    const board = boardFromRows([
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      'RRRR...',
    ]);
    expect(isDraw(board)).toBe(false);
  });
});

describe('Connect Four — playMove', () => {
  it('alternates turns, starting with red', () => {
    let state = createInitialState();
    expect(state.currentPlayer).toBe('red');
    state = playMove(state, 0);
    expect(state.currentPlayer).toBe('yellow');
    state = playMove(state, 1);
    expect(state.currentPlayer).toBe('red');
  });

  it('getNextPlayer derives the turn from piece counts', () => {
    let board = createEmptyBoard();
    expect(getNextPlayer(board)).toBe('red');
    board = applyDrop(board, 0, 'red');
    expect(getNextPlayer(board)).toBe('yellow');
    board = applyDrop(board, 1, 'yellow');
    expect(getNextPlayer(board)).toBe('red');
  });

  it('returns the same state when a column is full or out of range', () => {
    let state = createInitialState();
    for (let i = 0; i < ROWS; i++) state = playMove(state, 0);
    expect(isColumnFull(state.board, 0)).toBe(true);
    expect(playMove(state, 0)).toBe(state);
    expect(playMove(state, COLS)).toBe(state);
    expect(playMove(state, -1)).toBe(state);
  });

  it('records the winner and stops accepting moves after a win', () => {
    let state = createInitialState();
    // red drops 0,1,2,3 while yellow stacks column 6.
    state = playMove(state, 0); // red
    state = playMove(state, 6); // yellow
    state = playMove(state, 1); // red
    state = playMove(state, 6); // yellow
    state = playMove(state, 2); // red
    state = playMove(state, 6); // yellow
    state = playMove(state, 3); // red -> horizontal win
    expect(state.outcome).toBe('win');
    expect(state.winner).toBe('red');
    expect(state.winningLine).toHaveLength(4);

    // No further moves are allowed.
    expect(playMove(state, 4)).toBe(state);
  });
});
