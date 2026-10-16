import {
  MancalaState,
  createMancala,
  opposite,
  playMancala,
} from '../src/games/implementations/mancala/mancalaLogic';

const SOUTH_STORE = 6;
const NORTH_STORE = 13;

describe('Mancala — setup', () => {
  it('starts with four stones per pit and south to move', () => {
    const s = createMancala();
    expect(s.pits).toHaveLength(14);
    expect(s.pits[0]).toBe(4);
    expect(s.pits[SOUTH_STORE]).toBe(0);
    expect(s.pits[NORTH_STORE]).toBe(0);
    expect(s.currentPlayer).toBe('south');
  });
});

describe('Mancala — sowing', () => {
  it('sows stones counter-clockwise and passes the turn', () => {
    const s = playMancala(createMancala(), 0);
    expect(s.pits[0]).toBe(0);
    expect(s.pits.slice(1, 5)).toEqual([5, 5, 5, 5]);
    expect(s.currentPlayer).toBe('north');
  });

  it('grants a free turn when the last stone lands in your store', () => {
    const s = playMancala(createMancala(), 2); // 4 stones -> pits 3,4,5, store 6
    expect(s.pits[SOUTH_STORE]).toBe(1);
    expect(s.currentPlayer).toBe('south');
  });

  it('rejects moves from the opponent side or empty pits', () => {
    const s = createMancala();
    expect(playMancala(s, 8)).toBe(s);
  });
});

describe('Mancala — captures', () => {
  it('captures the opposite pit when landing on an empty own pit', () => {
    const pits = Array(14).fill(0);
    pits[2] = 3; // sow into 3,4,5 then capture at 5
    pits[8] = 1; // keep north non-empty so the game continues
    pits[7] = 5; // opposite of 5
    const s: MancalaState = { pits, currentPlayer: 'south', outcome: 'in_progress', winner: null, lastPit: null };
    const after = playMancala(s, 2);
    expect(after.pits[5]).toBe(0);
    expect(after.pits[7]).toBe(0);
    expect(after.pits[SOUTH_STORE]).toBe(6); // 1 (own) + 5 (captured)
  });

  it('maps opposite pits correctly', () => {
    expect(opposite(0)).toBe(12);
    expect(opposite(5)).toBe(7);
    expect(opposite(7)).toBe(5);
  });
});

describe('Mancala — end of game', () => {
  it('sweeps the board and declares the store leader the winner', () => {
    const pits = Array(14).fill(0);
    pits[5] = 1; // south's only stone -> lands in store, ending the game
    pits[7] = 2; // north's remaining stones
    const s: MancalaState = { pits, currentPlayer: 'south', outcome: 'in_progress', winner: null, lastPit: null };
    const after = playMancala(s, 5);
    expect(after.outcome).toBe('win');
    expect(after.winner).toBe('north');
    expect(after.pits[SOUTH_STORE]).toBe(1);
    expect(after.pits[NORTH_STORE]).toBe(2);
  });
});
