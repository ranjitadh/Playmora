import type { BestScore, BestScoreLabel } from './scoreUtils';

export type GameCategory = 'retro' | 'traditional' | 'racing' | 'brain' | 'modern';

export type GameStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'game_over' | 'completed';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type ScoreType = 'points' | 'time_lower_is_better' | 'moves_lower_is_better' | 'levels';

export interface GameDefinition {
  id: string;
  title: string;
  category: GameCategory;
  description: string;
  rules: string[];
  instructions: string;
  iconName: string; // Ionicons icon name
  badgeColor: string;
  scoreType: ScoreType;
  isImplemented: boolean;
  minPlayers?: number;
  maxPlayers?: number;
  orientation?: 'portrait' | 'landscape';
  difficulty?: DifficultyLevel;
  tags?: string[];
}

export interface GameSessionProps {
  gameId: string;
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number, metadata?: Record<string, unknown>) => void;
  onGameWin?: (finalScore: number, metadata?: Record<string, unknown>) => void;
  onExit: () => void;
  isMuted: boolean;
  isHapticsEnabled: boolean;
  isPaused?: boolean;
  /**
   * Game-specific saved state to restore when the player chooses "Continue".
   * Only provided for games that opt into resumable sessions; `undefined`
   * means a fresh start.
   */
  initialProgress?: unknown;
  /**
   * Persists a game-specific snapshot so the player can resume later. Only
   * games that opt into resumable sessions should call this.
   */
  onSaveProgress?: (state: unknown) => void;
}

export interface GameStats {
  timesPlayed: number;
  /** Raw stored best value (kept for backwards compatibility). */
  highScore: number;
  /** Score-mode aware best; `null` when nothing has been recorded yet. */
  bestScore: BestScore;
  /** Score mode used to compare scores for this game. */
  scoreType: ScoreType;
  /** Localized label for the best value (BEST / BEST TIME / BEST MOVES). */
  bestLabel: BestScoreLabel;
  lastPlayedAt?: number;
  totalTimeSpentSeconds?: number;
}
