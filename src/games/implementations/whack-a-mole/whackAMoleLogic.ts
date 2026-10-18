/**
 * Pure "Whack-a-Mole" helpers. Timed game — the UI drives spawning with these
 * small, testable array operations.
 */

export function createHoles(n: number): boolean[] {
  return Array.from({ length: n }, () => false);
}

export function availableHoles(holes: boolean[]): number[] {
  const out: number[] = [];
  holes.forEach((active, i) => {
    if (!active) out.push(i);
  });
  return out;
}

export function activeCount(holes: boolean[]): number {
  return holes.filter(Boolean).length;
}

/** Returns a random inactive hole index, or -1 if all are active. */
export function pickHole(holes: boolean[], rand: () => number = Math.random): number {
  const open = availableHoles(holes);
  if (open.length === 0) return -1;
  return open[Math.floor(rand() * open.length)];
}

export function setHole(holes: boolean[], index: number, active: boolean): boolean[] {
  if (index < 0 || index >= holes.length) return holes;
  return holes.map((v, i) => (i === index ? active : v));
}

export interface WhackResult {
  holes: boolean[];
  hit: boolean;
}

/** Resolves a whack: scores a hit and hides the mole, or records a miss. */
export function resolveWhack(holes: boolean[], index: number): WhackResult {
  if (index < 0 || index >= holes.length || !holes[index]) {
    return { holes, hit: false };
  }
  return { holes: setHole(holes, index, false), hit: true };
}

/** Score for hitting a mole, with a small bonus for streak. */
export function scoreForHit(streak: number): number {
  return 10 + Math.min(20, streak * 2);
}

/** Shortest/longest time (seconds) a mole stays up before hiding. */
export const MOLE_MIN_LIFE = 0.7;
export const MOLE_MAX_LIFE = 1.3;

/** All holes start with no mole (zero remaining life). */
export function createTimers(n: number): number[] {
  return Array.from({ length: n }, () => 0);
}

/** A hole is showing a mole while it has life left. */
export function holesFromTimers(timers: number[]): boolean[] {
  return timers.map((t) => t > 0);
}

/**
 * Advances every mole's remaining life by `dt` seconds. A `dt` of 0 (paused)
 * leaves them untouched, so mole hides freeze while the game is paused.
 */
export function tickTimers(timers: number[], dt: number): number[] {
  if (dt <= 0) return timers;
  return timers.map((t) => (t > 0 ? Math.max(0, +(t - dt).toFixed(3)) : 0));
}

/** Puts a mole in `index` for `duration` seconds. */
export function armHole(timers: number[], index: number, duration: number): number[] {
  if (index < 0 || index >= timers.length) return timers;
  return timers.map((t, i) => (i === index ? duration : t));
}

/** Lifespan for a freshly spawned mole. */
export function randomMoleLife(rand: () => number = Math.random): number {
  return MOLE_MIN_LIFE + rand() * (MOLE_MAX_LIFE - MOLE_MIN_LIFE);
}

/** Hole size that fits `cols` columns inside `innerWidth`, clamped to a usable range. */
export function holeSizeFor(innerWidth: number, cols: number, max = 96, min = 56): number {
  if (innerWidth <= 0 || cols <= 0) return min;
  return Math.max(min, Math.min(max, Math.floor(innerWidth / cols)));
}
