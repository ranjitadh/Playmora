/**
 * Pure Backgammon logic — two players, pass-and-play.
 *
 * 24 points indexed 0-23 (= points 1-24). points[i] > 0 counts of player 0
 * ("white"), < 0 counts of player 1 ("black"). White moves from index 23
 * toward 0 (home board 0-5) and bears off past 0; black moves from 0 toward
 * 23 (home board 18-23) and bears off past 23. No RN dependencies.
 */

export type BPlayer = 0 | 1;
export type Source = number | 'bar';

export interface BackgammonState {
  points: number[];
  bar: [number, number];
  off: [number, number];
  turn: BPlayer;
  dice: number[]; // remaining dice this turn
  rolled: number[]; // the original roll (for display)
  outcome: 'in_progress' | 'win';
  winner: BPlayer | null;
}

export const POINTS = 24;
export const CHECKERS_EACH = 15;
export const HOME: [number, number] = [0, 1];
const DIR: [number, number] = [-1, 1]; // white decreases index, black increases

const other = (p: BPlayer): BPlayer => (p === 0 ? 1 : 0);

export function createBackgammon(): BackgammonState {
  const points = Array<number>(POINTS).fill(0);
  // White: 2 on 24 (idx23), 5 on 13 (idx12), 3 on 8 (idx7), 5 on 6 (idx5)
  points[23] = 2;
  points[12] = 5;
  points[7] = 3;
  points[5] = 5;
  // Black: mirrored
  points[0] = -2;
  points[11] = -5;
  points[16] = -3;
  points[18] = -5;
  return { points, bar: [0, 0], off: [0, 0], turn: 0, dice: [], rolled: [], outcome: 'in_progress', winner: null };
}

export function rollDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}

export function rollDice(): [number, number] {
  return [rollDie(), rollDie()];
}

/** Set the dice for the current turn. Doubles yield four moves. */
export function setDice(state: BackgammonState, d1: number, d2: number): BackgammonState {
  if (state.outcome !== 'in_progress') return state;
  const rolled = [d1, d2];
  const dice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
  return { ...state, rolled, dice };
}

/** Roll randomly for the current turn. */
export function roll(state: BackgammonState): BackgammonState {
  const [d1, d2] = rollDice();
  return setDice(state, d1, d2);
}

export function countOn(state: BackgammonState, player: BPlayer, idx: number): number {
  const v = state.points[idx];
  return player === 0 ? Math.max(0, v) : Math.max(0, -v);
}

export function isBlocked(state: BackgammonState, idx: number, player: BPlayer): boolean {
  return countOn(state, other(player), idx) >= 2;
}

export function playerCanBearOff(state: BackgammonState, player: BPlayer): boolean {
  if (state.bar[player] > 0) return false;
  const [lo, hi] = player === 0 ? [0, 5] : [18, 23];
  let inHome = 0;
  for (let i = 0; i < POINTS; i++) inHome += countOn(state, player, i);
  let homeCount = 0;
  for (let i = lo; i <= hi; i++) homeCount += countOn(state, player, i);
  return homeCount === inHome;
}

/** Every occupied source for the current player (bar first if present). */
export function sources(state: BackgammonState, player: BPlayer = state.turn): Source[] {
  if (state.bar[player] > 0) return ['bar'];
  const s: Source[] = [];
  for (let i = 0; i < POINTS; i++) if (countOn(state, player, i) > 0) s.push(i);
  return s;
}

/** Destination for playing `die` from `from`, or null if illegal. */
export function destination(state: BackgammonState, player: BPlayer, from: Source, die: number): number | 'off' | null {
  if (from === 'bar') {
    const entry = player === 0 ? POINTS - die : die - 1; // white enters on points 19-24, black on 1-6
    if (entry < 0 || entry >= POINTS) return null;
    return isBlocked(state, entry, player) ? null : entry;
  }

  const dir = DIR[player];
  const to = from + dir * die;
  if (to >= 0 && to < POINTS) {
    if (isBlocked(state, to, player)) return null;
    // A destination is only reachable if the checker can travel there; in
    // backgammon checkers jump, so intermediate points do not block.
    return to;
  }

  // Bearing off.
  if (!playerCanBearOff(state, player)) return null;
  if (player === 0) {
    const need = from + 1; // point number 1..6
    if (die === need) return 'off';
    if (die > need) {
      for (let i = from + 1; i <= 5; i++) if (countOn(state, 0, i) > 0) return null;
      return 'off';
    }
    return null;
  } else {
    const need = POINTS - from; // 25 - point
    if (die === need) return 'off';
    if (die > need) {
      for (let i = 18; i < from; i++) if (countOn(state, 1, i) > 0) return null;
      return 'off';
    }
    return null;
  }
}

export interface BMove {
  from: Source;
  to: number | 'off';
  die: number;
}

/** All legal single-die moves available to the current player. */
export function legalMoves(state: BackgammonState): BMove[] {
  if (state.outcome !== 'in_progress') return [];
  const player = state.turn;
  const moves: BMove[] = [];
  const seen = new Set<number>();
  for (const die of state.dice) {
    if (seen.has(die)) continue;
    seen.add(die);
    for (const from of sources(state, player)) {
      const to = destination(state, player, from, die);
      if (to !== null) moves.push({ from, to, die });
    }
  }
  return moves;
}

/** Apply one single-die move, consuming that die. */
export function applyMove(state: BackgammonState, move: BMove): BackgammonState {
  if (state.outcome !== 'in_progress') return state;
  const player = state.turn;
  const dieIndex = state.dice.indexOf(move.die);
  if (dieIndex === -1) return state;
  const valid = destination(state, player, move.from, move.die);
  if (valid === null || valid !== move.to) return state;

  const points = state.points.slice();
  const bar: [number, number] = [...state.bar] as [number, number];
  const off: [number, number] = [...state.off] as [number, number];
  const sign = player === 0 ? 1 : -1;

  if (move.from === 'bar') {
    bar[player] -= 1;
  } else {
    points[move.from] -= sign;
  }

  if (move.to === 'off') {
    off[player] += 1;
  } else {
    if (countOn({ ...state, points }, other(player), move.to) === 1) {
      // Hit the blot.
      points[move.to] = 0;
      bar[other(player)] += 1;
    }
    points[move.to] += sign;
  }

  const dice = state.dice.slice();
  dice.splice(dieIndex, 1);

  const won = off[player] === CHECKERS_EACH;
  return {
    ...state,
    points,
    bar,
    off,
    dice,
    outcome: won ? 'win' : 'in_progress',
    winner: won ? player : null,
  };
}

/** Ends the current player's turn and hands over to the opponent. */
export function endTurn(state: BackgammonState): BackgammonState {
  if (state.outcome !== 'in_progress') return state;
  return { ...state, turn: other(state.turn), dice: [], rolled: [] };
}

/** True when the player has no legal move with their remaining dice. */
export function noMoves(state: BackgammonState): boolean {
  return state.outcome === 'in_progress' && state.dice.length > 0 && legalMoves(state).length === 0;
}
