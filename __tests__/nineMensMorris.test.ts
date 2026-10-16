import {
  ADJACENCY,
  MEN_EACH,
  MorrisState,
  createMorris,
  formsMill,
  isInMill,
  moveMorris,
  placeMorris,
  removeMorris,
} from '../src/games/implementations/nine-mens-morris/nineMensMorrisLogic';

describe("Nine Men's Morris — setup", () => {
  it('starts empty with white to place', () => {
    const s = createMorris();
    expect(s.board.every((p) => p === null)).toBe(true);
    expect(s.currentPlayer).toBe('white');
    expect(s.phase).toBe('placing');
  });

  it('connects edge midpoints across rings', () => {
    expect(ADJACENCY[1].sort((a, b) => a - b)).toEqual([0, 2, 9]);
  });

  it('recognises a mill', () => {
    const board = Array(24).fill(null);
    board[0] = 'white';
    board[1] = 'white';
    board[2] = 'white';
    expect(formsMill(board, 1, 'white')).toBe(true);
    expect(formsMill(board, 3, 'white')).toBe(false);
  });
});

describe("Nine Men's Morris — placing and mills", () => {
  it('places a man and passes the turn', () => {
    const s = placeMorris(createMorris(), 0);
    expect(s.board[0]).toBe('white');
    expect(s.currentPlayer).toBe('black');
    expect(s.placed.white).toBe(1);
  });

  it('forming a mill grants a removal and keeps the turn', () => {
    let s = createMorris();
    s = placeMorris(s, 0); // white
    s = placeMorris(s, 3); // black
    s = placeMorris(s, 1); // white
    s = placeMorris(s, 4); // black
    s = placeMorris(s, 2); // white -> mill
    expect(s.pendingRemoval).toBe(true);
    expect(s.currentPlayer).toBe('white');

    const after = removeMorris(s, 3);
    expect(after.board[3]).toBeNull();
    expect(after.pendingRemoval).toBe(false);
    expect(after.currentPlayer).toBe('black');
  });

  it('protects mill men unless every enemy man is in a mill', () => {
    const board = Array(24).fill(null);
    board[0] = 'black';
    board[1] = 'black';
    board[2] = 'black';
    board[3] = 'black';
    const s: MorrisState = { ...createMorris(), board, pendingRemoval: true, currentPlayer: 'white' };
    expect(isInMill(board, 0)).toBe(true);
    expect(removeMorris(s, 0)).toBe(s); // protected
    expect(removeMorris(s, 3).board[3]).toBeNull(); // allowed
  });

  it('switches to the moving phase after all men are placed', () => {
    const s: MorrisState = {
      ...createMorris(),
      placed: { white: MEN_EACH - 1, black: MEN_EACH - 1 },
      onBoard: { white: 8, black: 8 },
    };
    const afterWhite = placeMorris(s, 20);
    expect(afterWhite.phase).toBe('placing');
    const afterBlack = placeMorris(afterWhite, 21);
    expect(afterBlack.phase).toBe('moving');
  });
});

describe("Nine Men's Morris — moving", () => {
  it('moves along a line, not through space', () => {
    const board = Array(24).fill(null);
    board[0] = 'white';
    const s: MorrisState = { ...createMorris(), board, phase: 'moving', onBoard: { white: 1, black: 0 } };
    expect(moveMorris(s, 0, 10)).toBe(s); // not adjacent
    const ok = moveMorris(s, 0, 1);
    expect(ok.board[0]).toBeNull();
    expect(ok.board[1]).toBe('white');
  });

  it('flies when down to three men', () => {
    const board = Array(24).fill(null);
    board[0] = 'white';
    board[5] = 'white';
    board[7] = 'white';
    const s: MorrisState = { ...createMorris(), board, phase: 'moving', onBoard: { white: 3, black: 6 } };
    const ok = moveMorris(s, 0, 10);
    expect(ok.board[10]).toBe('white');
  });
});

describe("Nine Men's Morris — victory", () => {
  it('wins by reducing the opponent to two men', () => {
    const board = Array(24).fill(null);
    board[0] = 'black';
    board[1] = 'black';
    board[3] = 'black';
    const s: MorrisState = {
      ...createMorris(),
      board,
      phase: 'moving',
      placed: { white: MEN_EACH, black: MEN_EACH },
      onBoard: { white: 9, black: 3 },
      pendingRemoval: true,
      currentPlayer: 'white',
    };
    const after = removeMorris(s, 1);
    expect(after.outcome).toBe('win');
    expect(after.winner).toBe('white');
  });
});
