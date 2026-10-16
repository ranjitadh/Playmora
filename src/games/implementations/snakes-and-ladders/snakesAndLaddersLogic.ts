/**
 * Pure Snakes and Ladders logic — 1 to 4 players, pass-and-play (or bots).
 * Squares 1-100. You must land exactly on 100 to win. No RN dependencies.
 */

/** Zero-based seat index. */
export type SLPlayer = number;
export type Outcome = 'in_progress' | 'win';

export interface SLState {
  positions: number[];
  current: SLPlayer;
  dice: number | null;
  outcome: Outcome;
  winner: SLPlayer | null;
  lastRoll: number | null;
}

export const LAST_SQUARE = 100;
export const DICE_MIN = 1;
export const DICE_MAX = 6;
export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 4;

export const LADDERS: Record<number, number> = {
  1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100,
};
export const SNAKES: Record<number, number> = {
  16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78,
};

export function clampPlayerCount(count: number): number {
  if (!Number.isFinite(count)) return 2;
  return Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Math.floor(count)));
}

export function createSnakesLadders(playerCount: number = 2): SLState {
  const count = clampPlayerCount(playerCount);
  return {
    positions: Array.from({ length: count }, () => 0),
    current: 0,
    dice: null,
    outcome: 'in_progress',
    winner: null,
    lastRoll: null,
  };
}

/** Applies a ladder or snake if the square has one. */
export function resolveSquare(square: number): number {
  if (LADDERS[square] !== undefined) return LADDERS[square];
  if (SNAKES[square] !== undefined) return SNAKES[square];
  return square;
}

export function rollDie(): number {
  return DICE_MIN + Math.floor(Math.random() * (DICE_MAX - DICE_MIN + 1));
}

/** Next seat, cycling through every player. */
export function nextPlayer(state: SLState): SLPlayer {
  const count = state.positions.length || 1;
  return (state.current + 1) % count;
}

export function applyRoll(state: SLState, value: number): SLState {
  if (state.outcome !== 'in_progress') return state;
  if (value < DICE_MIN || value > DICE_MAX) return state;
  if (state.positions.length === 0) return state;

  const from = state.positions[state.current] ?? 0;
  const target = from + value;
  if (target > LAST_SQUARE) {
    // Overshoot: stay put and pass the turn.
    return { ...state, dice: value, lastRoll: value, current: nextPlayer(state) };
  }

  const landed = resolveSquare(target);
  const positions = [...state.positions];
  positions[state.current] = landed;

  if (landed === LAST_SQUARE) {
    return { ...state, positions, dice: value, lastRoll: value, outcome: 'win', winner: state.current };
  }
  return { ...state, positions, dice: value, lastRoll: value, current: nextPlayer(state) };
}

/** Rolls the die and applies the result. */
export function takeTurn(state: SLState): SLState {
  return applyRoll(state, rollDie());
}

// ---------------------------------------------------------------------------
// Seat setup — at least one seat must always be human (bots never play each
// other), so the last remaining human cannot be switched to a bot.
// ---------------------------------------------------------------------------

export type PlayerType = 'human' | 'bot';

/** True when at least one seat is a human. */
export function hasHuman(types: PlayerType[]): boolean {
  return types.some((type) => type === 'human');
}

/** Resizes the seat list, keeping existing choices; never leaves every seat a bot. */
export function resizePlayerTypes(prev: PlayerType[], count: number): PlayerType[] {
  const next = Array.from({ length: clampPlayerCount(count) }, (_, i) => prev[i] ?? 'human');
  if (hasHuman(next)) return next;
  return next.map((type, i) => (i === 0 ? 'human' : type));
}

/**
 * Sets one seat's type. A bot can never take the final human seat, so the
 * change is rejected (the previous list is returned) when it would leave no human.
 */
export function setPlayerTypeAt(
  types: PlayerType[],
  index: number,
  type: PlayerType
): PlayerType[] {
  const next = types.map((value, i) => (i === index ? type : value));
  return hasHuman(next) ? next : types;
}

/** True when this seat is the only human left, so it may not become a bot. */
export function isLastHuman(types: PlayerType[], index: number): boolean {
  return types[index] === 'human' && types.filter((type) => type === 'human').length === 1;
}
