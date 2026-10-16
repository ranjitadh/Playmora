import {
  FINISH,
  LudoState,
  absoluteSquare,
  applyMove,
  createLudo,
  legalMoves,
  noMoves,
  passTurn,
} from '../src/games/implementations/ludo/ludoLogic';

function fresh(): LudoState {
  return createLudo();
}

function withDie(s: LudoState, die: number): LudoState {
  return { ...s, die };
}

describe('Ludo — setup', () => {
  it('starts two players with four tokens in base', () => {
    const s = fresh();
    expect(s.tokens).toEqual([
      [-1, -1, -1, -1],
      [-1, -1, -1, -1],
    ]);
    expect(s.current).toBe(0);
    expect(s.die).toBeNull();
  });

  it('offsets the two start squares by half a lap', () => {
    expect(absoluteSquare(0, 0)).toBe(0);
    expect(absoluteSquare(1, 0)).toBe(26);
  });
});

describe('Ludo — entering from base', () => {
  it('requires a six to enter', () => {
    expect(legalMoves(withDie(fresh(), 3))).toHaveLength(0);
    const six = legalMoves(withDie(fresh(), 6));
    expect(six).toHaveLength(4);
    expect(six.every((m) => m.from === -1 && m.to === 0)).toBe(true);
  });

  it('places a token on its start square', () => {
    const s = applyMove(withDie(fresh(), 6), 0);
    expect(s.tokens[0][0]).toBe(0);
  });
});

describe('Ludo — moving', () => {
  it('advances a token by the die value', () => {
    const s = fresh();
    s.tokens[0][0] = 5;
    const moved = applyMove(withDie(s, 4), 0);
    expect(moved.tokens[0][0]).toBe(9);
  });

  it('must land exactly on home', () => {
    const s = fresh();
    s.tokens[0][0] = FINISH - 2;
    expect(legalMoves(withDie(s, 3))).toHaveLength(0); // overshoot not allowed
    const moved = applyMove(withDie(s, 2), 0);
    expect(moved.tokens[0][0]).toBe(FINISH);
  });
});

describe('Ludo — capture', () => {
  it('sends an opponent on the same square back to base', () => {
    const s = fresh();
    s.tokens[0][0] = 3;
    s.tokens[1][0] = 31; // abs (26+31)%52 = 5
    const moved = applyMove(withDie(s, 2), 0); // white 3 -> 5 captures black
    expect(moved.tokens[0][0]).toBe(5);
    expect(moved.tokens[1][0]).toBe(-1);
  });

  it('grants an extra turn after a capture', () => {
    const s = fresh();
    s.tokens[0][0] = 3;
    s.tokens[1][0] = 31;
    const m = applyMove(withDie(s, 2), 0);
    expect(m.current).toBe(0);
  });
});

describe('Ludo — turns and win', () => {
  it('keeps the turn after rolling a six', () => {
    const s = fresh();
    s.tokens[0][0] = 2;
    const m = applyMove(withDie(s, 6), 0);
    expect(m.current).toBe(0);
  });

  it('passes the turn after a normal roll', () => {
    const s = fresh();
    s.tokens[0][0] = 2;
    const m = applyMove(withDie(s, 3), 0);
    expect(m.current).toBe(1);
  });

  it('wins when all four tokens reach home', () => {
    const s = fresh();
    s.tokens[0] = [FINISH, FINISH, FINISH, FINISH - 1];
    const m = applyMove(withDie(s, 1), 3);
    expect(m.tokens[0]).toEqual([FINISH, FINISH, FINISH, FINISH]);
    expect(m.outcome).toBe('win');
    expect(m.winner).toBe(0);
  });

  it('detects a roll with no legal move and can pass', () => {
    const s = fresh();
    s.tokens[0] = [-1, -1, -1, -1];
    expect(noMoves(withDie(s, 2))).toBe(true);
    expect(passTurn(withDie(s, 2)).current).toBe(1);
  });
});
