/**
 * Pure game logic for Tic-Tac-Toe (local pass-and-play).
 * No React Native dependencies — safe for unit testing.
 *
 * Board is a flat array of 9 cells, indexed row-major:
 *   0 | 1 | 2
 *   3 | 4 | 5
 *   6 | 7 | 8
 */

export type Player = 'X' | 'O';
export type Cell = Player | null;
export type Board = Cell[];
export type Outcome = 'in_progress' | 'win' | 'draw';

export interface GameState {
  board: Board;
  currentPlayer: Player;
  outcome: Outcome;
  winner: Player | null;
  winningLine: number[] | null;
}

export const BOARD_LENGTH = 9;
export const FIRST_PLAYER: Player = 'X';

/** All 8 possible 3-in-a-row lines: 3 rows, 3 columns, 2 diagonals. */
export const WIN_LINES: readonly number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createEmptyBoard(): Board {
  return Array<Cell>(BOARD_LENGTH).fill(null);
}

export function createInitialState(): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: FIRST_PLAYER,
    outcome: 'in_progress',
    winner: null,
    winningLine: null,
  };
}

/** Resets a game to a fresh, playable state. */
export function resetGame(): GameState {
  return createInitialState();
}

export function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== null);
}

export function isCellEmpty(board: Board, index: number): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= BOARD_LENGTH) return false;
  return board[index] === null;
}

export function getAvailableMoves(board: Board): number[] {
  const moves: number[] = [];
  for (let i = 0; i < BOARD_LENGTH; i++) {
    if (board[i] === null) moves.push(i);
  }
  return moves;
}

/** Returns the winning player and the winning line, or null if there is no winner. */
export function getWinningLine(board: Board): { winner: Player; line: number[] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const mark = board[a];
    if (mark && mark === board[b] && mark === board[c]) {
      return { winner: mark, line };
    }
  }
  return null;
}

export function isDraw(board: Board): boolean {
  return getWinningLine(board) === null && isBoardFull(board);
}

/**
 * X always moves first. After that, turns alternate strictly by mark count,
 * so the next player is O whenever X has moved one more time than O.
 */
export function getNextPlayer(board: Board): Player {
  let x = 0;
  let o = 0;
  for (const cell of board) {
    if (cell === 'X') x++;
    else if (cell === 'O') o++;
  }
  return x > o ? 'O' : 'X';
}

export function evaluateBoard(board: Board): {
  outcome: Outcome;
  winner: Player | null;
  winningLine: number[] | null;
} {
  const win = getWinningLine(board);
  if (win) {
    return { outcome: 'win', winner: win.winner, winningLine: win.line };
  }
  if (isBoardFull(board)) {
    return { outcome: 'draw', winner: null, winningLine: null };
  }
  return { outcome: 'in_progress', winner: null, winningLine: null };
}

/** Returns a new board with the player's mark placed, or the same board if the move is illegal. */
export function applyMove(board: Board, index: number, player: Player): Board {
  if (!isCellEmpty(board, index)) return board;
  const next = board.slice();
  next[index] = player;
  return next;
}

/**
 * Plays a move for the current player.
 * Returns the SAME state object when the game is already over or the cell is occupied,
 * so callers can rely on identity to detect a rejected move.
 */
export function playMove(state: GameState, index: number): GameState {
  if (state.outcome !== 'in_progress') return state;
  if (!isCellEmpty(state.board, index)) return state;

  const board = applyMove(state.board, index, state.currentPlayer);
  const result = evaluateBoard(board);

  return {
    board,
    outcome: result.outcome,
    winner: result.winner,
    winningLine: result.winningLine,
    currentPlayer:
      result.outcome === 'in_progress' ? getNextPlayer(board) : state.currentPlayer,
  };
}
