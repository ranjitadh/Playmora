import {
  CheckerState,
  Sq,
  applyMove,
  countPieces,
  createCheckers,
  idx,
  legalMoves,
  movesFrom,
} from '../src/games/implementations/checkers/checkersLogic';

function emptyBoard(): Sq[] {
  return Array<Sq>(64).fill(null);
}

describe('Checkers — setup', () => {
  it('starts with twelve pieces each and red to move', () => {
    const s = createCheckers();
    expect(countPieces(s.board)).toEqual({ red: 12, black: 12 });
    expect(s.currentPlayer).toBe('red');
  });

  it('offers seven opening moves for red', () => {
    expect(legalMoves(createCheckers())).toHaveLength(7);
  });
});

describe('Checkers — movement rules', () => {
  it('moves a man only diagonally forward', () => {
    const s = createCheckers();
    const moves = movesFrom(s, idx(5, 0));
    expect(moves).toHaveLength(1);
    expect(moves[0].to).toBe(idx(4, 1));
  });

  it('lets a king move in both directions', () => {
    const board = emptyBoard();
    board[idx(4, 4)] = { color: 'red', king: true };
    const s: CheckerState = { board, currentPlayer: 'red', outcome: 'in_progress', winner: null, chainFrom: null };
    expect(movesFrom(s, idx(4, 4))).toHaveLength(4);
  });
});

describe('Checkers — captures', () => {
  it('jumps and removes an opponent piece', () => {
    const board = emptyBoard();
    board[idx(3, 2)] = { color: 'red', king: false };
    board[idx(2, 3)] = { color: 'black', king: false };
    const s: CheckerState = { board, currentPlayer: 'red', outcome: 'in_progress', winner: null, chainFrom: null };
    const moves = legalMoves(s);
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ from: idx(3, 2), to: idx(1, 4), capture: idx(2, 3) });

    const after = applyMove(s, idx(3, 2), idx(1, 4));
    expect(after.board[idx(2, 3)]).toBeNull();
    expect(after.board[idx(1, 4)]?.color).toBe('red');
  });

  it('chains a multi-jump with the same piece', () => {
    const board = emptyBoard();
    board[idx(6, 1)] = { color: 'red', king: false };
    board[idx(5, 2)] = { color: 'black', king: false };
    board[idx(3, 4)] = { color: 'black', king: false };
    const s: CheckerState = { board, currentPlayer: 'red', outcome: 'in_progress', winner: null, chainFrom: null };

    const after = applyMove(s, idx(6, 1), idx(4, 3));
    expect(after.chainFrom).toBe(idx(4, 3));
    expect(after.currentPlayer).toBe('red');
    const chain = legalMoves(after);
    expect(chain).toHaveLength(1);
    expect(chain[0].to).toBe(idx(2, 5));
  });
});

describe('Checkers — promotion and victory', () => {
  it('crowns a man that reaches the back row', () => {
    const board = emptyBoard();
    board[idx(1, 2)] = { color: 'red', king: false };
    const s: CheckerState = { board, currentPlayer: 'red', outcome: 'in_progress', winner: null, chainFrom: null };
    const after = applyMove(s, idx(1, 2), idx(0, 1));
    expect(after.board[idx(0, 1)]?.king).toBe(true);
  });

  it('wins when the opponent has no legal moves', () => {
    const board = emptyBoard();
    board[idx(7, 6)] = { color: 'red', king: false };
    board[idx(0, 0)] = { color: 'black', king: false };
    board[idx(1, 1)] = { color: 'red', king: false };
    board[idx(2, 2)] = { color: 'red', king: false };
    const s: CheckerState = { board, currentPlayer: 'red', outcome: 'in_progress', winner: null, chainFrom: null };
    const after = applyMove(s, idx(7, 6), idx(6, 5));
    expect(after.outcome).toBe('win');
    expect(after.winner).toBe('red');
  });
});
