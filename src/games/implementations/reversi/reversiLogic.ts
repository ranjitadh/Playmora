/**
 * Pure Reversi / Othello logic (two players, pass-and-play).
 * Board is a flat 8x8 array indexed row-major. No RN dependencies.
 */

export type Faction = 'black' | 'white';
export type Disc = Faction | null;
export type RBoard = Disc[];
export type Outcome = 'in_progress' | 'win' | 'draw';

export interface ReversiState {
  board: RBoard;
  currentPlayer: Faction;
  outcome: Outcome;
  winner: Faction | null;
  lastPassed: boolean;
}

export const N = 8;
export const SIZE = N * N;
export const FIRST: Faction = 'black';

export function idx(row: number, col: number): number {
  return row * N + col;
}
function rc(i: number): [number, number] {
  return [Math.floor(i / N), i % N];
}
function inside(row: number, col: number): boolean {
  return row >= 0 && row < N && col >= 0 && col < N;
}
function opponent(p: Faction): Faction {
  return p === 'black' ? 'white' : 'black';
}

const DIRS: ReadonlyArray<[number, number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

export function createReversi(): ReversiState {
  const board: RBoard = Array<Disc>(SIZE).fill(null);
  board[idx(3, 3)] = 'white';
  board[idx(4, 4)] = 'white';
  board[idx(3, 4)] = 'black';
  board[idx(4, 3)] = 'black';
  return { board, currentPlayer: FIRST, outcome: 'in_progress', winner: null, lastPassed: false };
}

/** Discs that would flip if `player` plays at index `i`. Empty if illegal. */
export function flipsFor(board: RBoard, i: number, player: Faction): number[] {
  if (board[i] !== null) return [];
  const [row, col] = rc(i);
  const opp = opponent(player);
  const flips: number[] = [];
  for (const [dr, dc] of DIRS) {
    const line: number[] = [];
    let r = row + dr;
    let c = col + dc;
    while (inside(r, c) && board[idx(r, c)] === opp) {
      line.push(idx(r, c));
      r += dr;
      c += dc;
    }
    if (line.length > 0 && inside(r, c) && board[idx(r, c)] === player) {
      flips.push(...line);
    }
  }
  return flips;
}

export function isLegalMove(board: RBoard, i: number, player: Faction): boolean {
  return board[i] === null && flipsFor(board, i, player).length > 0;
}

export function legalMoves(board: RBoard, player: Faction): number[] {
  const moves: number[] = [];
  for (let i = 0; i < SIZE; i++) {
    if (isLegalMove(board, i, player)) moves.push(i);
  }
  return moves;
}

export function countDiscs(board: RBoard): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (const d of board) {
    if (d === 'black') black++;
    else if (d === 'white') white++;
  }
  return { black, white };
}

function applyPlacement(board: RBoard, i: number, player: Faction): RBoard {
  const next = board.slice();
  next[i] = player;
  for (const f of flipsFor(board, i, player)) next[f] = player;
  return next;
}

export function playReversi(state: ReversiState, i: number): ReversiState {
  if (state.outcome !== 'in_progress') return state;
  if (!isLegalMove(state.board, i, state.currentPlayer)) return state;

  const board = applyPlacement(state.board, i, state.currentPlayer);
  const other = opponent(state.currentPlayer);

  if (legalMoves(board, other).length > 0) {
    return { board, currentPlayer: other, outcome: 'in_progress', winner: null, lastPassed: false };
  }
  if (legalMoves(board, state.currentPlayer).length > 0) {
    // Opponent must pass; same player moves again.
    return { board, currentPlayer: state.currentPlayer, outcome: 'in_progress', winner: null, lastPassed: true };
  }
  // Neither can move — game over.
  const { black, white } = countDiscs(board);
  const winner = black === white ? null : black > white ? 'black' : 'white';
  return { board, currentPlayer: state.currentPlayer, outcome: black === white ? 'draw' : 'win', winner, lastPassed: true };
}
