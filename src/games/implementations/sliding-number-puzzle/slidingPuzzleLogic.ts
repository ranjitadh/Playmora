/**
 * Pure "Sliding Number Puzzle" (15-puzzle) logic.
 * The board is a flat array of length size*size where 0 is the blank.
 * `move(dir)` slides the blank in that direction (swapping with the adjacent tile).
 */

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Board = number[];

export function createSolved(size: number): Board {
  const total = size * size;
  const board: number[] = [];
  for (let i = 1; i < total; i++) board.push(i);
  board.push(0);
  return board;
}

export function blankIndex(board: Board): number {
  return board.indexOf(0);
}

export function move(board: Board, dir: Dir): Board {
  const size = Math.round(Math.sqrt(board.length));
  const b = blankIndex(board);
  const r = Math.floor(b / size);
  const c = b % size;

  let nr = r;
  let nc = c;
  if (dir === 'up') nr = r - 1;
  else if (dir === 'down') nr = r + 1;
  else if (dir === 'left') nc = c - 1;
  else nc = c + 1;

  if (nr < 0 || nr >= size || nc < 0 || nc >= size) return board;

  const target = nr * size + nc;
  const next = [...board];
  next[b] = next[target];
  next[target] = 0;
  return next;
}

export function isSolved(board: Board): boolean {
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[board.length - 1] === 0;
}

/** Number of inversions among non-blank tiles. */
export function countInversions(board: Board): number {
  const tiles = board.filter((t) => t !== 0);
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (tiles[i] > tiles[j]) inversions++;
    }
  }
  return inversions;
}

/** Standard solvability test for the classic puzzle. */
export function isSolvable(board: Board): boolean {
  const size = Math.round(Math.sqrt(board.length));
  const inversions = countInversions(board);
  if (size % 2 === 1) return inversions % 2 === 0;
  const rowFromBottom = size - Math.floor(blankIndex(board) / size);
  return (inversions + rowFromBottom) % 2 === 1;
}

/** Generates a solvable shuffle by applying random valid blank moves from solved. */
export function createShuffled(size: number, moves: number): Board {
  let board = createSolved(size);
  const dirs: Dir[] = ['up', 'down', 'left', 'right'];
  let last: Dir | null = null;
  for (let i = 0; i < moves; i++) {
    const options = dirs.filter((d) => d !== last);
    const dir = options[Math.floor(Math.random() * options.length)];
    const next = move(board, dir);
    if (next !== board) {
      board = next;
      last = dir;
    }
  }
  if (isSolved(board)) return move(board, 'up');
  return board;
}
