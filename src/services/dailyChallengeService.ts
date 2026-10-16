import { appDatabase } from '../database/database';
import { GAME_CATALOG, getGameById } from '../games/catalog';
import type { GameDefinition, ScoreType } from '../games/types';
import { meetsTarget } from '../games/scoreUtils';

export interface DailyChallengeSpec {
  dateKey: string;
  gameId: string;
  gameTitle: string;
  targetScore: number;
  scoreType: ScoreType;
}

export interface DailyChallengeState {
  available: boolean;
  spec: DailyChallengeSpec | null;
  completed: boolean;
  completedAt: number | null;
}

export interface DailyChallengeCompletionResult {
  available: boolean;
  completed: boolean;
  newlyCompleted: boolean;
}

interface DailyChallengeRow {
  date_key: string;
  game_id: string;
  target_score: number;
  completed: number;
  completed_at: number | null;
}

/** Local calendar date key, e.g. `2026-10-16`. */
export function formatLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashDateKey(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash << 5) - hash + dateKey.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Deterministic challenge for a local date: one implemented game plus a target
 * score. Returns `null` when the implemented catalog is empty so callers can
 * degrade gracefully instead of crashing.
 */
export function computeDailyChallengeSpec(
  date: Date = new Date(),
  games: GameDefinition[] = GAME_CATALOG.filter((g) => g.isImplemented)
): DailyChallengeSpec | null {
  if (!Array.isArray(games) || games.length === 0) return null;

  const dateKey = formatLocalDateKey(date);
  const hash = hashDateKey(dateKey);
  const index = Math.abs(hash) % games.length;
  const selected = games[index];
  const targetScore = 50 + (Math.abs(hash * 13) % 150);

  return {
    dateKey,
    gameId: selected.id,
    gameTitle: selected.title,
    targetScore,
    scoreType: selected.scoreType,
  };
}

function rowToSpec(row: DailyChallengeRow): DailyChallengeSpec {
  const game = getGameById(row.game_id);
  return {
    dateKey: row.date_key,
    gameId: row.game_id,
    gameTitle: game?.title ?? row.game_id,
    targetScore: row.target_score,
    scoreType: game?.scoreType ?? 'points',
  };
}

export class DailyChallengeService {
  /**
   * Today's persisted record (one row per local date). The row is created on
   * first read using the deterministic spec for the date.
   */
  public static async getTodayState(date: Date = new Date()): Promise<DailyChallengeState> {
    const spec = computeDailyChallengeSpec(date);
    if (!spec) {
      return { available: false, spec: null, completed: false, completedAt: null };
    }

    const record = await this.getRecord(spec.dateKey);
    if (!record) {
      await this.upsertRecord({ ...spec, completed: false, completedAt: null });
      return { available: true, spec, completed: false, completedAt: null };
    }

    return {
      available: true,
      spec: rowToSpec(record),
      completed: record.completed === 1,
      completedAt: record.completed_at ?? null,
    };
  }

  public static async getRecord(dateKey: string): Promise<DailyChallengeRow | null> {
    const db = await appDatabase.getDriver();
    return db.getFirstAsync<DailyChallengeRow>(
      `SELECT * FROM daily_challenges WHERE date_key = ?`,
      [dateKey]
    );
  }

  public static async isCompletedToday(date: Date = new Date()): Promise<boolean> {
    const state = await this.getTodayState(date);
    return state.completed;
  }

  /**
   * Mark today's challenge complete — but only when the finishing game and
   * score satisfy today's game and target. Idempotent: repeated calls after a
   * completed challenge report `completed` without a new completion.
   */
  public static async completeIfSatisfied(params: {
    gameId: string;
    score: number;
    date?: Date;
  }): Promise<DailyChallengeCompletionResult> {
    const date = params.date ?? new Date();
    const spec = computeDailyChallengeSpec(date);
    if (!spec) {
      return { available: false, completed: false, newlyCompleted: false };
    }

    let record = await this.getRecord(spec.dateKey);
    if (!record) {
      await this.upsertRecord({ ...spec, completed: false, completedAt: null });
      record = await this.getRecord(spec.dateKey);
    }

    if (record && record.completed === 1) {
      return { available: true, completed: true, newlyCompleted: false };
    }

    const storedGameId = record?.game_id ?? spec.gameId;
    if (storedGameId !== params.gameId) {
      return { available: true, completed: false, newlyCompleted: false };
    }

    const target = record?.target_score ?? spec.targetScore;
    const scoreType = getGameById(storedGameId)?.scoreType ?? spec.scoreType;
    if (!meetsTarget(params.score, target, scoreType)) {
      return { available: true, completed: false, newlyCompleted: false };
    }

    await this.upsertRecord({
      dateKey: spec.dateKey,
      gameId: storedGameId,
      targetScore: target,
      completed: true,
      completedAt: Date.now(),
    });

    return { available: true, completed: true, newlyCompleted: true };
  }

  private static async upsertRecord(record: {
    dateKey: string;
    gameId: string;
    targetScore: number;
    completed: boolean;
    completedAt: number | null;
  }): Promise<void> {
    const db = await appDatabase.getDriver();
    // INSERT OR REPLACE keyed by date_key keeps one row per local date and is
    // supported identically by the SQLite and in-memory drivers (no UPDATE).
    await db.runAsync(
      `INSERT OR REPLACE INTO daily_challenges (date_key, game_id, target_score, completed, completed_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        record.dateKey,
        record.gameId,
        record.targetScore,
        record.completed ? 1 : 0,
        record.completedAt,
      ]
    );
  }
}
