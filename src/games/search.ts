import type { GameDefinition } from './types';

/**
 * Normalize a raw search string: trim, collapse whitespace and lowercase so
 * matching behaves consistently across Home, Explore and tests.
 */
export function normalizeSearchQuery(query: string): string {
  if (typeof query !== 'string') return '';
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Does a game match the query across title, description and tags? */
export function gameMatchesQuery(game: GameDefinition, rawQuery: string): boolean {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return true;
  if (game.title.toLowerCase().includes(query)) return true;
  if (game.description.toLowerCase().includes(query)) return true;
  return (game.tags ?? []).some((tag) => tag.toLowerCase().includes(query));
}

/** Filter a game list by an optional query and optional category. */
export function filterGames(
  games: GameDefinition[],
  options: { query?: string; category?: string | null }
): GameDefinition[] {
  const category = options.category ?? null;
  return games.filter((game) => {
    const matchesCategory = category ? game.category === category : true;
    return matchesCategory && gameMatchesQuery(game, options.query ?? '');
  });
}
