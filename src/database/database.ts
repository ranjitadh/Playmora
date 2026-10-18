import { CURRENT_DB_VERSION, SCHEMA_V1 } from './schema';
import { Platform } from 'react-native';

export interface IDatabaseDriver {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: any[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>;
  getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>;
}

// Memory fallback driver for Node.js unit tests and Web fallback
class MemoryDatabaseDriver implements IDatabaseDriver {
  private tables: Record<string, any[]> = {
    meta: [],
    game_scores: [],
    game_stats: [],
    favorites: [],
    achievements: [],
    user_settings: [],
    daily_challenges: [],
    game_progress: [],
  };

  async execAsync(sql: string): Promise<void> {
    // schema initialization in memory
  }

  async runAsync(sql: string, params: any[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
    const s = sql.trim().toLowerCase();

    if (s.startsWith('insert into game_scores') || s.startsWith('insert or replace into game_scores')) {
      const id = this.tables.game_scores.length + 1;
      this.tables.game_scores.push({
        id,
        game_id: params[0],
        score: params[1],
        played_at: params[2],
        metadata: params[3] || null,
      });
      return { lastInsertRowId: id, changes: 1 };
    }

    if (s.startsWith('insert into favorites') || s.startsWith('insert or replace into favorites')) {
      const existing = this.tables.favorites.findIndex((f) => f.game_id === params[0]);
      if (existing >= 0) {
        this.tables.favorites[existing] = { game_id: params[0], created_at: params[1] };
      } else {
        this.tables.favorites.push({ game_id: params[0], created_at: params[1] });
      }
      return { lastInsertRowId: 1, changes: 1 };
    }

    if (s.startsWith('delete from favorites')) {
      const initial = this.tables.favorites.length;
      this.tables.favorites = this.tables.favorites.filter((f) => f.game_id !== params[0]);
      return { lastInsertRowId: 0, changes: initial - this.tables.favorites.length };
    }

    if (s.startsWith('insert or replace into user_settings')) {
      const idx = this.tables.user_settings.findIndex((u) => u.key === params[0]);
      if (idx >= 0) {
        this.tables.user_settings[idx].value = params[1];
      } else {
        this.tables.user_settings.push({ key: params[0], value: params[1] });
      }
      return { lastInsertRowId: 1, changes: 1 };
    }

    if (s.startsWith('insert or replace into game_stats')) {
      const idx = this.tables.game_stats.findIndex((st) => st.game_id === params[0]);
      const record = {
        game_id: params[0],
        high_score: params[1],
        times_played: params[2],
        last_played_at: params[3],
        total_time_spent: params[4] || 0,
      };
      if (idx >= 0) {
        this.tables.game_stats[idx] = record;
      } else {
        this.tables.game_stats.push(record);
      }
      return { lastInsertRowId: 1, changes: 1 };
    }

    if (s.startsWith('insert or replace into daily_challenges')) {
      const idx = this.tables.daily_challenges.findIndex((d) => d.date_key === params[0]);
      const record = {
        date_key: params[0],
        game_id: params[1],
        target_score: params[2],
        completed: params[3],
        completed_at: params[4],
      };
      if (idx >= 0) {
        this.tables.daily_challenges[idx] = record;
      } else {
        this.tables.daily_challenges.push(record);
      }
      return { lastInsertRowId: 1, changes: 1 };
    }

    if (s.startsWith('insert or replace into achievements')) {
      const idx = this.tables.achievements.findIndex((a) => a.id === params[0]);
      const record = {
        id: params[0],
        title: params[1],
        description: params[2],
        unlocked_at: params[3],
        progress: params[4],
        max_progress: params[5],
      };
      if (idx >= 0) {
        this.tables.achievements[idx] = record;
      } else {
        this.tables.achievements.push(record);
      }
      return { lastInsertRowId: 1, changes: 1 };
    }

    if (s.startsWith('insert or replace into game_progress')) {
      const idx = this.tables.game_progress.findIndex((p) => p.game_id === params[0]);
      const record = {
        game_id: params[0],
        state: params[1],
        updated_at: params[2],
      };
      if (idx >= 0) {
        this.tables.game_progress[idx] = record;
      } else {
        this.tables.game_progress.push(record);
      }
      return { lastInsertRowId: 1, changes: 1 };
    }

    if (s.startsWith('delete from game_progress')) {
      const initial = this.tables.game_progress.length;
      this.tables.game_progress = this.tables.game_progress.filter((p) => p.game_id !== params[0]);
      return { lastInsertRowId: 0, changes: initial - this.tables.game_progress.length };
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  async getAllAsync<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const s = sql.trim().toLowerCase();

    if (s.includes('from favorites')) {
      return [...this.tables.favorites] as unknown as T[];
    }
    if (s.includes('from game_scores')) {
      let filtered = [...this.tables.game_scores];
      if (params.length > 0) {
        filtered = filtered.filter((r) => r.game_id === params[0]);
      }
      filtered.sort((a, b) => b.played_at - a.played_at);
      return filtered as unknown as T[];
    }
    if (s.includes('from game_stats')) {
      return [...this.tables.game_stats] as unknown as T[];
    }
    if (s.includes('from achievements')) {
      return [...this.tables.achievements] as unknown as T[];
    }
    if (s.includes('from user_settings')) {
      return [...this.tables.user_settings] as unknown as T[];
    }
    if (s.includes('from daily_challenges')) {
      return [...this.tables.daily_challenges] as unknown as T[];
    }
    if (s.includes('from game_progress')) {
      return [...this.tables.game_progress] as unknown as T[];
    }
    return [];
  }

  async getFirstAsync<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const s = sql.trim().toLowerCase();

    if (s.includes('from favorites where game_id')) {
      const f = this.tables.favorites.find((x) => x.game_id === params[0]);
      return (f as unknown as T) || null;
    }
    if (s.includes('from game_stats where game_id')) {
      const st = this.tables.game_stats.find((x) => x.game_id === params[0]);
      return (st as unknown as T) || null;
    }
    if (s.includes('from user_settings where key')) {
      const u = this.tables.user_settings.find((x) => x.key === params[0]);
      return (u as unknown as T) || null;
    }
    if (s.includes('from daily_challenges where date_key')) {
      const d = this.tables.daily_challenges.find((x) => x.date_key === params[0]);
      return (d as unknown as T) || null;
    }
    if (s.includes('from achievements where id')) {
      const a = this.tables.achievements.find((x) => x.id === params[0]);
      return (a as unknown as T) || null;
    }
    if (s.includes('from game_progress where game_id')) {
      const p = this.tables.game_progress.find((x) => x.game_id === params[0]);
      return (p as unknown as T) || null;
    }

    const all = await this.getAllAsync<T>(sql, params);
    return all.length > 0 ? all[0] : null;
  }
}

class AppDatabase {
  private driver: IDatabaseDriver | null = null;
  private initialized = false;

  public async getDriver(): Promise<IDatabaseDriver> {
    if (!this.initialized || !this.driver) {
      await this.init();
    }
    return this.driver!;
  }

  public async init(): Promise<void> {
    if (this.initialized && this.driver) return;

    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        const SQLite = require('expo-sqlite');
        const db = await SQLite.openDatabaseAsync('playmora_games.db');
        this.driver = db;
      } catch (err) {
        console.warn('Falling back to memory driver for SQLite:', err);
        this.driver = new MemoryDatabaseDriver();
      }
    } else {
      this.driver = new MemoryDatabaseDriver();
    }

    try {
      await this.driver!.execAsync(SCHEMA_V1);
    } catch (e) {
      console.warn('Error running initial database schema:', e);
    }

    this.initialized = true;
  }
}

export const appDatabase = new AppDatabase();
