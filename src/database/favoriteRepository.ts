import { appDatabase } from './database';

export class FavoriteRepository {
  public static async isFavorite(gameId: string): Promise<boolean> {
    const db = await appDatabase.getDriver();
    const row = await db.getFirstAsync<{ game_id: string }>(
      `SELECT game_id FROM favorites WHERE game_id = ?`,
      [gameId]
    );
    return !!row;
  }

  public static async toggleFavorite(gameId: string): Promise<boolean> {
    const db = await appDatabase.getDriver();
    const exists = await this.isFavorite(gameId);

    if (exists) {
      await db.runAsync(`DELETE FROM favorites WHERE game_id = ?`, [gameId]);
      return false;
    } else {
      await db.runAsync(`INSERT INTO favorites (game_id, created_at) VALUES (?, ?)`, [
        gameId,
        Date.now(),
      ]);
      return true;
    }
  }

  public static async getAllFavorites(): Promise<string[]> {
    const db = await appDatabase.getDriver();
    const rows = await db.getAllAsync<{ game_id: string }>(
      `SELECT game_id FROM favorites ORDER BY created_at DESC`
    );
    return rows.map((r) => r.game_id);
  }
}
