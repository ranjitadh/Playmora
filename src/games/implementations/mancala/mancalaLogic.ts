/**
 * Pure Mancala (Kalah) logic — two players, pass-and-play.
 *
 * 14 slots indexed 0-13 in sowing order (counter-clockwise):
 *   south pits 0-5, south store 6, north pits 7-12, north store 13.
 * Both players sow in increasing index order, skipping the opponent's store.
 * No RN dependencies.
 */

export type MSide = 'south' | 'north';
export type Outcome = 'in_progress' | 'win' | 'draw';

export interface MancalaState {
  pits: number[];
  currentPlayer: MSide;
  outcome: Outcome;
  winner: MSide | null;
  lastPit: number | null;
}

export const PITS = 14;
export const STONES_PER_PIT = 4;
export const SOUTH_STORE = 6;
export const NORTH_STORE = 13;
export const FIRST: MSide = 'south';

function other(p: MSide): MSide {
  return p === 'south' ? 'north' : 'south';
}
export function storeOf(side: MSide): number {
  return side === 'south' ? SOUTH_STORE : NORTH_STORE;
}
export function ownPits(side: MSide): number[] {
  return side === 'south' ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12];
}
function isOwnPit(side: MSide, i: number): boolean {
  return side === 'south' ? i >= 0 && i <= 5 : i >= 7 && i <= 12;
}
/** Opposite pit across the board (valid only for the 12 playing pits). */
export function opposite(i: number): number {
  return 12 - i;
}

export function createMancala(): MancalaState {
  const pits = Array<number>(PITS).fill(0);
  for (let i = 0; i < PITS; i++) {
    if (i === SOUTH_STORE || i === NORTH_STORE) continue;
    pits[i] = STONES_PER_PIT;
  }
  return { pits, currentPlayer: FIRST, outcome: 'in_progress', winner: null, lastPit: null };
}

function sidePitsEmpty(pits: number[], side: MSide): boolean {
  return ownPits(side).every((i) => pits[i] === 0);
}

function sweep(pits: number[]): void {
  for (const i of ownPits('south')) {
    pits[SOUTH_STORE] += pits[i];
    pits[i] = 0;
  }
  for (const i of ownPits('north')) {
    pits[NORTH_STORE] += pits[i];
    pits[i] = 0;
  }
}

export function playMancala(state: MancalaState, pit: number): MancalaState {
  if (state.outcome !== 'in_progress') return state;
  if (!ownPits(state.currentPlayer).includes(pit)) return state;
  if (state.pits[pit] === 0) return state;

  const pits = state.pits.slice();
  let stones = pits[pit];
  pits[pit] = 0;

  const oppStore = storeOf(other(state.currentPlayer));
  let pos = pit;
  while (stones > 0) {
    pos = (pos + 1) % PITS;
    if (pos === oppStore) continue; // skip opponent's store
    pits[pos] += 1;
    stones -= 1;
  }

  const ownStore = storeOf(state.currentPlayer);
  const freeTurn = pos === ownStore;

  // Capture: landed on an empty own pit that now holds exactly one stone.
  if (!freeTurn && isOwnPit(state.currentPlayer, pos) && pits[pos] === 1) {
    const oppPit = opposite(pos);
    const captured = pits[oppPit];
    if (captured > 0) {
      pits[ownStore] += pits[pos] + captured;
      pits[pos] = 0;
      pits[oppPit] = 0;
    }
  }

  // End of game: one side has no stones left in its pits.
  if (sidePitsEmpty(pits, 'south') || sidePitsEmpty(pits, 'north')) {
    sweep(pits);
    const winner = pits[SOUTH_STORE] === pits[NORTH_STORE] ? null : pits[SOUTH_STORE] > pits[NORTH_STORE] ? 'south' : 'north';
    return {
      pits,
      currentPlayer: state.currentPlayer,
      outcome: pits[SOUTH_STORE] === pits[NORTH_STORE] ? 'draw' : 'win',
      winner,
      lastPit: pos,
    };
  }

  return {
    pits,
    currentPlayer: freeTurn ? state.currentPlayer : other(state.currentPlayer),
    outcome: 'in_progress',
    winner: null,
    lastPit: pos,
  };
}
