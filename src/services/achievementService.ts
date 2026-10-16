import { appDatabase } from '../database/database';
import { GAME_CATALOG } from '../games/catalog';
import {
  DailyChallengeService,
  computeDailyChallengeSpec,
  formatLocalDateKey,
} from './dailyChallengeService';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: number | null;
  progress: number;
  maxProgress: number;
}

export const ACHIEVEMENTS_DEF: Omit<Achievement, 'unlockedAt' | 'progress'>[] = [
  {
    id: 'first_game',
    title: 'First Step',
    description: 'Play your first mini-game in Playmora.',
    icon: 'play-outline',
    maxProgress: 1,
  },
  {
    id: 'five_games',
    title: 'Arcade Explorer',
    description: 'Play at least 5 different mini-games.',
    icon: 'compass-outline',
    maxProgress: 5,
  },
  {
    id: 'ten_games',
    title: 'Dedicated Player',
    description: 'Play at least 10 different mini-games.',
    icon: 'flame-outline',
    maxProgress: 10,
  },
  {
    id: 'first_pb',
    title: 'New Heights',
    description: 'Set your very first personal high score.',
    icon: 'trending-up-outline',
    maxProgress: 1,
  },
  {
    id: 'puzzle_master',
    title: 'Puzzle Master',
    description: 'Score 100+ points in any puzzle game.',
    icon: 'extension-puzzle-outline',
    maxProgress: 1,
  },
  {
    id: 'arcade_streak',
    title: 'Arcade Streak',
    description: 'Score 50+ points in any arcade game.',
    icon: 'flash-outline',
    maxProgress: 1,
  },
  {
    id: 'daily_challenge',
    title: 'Daily Champion',
    description: 'Complete today’s featured daily challenge.',
    icon: 'calendar-outline',
    maxProgress: 1,
  },
];

export class AchievementService {
  public static async getAchievements(): Promise<Achievement[]> {
    const db = await appDatabase.getDriver();
    const rows = await db.getAllAsync<{
      id: string;
      unlocked_at: number | null;
      progress: number;
    }>(`SELECT id, unlocked_at, progress FROM achievements`);

    const progressMap = new Map(rows.map((r) => [r.id, r]));

    return ACHIEVEMENTS_DEF.map((def) => {
      const stored = progressMap.get(def.id);
      return {
        ...def,
        unlockedAt: stored?.unlocked_at ?? null,
        progress: stored?.progress ?? 0,
      };
    });
  }

  public static async checkOnGameFinished(params: {
    gameId: string;
    score: number;
    isNewHighScore: boolean;
    totalGamesPlayedCount: number;
    distinctGamesPlayedCount: number;
  }): Promise<Achievement[]> {
    const db = await appDatabase.getDriver();
    const newlyUnlocked: Achievement[] = [];
    const all = await this.getAchievements();
    const game = GAME_CATALOG.find((g) => g.id === params.gameId);

    for (const ach of all) {
      if (ach.unlockedAt) continue;

      let shouldUnlock = false;
      let currentProgress = ach.progress;

      if (ach.id === 'first_game' && params.totalGamesPlayedCount >= 1) {
        shouldUnlock = true;
        currentProgress = 1;
      } else if (ach.id === 'five_games') {
        currentProgress = Math.min(params.distinctGamesPlayedCount, 5);
        if (currentProgress >= 5) shouldUnlock = true;
      } else if (ach.id === 'ten_games') {
        currentProgress = Math.min(params.distinctGamesPlayedCount, 10);
        if (currentProgress >= 10) shouldUnlock = true;
      } else if (ach.id === 'first_pb' && params.isNewHighScore) {
        shouldUnlock = true;
        currentProgress = 1;
      } else if (ach.id === 'puzzle_master' && game?.category === 'brain' && params.score >= 100) {
        shouldUnlock = true;
        currentProgress = 1;
      } else if (ach.id === 'arcade_streak' && game?.category === 'retro' && params.score >= 50) {
        shouldUnlock = true;
        currentProgress = 1;
      }

      // Preserve an existing unlock (e.g. Daily Champion earned via the daily
      // challenge helpers) when this run does not re-trigger it.
      const unlockedAt = shouldUnlock ? Date.now() : ach.unlockedAt;
      await db.runAsync(
        `INSERT OR REPLACE INTO achievements (id, title, description, unlocked_at, progress, max_progress)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ach.id, ach.title, ach.description, unlockedAt, currentProgress, ach.maxProgress]
      );

      if (shouldUnlock) {
        newlyUnlocked.push({ ...ach, unlockedAt, progress: currentProgress });
      }
    }

    return newlyUnlocked;
  }

  /**
   * Unlock the Daily Champion achievement the first time today's challenge is
   * completed. Returns `null` when it is already unlocked.
   */
  public static async markDailyChallengeCompleted(): Promise<Achievement | null> {
    const db = await appDatabase.getDriver();
    const def = ACHIEVEMENTS_DEF.find((a) => a.id === 'daily_challenge');
    if (!def) return null;

    const existing = await db.getFirstAsync<{ unlocked_at: number | null; progress: number }>(
      `SELECT id, unlocked_at, progress FROM achievements WHERE id = ?`,
      [def.id]
    );
    if (existing?.unlocked_at) return null;

    const unlockedAt = Date.now();
    await db.runAsync(
      `INSERT OR REPLACE INTO achievements (id, title, description, unlocked_at, progress, max_progress)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [def.id, def.title, def.description, unlockedAt, 1, def.maxProgress]
    );

    return { ...def, unlockedAt, progress: 1 };
  }

  /**
   * Deterministic challenge for today, derived from the shared daily challenge
   * helpers (single source of truth with {@link DailyChallengeService}).
   */
  public static getDailyChallenge(): {
    dateKey: string;
    gameId: string;
    gameTitle: string;
    targetScore: number;
  } {
    const spec = computeDailyChallengeSpec(new Date(), GAME_CATALOG.filter((g) => g.isImplemented));
    if (!spec) {
      // Defensive: an empty implemented catalog must not crash the UI.
      return {
        dateKey: formatLocalDateKey(new Date()),
        gameId: '',
        gameTitle: 'Daily Challenge',
        targetScore: 0,
      };
    }
    return {
      dateKey: spec.dateKey,
      gameId: spec.gameId,
      gameTitle: spec.gameTitle,
      targetScore: spec.targetScore,
    };
  }
}
