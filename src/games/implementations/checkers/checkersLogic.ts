/**
 * Pure English draughts (checkers) logic — two players, pass-and-play.
 * 8x8 board, flat row-major array. Only dark squares ((row+col) % 2 === 1) are
 * playable. Captures are mandatory; multi-jumps chain automatically.
 * No RN dependencies.
 */

export type Color = 'red' | 'black';
export interface Piece {
  color: Color;
  king: boolean;
}
export type Sq = Piece | null;
export type Outcome = 'in_progress' | 'win';

export interface Move {
  from: number;
  to: number;
  capture: number | null;
}

export interface CheckerState {
  board: Sq[];
  currentPlayer: Color;
  outcome: Outcome;
  winner: Color | null;
  chainFrom: number | null;
}

export const N = 8;
export const SIZE = N * N;
export const FIRST: Color = 'red';

export function idx(row: number, col: number): number {
  return row * N + col;
}
function rc(i: number): [number, number] {
  return [Math.floor(i / N), i % N];
}
export function isDark(i: number): boolean {
  const [r, c] = rc(i);
  return (r + c) % 2 === 1;
}
function inside(r: number, c: number): boolean {
  return r >= 0 && r < N && c >= 0 && c < N;
}
function other(p: Color): Color {
  return p === 'red' ? 'black' : 'red';
}
function forwardDir(color: Color): number {
  return color === 'red' ? -1 : 1;
}

export function createCheckers(): CheckerState {
  const board: Sq[] = Array<Sq>(SIZE).fill(null);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const i = idx(r, c);
      if (!isDark(i)) continue;
      if (r <= 2) board[i] = { color: 'black', king: false };
      else if (r >= 5) board[i] = { color: 'red', king: false };
    }
  }
  return { board, currentPlayer: FIRST, outcome: 'in_progress', winner: null, chainFrom: null };
}

function jumpMovesFrom(board: Sq[], i: number): Move[] {
  const piece = board[i];
  if (!piece) return [];
  const [r, c] = rc(i);
  const dirs = piece.king ? [-1, 1] : [forwardDir(piece.color)];
  const moves: Move[] = [];
  for (const dr of dirs) {
    for (const dc of [-1, 1]) {
      const mr = r + dr;
      const mc = c + dc;
      const lr = r + dr * 2;
      const lc = c + dc * 2;
      if (!inside(lr, lc)) continue;
      const mid = board[idx(mr, mc)];
      const landing = board[idx(lr, lc)];
      if (mid && mid.color !== piece.color && !landing) {
        moves.push({ from: i, to: idx(lr, lc), capture: idx(mr, mc) });
      }
    }
  }
  return moves;
}

function stepMovesFrom(board: Sq[], i: number): Move[] {
  const piece = board[i];
  if (!piece) return [];
  const [r, c] = rc(i);
  const dirs = piece.king ? [-1, 1] : [forwardDir(piece.color)];
  const moves: Move[] = [];
  for (const dr of dirs) {
    for (const dc of [-1, 1]) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inside(nr, nc)) continue;
      if (!board[idx(nr, nc)]) moves.push({ from: i, to: idx(nr, nc), capture: null });
    }
  }
  return moves;
}

/** All legal moves for the side to move. Captures are mandatory. */
export function legalMoves(state: CheckerState): Move[] {
  if (state.outcome !== 'in_progress') return [];
  const { board, currentPlayer, chainFrom } = state;

  if (chainFrom !== null) {
    return jumpMovesFrom(board, chainFrom);
  }

  const jumps: Move[] = [];
  const steps: Move[] = [];
  for (let i = 0; i < SIZE; i++) {
    const piece = board[i];
    if (!piece || piece.color !== currentPlayer) continue;
    jumps.push(...jumpMovesFrom(board, i));
    steps.push(...stepMovesFrom(board, i));
  }
  return jumps.length > 0 ? jumps : steps;
}

export function movesFrom(state: CheckerState, from: number): Move[] {
  return legalMoves(state).filter((m) => m.from === from);
}

function promotes(piece: Piece, to: number): boolean {
  const [r] = rc(to);
  return (piece.color === 'red' && r === 0) || (piece.color === 'black' && r === N - 1);
}

export function applyMove(state: CheckerState, from: number, to: number): CheckerState {
  const move = legalMoves(state).find((m) => m.from === from && m.to === to);
  if (!move) return state;

  const board = state.board.slice();
  const piece = board[from] as Piece;
  board[from] = null;
  board[to] = piece;
  if (move.capture !== null) board[move.capture] = null;

  const becameKing = promotes(piece, to);
  if (becameKing) board[to] = { color: piece.color, king: true };

  const chain =
    move.capture !== null && !becameKing ? jumpMovesFrom(board, to) : [];

  if (chain.length > 0) {
    return { board, currentPlayer: state.currentPlayer, outcome: 'in_progress', winner: null, chainFrom: to };
  }

  const nextPlayer = other(state.currentPlayer);
  const next: CheckerState = {
    board,
    currentPlayer: nextPlayer,
    outcome: 'in_progress',
    winner: null,
    chainFrom: null,
  };
  if (legalMoves(next).length === 0) {
    return { ...next, outcome: 'win', winner: state.currentPlayer };
  }
  return next;
}

export function countPieces(board: Sq[]): { red: number; black: number } {
  let red = 0;
  let black = 0;
  for (const sq of board) {
    if (sq?.color === 'red') red++;
    else if (sq?.color === 'black') black++;
  }
  return { red, black };
}
