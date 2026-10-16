import { GAME_CATALOG, CATEGORIES, getGameById, getGamesByCategory } from '../src/games/catalog';
import { isGamePlayable, getGameComponent } from '../src/games/registry';

describe('Game Catalog & Registry Audit', () => {
  test('Catalog contains exactly 50 mini-games', () => {
    expect(GAME_CATALOG.length).toBe(50);
  });

  test('All game IDs are unique and URL-safe', () => {
    const ids = new Set<string>();
    for (const game of GAME_CATALOG) {
      expect(ids.has(game.id)).toBe(false);
      expect(game.id).toMatch(/^[a-z0-9-]+$/);
      ids.add(game.id);
    }
  });

  test('All 5 standard categories have exactly 10 games each', () => {
    for (const cat of CATEGORIES) {
      const games = getGamesByCategory(cat.id);
      expect(games.length).toBe(10);
    }
  });

  test('Every game has required metadata, instructions, and rules', () => {
    for (const game of GAME_CATALOG) {
      expect(game.title.length).toBeGreaterThan(0);
      expect(game.description.length).toBeGreaterThan(10);
      expect(game.instructions.length).toBeGreaterThan(10);
      expect(game.rules.length).toBeGreaterThan(0);
      expect(game.iconName.length).toBeGreaterThan(0);
      expect(game.badgeColor.length).toBeGreaterThan(0);
      expect(game.scoreType).toBeDefined();
    }
  });

  test('Milestone games are marked implemented and registered in registry', () => {
    const implementedGames = GAME_CATALOG.filter((g) => g.isImplemented);
    expect(implementedGames.length).toBeGreaterThanOrEqual(5);

    for (const game of implementedGames) {
      expect(isGamePlayable(game.id)).toBe(true);
      expect(getGameComponent(game.id)).not.toBeNull();
    }
  });

  test('getGameById retrieves correct definitions', () => {
    const ticTacToe = getGameById('tic-tac-toe');
    expect(ticTacToe).toBeDefined();
    expect(ticTacToe?.title).toBe('Tic-Tac-Toe');

    const snake = getGameById('snake-classic');
    expect(snake).toBeDefined();
    expect(snake?.category).toBe('retro');
  });
});
