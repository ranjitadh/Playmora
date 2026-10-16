/**
 * Pure Chess logic — full legal-move generation with check, checkmate,
 * stalemate, castling, en passant and promotion. No RN dependencies.
 *
 * Board is a flat 64 array, row-major with index 0 = a8 (top-left) and
 * index 63 = h1 (bottom-right). White sits at the bottom and moves upward.
 */

export type Color = 'w' | 'b';
export type Piece = string; // 'wP', 'bK', ...
export type Board = (Piece | null)[];

export interface ChessMove {
  from: number;
  to: number;
  castle?: 'K' | 'Q';
  enPassant?: boolean;
  promotion?: 'Q' | 'R' | 'B' | 'N';
}

export interface ChessState {
  board: Board;
  turn: Color;
  castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  ep: number | null; // en-passant target square
  halfmove: number;
  lastMove: ChessMove | null;
  outcome: 'in_progress' | 'checkmate' | 'stalemate' | 'draw';
  winner: Color | null;
  check: boolean;
}

const KNIGHT: [number, number][] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
];
const DIAG: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTH: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const KING: [number, number][] = [...DIAG, ...ORTH];

const idx = (r: number, c: number) => r * 8 + c;
const inside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
const rc = (i: number): [number, number] => [Math.floor(i / 8), i % 8];
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const colorOf = (p: Piece): Color => p[0] as Color;
const typeOf = (p: Piece): string => p[1];

export function createChess(): ChessState {
  const board: Board = Array<Piece | null>(64).fill(null);
  const back: string[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let c = 0; c < 8; c++) {
    board[idx(0, c)] = 'b' + back[c];
    board[idx(1, c)] = 'bP';
    board[idx(6, c)] = 'wP';
    board[idx(7, c)] = 'w' + back[c];
  }
  return {
    board,
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    ep: null,
    halfmove: 0,
    lastMove: null,
    outcome: 'in_progress',
    winner: null,
    check: false,
  };
}

export function kingSquare(board: Board, color: Color): number {
  for (let i = 0; i < 64; i++) if (board[i] === color + 'K') return i;
  return -1;
}

/** Is `square` attacked by any piece of `byColor`? (Ignores castling/en-passant.) */
export function isAttacked(board: Board, square: number, byColor: Color): boolean {
  const [r, c] = rc(square);

  // Knights
  for (const [dr, dc] of KNIGHT) {
    const rr = r + dr;
    const cc = c + dc;
    if (inside(rr, cc) && board[idx(rr, cc)] === byColor + 'N') return true;
  }
  // King
  for (const [dr, dc] of KING) {
    const rr = r + dr;
    const cc = c + dc;
    if (inside(rr, cc) && board[idx(rr, cc)] === byColor + 'K') return true;
  }
  // Pawns (a white pawn attacks "upward", so it sits one row below the target)
  const pawnDir = byColor === 'w' ? 1 : -1; // attacker's row relative to target
  for (const dc of [-1, 1]) {
    const rr = r + pawnDir;
    const cc = c + dc;
    if (inside(rr, cc) && board[idx(rr, cc)] === byColor + 'P') return true;
  }
  // Sliding: diagonals (bishop/queen)
  for (const [dr, dc] of DIAG) {
    let rr = r + dr;
    let cc = c + dc;
    while (inside(rr, cc)) {
      const p = board[idx(rr, cc)];
      if (p) {
        if (colorOf(p) === byColor && (typeOf(p) === 'B' || typeOf(p) === 'Q')) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
  // Sliding: orthogonals (rook/queen)
  for (const [dr, dc] of ORTH) {
    let rr = r + dr;
    let cc = c + dc;
    while (inside(rr, cc)) {
      const p = board[idx(rr, cc)];
      if (p) {
        if (colorOf(p) === byColor && (typeOf(p) === 'R' || typeOf(p) === 'Q')) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
  return false;
}

export function inCheck(state: ChessState, color: Color): boolean {
  const ks = kingSquare(state.board, color);
  return ks >= 0 && isAttacked(state.board, ks, other(color));
}

/** Pseudo-legal moves ignoring whether they leave the own king in check. */
function pseudoMoves(state: ChessState, from: number): ChessMove[] {
  const piece = state.board[from];
  if (!piece) return [];
  const color = colorOf(piece);
  const type = typeOf(piece);
  const [r, c] = rc(from);
  const moves: ChessMove[] = [];
  const push = (to: number, extra?: Partial<ChessMove>) => moves.push({ from, to, ...extra });

  const slide = (dirs: [number, number][]) => {
    for (const [dr, dc] of dirs) {
      let rr = r + dr;
      let cc = c + dc;
      while (inside(rr, cc)) {
        const p = state.board[idx(rr, cc)];
        if (!p) push(idx(rr, cc));
        else {
          if (colorOf(p) !== color) push(idx(rr, cc));
          break;
        }
        rr += dr;
        cc += dc;
      }
    }
  };

  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    const promoRow = color === 'w' ? 0 : 7;
    const one = idx(r + dir, c);
    if (inside(r + dir, c) && !state.board[one]) {
      if (r + dir === promoRow) for (const pr of ['Q', 'R', 'B', 'N'] as const) push(one, { promotion: pr });
      else push(one);
      const two = idx(r + 2 * dir, c);
      if (r === startRow && !state.board[two]) push(two);
    }
    for (const dc of [-1, 1]) {
      const rr = r + dir;
      const cc = c + dc;
      if (!inside(rr, cc)) continue;
      const t = idx(rr, cc);
      const target = state.board[t];
      if (target && colorOf(target) !== color) {
        if (rr === promoRow) for (const pr of ['Q', 'R', 'B', 'N'] as const) push(t, { promotion: pr });
        else push(t);
      } else if (!target && state.ep === t) {
        push(t, { enPassant: true });
      }
    }
  } else if (type === 'N') {
    for (const [dr, dc] of KNIGHT) {
      const rr = r + dr;
      const cc = c + dc;
      if (!inside(rr, cc)) continue;
      const p = state.board[idx(rr, cc)];
      if (!p || colorOf(p) !== color) push(idx(rr, cc));
    }
  } else if (type === 'B') slide(DIAG);
  else if (type === 'R') slide(ORTH);
  else if (type === 'Q') slide([...DIAG, ...ORTH]);
  else if (type === 'K') {
    for (const [dr, dc] of KING) {
      const rr = r + dr;
      const cc = c + dc;
      if (!inside(rr, cc)) continue;
      const p = state.board[idx(rr, cc)];
      if (!p || colorOf(p) !== color) push(idx(rr, cc));
    }
    // Castling
    const rights = color === 'w' ? { k: state.castling.wK, q: state.castling.wQ } : { k: state.castling.bK, q: state.castling.bQ };
    const row = color === 'w' ? 7 : 0;
    if (from === idx(row, 4)) {
      if (rights.k && !state.board[idx(row, 5)] && !state.board[idx(row, 6)] && state.board[idx(row, 7)] === color + 'R') {
        push(idx(row, 6), { castle: 'K' });
      }
      if (rights.q && !state.board[idx(row, 3)] && !state.board[idx(row, 2)] && !state.board[idx(row, 1)] && state.board[idx(row, 0)] === color + 'R') {
        push(idx(row, 2), { castle: 'Q' });
      }
    }
  }
  return moves;
}

/** Applies a move to a cloned board without validating turn/legality. */
function applyRaw(board: Board, move: ChessMove, piece: Piece): Board {
  const b = board.slice();
  const color = colorOf(piece);
  b[move.to] = move.promotion ? color + move.promotion : piece;
  b[move.from] = null;
  if (move.enPassant) {
    const [tr] = rc(move.to);
    const capDir = color === 'w' ? tr + 1 : tr - 1; // captured pawn row
    const [, tc] = rc(move.to);
    b[idx(capDir, tc)] = null;
  }
  if (move.castle) {
    const row = color === 'w' ? 7 : 0;
    if (move.castle === 'K') {
      b[idx(row, 5)] = b[idx(row, 7)];
      b[idx(row, 7)] = null;
    } else {
      b[idx(row, 3)] = b[idx(row, 0)];
      b[idx(row, 0)] = null;
    }
  }
  return b;
}

/** Fully legal moves for the piece on `from` (turn order enforced). */
export function legalMovesFrom(state: ChessState, from: number): ChessMove[] {
  const piece = state.board[from];
  if (!piece || colorOf(piece) !== state.turn) return [];
  const color = state.turn;
  return pseudoMoves(state, from).filter((m) => {
    if (m.castle) {
      if (inCheck(state, color)) return false;
      const row = color === 'w' ? 7 : 0;
      const mid = m.castle === 'K' ? idx(row, 5) : idx(row, 3);
      if (isAttacked(state.board, mid, other(color))) return false;
    }
    const after = applyRaw(state.board, m, piece);
    const ks = kingSquare(after, color);
    return ks >= 0 && !isAttacked(after, ks, other(color));
  });
}

export function allLegalMoves(state: ChessState, color: Color = state.turn): ChessMove[] {
  const moves: ChessMove[] = [];
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (p && colorOf(p) === color) {
      if (color === state.turn) moves.push(...legalMovesFrom(state, i));
      else {
        // For the non-turn side (search), emulate by temporary turn swap.
        const swapped: ChessState = { ...state, turn: color };
        moves.push(...legalMovesFrom(swapped, i));
      }
    }
  }
  return moves;
}

export function makeMove(state: ChessState, from: number, to: number, promotion?: ChessMove['promotion']): ChessState {
  if (state.outcome !== 'in_progress') return state;
  const legal = legalMovesFrom(state, from);
  const move = legal.find((m) => m.to === to && (m.promotion ?? undefined) === (promotion ?? undefined))
    ?? legal.find((m) => m.to === to && !m.promotion && !promotion);
  if (!move) return state;

  const piece = state.board[from] as Piece;
  const color = colorOf(piece);
  const captured = state.board[move.to];
  const board = applyRaw(state.board, move, piece);

  const castling = { ...state.castling };
  if (typeOf(piece) === 'K') {
    if (color === 'w') { castling.wK = false; castling.wQ = false; }
    else { castling.bK = false; castling.bQ = false; }
  }
  if (from === idx(7, 0) || move.to === idx(7, 0)) castling.wQ = false;
  if (from === idx(7, 7) || move.to === idx(7, 7)) castling.wK = false;
  if (from === idx(0, 0) || move.to === idx(0, 0)) castling.bQ = false;
  if (from === idx(0, 7) || move.to === idx(0, 7)) castling.bK = false;

  let ep: number | null = null;
  if (typeOf(piece) === 'P' && Math.abs(Math.floor(from / 8) - Math.floor(move.to / 8)) === 2) {
    ep = (from + move.to) / 2;
  }

  const halfmove = typeOf(piece) === 'P' || captured || move.enPassant ? 0 : state.halfmove + 1;

  const next: ChessState = {
    board,
    turn: other(color),
    castling,
    ep,
    halfmove,
    lastMove: move,
    outcome: 'in_progress',
    winner: null,
    check: false,
  };

  next.check = inCheck(next, next.turn);
  const replies = allLegalMoves(next, next.turn);
  if (replies.length === 0) {
    if (next.check) {
      next.outcome = 'checkmate';
      next.winner = color;
    } else {
      next.outcome = 'stalemate';
    }
  } else if (halfmove >= 100) {
    next.outcome = 'draw';
  }
  return next;
}

export function toAlgebraic(square: number): string {
  const [r, c] = rc(square);
  return 'abcdefgh'[c] + String(8 - r);
}
