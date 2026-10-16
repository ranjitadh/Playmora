import { AchievementService, ACHIEVEMENTS_DEF } from '../src/services/achievementService';

describe('Achievements & Daily Challenge Service', () => {
  test('Returns deterministic daily challenge based on current date', () => {
    const challenge1 = AchievementService.getDailyChallenge();
    const challenge2 = AchievementService.getDailyChallenge();

    expect(challenge1.dateKey).toBe(challenge2.dateKey);
    expect(challenge1.gameId).toBe(challenge2.gameId);
    expect(challenge1.targetScore).toBe(challenge2.targetScore);
    expect(challenge1.targetScore).toBeGreaterThan(0);
  });

  test('All achievement definitions have valid IDs and descriptions', () => {
    expect(ACHIEVEMENTS_DEF.length).toBeGreaterThanOrEqual(7);
    for (const ach of ACHIEVEMENTS_DEF) {
      expect(ach.id.length).toBeGreaterThan(0);
      expect(ach.title.length).toBeGreaterThan(0);
      expect(ach.description.length).toBeGreaterThan(0);
      expect(ach.maxProgress).toBeGreaterThan(0);
    }
  });

  test('Unlocks First Step achievement upon finishing first game', async () => {
    const unlocked = await AchievementService.checkOnGameFinished({
      gameId: 'color-match',
      score: 40,
      isNewHighScore: true,
      totalGamesPlayedCount: 1,
      distinctGamesPlayedCount: 1,
    });

    const hasFirstStep = unlocked.some((a) => a.id === 'first_game');
    expect(hasFirstStep).toBe(true);
  });
});
