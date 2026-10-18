import { ScoreRepository, resolveScoreType } from '../src/database/scoreRepository';
import { appDatabase } from '../src/database/database';
import { GAME_CATALOG } from '../src/games/catalog';

// The in-memory test database is shared across tests in this file, so each test
// uses its own catalog game ids (mirrors __tests__/database.test.ts).

const POINTS_GAME = 'snake-classic';
const OTHER_POINTS_GAME = 'pong';
const TIME_GAME = 'minesweeper';
const OTHER_TIME_GAME = 'solitaire';
const MOVES_GAME = 'sliding-number-puzzle';

beforeEach(async () => {
  await appDatabase.getDriver();
});

describe('ScoreRepository · no history yet', () => {
  test('recent games and stats start empty', async () => {
    expect(await ScoreRepository.getRecentGames(5)).toEqual([]);
    expect(await ScoreRepository.getAllStats()).toEqual({});
    expect(await ScoreRepository.getGameStats(POINTS_GAME)).toBeNull();
  });
});

describe('ScoreRepository · higher-is-better (points) games', () => {
  test('a first score is a best, then only strictly better scores replace it', async () => {
    const first = await ScoreRepository.recordScore(POINTS_GAME, 100);
    expect(first).toEqual({ isNewHighScore: true, currentHighScore: 100, bestScore: 100 });

    const worse = await ScoreRepository.recordScore(POINTS_GAME, 50);
    expect(worse.isNewHighScore).toBe(false);
    expect(worse.bestScore).toBe(100);

    const equal = await ScoreRepository.recordScore(POINTS_GAME, 100);
    expect(equal.isNewHighScore).toBe(false);
    expect(equal.bestScore).toBe(100);

    const better = await ScoreRepository.recordScore(POINTS_GAME, 250);
    expect(better.isNewHighScore).toBe(true);
    expect(better.bestScore).toBe(250);

    expect(await ScoreRepository.getHighScore(POINTS_GAME)).toBe(250);
    expect(await ScoreRepository.getBestScore(POINTS_GAME)).toBe(250);

    const stats = await ScoreRepository.getGameStats(POINTS_GAME);
    expect(stats).not.toBeNull();
    expect(stats!.timesPlayed).toBe(4);
    expect(stats!.bestScore).toBe(250);
    expect(stats!.scoreType).toBe('points');
    expect(stats!.bestLabel).toBe('BEST');
  });

  test('a real 0 is a valid points score', async () => {
    const result = await ScoreRepository.recordScore(OTHER_POINTS_GAME, 0);
    expect(result.isNewHighScore).toBe(true);
    expect(result.bestScore).toBe(0);
    expect(await ScoreRepository.getBestScore(OTHER_POINTS_GAME)).toBe(0);
  });
});

describe('ScoreRepository · lower-is-better (time/moves) games', () => {
  test('a reported 0 is a placeholder, not a record', async () => {
    const placeholder = await ScoreRepository.recordScore(TIME_GAME, 0);
    expect(placeholder.isNewHighScore).toBe(false);
    expect(placeholder.bestScore).toBeNull();

    // Raw storage keeps the placeholder, but the safe accessor hides it.
    expect(await ScoreRepository.getHighScore(TIME_GAME)).toBe(0);
    expect(await ScoreRepository.getBestScore(TIME_GAME)).toBeNull();

    const stats = await ScoreRepository.getGameStats(TIME_GAME);
    expect(stats!.bestScore).toBeNull();
    expect(stats!.scoreType).toBe('time_lower_is_better');
    expect(stats!.bestLabel).toBe('BEST TIME');
  });

  test('the fastest (smallest positive) time is kept as the best', async () => {
    await ScoreRepository.recordScore(OTHER_TIME_GAME, 0);
    expect((await ScoreRepository.recordScore(OTHER_TIME_GAME, 120)).bestScore).toBe(120);

    const slower = await ScoreRepository.recordScore(OTHER_TIME_GAME, 200);
    expect(slower.isNewHighScore).toBe(false);
    expect(slower.bestScore).toBe(120);

    const faster = await ScoreRepository.recordScore(OTHER_TIME_GAME, 75);
    expect(faster.isNewHighScore).toBe(true);
    expect(faster.bestScore).toBe(75);

    expect(await ScoreRepository.getHighScore(OTHER_TIME_GAME)).toBe(75);
    expect(await ScoreRepository.getBestScore(OTHER_TIME_GAME)).toBe(75);
  });

  test('moves games keep the fewest moves', async () => {
    expect((await ScoreRepository.recordScore(MOVES_GAME, 40)).bestScore).toBe(40);
    expect((await ScoreRepository.recordScore(MOVES_GAME, 55)).bestScore).toBe(40);
    expect((await ScoreRepository.recordScore(MOVES_GAME, 22)).bestScore).toBe(22);

    const stats = await ScoreRepository.getGameStats(MOVES_GAME);
    expect(stats!.scoreType).toBe('moves_lower_is_better');
    expect(stats!.bestLabel).toBe('BEST MOVES');
    expect(stats!.bestScore).toBe(22);
  });
});

describe('ScoreRepository · catalog is the source of truth', () => {
  test('resolveScoreType matches every catalog entry', () => {
    expect(GAME_CATALOG.length).toBe(50);
    for (const game of GAME_CATALOG) {
      expect(resolveScoreType(game.id)).toBe(game.scoreType);
    }
  });

  test('stored stats carry their catalog score type, label and best score', async () => {
    await ScoreRepository.recordScore('brick-breaker', 10);
    await ScoreRepository.recordScore('reaction-time-challenge', 90);

    const all = await ScoreRepository.getAllStats();
    expect(all['brick-breaker'].scoreType).toBe('points');
    expect(all['brick-breaker'].bestLabel).toBe('BEST');
    expect(all['brick-breaker'].bestScore).toBe(10);
    expect(all['reaction-time-challenge'].scoreType).toBe('points');
    expect(all['reaction-time-challenge'].bestLabel).toBe('BEST');
    expect(all['reaction-time-challenge'].bestScore).toBe(90);
    // Recorded earlier in this file, resolved from the catalog on read.
    expect(all[MOVES_GAME].bestLabel).toBe('BEST MOVES');
  });

  test('an explicit scoreType overrides the catalog fallback', () => {
    expect(resolveScoreType('snake-classic', 'levels')).toBe('levels');
  });

  test('unknown games fall back to points instead of throwing', async () => {
    expect(resolveScoreType('does-not-exist')).toBe('points');
    expect(await ScoreRepository.getBestScore('does-not-exist')).toBe(0);
  });
});

describe('ScoreRepository · recent games ordering', () => {
  test('most recently played games come first, limited to the requested count', async () => {
    const first = 'drift-challenge';
    const second = 'mini-kart-racing';
    const third = 'traffic-racer';

    // Future timestamps guarantee these three sort ahead of every other test's rows.
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(9_000_000_001_000);
    await ScoreRepository.recordScore(first, 10);
    nowSpy.mockReturnValueOnce(9_000_000_002_000);
    await ScoreRepository.recordScore(second, 90);
    nowSpy.mockReturnValueOnce(9_000_000_003_000);
    await ScoreRepository.recordScore(third, 30);
    nowSpy.mockRestore();

    const recent = await ScoreRepository.getRecentGames(2);
    expect(recent).toEqual([third, second]);

    const all = await ScoreRepository.getRecentGames(50);
    expect(all.slice(0, 3)).toEqual([third, second, first]);
  });
});
