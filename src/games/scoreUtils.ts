import type { GameDefinition, ScoreType } from './types';

export type ScoreMode = 'higher_is_better' | 'lower_is_better';

export type BestScoreLabel = 'BEST' | 'BEST TIME' | 'BEST MOVES';

export type FinalScoreLabel = 'SCORE' | 'TIME' | 'MOVES';

/**
 * Safe "no score recorded yet" state. A raw `0` stored in the database for a
 * lower-is-better game is a placeholder, not an existing time/moves record.
 */
export type BestScore = number | null;

export const NO_SCORE: BestScore = null;

export function getScoreMode(scoreType: ScoreType): ScoreMode {
  switch (scoreType) {
    case 'time_lower_is_better':
    case 'moves_lower_is_better':
      return 'lower_is_better';
    case 'levels':
    case 'points':
    default:
      return 'higher_is_better';
  }
}

export function isLowerIsBetter(scoreType: ScoreType): boolean {
  return getScoreMode(scoreType) === 'lower_is_better';
}

export function getBestScoreLabel(scoreType: ScoreType): BestScoreLabel {
  switch (scoreType) {
    case 'time_lower_is_better':
      return 'BEST TIME';
    case 'moves_lower_is_better':
      return 'BEST MOVES';
    case 'levels':
    case 'points':
    default:
      return 'BEST';
  }
}

export function getFinalScoreLabel(scoreType: ScoreType): FinalScoreLabel {
  switch (scoreType) {
    case 'time_lower_is_better':
      return 'TIME';
    case 'moves_lower_is_better':
      return 'MOVES';
    case 'levels':
    case 'points':
    default:
      return 'SCORE';
  }
}

export function getScoreTypeOfGame(
  game: Pick<GameDefinition, 'scoreType'> | undefined | null
): ScoreType {
  return game?.scoreType ?? 'points';
}

export function isValidScoreValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Convert a raw stored/reported value into the safe no-score state.
 * For time/moves (lower-is-better) games an initial `0` is a placeholder and
 * is therefore never treated as an existing record.
 */
export function toBestScore(value: number | null | undefined, scoreType: ScoreType): BestScore {
  if (!isValidScoreValue(value)) return NO_SCORE;
  if (isLowerIsBetter(scoreType) && value <= 0) return NO_SCORE;
  return value;
}

/**
 * Strict comparison of `candidate` against `best` for the given score mode.
 * Returns false for invalid candidate values.
 */
export function isBetterScore(candidate: number, best: BestScore, scoreType: ScoreType): boolean {
  if (!isValidScoreValue(candidate)) return false;
  const currentBest = toBestScore(best, scoreType);

  if (isLowerIsBetter(scoreType)) {
    if (candidate <= 0) return false;
    if (currentBest === null) return true;
    return candidate < currentBest;
  }

  if (currentBest === null) return true;
  return candidate > currentBest;
}

export interface BestScoreEvaluation {
  /** True when the candidate becomes the new best for this score mode. */
  isBest: boolean;
  /** The resulting best score (safe no-score state when nothing is recorded). */
  best: BestScore;
}

export function evaluateBestScore(
  existing: number | null | undefined,
  candidate: number,
  scoreType: ScoreType
): BestScoreEvaluation {
  const currentBest = toBestScore(existing, scoreType);
  if (isBetterScore(candidate, currentBest, scoreType)) {
    return { isBest: true, best: toBestScore(candidate, scoreType) };
  }
  return { isBest: false, best: currentBest };
}

/** Does `score` satisfy a target under the score mode's comparison? */
export function meetsTarget(score: number, target: number, scoreType: ScoreType): boolean {
  if (!isValidScoreValue(score) || !isValidScoreValue(target)) return false;
  if (isLowerIsBetter(scoreType)) {
    return score > 0 && score <= target;
  }
  return score >= target;
}

/** Human readable display for a best score; an em dash when nothing is recorded. */
export function formatBestScore(value: BestScore, scoreType: ScoreType): string {
  const best = toBestScore(value, scoreType);
  if (best === NO_SCORE) return '—';
  return String(best);
}
