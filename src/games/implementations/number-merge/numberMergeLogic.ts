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

export { BOARD_SIZE };
