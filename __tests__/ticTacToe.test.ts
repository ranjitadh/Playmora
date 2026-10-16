import {
  Board,
  GameState,
  WIN_LINES,
  applyMove,
  createEmptyBoard,
  createInitialState,
  getAvailableMoves,
  getNextPlayer,
  getWinningLine,
  isBoardFull,
  isCellEmpty,
  isDraw,
  playMove,
  resetGame,
} from '../src/games/implementations/tic-tac-toe/ticTacToeLogic';

/** Builds a board from a 9-character string: 'X', 'O' or '.' for empty. */
function boardFrom(str: string): Board {
  if (str.length !== 9) throw new Error(`board string must be 9 chars, got ${str.length}`);
  return str.split('').map((ch) => (ch === '.' ? null : (ch as 'X' | 'O')));
}

/** Play a list of cell indices as alternating X, O, X, O... from a fresh state. */
function playSequence(indices: number[]): GameState {
  return indices.reduce((state, idx) => playMove(state, idx), createInitialState());
}

describe('Tic-Tac-Toe — board basics', () => {
  test('initial state is empty, X to move, in progress', () => {
    const state = createInitialState();
    expect(state.board).toEqual(createEmptyBoard());
    expect(state.board).toHaveLength(9);
    expect(state.board.every((c) => c === null)).toBe(true);
    expect(state.currentPlayer).toBe('X');
    expect(state.outcome).toBe('in_progress');
    expect(state.winner).toBeNull();
    expect(state.winningLine).toBeNull();
  });

  test('available moves start at all 9 cells and shrink as marks are placed', () => {
    expect(getAvailableMoves(createEmptyBoard())).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(getAvailableMoves(boardFrom('XO.......'))).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  test('isCellEmpty rejects occupied cells and out-of-range indices', () => {
    const board = boardFrom('X........');
    expect(isCellEmpty(board, 0)).toBe(false);
    expect(isCellEmpty(board, 1)).toBe(true);
    expect(isCellEmpty(board, -1)).toBe(false);
    expect(isCellEmpty(board, 9)).toBe(false);
    expect(isCellEmpty(board, 1.5)).toBe(false);
  });

  test('isBoardFull is true only when every cell is filled', () => {
    expect(isBoardFull(boardFrom('XOXXOOOXX'))).toBe(true);
    expect(isBoardFull(boardFrom('XOXXOOOX.'))).toBe(false);
  });
});

describe('Tic-Tac-Toe — winning combinations', () => {
  test('WIN_LINES defines exactly the 8 valid lines', () => {
    expect(WIN_LINES).toHaveLength(8);
    expect(WIN_LINES).toContainEqual([0, 1, 2]);
    expect(WIN_LINES).toContainEqual([3, 4, 5]);
    expect(WIN_LINES).toContainEqual([6, 7, 8]);
    expect(WIN_LINES).toContainEqual([0, 3, 6]);
    expect(WIN_LINES).toContainEqual([1, 4, 7]);
    expect(WIN_LINES).toContainEqual([2, 5, 8]);
    expect(WIN_LINES).toContainEqual([0, 4, 8]);
    expect(WIN_LINES).toContainEqual([2, 4, 6]);
  });

  test.each([
    ['X wins top row', 'XXXOO....', 'X', [0, 1, 2]],
    ['X wins middle row', 'OO.XXX...', 'X', [3, 4, 5]],
    ['X wins bottom row', 'OO.XX.XXX', 'X', [6, 7, 8]],
    ['X wins left column', 'XOOX.OX..', 'X', [0, 3, 6]],
    ['X wins middle column', 'OXO.XO.X.', 'X', [1, 4, 7]],
    ['X wins right column', 'OOX..XOOX', 'X', [2, 5, 8]],
    ['X wins main diagonal', 'XOO.X...X', 'X', [0, 4, 8]],
    ['X wins anti diagonal', 'OOX.X.X..', 'X', [2, 4, 6]],
    ['O wins top row', 'OOOXX....', 'O', [0, 1, 2]],
  ] as const)('%s', (_name, boardStr, winner, line) => {
    const result = getWinningLine(boardFrom(boardStr));
    expect(result).not.toBeNull();
    expect(result?.winner).toBe(winner);
    expect(result?.line).toEqual(line);
  });

  test('playMove detects an X win and records the winning line', () => {
    // X:0 O:3 X:1 O:4 X:2 -> X takes the top row
    const state = playSequence([0, 3, 1, 4, 2]);
    expect(state.outcome).toBe('win');
    expect(state.winner).toBe('X');
    expect(state.winningLine).toEqual([0, 1, 2]);
  });

  test('the second player (O) can win', () => {
    // X:0 O:3 X:1 O:4 X:8 O:5 -> O takes the middle row
    const state = playSequence([0, 3, 1, 4, 8, 5]);
    expect(state.outcome).toBe('win');
    expect(state.winner).toBe('O');
    expect(state.winningLine).toEqual([3, 4, 5]);
  });
});

describe('Tic-Tac-Toe — draws', () => {
  test('a full board with no line is a draw', () => {
    // X O X
    // X O O
    // O X X
    const drawBoard = boardFrom('XOXXOOOXX');
    expect(isDraw(drawBoard)).toBe(true);
    expect(getWinningLine(drawBoard)).toBeNull();
  });

  test('a legitimate drawn game reached through play has outcome "draw"', () => {
    // X:0 O:1 X:2 O:3 X:5 O:4 X:6 O:8 X:7  ->  X O X / O O X / X X O
    const state = playSequence([0, 1, 2, 3, 5, 4, 6, 8, 7]);
    expect(state.outcome).toBe('draw');
    expect(state.winner).toBeNull();
    expect(state.winningLine).toBeNull();
    expect(isBoardFull(state.board)).toBe(true);
  });
});

describe('Tic-Tac-Toe — turn switching', () => {
  test('X always starts and turns alternate', () => {
    let state = createInitialState();
    expect(state.currentPlayer).toBe('X');

    state = playMove(state, 4); // X
    expect(state.board[4]).toBe('X');
    expect(state.currentPlayer).toBe('O');

    state = playMove(state, 0); // O
    expect(state.board[0]).toBe('O');
    expect(state.currentPlayer).toBe('X');

    state = playMove(state, 8); // X
    expect(state.board[8]).toBe('X');
    expect(state.currentPlayer).toBe('O');
  });

  test('getNextPlayer derives the turn from mark counts', () => {
    expect(getNextPlayer(boardFrom('.........'))).toBe('X');
    expect(getNextPlayer(boardFrom('X........'))).toBe('O');
    expect(getNextPlayer(boardFrom('XO.......'))).toBe('X');
    expect(getNextPlayer(boardFrom('XOX......'))).toBe('O');
  });
});

describe('Tic-Tac-Toe — invalid moves', () => {
  test('cannot play an occupied cell; state is returned unchanged by reference', () => {
    const after = playMove(createInitialState(), 4); // X plays center
    const again = playMove(after, 4); // O tries the same cell
    expect(again).toBe(after);
    expect(again.board[4]).toBe('X');
    expect(again.currentPlayer).toBe('O'); // turn did not advance
  });

  test('applyMove ignores illegal indices and occupied cells', () => {
    const board = boardFrom('X........');
    expect(applyMove(board, 0, 'O')).toBe(board); // occupied
    expect(applyMove(board, -1, 'O')).toBe(board); // out of range
    expect(applyMove(board, 9, 'O')).toBe(board); // out of range
    const moved = applyMove(board, 1, 'O');
    expect(moved).not.toBe(board);
    expect(moved[1]).toBe('O');
  });

  test('no moves are allowed after a win', () => {
    const won = playSequence([0, 3, 1, 4, 2]); // X wins
    expect(won.outcome).toBe('win');
    const blocked = playMove(won, 5); // would be O's move, but the game is over
    expect(blocked).toBe(won);
    expect(blocked.board[5]).toBeNull();
  });

  test('no moves are allowed after a draw', () => {
    const drawn = playSequence([0, 1, 2, 3, 5, 4, 6, 8, 7]);
    expect(drawn.outcome).toBe('draw');
    expect(playMove(drawn, 0)).toBe(drawn);
  });
});

describe('Tic-Tac-Toe — restart', () => {
  test('resetGame returns a fresh playable state', () => {
    const finished = playSequence([0, 3, 1, 4, 2]);
    expect(finished.outcome).toBe('win');

    const restarted = resetGame();
    expect(restarted).not.toBe(finished);
    expect(restarted.board).toEqual(createEmptyBoard());
    expect(restarted.board.every((c) => c === null)).toBe(true);
    expect(restarted.currentPlayer).toBe('X');
    expect(restarted.outcome).toBe('in_progress');
    expect(restarted.winner).toBeNull();
    expect(restarted.winningLine).toBeNull();
  });

  test('a fresh game after restart accepts moves normally', () => {
    const restarted = resetGame();
    const firstMove = playMove(restarted, 0);
    expect(firstMove.board[0]).toBe('X');
    expect(firstMove.currentPlayer).toBe('O');
    expect(firstMove.outcome).toBe('in_progress');
  });
});
