/**
 * Pure resolution of which overlay (if any) a game session should show.
 *
 * The rule is simple and testable: a session shows at most one overlay, and no
 * in-game overlay (game over / how to play / pause) may appear before the
 * session is actually ready. While a resumable snapshot is loading or awaiting
 * the player's resume decision, the loading spinner or resume prompt wins.
 */

export type ProgressState = 'loading' | 'prompt' | 'ready';

export type OverlayKind =
  | 'loading'
  | 'resume'
  | 'gameOver'
  | 'howToPlay'
  | 'pause'
  | 'none';

export interface OverlayInputs {
  progressState: ProgressState;
  isGameOverModalVisible: boolean;
  isHowToPlayVisible: boolean;
  isPaused: boolean;
  isMultiplayer: boolean;
}

/**
 * A game is interactive (and its overlays may mount) only once its session is
 * ready: not loading a snapshot and not waiting on the resume prompt.
 */
export function isGameInteractive(progressState: ProgressState): boolean {
  return progressState === 'ready';
}

/**
 * Resolves the single overlay to show, in priority order. Lower-priority
 * overlays are suppressed while a higher-priority one is active, which is what
 * prevents stacked/duplicate dialogs.
 */
export function resolveOverlayState(inputs: OverlayInputs): OverlayKind {
  const {
    progressState,
    isGameOverModalVisible,
    isHowToPlayVisible,
    isPaused,
    isMultiplayer,
  } = inputs;

  if (progressState === 'loading') return 'loading';
  if (progressState === 'prompt') return 'resume';

  if (isGameOverModalVisible && !isMultiplayer) return 'gameOver';
  if (isHowToPlayVisible) return 'howToPlay';
  if (isPaused) return 'pause';

  return 'none';
}

export interface GameOverHeader {
  /** Whether to show the "new personal best" trophy above the outcome. */
  showBestBanner: boolean;
  /** The outcome, always shown so the dialog always states win or loss. */
  title: 'YOU WIN!' | 'GAME OVER';
}

/**
 * The game-over dialog must always state the actual outcome. The "new personal
 * best" trophy is an additional accent, never a replacement for the outcome —
 * otherwise a first session (where a score of 0 is trivially a new best for a
 * higher-is-better game) would hide a loss behind "NEW PERSONAL BEST!".
 */
export function resolveGameOverHeader(
  isNewHighScore: boolean,
  didWin: boolean
): GameOverHeader {
  return {
    showBestBanner: isNewHighScore,
    title: didWin ? 'YOU WIN!' : 'GAME OVER',
  };
}
