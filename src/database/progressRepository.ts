import { appDatabase } from './database';

export interface GameProgress {
  game_id: string;
  state: string;
  updated_at: number;
}

export class ProgressRepository {
  public static async saveProgress(gameId: string, state: unknown): Promise<void> {
    const db = await appDatabase.getDriver();
    const now = Date.now();
    await db.runAsync(
      `INSERT OR REPLACE INTO game_progress (game_id, state, updated_at) VALUES (?, ?, ?)`,
      [gameId, JSON.stringify(state), now]
    );
  }

  public static async loadProgress(gameId: string): Promise<unknown | null> {
    const db = await appDatabase.getDriver();
    const row = await db.getFirstAsync<GameProgress>(
      `SELECT * FROM game_progress WHERE game_id = ?`,
      [gameId]
    );
    if (!row) return null;
    try {
      return JSON.parse(row.state);
    } catch {
      return null;
    }
  }

  public static async clearProgress(gameId: string): Promise<void> {
    const db = await appDatabase.getDriver();
    await db.runAsync(`DELETE FROM game_progress WHERE game_id = ?`, [gameId]);
  }
}
