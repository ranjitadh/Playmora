import { GAME_CATALOG, CATEGORIES } from '../src/games/catalog';
import { isGamePlayable } from '../src/games/registry';

export function validateCatalog() {
  console.log('==============================================');
  console.log(' PLAYMORA: 50 MINI-GAMES CATALOG AUDIT    ');
  console.log('==============================================\n');

  const totalGames = GAME_CATALOG.length;
  console.log(`Total games cataloged: ${totalGames} / 50 target`);

  // Check unique IDs
  const idSet = new Set<string>();
  const duplicates: string[] = [];
  for (const game of GAME_CATALOG) {
    if (idSet.has(game.id)) {
      duplicates.push(game.id);
    }
    idSet.add(game.id);
  }

  if (duplicates.length > 0) {
    console.error(`❌ Duplicate game IDs found: ${duplicates.join(', ')}`);
  } else {
    console.log(`✅ All ${totalGames} game IDs are unique.`);
  }

  // Check categories distribution
  console.log('\n--- Category Distribution ---');
  for (const cat of CATEGORIES) {
    const gamesInCat = GAME_CATALOG.filter((g) => g.category === cat.id);
    const playableInCat = gamesInCat.filter((g) => g.isImplemented && isGamePlayable(g.id));
    console.log(
      `  • ${cat.name.padEnd(20)}: ${gamesInCat.length} games (${playableInCat.length} fully playable)`
    );
  }

  // Audit implemented games
  console.log('\n--- Playable Implementations ---');
  const implemented = GAME_CATALOG.filter((g) => g.isImplemented);
  for (const game of implemented) {
    const playable = isGamePlayable(game.id);
    console.log(
      `  [${playable ? 'READY' : 'MISSING'}] ${game.id.padEnd(16)} - ${game.title} (${game.category})`
    );
  }

  // Check missing or unverified implementations
  const pending = GAME_CATALOG.filter((g) => !g.isImplemented);
  console.log(`\nPending games queued for subsequent milestones: ${pending.length}`);

  return {
    total: totalGames,
    playable: implemented.length,
    pending: pending.length,
    hasDuplicates: duplicates.length > 0,
  };
}

if ((require as any).main === module) {
  validateCatalog();
}
