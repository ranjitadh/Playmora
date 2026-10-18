import { useEffect, useRef, type MutableRefObject } from 'react';

/**
 * Keeps a ref in sync with the engine's `isPaused` flag.
 *
 * Game loops (requestAnimationFrame / setInterval) read `ref.current` to skip
 * their update while a session is paused (manual pause or app backgrounding).
 * Using a ref instead of re-running the loop effect on every pause toggle avoids
 * tearing down and rebuilding timers/animation frames.
 */
export function usePausedRef(isPaused?: boolean): MutableRefObject<boolean> {
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = !!isPaused;
  }, [isPaused]);

  return pausedRef;
}
