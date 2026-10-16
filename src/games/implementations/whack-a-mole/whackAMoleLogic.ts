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
