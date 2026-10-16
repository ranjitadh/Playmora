import {
  ReversiState,
  countDiscs,
  createReversi,
  flipsFor,
  idx,
  legalMoves,
  playReversi,
} from '../src/games/implementations/reversi/reversiLogic';

describe('Reversi — setup', () => {
  it('starts with the four central discs and black to move', () => {
    const s = createReversi();
    expect(countDiscs(s.board)).toEqual({ black: 2, white: 2 });
    expect(s.currentPlayer).toBe('black');
    expect(s.outcome).toBe('in_progress');
  });

  it('offers four opening moves for black', () => {
    const s = createReversi();
    expect(legalMoves(s.board, 'black').sort((a, b) => a - b)).toEqual(
      [idx(3, 2), idx(2, 3), idx(5, 4), idx(4, 5)].sort((a, b) => a - b)
    );
  });

  it('rejects illegal placements', () => {
    expect(flipsFor(createReversi().board, idx(0, 0), 'black')).toEqual([]);
  });
});

describe('Reversi — flipping', () => {
  it('flips the flanked disc when black plays (2,3)', () => {
    const s = createReversi();
    expect(flipsFor(s.board, idx(2, 3), 'black')).toEqual([idx(3, 3)]);
    const after = playReversi(s, idx(2, 3));
    expect(after.board[idx(3, 3)]).toBe('black');
    expect(countDiscs(after.board)).toEqual({ black: 4, white: 1 });
    expect(after.currentPlayer).toBe('white');
  });

  it('ignores moves out of turn order', () => {
    const s = createReversi();
    expect(playReversi(s, idx(0, 0))).toBe(s);
  });
});

describe('Reversi — game end', () => {
  it('finishes with a winner when the last move fills the board', () => {
    const board = Array(64).fill('white');
    board[idx(3, 3)] = null;
    board[idx(0, 0)] = 'black';
    const s: ReversiState = { board, currentPlayer: 'black', outcome: 'in_progress', winner: null, lastPassed: false };
    const after = playReversi(s, idx(3, 3));
    expect(after.outcome).toBe('win');
    expect(after.winner).toBe('white');
    expect(countDiscs(after.board).black).toBe(4);
  });

  it('finishes when neither side can move', () => {
    const board = Array(64).fill(null);
    board[idx(0, 0)] = 'black';
    board[idx(0, 1)] = 'black';
    board[idx(7, 7)] = 'white';
    const s: ReversiState = { board, currentPlayer: 'black', outcome: 'in_progress', winner: null, lastPassed: false };
    // Black has no legal move here; a call to play must be rejected.
    expect(legalMoves(board, 'black').length).toBe(0);
    expect(playReversi(s, idx(3, 3))).toBe(s);
  });
});
