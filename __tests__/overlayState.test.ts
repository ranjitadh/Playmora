import { isGameInteractive, resolveGameOverHeader, resolveOverlayState, OverlayInputs } from '../src/games/engine/overlayState';

const base: OverlayInputs = {
  progressState: 'ready',
  isGameOverModalVisible: false,
  isHowToPlayVisible: false,
  isPaused: false,
  isMultiplayer: false,
};

describe('resolveOverlayState — one overlay, never before ready', () => {
  it('shows nothing for an idle, ready session', () => {
    expect(resolveOverlayState(base)).toBe('none');
  });

  it('prioritises the loading spinner over every in-game overlay', () => {
    expect(
      resolveOverlayState({
        ...base,
        progressState: 'loading',
        isPaused: true,
        isHowToPlayVisible: true,
        isGameOverModalVisible: true,
      })
    ).toBe('loading');
  });

  it('prioritises the resume prompt over in-game overlays', () => {
    expect(
      resolveOverlayState({
        ...base,
        progressState: 'prompt',
        isPaused: true,
        isGameOverModalVisible: true,
      })
    ).toBe('resume');
  });

  it('never shows pause, game over, or how-to-play before the game is ready', () => {
    expect(
      resolveOverlayState({ ...base, progressState: 'loading', isPaused: true })
    ).toBe('loading');
    expect(
      resolveOverlayState({ ...base, progressState: 'prompt', isHowToPlayVisible: true })
    ).toBe('resume');
  });

  it('renders only one overlay at a time (game over beats how-to-play and pause)', () => {
    expect(
      resolveOverlayState({
        ...base,
        isGameOverModalVisible: true,
        isHowToPlayVisible: true,
        isPaused: true,
      })
    ).toBe('gameOver');
    expect(
      resolveOverlayState({ ...base, isHowToPlayVisible: true, isPaused: true })
    ).toBe('howToPlay');
  });

  it('suppresses the game over dialog for multiplayer sessions', () => {
    expect(
      resolveOverlayState({ ...base, isMultiplayer: true, isGameOverModalVisible: true })
    ).toBe('none');
  });

  it('shows pause only when the session is ready and paused', () => {
    expect(resolveOverlayState({ ...base, isPaused: true })).toBe('pause');
    expect(resolveOverlayState({ ...base, progressState: 'loading', isPaused: true })).toBe(
      'loading'
    );
  });

  it('reports interactivity strictly from the progress state', () => {
    expect(isGameInteractive('ready')).toBe(true);
    expect(isGameInteractive('loading')).toBe(false);
    expect(isGameInteractive('prompt')).toBe(false);
  });
});

describe('resolveGameOverHeader — the outcome is never hidden', () => {
  it('states a win with no new best', () => {
    expect(resolveGameOverHeader(false, true)).toEqual({
      showBestBanner: false,
      title: 'YOU WIN!',
    });
  });

  it('states a loss with no new best', () => {
    expect(resolveGameOverHeader(false, false)).toEqual({
      showBestBanner: false,
      title: 'GAME OVER',
    });
  });

  it('still states a loss when the score is (trivially) a new best', () => {
    // A first session on a higher-is-better game treats a 0 score as a new
    // best; the dialog must not replace "GAME OVER" with the trophy banner.
    const header = resolveGameOverHeader(true, false);
    expect(header.showBestBanner).toBe(true);
    expect(header.title).toBe('GAME OVER');
  });

  it('states a win when the score is also a new best', () => {
    const header = resolveGameOverHeader(true, true);
    expect(header.showBestBanner).toBe(true);
    expect(header.title).toBe('YOU WIN!');
  });
});
