/**
 * Pure Penalty Shootout logic. No RN dependencies.
 *
 * The goal is split into six zones (two rows of three). The player picks a
 * zone, then an accuracy meter decides how cleanly the penalty is struck.
 * Below a threshold the shot goes wide; otherwise a keeper who dived to the
 * right zone saves it, and any other dive concedes a goal. Keeper skill rises
 * with each attempt.
 */

export const ZONES = 6;
export const MAX_ATTEMPTS = 5;
export const ACC_MISS = 0.35;

export type ShotResult = 'goal' | 'saved' | 'miss';

export interface PenaltyState {
  attempt: number;
  goals: number;
  saved: number;
  misses: number;
  outcomes: ShotResult[];
  accuracy: number;
  outcome: 'in_progress' | 'over';
}

export function createPenalty(): PenaltyState {
  return { attempt: 0, goals: 0, saved: 0, misses: 0, outcomes: [], accuracy: 0, outcome: 'in_progress' };
}

/** Decides what the shot becomes from the target, the dive and the accuracy. */
export function resolveShot(target: number, keeper: number, accuracy: number): ShotResult {
  if (accuracy < ACC_MISS) return 'miss';
  if (keeper === target) return 'saved';
  return 'goal';
}

/**
 * Picks the keeper's dive. `r1` and `r2` are uniform draws in [0,1) so the
 * choice is deterministic for tests. `skill` is the chance of reading the shot.
 */
export function keeperChoice(target: number, r1: number, r2: number, skill: number): number {
  if (r1 < skill) return target;
  const others: number[] = [];
  for (let z = 0; z < ZONES; z++) if (z !== target) others.push(z);
  return others[Math.floor(r2 * others.length) % others.length];
}

export function keeperSkillFor(attempt: number): number {
  return 0.3 + attempt * 0.1;
}

/** Records one taken penalty. `r1`/`r2` feed the keeper's decision. */
export function shoot(state: PenaltyState, target: number, accuracy: number, r1: number, r2: number): PenaltyState {
  if (state.outcome !== 'in_progress') return state;
  const keeper = keeperChoice(target, r1, r2, keeperSkillFor(state.attempt));
  const result = resolveShot(target, keeper, accuracy);
  const attempt = state.attempt + 1;
  return {
    ...state,
    attempt,
    accuracy,
    goals: state.goals + (result === 'goal' ? 1 : 0),
    saved: state.saved + (result === 'saved' ? 1 : 0),
    misses: state.misses + (result === 'miss' ? 1 : 0),
    outcomes: [...state.outcomes, result],
    outcome: attempt >= MAX_ATTEMPTS ? 'over' : 'in_progress',
  };
}

export function scoreOf(state: PenaltyState): number {
  return state.goals * 100 + state.outcomes.reduce((sum, o) => sum + (o === 'goal' ? 25 : 0), 0);
}
