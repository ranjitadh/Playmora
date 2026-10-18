/**
 * Pure game logic for Number Merge (2048).
 * No React Native dependencies — safe for unit testing.
 */

const BOARD_SIZE = 4;
export type Board = number[][];

export function createEmptyBoard(): Board {
  return Array(BOARD_SIZE)
    .fill(0)
    .map(() => Array(BOARD_SIZE).fill(0));
}

export function spawnRandomTile(board: Board): Board {
  const emptyCoords: [number, number][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) emptyCoords.push([r, c]);
    }
  }
  if (emptyCoords.length === 0) return board;
  const [row, col] = emptyCoords[Math.floor(Math.random() * emptyCoords.length)];
  const newBoard = board.map((r) => [...r]);
  newBoard[row][col] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
}

export function slideRow(row: number[]): { newRow: number[]; scoreGained: number } {
  const filtered = row.filter((val) => val !== 0);
  const result: number[] = [];
  let scoreGained = 0;

  for (let i = 0; i < filtered.length; i++) {
    if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      scoreGained += merged;
      i++;
    } else {
      result.push(filtered[i]);
    }
  }

  while (result.length < BOARD_SIZE) {
    result.push(0);
  }

  return { newRow: result, scoreGained };
}

export function hasMovesRemaining(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) return true;
      if (c < BOARD_SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < BOARD_SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

export type MoveDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Applies a full slide+merge for one direction across the whole board. Pure: it
 * returns the resulting board, the score gained and whether anything moved, so
 * the caller decides whether to spawn a tile (and can operate on fresh state).
 */
export function applyMove(
  board: Board,
  direction: MoveDirection
): { board: Board; gained: number; changed: boolean } {
  const next = createEmptyBoard();
  let gained = 0;
  let changed = false;

  const horizontal = direction === 'left' || direction === 'right';
  for (let line = 0; line < BOARD_SIZE; line++) {
    // Read the line in the direction of travel so `slideRow` always merges
    // toward index 0, then write it back in the original orientation.
    const source: number[] = horizontal
      ? direction === 'left'
        ? [...board[line]]
        : [...board[line]].reverse()
      : direction === 'up'
        ? Array.from({ length: BOARD_SIZE }, (_, r) => board[r][line])
        : Array.from({ length: BOARD_SIZE }, (_, r) => board[BOARD_SIZE - 1 - r][line]);

    const { newRow, scoreGained } = slideRow(source);
    gained += scoreGained;

    for (let i = 0; i < BOARD_SIZE; i++) {
      const value = source[i];
      const merged = newRow[i];
      if (value !== merged) changed = true;

      if (horizontal) {
        const c = direction === 'left' ? i : BOARD_SIZE - 1 - i;
        next[line][c] = merged;
      } else {
        const r = direction === 'up' ? i : BOARD_SIZE - 1 - i;
        next[r][line] = merged;
      }
    }
  }

  return { board: next, gained, changed };
}

export { BOARD_SIZE };
