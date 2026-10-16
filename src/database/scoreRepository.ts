import { appDatabase } from './database';
import { GameStats, ScoreType } from '../games/types';
import { getGameById } from '../games/catalog';
import {
  BestScore,
  evaluateBestScore,
  getBestScoreLabel,
  toBestScore,
} from '../games/scoreUtils';

export interface ScoreRecord {
  id: number;
  game_id: string;
  score: number;
  played_at: number;
  metadata?: string;
}

export interface RecordScoreResult {
  isNewHighScore: boolean;
  currentHighScore: number;
  /** Score-mode aware best after recording; `null` when no valid record exists. */
  bestScore: BestScore;
}

interface StatsRow {
  game_id: string;
  high_score: number;
  times_played: number;
  last_played_at: number;
  total_time_spent?: number;
}

/**
 * Resolve the score mode for a game. The catalog's `GameDefinition.scoreType`
 * is the single source of truth; unknown games fall back to `points`.
 */
export function resolveScoreType(gameId: string, explicit?: ScoreType): ScoreType {
  if (explicit) return explicit;
  return getGameById(gameId)?.scoreType ?? 'points';
}

function toGameStats(row: StatsRow): GameStats {
  const scoreType = resolveScoreType(row.game_id);
  return {
    timesPlayed: row.times_played,
    highScore: row.high_score,
    bestScore: toBestScore(row.high_score, scoreType),
    scoreType,
    bestLabel: getBestScoreLabel(scoreType),
    lastPlayedAt: row.last_played_at,
  };
}

export class ScoreRepository {
  public static async recordScore(
    gameId: string,
    score: number,
    metadata?: Record<string, unknown>,
    scoreType?: ScoreType
  ): Promise<RecordScoreResult> {
    const db = await appDatabase.getDriver();
    const type = resolveScoreType(gameId, scoreType);
    const now = Date.now();
    const metaStr = metadata ? JSON.stringify(metadata) : null;

    // 1. Insert new score entry
    await db.runAsync(
      `INSERT INTO game_scores (game_id, score, played_at, metadata) VALUES (?, ?, ?, ?)`,
      [gameId, score, now, metaStr]
    );

    // 2. Fetch current stats
    const existingStats = await db.getFirstAsync<StatsRow>(
      `SELECT * FROM game_stats WHERE game_id = ?`,
      [gameId]
    );

    // 3. Compare using the game's score mode. An initial `0` stored for a
    //    time/moves game is a placeholder, never an existing record.
    const evaluation = evaluateBestScore(existingStats?.high_score ?? null, score, type);

    let timesPlayed = 1;
    if (existingStats) {
      timesPlayed = (existingStats.times_played || 0) + 1;
    }

    const newHighScore = evaluation.best ?? 0;

    // 4. Upsert stats
    await db.runAsync(
      `INSERT OR REPLACE INTO game_stats (game_id, high_score, times_played, last_played_at, total_time_spent)
       VALUES (?, ?, ?, ?, ?)`,
      [gameId, newHighScore, timesPlayed, now, 0]
    );

    return {
      isNewHighScore: evaluation.isBest,
      currentHighScore: newHighScore,
      bestScore: evaluation.best,
    };
  }

  /**
   * Raw stored best value. Returns `0` when nothing has been recorded, which
   * for time/moves games is only a placeholder — use {@link getBestScore} for
   * the safe no-score state.
   */
  public static async getHighScore(gameId: string): Promise<number> {
    const db = await appDatabase.getDriver();
    const stat = await db.getFirstAsync<{ high_score: number }>(
      `SELECT high_score FROM game_stats WHERE game_id = ?`,
      [gameId]
    );
    return stat ? stat.high_score : 0;
  }

  /**
   * Score-mode aware best value: `null` when there is no valid record. An
   * initial `0` for a time/moves game resolves to `null`.
   */
  public static async getBestScore(gameId: string): Promise<BestScore> {
    const raw = await this.getHighScore(gameId);
    return toBestScore(raw, resolveScoreType(gameId));
  }

  public static async getGameStats(gameId: string): Promise<GameStats | null> {
    const db = await appDatabase.getDriver();
    const stat = await db.getFirstAsync<StatsRow>(
      `SELECT * FROM game_stats WHERE game_id = ?`,
      [gameId]
    );

    if (!stat) return null;
    return toGameStats(stat);
  }

  public static async getAllStats(): Promise<Record<string, GameStats>> {
    const db = await appDatabase.getDriver();
    const rows = await db.getAllAsync<StatsRow>(`SELECT * FROM game_stats`);

    const result: Record<string, GameStats> = {};
    for (const r of rows) {
      result[r.game_id] = toGameStats(r);
    }
    return result;
  }

  public static async getRecentGames(limit: number = 6): Promise<string[]> {
    const db = await appDatabase.getDriver();
    const rows = await db.getAllAsync<{ game_id: string; last_played_at: number }>(
      `SELECT game_id, last_played_at FROM game_stats ORDER BY last_played_at DESC LIMIT ?`,
      [limit]
    );
    // Sort/slice in shared code so the SQLite and memory drivers behave identically.
    return [...rows]
      .sort((a, b) => (b.last_played_at ?? 0) - (a.last_played_at ?? 0))
      .slice(0, limit)
      .map((r) => r.game_id);
  }
}
