import { ScoreRepository } from '../src/database/scoreRepository';
import { FavoriteRepository } from '../src/database/favoriteRepository';
import { SettingsRepository } from '../src/database/settingsRepository';

describe('Database Repositories & Local Persistence', () => {
  test('Records score and detects personal high scores accurately', async () => {
    const gameId = 'color-match';

    // First play
    const result1 = await ScoreRepository.recordScore(gameId, 80);
    expect(result1.isNewHighScore).toBe(true);
    expect(result1.currentHighScore).toBe(80);

    const hs1 = await ScoreRepository.getHighScore(gameId);
    expect(hs1).toBe(80);

    // Second play with lower score
    const result2 = await ScoreRepository.recordScore(gameId, 50);
    expect(result2.isNewHighScore).toBe(false);
    expect(result2.currentHighScore).toBe(80);

    // Third play setting new high score
    const result3 = await ScoreRepository.recordScore(gameId, 120);
    expect(result3.isNewHighScore).toBe(true);
    expect(result3.currentHighScore).toBe(120);

    const stats = await ScoreRepository.getGameStats(gameId);
    expect(stats?.highScore).toBe(120);
    expect(stats?.timesPlayed).toBe(3);
  });

  test('Toggles and manages favorites list', async () => {
    const gameId = 'snake-sprint';

    const isFavInitially = await FavoriteRepository.isFavorite(gameId);
    expect(isFavInitially).toBe(false);

    // Toggle on
    const toggledOn = await FavoriteRepository.toggleFavorite(gameId);
    expect(toggledOn).toBe(true);
    expect(await FavoriteRepository.isFavorite(gameId)).toBe(true);

    const allFavs = await FavoriteRepository.getAllFavorites();
    expect(allFavs).toContain(gameId);

    // Toggle off
    const toggledOff = await FavoriteRepository.toggleFavorite(gameId);
    expect(toggledOff).toBe(false);
    expect(await FavoriteRepository.isFavorite(gameId)).toBe(false);
  });

  test('User settings save and retrieve', async () => {
    await SettingsRepository.setSetting('soundEnabled', false);
    const settings = await SettingsRepository.getSettings();
    expect(settings.soundEnabled).toBe(false);

    await SettingsRepository.setSetting('soundEnabled', true);
    const updated = await SettingsRepository.getSettings();
    expect(updated.soundEnabled).toBe(true);
  });
});
