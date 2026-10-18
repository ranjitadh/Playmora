import {
  Board,
  ChessState,
  allLegalMoves,
  createChess,
  inCheck,
  kingSquare,
  legalMovesFrom,
  makeMove,
  outcomeReport,
} from '../src/games/implementations/chess/chessLogic';

describe('Chess — setup', () => {
  it('initialises the standard board', () => {
    const s = createChess();
    expect(s.board[0]).toBe('bR'); // a8
    expect(s.board[4]).toBe('bK'); // e8
    expect(s.board[59]).toBe('wQ'); // d1 (r7,c3? r7 is bottom rank white, c3 d1 → index 7*8+3=59)
    expect(s.board[60]).toBe('wK'); // e1
    expect(s.turn).toBe('w');
    expect(s.outcome).toBe('in_progress');
  });

  it('finds the king square', () => {
    const s = createChess();
    expect(kingSquare(s.board, 'w')).toBe(60);
    expect(kingSquare(s.board, 'b')).toBe(4);
  });
});

describe('Chess — moves', () => {
  it('allows a pawn to move forward two from start', () => {
    const s = createChess();
    const moves = legalMovesFrom(s, 52); // e2
    expect(moves.some((m) => m.to === 36)).toBe(true); // e4
  });

  it('allows capturing diagonally', () => {
    const s = createChess();
    // 1.e4 d5 2.exd5 Qxd5
    let m = makeMove(s, 52, 36); // e2-e4
    m = makeMove(m, 11, 27); // d7-d5
    m = makeMove(m, 36, 27); // exd5
    expect(m.board[27]).toBe('wP');
    expect(m.turn).toBe('b');
    m = makeMove(m, 3, 27); // Qxd5
    expect(m.board[27]).toBe('bQ');
    expect(m.outcome).toBe('in_progress');
  });

  it('recognises check', () => {
    const s = createChess();
    // Scholar's-like setup: e4 e5 Bc4 Bc5 Qh5 Nf6
    let m = makeMove(s, 52, 36);
    m = makeMove(m, 12, 28);
    m = makeMove(m, 61, 34);
    m = makeMove(m, 5, 26);
    m = makeMove(m, 59, 31);
    m = makeMove(m, 6, 21);
    m = makeMove(m, 31, 13); // Qh5xf7+ → black king on e8 index 4, f7 index 13, white queen attacks
    expect(m.turn).toBe('b');
    expect(inCheck(m, 'b')).toBe(true);
  });

  it('detects checkmate (Fool\'s mate)', () => {
    const s = createChess();
    let m = makeMove(s, 53, 45); // f2-f3
    m = makeMove(m, 12, 28); // e7-e5
    m = makeMove(m, 54, 38); // g2-g4
    m = makeMove(m, 3, 39); // d8-h4#
    expect(m.outcome).toBe('checkmate');
    expect(m.winner).toBe('b');
  });

  it('prevents moving into check', () => {
    const s = createChess();
    let m = makeMove(s, 52, 36);
    m = makeMove(m, 3, 19);
    // Black Queen on e5 attacks e2? e5 is index 28, e2 index 52? e5 → index 3*8+4=28, e2 → index 6*8+4=52; not directly line. Another simple: Qh5+ forces king move only.
    m = makeMove(m, 61, 34);
    m = makeMove(m, 11, 27);
    m = makeMove(m, 59, 31);
    m = makeMove(m, 6, 21);
    m = makeMove(m, 31, 13); // check
    const kingMoves = allLegalMoves(m, 'b');
    // Black king must move
    expect(kingMoves.every((mv) => mv.from === 4)).toBe(true);
  });
});

function customState(over: Partial<ChessState>): ChessState {
  return {
    board: Array(64).fill(null),
    turn: 'w',
    castling: { wK: false, wQ: false, bK: false, bQ: false },
    ep: null,
    halfmove: 0,
    lastMove: null,
    outcome: 'in_progress',
    winner: null,
    check: false,
    ...over,
  };
}

describe('Chess — terminal outcome reporting', () => {
  it('reports null while the game is in progress', () => {
    expect(outcomeReport(createChess())).toBeNull();
  });

  it("reports checkmate and its winner (Fool's mate)", () => {
    let m = createChess();
    m = makeMove(m, 53, 45); // f2-f3
    m = makeMove(m, 12, 28); // e7-e5
    m = makeMove(m, 54, 38); // g2-g4
    m = makeMove(m, 3, 39); // d8-h4#
    expect(outcomeReport(m)).toEqual({ outcome: 'checkmate', winner: 'b' });
  });

  it('reports stalemate with no winner', () => {
    const board: Board = Array(64).fill(null);
    board[0] = 'bK'; // a8
    board[17] = 'wQ'; // b6
    board[56] = 'wK'; // a1
    const s = customState({ board, turn: 'w' });
    const m = makeMove(s, 17, 10); // Qb6-c7 → black king a8 has no legal move and is not in check
    expect(m.outcome).toBe('stalemate');
    expect(outcomeReport(m)).toEqual({ outcome: 'stalemate', winner: null });
  });

  it('reports a draw by the 50-move rule', () => {
    const board: Board = Array(64).fill(null);
    board[60] = 'wK'; // e1
    board[4] = 'bK'; // e8
    board[48] = 'wR'; // a2
    const s = customState({ board, turn: 'w', halfmove: 99 });
    const m = makeMove(s, 48, 40); // Ra2-a3 (non-pawn, non-capture) → halfmove hits 100
    expect(m.outcome).toBe('draw');
    expect(outcomeReport(m)).toEqual({ outcome: 'draw', winner: null });
  });

  it('produces the terminal report exactly once (makeMove is a no-op after)', () => {
    let m = createChess();
    m = makeMove(m, 53, 45);
    m = makeMove(m, 12, 28);
    m = makeMove(m, 54, 38);
    m = makeMove(m, 3, 39); // mate
    expect(outcomeReport(m)).toEqual({ outcome: 'checkmate', winner: 'b' });
    const again = makeMove(m, 52, 44);
    expect(again).toBe(m);
    expect(outcomeReport(again)).toEqual({ outcome: 'checkmate', winner: 'b' });
  });
});
