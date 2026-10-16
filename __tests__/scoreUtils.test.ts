import {
  getScoreMode,
  isLowerIsBetter,
  getBestScoreLabel,
  getFinalScoreLabel,
  getScoreTypeOfGame,
  isValidScoreValue,
  toBestScore,
  isBetterScore,
  evaluateBestScore,
  meetsTarget,
  formatBestScore,
  NO_SCORE,
} from '../src/games/scoreUtils';
import type { ScoreType } from '../src/games/types';

const ALL_SCORE_TYPES: ScoreType[] = [
  'points',
  'levels',
  'time_lower_is_better',
  'moves_lower_is_better',
];

describe('scoreUtils · score modes', () => {
  test('time/moves are the only lower-is-better modes', () => {
    expect(getScoreMode('time_lower_is_better')).toBe('lower_is_better');
    expect(getScoreMode('moves_lower_is_better')).toBe('lower_is_better');
    expect(getScoreMode('points')).toBe('higher_is_better');
    expect(getScoreMode('levels')).toBe('higher_is_better');

    expect(ALL_SCORE_TYPES.filter(isLowerIsBetter)).toEqual([
      'time_lower_is_better',
      'moves_lower_is_better',
    ]);
  });

  test('unknown score type falls back to points (higher is better)', () => {
    expect(getScoreMode('nonsense' as ScoreType)).toBe('higher_is_better');
    expect(isLowerIsBetter('nonsense' as ScoreType)).toBe(false);
  });

  test('getScoreTypeOfGame defaults missing games to points', () => {
    expect(getScoreTypeOfGame({ scoreType: 'time_lower_is_better' })).toBe(
      'time_lower_is_better'
    );
    expect(getScoreTypeOfGame(undefined)).toBe('points');
    expect(getScoreTypeOfGame(null)).toBe('points');
  });
});

describe('scoreUtils · labels', () => {
  test('best-score labels match the score mode', () => {
    expect(getBestScoreLabel('time_lower_is_better')).toBe('BEST TIME');
    expect(getBestScoreLabel('moves_lower_is_better')).toBe('BEST MOVES');
    expect(getBestScoreLabel('points')).toBe('BEST');
    expect(getBestScoreLabel('levels')).toBe('BEST');
  });

  test('final-score labels match the score mode', () => {
    expect(getFinalScoreLabel('time_lower_is_better')).toBe('TIME');
    expect(getFinalScoreLabel('moves_lower_is_better')).toBe('MOVES');
    expect(getFinalScoreLabel('points')).toBe('SCORE');
    expect(getFinalScoreLabel('levels')).toBe('SCORE');
  });
});

describe('scoreUtils · toBestScore (no-score state)', () => {
  test('invalid values are the safe no-score state', () => {
    expect(toBestScore(null, 'points')).toBe(NO_SCORE);
    expect(toBestScore(undefined, 'points')).toBe(NO_SCORE);
    expect(toBestScore(NaN, 'points')).toBe(NO_SCORE);
    expect(toBestScore(Infinity, 'points')).toBe(NO_SCORE);
  });

  test('a stored 0 is a placeholder for lower-is-better games', () => {
    expect(toBestScore(0, 'time_lower_is_better')).toBe(NO_SCORE);
    expect(toBestScore(0, 'moves_lower_is_better')).toBe(NO_SCORE);
    expect(toBestScore(0, 'points')).toBe(0);
  });

  test('real records survive normalization', () => {
    expect(toBestScore(150, 'points')).toBe(150);
    expect(toBestScore(42, 'time_lower_is_better')).toBe(42);
  });
});

describe('scoreUtils · isBetterScore', () => {
  test('higher-is-better: any first score is a record, then strictly greater wins', () => {
    expect(isBetterScore(10, NO_SCORE, 'points')).toBe(true);
    expect(isBetterScore(50, 40, 'points')).toBe(true);
    expect(isBetterScore(40, 40, 'points')).toBe(false);
    expect(isBetterScore(30, 40, 'points')).toBe(false);
  });

  test('lower-is-better: strictly smaller time wins, non-positive never counts', () => {
    expect(isBetterScore(120, NO_SCORE, 'time_lower_is_better')).toBe(true);
    expect(isBetterScore(90, 120, 'time_lower_is_better')).toBe(true);
    expect(isBetterScore(120, 120, 'time_lower_is_better')).toBe(false);
    expect(isBetterScore(150, 120, 'time_lower_is_better')).toBe(false);
    expect(isBetterScore(0, NO_SCORE, 'time_lower_is_better')).toBe(false);
    expect(isBetterScore(-5, NO_SCORE, 'moves_lower_is_better')).toBe(false);
  });

  test('invalid candidates never win', () => {
    expect(isBetterScore(NaN, NO_SCORE, 'points')).toBe(false);
    expect(isBetterScore(Infinity, 5, 'points')).toBe(false);
  });
});

describe('scoreUtils · evaluateBestScore', () => {
  test('reports the new best and resulting best value for higher-is-better', () => {
    expect(evaluateBestScore(null, 100, 'points')).toEqual({ isBest: true, best: 100 });
    expect(evaluateBestScore(100, 90, 'points')).toEqual({ isBest: false, best: 100 });
    expect(evaluateBestScore(100, 120, 'points')).toEqual({ isBest: true, best: 120 });
  });

  test('treats a stored 0 as no record for lower-is-better games', () => {
    expect(evaluateBestScore(0, 75, 'time_lower_is_better')).toEqual({
      isBest: true,
      best: 75,
    });
    expect(evaluateBestScore(75, 90, 'time_lower_is_better')).toEqual({
      isBest: false,
      best: 75,
    });
    expect(evaluateBestScore(75, 60, 'moves_lower_is_better')).toEqual({
      isBest: true,
      best: 60,
    });
  });

  test('an invalid candidate leaves the existing best untouched', () => {
    expect(evaluateBestScore(120, 0, 'time_lower_is_better')).toEqual({
      isBest: false,
      best: 120,
    });
  });
});

describe('scoreUtils · meetsTarget', () => {
  test('higher-is-better needs score >= target', () => {
    expect(meetsTarget(100, 100, 'points')).toBe(true);
    expect(meetsTarget(101, 100, 'points')).toBe(true);
    expect(meetsTarget(99, 100, 'points')).toBe(false);
  });

  test('lower-is-better needs a positive score <= target', () => {
    expect(meetsTarget(50, 60, 'time_lower_is_better')).toBe(true);
    expect(meetsTarget(60, 60, 'time_lower_is_better')).toBe(true);
    expect(meetsTarget(61, 60, 'time_lower_is_better')).toBe(false);
    expect(meetsTarget(0, 60, 'moves_lower_is_better')).toBe(false);
  });

  test('invalid inputs never meet a target', () => {
    expect(meetsTarget(NaN, 10, 'points')).toBe(false);
    expect(meetsTarget(10, NaN, 'points')).toBe(false);
  });
});

describe('scoreUtils · formatBestScore', () => {
  test('renders an em dash when no record exists', () => {
    expect(formatBestScore(null, 'points')).toBe('—');
    expect(formatBestScore(0, 'time_lower_is_better')).toBe('—');
  });

  test('renders the numeric record otherwise', () => {
    expect(formatBestScore(150, 'points')).toBe('150');
    expect(formatBestScore(45, 'time_lower_is_better')).toBe('45');
  });
});
