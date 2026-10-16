/**
 * Pure Nine Men's Morris logic — two players, pass-and-play.
 *
 * 24 points on three concentric squares. Points are numbered ring by ring
 * (0-7 outer, 8-15 middle, 16-23 inner), with j=0 top-left corner, j=1 top
 * midpoint, j=2 top-right corner, j=3 right midpoint, ... clockwise.
 * Spokes connect the edge midpoints across rings.
 * No RN dependencies.
 */

export type MColor = 'white' | 'black';
export type MPoint = MColor | null;
export type Phase = 'placing' | 'moving' | 'over';

export interface MorrisState {
  board: MPoint[];
  currentPlayer: MColor;
  phase: Phase;
  placed: { white: number; black: number };
  onBoard: { white: number; black: number };
  pendingRemoval: boolean;
  outcome: 'in_progress' | 'win';
  winner: MColor | null;
}

export const POINTS = 24;
export const MEN_EACH = 9;
export const FIRST: MColor = 'white';

function other(p: MColor): MColor {
  return p === 'white' ? 'black' : 'white';
}

/** Adjacency list for the 24 points. */
export const ADJACENCY: number[][] = (() => {
  const adj: number[][] = Array.from({ length: POINTS }, () => []);
  const link = (a: number, b: number) => {
    adj[a].push(b);
    adj[b].push(a);
  };
  for (let r = 0; r < 3; r++) {
    for (let j = 0; j < 8; j++) {
      link(r * 8 + j, r * 8 + ((j + 1) % 8));
    }
  }
  for (const j of [1, 3, 5, 7]) {
    link(j, 8 + j);
    link(8 + j, 16 + j);
  }
  return adj;
})();

/** The 16 winning lines (mills). */
export const MILLS: number[][] = (() => {
  const mills: number[][] = [];
  for (let r = 0; r < 3; r++) {
    const b = r * 8;
    mills.push([b + 0, b + 1, b + 2]);
    mills.push([b + 2, b + 3, b + 4]);
    mills.push([b + 4, b + 5, b + 6]);
    mills.push([b + 6, b + 7, b + 0]);
  }
  mills.push([1, 9, 17]);
  mills.push([5, 13, 21]);
  mills.push([7, 15, 23]);
  mills.push([3, 11, 19]);
  return mills;
})();

const MILLS_AT: number[][][] = Array.from({ length: POINTS }, (_, i) =>
  MILLS.filter((m) => m.includes(i))
);

export function createMorris(): MorrisState {
  return {
    board: Array<MPoint>(POINTS).fill(null),
    currentPlayer: FIRST,
    phase: 'placing',
    placed: { white: 0, black: 0 },
    onBoard: { white: 0, black: 0 },
    pendingRemoval: false,
    outcome: 'in_progress',
    winner: null,
  };
}

export function formsMill(board: MPoint[], index: number, color: MColor): boolean {
  return MILLS_AT[index].some((m) => m.every((p) => board[p] === color));
}

export function isInMill(board: MPoint[], index: number): boolean {
  const color = board[index];
  if (!color) return false;
  return formsMill(board, index, color);
}

function hasAnyMove(state: MorrisState, color: MColor): boolean {
  if (state.phase === 'placing') return true;
  const empty = state.board.some((p) => p === null);
  if (!empty) return false;
  const flying = state.onBoard[color] === 3;
  for (let i = 0; i < POINTS; i++) {
    if (state.board[i] !== color) continue;
    if (flying) return true;
    for (const n of ADJACENCY[i]) {
      if (state.board[n] === null) return true;
    }
  }
  return false;
}

function finishTurn(s: MorrisState): MorrisState {
  if (s.outcome !== 'in_progress') return s;
  let phase = s.phase;
  if (s.placed.white === MEN_EACH && s.placed.black === MEN_EACH) phase = 'moving';
  const next = other(s.currentPlayer);
  const st: MorrisState = { ...s, phase, currentPlayer: next, pendingRemoval: false };

  if (phase === 'moving' && st.onBoard[next] < 3) {
    return { ...st, phase: 'over', outcome: 'win', winner: s.currentPlayer };
  }
  if (phase === 'moving' && !hasAnyMove(st, next)) {
    return { ...st, phase: 'over', outcome: 'win', winner: s.currentPlayer };
  }
  return st;
}

export function placeMorris(state: MorrisState, index: number): MorrisState {
  if (state.phase !== 'placing' || state.pendingRemoval) return state;
  if (state.board[index] !== null) return state;

  const board = state.board.slice();
  board[index] = state.currentPlayer;
  const placed = { ...state.placed, [state.currentPlayer]: state.placed[state.currentPlayer] + 1 };
  const onBoard = { ...state.onBoard, [state.currentPlayer]: state.onBoard[state.currentPlayer] + 1 };
  const withMove: MorrisState = { ...state, board, placed, onBoard };

  if (formsMill(board, index, state.currentPlayer)) {
    return { ...withMove, pendingRemoval: true };
  }
  return finishTurn(withMove);
}

/** During a pending removal, take an opponent man (mill men are protected unless all are in mills). */
export function removeMorris(state: MorrisState, index: number): MorrisState {
  if (!state.pendingRemoval) return state;
  const victim = state.board[index];
  const opp = other(state.currentPlayer);
  if (victim !== opp) return state;

  const allInMills = state.board.every((p, i) => p !== opp || isInMill(state.board, i));
  if (isInMill(state.board, index) && !allInMills) return state;

  const board = state.board.slice();
  board[index] = null;
  const onBoard = { ...state.onBoard, [opp]: state.onBoard[opp] - 1 };
  return finishTurn({ ...state, board, onBoard });
}

export function moveMorris(state: MorrisState, from: number, to: number): MorrisState {
  if (state.phase !== 'moving' || state.pendingRemoval) return state;
  if (state.board[from] !== state.currentPlayer || state.board[to] !== null) return state;

  const flying = state.onBoard[state.currentPlayer] === 3;
  if (!flying && !ADJACENCY[from].includes(to)) return state;

  const board = state.board.slice();
  board[to] = state.currentPlayer;
  board[from] = null;
  const withMove: MorrisState = { ...state, board };

  if (formsMill(board, to, state.currentPlayer)) {
    return { ...withMove, pendingRemoval: true };
  }
  return finishTurn(withMove);
}
