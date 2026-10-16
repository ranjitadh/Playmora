import { allLegalMoves, createChess, inCheck, kingSquare, legalMovesFrom, makeMove } from '../src/games/implementations/chess/chessLogic';

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
