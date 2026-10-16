import {
  DailyChallengeService,
  computeDailyChallengeSpec,
  formatLocalDateKey,
} from '../src/services/dailyChallengeService';
import { AchievementService, ACHIEVEMENTS_DEF } from '../src/services/achievementService';
import { appDatabase } from '../src/database/database';
import { GAME_CATALOG, getGameById } from '../src/games/catalog';
import { meetsTarget } from '../src/games/scoreUtils';

beforeEach(async () => {
  await appDatabase.getDriver();
});

describe('formatLocalDateKey', () => {
  test('zero-pads month and day in local time', () => {
    expect(formatLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatLocalDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
    expect(formatLocalDateKey(new Date(2026, 9, 16))).toBe('2026-10-16');
  });
});

describe('computeDailyChallengeSpec', () => {
  test('is deterministic for a given date', () => {
    const date = new Date(2026, 9, 16);
    const a = computeDailyChallengeSpec(date);
    const b = computeDailyChallengeSpec(date);
    expect(a).toEqual(b);
    expect(a!.dateKey).toBe('2026-10-16');
  });

  test('picks an implemented game and a target in [50, 199]', () => {
    for (let day = 1; day <= 28; day++) {
      const spec = computeDailyChallengeSpec(new Date(2026, 5, day));
      expect(spec).not.toBeNull();
      const game = getGameById(spec!.gameId);
      expect(game).toBeDefined();
      expect(game!.isImplemented).toBe(true);
      expect(spec!.gameTitle).toBe(game!.title);
      expect(spec!.scoreType).toBe(game!.scoreType);
      expect(spec!.targetScore).toBeGreaterThanOrEqual(50);
      expect(spec!.targetScore).toBeLessThanOrEqual(199);
    }
  });

  test('different dates can select different games', () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 28; day++) {
      seen.add(computeDailyChallengeSpec(new Date(2026, 0, day))!.gameId);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  test('an empty implemented catalog degrades to null instead of throwing', () => {
    expect(computeDailyChallengeSpec(new Date(2026, 9, 16), [])).toBeNull();
    expect(computeDailyChallengeSpec(new Date(2026, 9, 16), null as never)).toBeNull();
  });

  test('uses the supplied game list when provided', () => {
    const only = GAME_CATALOG.filter((g) => g.id === 'minesweeper');
    const spec = computeDailyChallengeSpec(new Date(2026, 9, 16), only);
    expect(spec!.gameId).toBe('minesweeper');
    expect(spec!.scoreType).toBe('time_lower_is_better');
  });
});

describe('DailyChallengeService · persistence', () => {
  const date = new Date(2026, 9, 16);

  test('the first read persists exactly one row for the local date', async () => {
    const state = await DailyChallengeService.getTodayState(date);
    expect(state.available).toBe(true);
    expect(state.completed).toBe(false);
    expect(state.completedAt).toBeNull();
    expect(state.spec).not.toBeNull();

    await DailyChallengeService.getTodayState(date);
    const db = await appDatabase.getDriver();
    const rows = await db.getAllAsync<{ date_key: string }>(
      `SELECT * FROM daily_challenges`
    );
    expect(rows.filter((r) => r.date_key === '2026-10-16')).toHaveLength(1);

    const again = await DailyChallengeService.getTodayState(date);
    expect(again.spec).toEqual(state.spec);
    expect(await DailyChallengeService.isCompletedToday(date)).toBe(false);
  });

  test('a different day gets its own row', async () => {
    await DailyChallengeService.getTodayState(new Date(2026, 9, 16));
    await DailyChallengeService.getTodayState(new Date(2026, 9, 17));
    const db = await appDatabase.getDriver();
    const rows = await db.getAllAsync<{ date_key: string }>(`SELECT * FROM daily_challenges`);
    expect(rows.map((r) => r.date_key).sort()).toEqual(['2026-10-16', '2026-10-17']);
  });
});

describe('DailyChallengeService · completion', () => {
  const date = new Date(2026, 9, 16);

  function unmetScore(target: number, scoreType: string): number {
    return scoreType === 'points' || scoreType === 'levels' ? target - 1 : target + 1;
  }

  test('only the featured game can complete the challenge', async () => {
    const spec = (await DailyChallengeService.getTodayState(date)).spec!;
    const other = GAME_CATALOG.find((g) => g.isImplemented && g.id !== spec.gameId)!;

    const result = await DailyChallengeService.completeIfSatisfied({
      gameId: other.id,
      score: spec.targetScore,
      date,
    });
    expect(result).toEqual({ available: true, completed: false, newlyCompleted: false });
    expect(await DailyChallengeService.isCompletedToday(date)).toBe(false);
  });

  test('the featured game with an unmet target does not complete', async () => {
    const spec = (await DailyChallengeService.getTodayState(date)).spec!;
    const score = unmetScore(spec.targetScore, spec.scoreType);
    expect(meetsTarget(score, spec.targetScore, spec.scoreType)).toBe(false);

    const result = await DailyChallengeService.completeIfSatisfied({
      gameId: spec.gameId,
      score,
      date,
    });
    expect(result.newlyCompleted).toBe(false);
    expect(await DailyChallengeService.isCompletedToday(date)).toBe(false);
  });

  test('the featured game hitting the target completes once and stays completed', async () => {
    const spec = (await DailyChallengeService.getTodayState(date)).spec!;
    expect(meetsTarget(spec.targetScore, spec.targetScore, spec.scoreType)).toBe(true);

    const first = await DailyChallengeService.completeIfSatisfied({
      gameId: spec.gameId,
      score: spec.targetScore,
      date,
    });
    expect(first).toEqual({ available: true, completed: true, newlyCompleted: true });

    const state = await DailyChallengeService.getTodayState(date);
    expect(state.completed).toBe(true);
    expect(state.completedAt).not.toBeNull();

    const repeat = await DailyChallengeService.completeIfSatisfied({
      gameId: spec.gameId,
      score: spec.targetScore,
      date,
    });
    expect(repeat).toEqual({ available: true, completed: true, newlyCompleted: false });

    const db = await appDatabase.getDriver();
    const rows = await db.getAllAsync<{ date_key: string }>(
      `SELECT * FROM daily_challenges`
    );
    expect(rows.filter((r) => r.date_key === '2026-10-16')).toHaveLength(1);
  });
});

describe('Daily Challenge achievement', () => {
  test('markDailyChallengeCompleted unlocks exactly once', async () => {
    const before = await AchievementService.getAchievements();
    const dailyBefore = before.find((a) => a.id === 'daily_challenge')!;
    expect(dailyBefore.unlockedAt).toBeNull();
    expect(dailyBefore.progress).toBe(0);

    const unlocked = await AchievementService.markDailyChallengeCompleted();
    expect(unlocked).not.toBeNull();
    expect(unlocked!.id).toBe('daily_challenge');
    expect(unlocked!.unlockedAt).not.toBeNull();
    expect(unlocked!.progress).toBe(1);

    expect(await AchievementService.markDailyChallengeCompleted()).toBeNull();

    const after = await AchievementService.getAchievements();
    const dailyAfter = after.find((a) => a.id === 'daily_challenge')!;
    expect(dailyAfter.unlockedAt).toBe(unlocked!.unlockedAt);
    expect(dailyAfter.progress).toBe(1);
  });

  test('the definition is Playmora-branded and includes the daily challenge', () => {
    const firstGame = ACHIEVEMENTS_DEF.find((a) => a.id === 'first_game')!;
    expect(firstGame.description).toContain('Playmora');
    expect(ACHIEVEMENTS_DEF.some((a) => a.id === 'daily_challenge')).toBe(true);
  });

  test('getDailyChallenge mirrors the deterministic spec', () => {
    const challenge = AchievementService.getDailyChallenge();
    const spec = computeDailyChallengeSpec(new Date())!;
    expect(challenge).toEqual({
      dateKey: spec.dateKey,
      gameId: spec.gameId,
      gameTitle: spec.gameTitle,
      targetScore: spec.targetScore,
    });
  });
});
