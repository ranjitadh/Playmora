import {
  LAST_SQUARE,
  PlayerType,
  SLState,
  applyRoll,
  clampPlayerCount,
  createSnakesLadders,
  hasHuman,
  isLastHuman,
  resolveSquare,
  resizePlayerTypes,
  setPlayerTypeAt,
  takeTurn,
} from '../src/games/implementations/snakes-and-ladders/snakesAndLaddersLogic';

describe('Snakes and Ladders — setup', () => {
  it('starts both players off the board', () => {
    const s = createSnakesLadders();
    expect(s.positions).toEqual([0, 0]);
    expect(s.current).toBe(0);
    expect(s.outcome).toBe('in_progress');
  });

  it('resolves ladders and snakes', () => {
    expect(resolveSquare(1)).toBe(38);
    expect(resolveSquare(16)).toBe(6);
    expect(resolveSquare(50)).toBe(50);
  });
});

describe('Snakes and Ladders — rolling', () => {
  it('moves the current player and passes the turn', () => {
    const s = applyRoll(createSnakesLadders(), 3);
    expect(s.positions[0]).toBe(3);
    expect(s.current).toBe(1);
  });

  it('climbs a ladder', () => {
    const s = applyRoll(createSnakesLadders(), 1); // 0 -> 1 -> ladder to 38
    expect(s.positions[0]).toBe(38);
  });

  it('slides down a snake', () => {
    const start: SLState = { positions: [10, 0], current: 0, dice: null, outcome: 'in_progress', winner: null, lastRoll: null };
    const s = applyRoll(start, 6); // 10 -> 16 -> snake to 6
    expect(s.positions[0]).toBe(6);
  });

  it('must land exactly on the final square', () => {
    const start: SLState = { positions: [97, 0], current: 0, dice: null, outcome: 'in_progress', winner: null, lastRoll: null };
    const s = applyRoll(start, 5); // 102 -> overshoot, stay on 97
    expect(s.positions[0]).toBe(97);
    expect(s.current).toBe(1);
  });

  it('wins by landing on square 100', () => {
    const start: SLState = { positions: [96, 0], current: 0, dice: null, outcome: 'in_progress', winner: null, lastRoll: null };
    const s = applyRoll(start, 4);
    expect(s.positions[0]).toBe(LAST_SQUARE);
    expect(s.outcome).toBe('win');
    expect(s.winner).toBe(0);
  });

  it('rejects out-of-range dice and moves after the game ends', () => {
    const s = createSnakesLadders();
    expect(applyRoll(s, 0)).toBe(s);
    expect(applyRoll(s, 7)).toBe(s);
    const won = applyRoll({ ...start(), positions: [96, 0] }, 4);
    expect(applyRoll(won, 3)).toBe(won);
  });

  it('takeTurn produces a legal move', () => {
    const s = takeTurn(createSnakesLadders());
    expect(s.dice).toBeGreaterThanOrEqual(1);
    expect(s.dice).toBeLessThanOrEqual(6);
  });
});

describe('Snakes and Ladders — 1 to 4 players', () => {
  it('defaults to two players and clamps the count', () => {
    expect(createSnakesLadders().positions).toHaveLength(2);
    expect(clampPlayerCount(1)).toBe(1);
    expect(clampPlayerCount(4)).toBe(4);
    expect(clampPlayerCount(9)).toBe(4);
    expect(clampPlayerCount(0)).toBe(1);
    expect(clampPlayerCount(Number.NaN)).toBe(2);
    expect(createSnakesLadders(3).positions).toEqual([0, 0, 0]);
  });

  it('cycles the turn through every seat', () => {
    let s = createSnakesLadders(4);
    expect(s.current).toBe(0);
    for (const expected of [1, 2, 3, 0, 1]) {
      s = applyRoll(s, 1);
      expect(s.current).toBe(expected);
    }
    expect(s.positions).toHaveLength(4);
  });

  it('keeps a single player on turn', () => {
    let s = createSnakesLadders(1);
    s = applyRoll(s, 3);
    expect(s.positions).toEqual([3]);
    expect(s.current).toBe(0);
  });

  it('passes the turn on an overshoot regardless of player count', () => {
    const s = applyRoll(
      { ...start(), positions: [97, 97, 97, 97], current: 2 },
      6
    );
    expect(s.positions).toEqual([97, 97, 97, 97]);
    expect(s.current).toBe(3);
  });

  it('awards the win to the seat that reached the house', () => {
    const s = applyRoll({ ...start(), positions: [0, 96, 0, 0], current: 1 }, 4);
    expect(s.outcome).toBe('win');
    expect(s.winner).toBe(1);
    expect(s.positions[1]).toBe(LAST_SQUARE);
  });
});

describe('Snakes and Ladders — a human seat is compulsory', () => {
  const types = (...t: PlayerType[]): PlayerType[] => t;

  it('refuses to turn the last human into a bot', () => {
    const oneHuman = types('human', 'bot');
    expect(setPlayerTypeAt(oneHuman, 0, 'bot')).toEqual(oneHuman);
    expect(isLastHuman(oneHuman, 0)).toBe(true);
    expect(isLastHuman(oneHuman, 1)).toBe(false);
  });

  it('allows switching a seat to bot when another human remains', () => {
    const twoHumans = types('human', 'human');
    const next = setPlayerTypeAt(twoHumans, 0, 'bot');
    expect(next).toEqual(['bot', 'human']);
    expect(hasHuman(next)).toBe(true);
  });

  it('can still set a seat back to human and then bot again', () => {
    const mixed = types('bot', 'human', 'bot');
    expect(setPlayerTypeAt(mixed, 1, 'bot')).toEqual(mixed);
    expect(setPlayerTypeAt(mixed, 1, 'human')).toEqual(mixed);
  });

  it('never leaves an all-bot list after resizing down', () => {
    const bots = types('human', 'bot', 'bot');
    // Keep seat 0 (human) when shrinking to one seat.
    expect(resizePlayerTypes(bots, 1)).toEqual(['human']);
    // If the surviving seat would have been a bot, it is forced back to human.
    const trailingHuman = types('bot', 'human');
    expect(resizePlayerTypes(trailingHuman, 1)).toEqual(['human']);
  });

  it('detects whether any human is present', () => {
    expect(hasHuman(types('bot', 'bot'))).toBe(false);
    expect(hasHuman(types('bot', 'human'))).toBe(true);
    expect(hasHuman([])).toBe(false);
  });
});

function start(): SLState {
  return { positions: [96, 0], current: 0, dice: null, outcome: 'in_progress', winner: null, lastRoll: null };
}
