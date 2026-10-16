/**
 * Pure Ludo logic — two players, pass-and-play.
 *
 * Each player has four tokens. A token is either in base (-1) or on its own
 * linear path: progress 0-51 is the shared 52-square main track, 52-56 is the
 * five-square home column, and FINISH (57) is home. Player 1's main track is
 * offset half a lap so the two start squares are opposite each other.
 * No RN dependencies.
 */

export type LPlayer = 0 | 1;

export interface LudoState {
  tokens: number[][]; // [player][token] = progress (-1 base .. FINISH home)
  current: LPlayer;
  die: number | null;
  outcome: 'in_progress' | 'win';
  winner: LPlayer | null;
}

export interface LudoMove {
  token: number;
  from: number;
  to: number;
  captures: boolean;
}

export const TOKENS = 4;
export const MAIN = 52;
export const HOME = 5;
export const FINISH = MAIN + HOME; // 57
export const START_OFFSET: [number, number] = [0, 26];

const other = (p: LPlayer): LPlayer => (p === 0 ? 1 : 0);

export function createLudo(): LudoState {
  return {
    tokens: [Array<number>(TOKENS).fill(-1), Array<number>(TOKENS).fill(-1)],
    current: 0,
    die: null,
    outcome: 'in_progress',
    winner: null,
  };
}

export function rollDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}

/** Absolute main-track square for a token on the shared loop. */
export function absoluteSquare(player: LPlayer, progress: number): number | null {
  if (progress < 0 || progress >= MAIN) return null;
  return (START_OFFSET[player] + progress) % MAIN;
}

/** List every legal move for the current player with the current die. */
export function legalMoves(state: LudoState): LudoMove[] {
  if (state.outcome !== 'in_progress' || state.die === null) return [];
  const player = state.current;
  const die = state.die;
  const moves: LudoMove[] = [];

  for (let i = 0; i < TOKENS; i++) {
    const p = state.tokens[player][i];
    if (p === -1) {
      if (die === 6) moves.push({ token: i, from: -1, to: 0, captures: willCapture(state, player, 0) });
      continue;
    }
    const np = p + die;
    if (np <= FINISH) moves.push({ token: i, from: p, to: np, captures: np < MAIN && willCapture(state, player, np) });
  }
  return moves;
}

function willCapture(state: LudoState, player: LPlayer, progress: number): boolean {
  const abs = absoluteSquare(player, progress);
  if (abs === null) return false;
  const opp = other(player);
  for (let i = 0; i < TOKENS; i++) {
    const op = state.tokens[opp][i];
    if (op >= 0 && absoluteSquare(opp, op) === abs) return true;
  }
  return false;
}

export function applyMove(state: LudoState, token: number): LudoState {
  if (state.outcome !== 'in_progress' || state.die === null) return state;
  const move = legalMoves(state).find((m) => m.token === token);
  if (!move) return state;

  const player = state.current;
  const opp = other(player);
  const die = state.die;
  const tokens: number[][] = [state.tokens[0].slice(), state.tokens[1].slice()];
  tokens[player][token] = move.to;

  // Capture any opponent sharing the landing main square.
  if (move.captures) {
    const abs = absoluteSquare(player, move.to);
    for (let i = 0; i < TOKENS; i++) {
      const op = tokens[opp][i];
      if (op >= 0 && absoluteSquare(opp, op) === abs) tokens[opp][i] = -1;
    }
  }

  const won = tokens[player].every((p) => p === FINISH);
  const extraTurn = die === 6 || move.captures;

  return {
    tokens,
    current: won || extraTurn ? player : opp,
    die: null,
    outcome: won ? 'win' : 'in_progress',
    winner: won ? player : null,
  };
}

/** Rolls for the current player. */
export function roll(state: LudoState): LudoState {
  if (state.outcome !== 'in_progress') return state;
  return { ...state, die: rollDie() };
}

/** True when the current roll has no legal move. */
export function noMoves(state: LudoState): boolean {
  return state.outcome === 'in_progress' && state.die !== null && legalMoves(state).length === 0;
}

/** Hands the turn to the opponent (used after a roll with no legal move). */
export function passTurn(state: LudoState): LudoState {
  if (state.outcome !== 'in_progress') return state;
  return { ...state, current: other(state.current), die: null };
}
