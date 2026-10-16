import {
  BackgammonState,
  applyMove,
  createBackgammon,
  destination,
  legalMoves,
  playerCanBearOff,
  setDice,
} from '../src/games/implementations/backgammon/backgammonLogic';

function fresh(): BackgammonState {
  return createBackgammon();
}

describe('Backgammon — setup', () => {
  it('lays out the standard starting position', () => {
    const s = fresh();
    expect(s.points[23]).toBe(2);
    expect(s.points[12]).toBe(5);
    expect(s.points[0]).toBe(-2);
    expect(s.points[18]).toBe(-5);
    expect(s.bar).toEqual([0, 0]);
    expect(s.off).toEqual([0, 0]);
    expect(s.turn).toBe(0);
  });
});

describe('Backgammon — dice', () => {
  it('gives four moves on doubles', () => {
    const s = setDice(fresh(), 4, 4);
    expect(s.dice).toEqual([4, 4, 4, 4]);
  });

  it('gives two moves otherwise', () => {
    const s = setDice(fresh(), 3, 5);
    expect(s.dice).toEqual([3, 5]);
  });
});

describe('Backgammon — movement', () => {
  it('moves white toward its home board', () => {
    const s = setDice(fresh(), 3, 2);
    expect(destination(s, 0, 5, 3)).toBe(2); // 6-point back three to the 3-point
  });

  it('blocks a point held by two or more enemy checkers', () => {
    const s = fresh();
    s.points[2] = -2; // black makes the 3-point
    expect(destination(s, 0, 5, 3)).toBeNull();
  });

  it('re-enters from the bar on the enemy home board', () => {
    const s = fresh();
    s.points = Array<number>(24).fill(0);
    s.bar = [1, 0];
    expect(destination(s, 0, 'bar', 1)).toBe(23); // white enters on the 24-point
    expect(destination(s, 0, 'bar', 6)).toBe(18); // ...or the 19-point
  });

  it('hits a lone enemy checker and sends it to the bar', () => {
    const s = fresh();
    s.points = Array<number>(24).fill(0);
    s.points[5] = 1;
    s.points[2] = -1;
    s.bar = [0, 0];
    s.dice = [3];
    const moved = applyMove(s, { from: 5, to: 2, die: 3 });
    expect(moved.points[2]).toBe(1);
    expect(moved.bar[1]).toBe(1);
  });
});

describe('Backgammon — bearing off', () => {
  it('only bears off once every checker is home', () => {
    const s = fresh();
    expect(playerCanBearOff(s, 0)).toBe(false);
  });

  it('bears off with an exact die', () => {
    const s = fresh();
    s.points = Array<number>(24).fill(0);
    s.points[0] = 15;
    s.dice = [1];
    expect(playerCanBearOff(s, 0)).toBe(true);
    expect(destination(s, 0, 0, 1)).toBe('off');
  });

  it('bears off with a larger die when no checker is further back', () => {
    const s = fresh();
    s.points = Array<number>(24).fill(0);
    s.points[0] = 15;
    s.dice = [6];
    expect(destination(s, 0, 0, 6)).toBe('off');
  });

  it('wins when all fifteen checkers are off', () => {
    const s = fresh();
    s.points = Array<number>(24).fill(0);
    s.off = [14, 0];
    s.points[0] = 1;
    s.dice = [1];
    const moved = applyMove(s, { from: 0, to: 'off', die: 1 });
    expect(moved.off[0]).toBe(15);
    expect(moved.outcome).toBe('win');
    expect(moved.winner).toBe(0);
  });
});

describe('Backgammon — legal moves', () => {
  it('produces moves for the current roll', () => {
    const s = setDice(fresh(), 6, 1);
    const moves = legalMoves(s);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.die === 6 || m.die === 1)).toBe(true);
  });
});
