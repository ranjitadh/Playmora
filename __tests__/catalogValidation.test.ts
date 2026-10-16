import { validateCatalog } from '../scripts/validate-game-catalog';
import { GAME_CATALOG } from '../src/games/catalog';
import { isGamePlayable } from '../src/games/registry';

// scripts/validate-game-catalog.ts depends on the game registry (React Native
// modules), so it is exercised here in the jest-expo environment instead of a
// bare node/tsx runner.
describe('scripts/validate-game-catalog', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  afterAll(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('reports a complete, duplicate-free, fully playable catalog', () => {
    const summary = validateCatalog();

    expect(summary).toEqual({
      total: 50,
      playable: 50,
      pending: 0,
      hasDuplicates: false,
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('every catalog entry is implemented and registered as playable', () => {
    for (const game of GAME_CATALOG) {
      expect(game.isImplemented).toBe(true);
      expect(isGamePlayable(game.id)).toBe(true);
    }
  });
});
