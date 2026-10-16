import { normalizeSearchQuery, gameMatchesQuery, filterGames } from '../src/games/search';
import { GAME_CATALOG, getGamesByCategory } from '../src/games/catalog';

describe('normalizeSearchQuery', () => {
  test('trims, lowercases and collapses whitespace', () => {
    expect(normalizeSearchQuery('  Snake   Classic ')).toBe('snake classic');
    expect(normalizeSearchQuery('SUDOKU')).toBe('sudoku');
    expect(normalizeSearchQuery('\t puzzle \n')).toBe('puzzle');
    expect(normalizeSearchQuery('')).toBe('');
  });

  test('non-string input degrades to an empty query', () => {
    expect(normalizeSearchQuery(undefined as never)).toBe('');
    expect(normalizeSearchQuery(null as never)).toBe('');
  });
});

describe('gameMatchesQuery', () => {
  const snake = GAME_CATALOG.find((g) => g.id === 'snake-classic')!;

  test('an empty query matches everything', () => {
    expect(gameMatchesQuery(snake, '')).toBe(true);
    expect(gameMatchesQuery(snake, '   ')).toBe(true);
  });

  test('matches on title case-insensitively', () => {
    expect(gameMatchesQuery(snake, 'snake')).toBe(true);
    expect(gameMatchesQuery(snake, 'SNAKE CLASSIC')).toBe(true);
    expect(gameMatchesQuery(snake, 'classic')).toBe(true);
  });

  test('matches on tags and description', () => {
    expect(snake.tags!.length).toBeGreaterThan(0);
    expect(gameMatchesQuery(snake, snake.tags![0])).toBe(true);
    expect(gameMatchesQuery(snake, snake.description.slice(0, 12))).toBe(true);
  });

  test('rejects non-matching queries', () => {
    expect(gameMatchesQuery(snake, 'sudoku')).toBe(false);
    expect(gameMatchesQuery(snake, 'zzzz')).toBe(false);
  });
});

describe('filterGames', () => {
  test('returns the full list when no query or category is given', () => {
    expect(filterGames(GAME_CATALOG, {})).toHaveLength(GAME_CATALOG.length);
    expect(filterGames(GAME_CATALOG, { query: '', category: null })).toHaveLength(
      GAME_CATALOG.length
    );
  });

  test('filters by category only', () => {
    const brain = filterGames(GAME_CATALOG, { category: 'brain' });
    expect(brain).toEqual(getGamesByCategory('brain'));
    expect(brain.length).toBeGreaterThan(0);
  });

  test('filters by query only', () => {
    const results = filterGames(GAME_CATALOG, { query: 'sudoku' });
    expect(results.map((g) => g.id)).toContain('sudoku');
    expect(results.every((g) => gameMatchesQuery(g, 'sudoku'))).toBe(true);
  });

  test('combines query and category, and can yield nothing', () => {
    const combined = filterGames(GAME_CATALOG, { query: 'sudoku', category: 'brain' });
    expect(combined.map((g) => g.id)).toEqual(['sudoku']);

    expect(filterGames(GAME_CATALOG, { query: 'sudoku', category: 'racing' })).toEqual([]);
    expect(filterGames(GAME_CATALOG, { query: 'zzzz' })).toEqual([]);
  });
});
