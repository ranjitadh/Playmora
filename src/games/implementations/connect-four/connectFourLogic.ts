/**
 * Pure game logic for Connect Four (local pass-and-play).
 * No React Native dependencies — safe for unit testing.
 *
 * PREPARATION ONLY: this module is intentionally NOT registered in the game
 * registry and the catalog entry remains `isImplemented: false`. It exists so
 * the next multiplayer title can be wired up quickly.
 *
 * Board is a flat array of ROWS * COLS cells, indexed row-major.
 * Row 0 is the TOP row; row ROWS-1 is the BOTTOM row. Pieces fall to the
 * lowest empty row within a column.
 */

export type Player = 'red' | 'yellow';
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

export const ROWS = 6;
export const COLS = 7;
export const BOARD_LENGTH = ROWS * COLS;
export const CONNECT_LENGTH = 4;
export const FIRST_PLAYER: Player = 'red';

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

export function resetGame(): GameState {
  return createInitialState();
}

export function idx(row: number, col: number): number {
  return row * COLS + col;
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

export function isColumnFull(board: Board, col: number): boolean {
  if (!Number.isInteger(col) || col < 0 || col >= COLS) return true;
  return board[idx(0, col)] !== null;
}

/** Lowest empty row in a column, or null if the column is invalid/full. */
export function getLandingRow(board: Board, col: number): number | null {
  if (!Number.isInteger(col) || col < 0 || col >= COLS) return null;
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[idx(row, col)] === null) return row;
  }
  return null;
}

export function getAvailableColumns(board: Board): number[] {
  const cols: number[] = [];
  for (let col = 0; col < COLS; col++) {
    if (!isColumnFull(board, col)) cols.push(col);
  }
  return cols;
}

export function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== null);
}

/** Returns a new board with the player's piece dropped, or the same board if the drop is illegal. */
export function applyDrop(board: Board, col: number, player: Player): Board {
  const row = getLandingRow(board, col);
  if (row === null) return board;
  const next = board.slice();
  next[idx(row, col)] = player;
  return next;
}

const DIRECTIONS: ReadonlyArray<[number, number]> = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal down-right
  [1, -1], // diagonal down-left
];

/** Returns the winning player and the 4 connected cells, or null. */
export function getWinningLine(board: Board): { winner: Player; line: number[] } | null {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const mark = board[idx(row, col)];
      if (!mark) continue;

      for (const [dr, dc] of DIRECTIONS) {
        const line = [idx(row, col)];
        let ok = true;
        for (let step = 1; step < CONNECT_LENGTH; step++) {
          const r = row + dr * step;
          const c = col + dc * step;
          if (!inBounds(r, c) || board[idx(r, c)] !== mark) {
            ok = false;
            break;
          }
          line.push(idx(r, c));
        }
        if (ok) return { winner: mark, line };
      }
    }
  }
  return null;
}

export function isDraw(board: Board): boolean {
  return getWinningLine(board) === null && isBoardFull(board);
}

export function getNextPlayer(board: Board): Player {
  let red = 0;
  let yellow = 0;
  for (const cell of board) {
    if (cell === 'red') red++;
    else if (cell === 'yellow') yellow++;
  }
  return red > yellow ? 'yellow' : 'red';
}

export function evaluateBoard(board: Board): {
  outcome: Outcome;
  winner: Player | null;
  winningLine: number[] | null;
} {
  const win = getWinningLine(board);
  if (win) return { outcome: 'win', winner: win.winner, winningLine: win.line };
  if (isBoardFull(board)) return { outcome: 'draw', winner: null, winningLine: null };
  return { outcome: 'in_progress', winner: null, winningLine: null };
}

/**
 * Drops the current player's piece into a column.
 * Returns the SAME state object when the game is over or the column is full/invalid,
 * so callers can rely on identity to detect a rejected move.
 */
export function playMove(state: GameState, col: number): GameState {
  if (state.outcome !== 'in_progress') return state;
  if (isColumnFull(state.board, col)) return state;

  const board = applyDrop(state.board, col, state.currentPlayer);
  if (board === state.board) return state;

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
