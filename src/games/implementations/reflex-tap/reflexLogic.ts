/**
 * Pure "Reaction Time Challenge" (reflex-tap) rush logic.
 *
 * The whole game runs off a single pure tick so that:
 *  - target lifetimes are tied to game-logic time (they never expire while paused),
 *  - target spawning stops the instant the rush ends,
 *  - the game-over transition happens exactly once,
 *  - target placement is computed from the real target/arena sizes so nothing
 *    is clipped on small screens.
 *
 * Randomness is drawn from a deterministic in-state PRNG so `stepReflex` is a
 * pure function of its inputs and therefore safe to run under React Strict Mode.
 */

export type TargetType = 'green' | 'cyan' | 'star' | 'skull';

export interface Target {
  id: number;
  /** Normalised horizontal placement in [0, 1]. */
  x: number;
  /** Normalised vertical placement in [0, 1]. */
  y: number;
  type: TargetType;
  /** Remaining lifetime in seconds of game-logic time. */
  ttl: number;
}

export interface ReflexState {
  score: number;
  combo: number;
  /** Remaining rush time in seconds. */
  timeLeft: number;
  targets: Target[];
  nextId: number;
  /** Seconds accumulated toward the next spawn attempt. */
  spawnTimer: number;
  seed: number;
  status: 'playing' | 'over';
}

export interface TargetSpec {
  lifetime: number;
  points: number;
  size: number;
}

export const TOTAL_RUSH_SECONDS = 30;
export const SPAWN_INTERVAL = 0.4;
export const MAX_TARGETS = 4;
export const MAX_COMBO = 5;
export const SKULL_PENALTY = 20;

export const TARGET_SPECS: Record<TargetType, TargetSpec> = {
  green: { lifetime: 1.6, points: 10, size: 64 },
  cyan: { lifetime: 1.3, points: 20, size: 58 },
  star: { lifetime: 1.1, points: 35, size: 52 },
  skull: { lifetime: 2.0, points: 0, size: 60 },
};

export type TapEvent =
  | { kind: 'penalty'; score: number }
  | { kind: 'hit'; score: number; combo: number; sound: 'pop' | 'combo' };

export interface TapResult {
  state: ReflexState;
  event: TapEvent | null;
}

export function targetSize(type: TargetType): number {
  return TARGET_SPECS[type].size;
}

/** Deterministic PRNG step (mulberry32); returns the value and the next seed. */
function nextRandom(seed: number): [number, number] {
  const t = (seed + 0x6d2b79f5) | 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  const value = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  return [value, t];
}

function pickType(rand: number): TargetType {
  if (rand < 0.25) return 'skull';
  if (rand < 0.55) return 'cyan';
  if (rand < 0.7) return 'star';
  return 'green';
}

export function createReflexState(seed = 1): ReflexState {
  return {
    score: 0,
    combo: 1,
    timeLeft: TOTAL_RUSH_SECONDS,
    targets: [],
    nextId: 1,
    spawnTimer: 0,
    seed,
    status: 'playing',
  };
}

/**
 * Advance the rush by `dt` seconds of game-logic time. Callers MUST NOT invoke
 * this while paused, so target lifetimes and the countdown only move with play.
 */
export function stepReflex(state: ReflexState, dt: number): ReflexState {
  if (state.status !== 'playing' || dt <= 0) return state;

  const timeLeft = state.timeLeft - dt;
  if (timeLeft <= 0) {
    return { ...state, timeLeft: 0, status: 'over', targets: [] };
  }

  let targets = state.targets
    .map((t) => ({ ...t, ttl: t.ttl - dt }))
    .filter((t) => t.ttl > 0);

  let spawnTimer = state.spawnTimer + dt;
  let nextId = state.nextId;
  let seed = state.seed;

  while (spawnTimer >= SPAWN_INTERVAL) {
    spawnTimer -= SPAWN_INTERVAL;
    if (targets.length < MAX_TARGETS) {
      let typeRand: number;
      let xRand: number;
      let yRand: number;
      [typeRand, seed] = nextRandom(seed);
      [xRand, seed] = nextRandom(seed);
      [yRand, seed] = nextRandom(seed);
      const type = pickType(typeRand);
      targets = [
        ...targets,
        { id: nextId++, x: xRand, y: yRand, type, ttl: TARGET_SPECS[type].lifetime },
      ];
    }
  }

  return { ...state, timeLeft, targets, spawnTimer, nextId, seed };
}

/** Apply a tap to a target, returning the new state and the side-effect event. */
export function tapTarget(state: ReflexState, id: number): TapResult {
  if (state.status !== 'playing') return { state, event: null };

  const target = state.targets.find((t) => t.id === id);
  if (!target) return { state, event: null };

  const targets = state.targets.filter((t) => t.id !== id);

  if (target.type === 'skull') {
    const score = Math.max(0, state.score - SKULL_PENALTY);
    return {
      state: { ...state, targets, score, combo: 1 },
      event: { kind: 'penalty', score },
    };
  }

  const gained = TARGET_SPECS[target.type].points * state.combo;
  const score = state.score + gained;
  const combo = Math.min(MAX_COMBO, state.combo + 1);
  return {
    state: { ...state, targets, score, combo },
    event: { kind: 'hit', score, combo, sound: state.combo > 2 ? 'combo' : 'pop' },
  };
}

/**
 * Map a normalised placement fraction to a pixel offset that keeps a target of
 * `size` fully inside `available` pixels (never negative, never overhanging).
 */
export function safeOffset(fraction: number, size: number, available: number): number {
  const clamped = Math.min(1, Math.max(0, fraction));
  return clamped * Math.max(0, available - size);
}
