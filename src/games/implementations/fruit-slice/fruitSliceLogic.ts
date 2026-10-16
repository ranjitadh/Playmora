/**
 * Pure Fruit Slice logic. No RN dependencies.
 *
 * Positions live in a normalised 0..1 space (y grows downward). Fruits launch
 * from below the screen and arc up under gravity; the player's swipe is a line
 * segment tested against each entity's circle. Slicing a bomb ends the run;
 * letting a fruit fall off the bottom costs a life.
 */

export type EntityKind = 'fruit' | 'bomb';

export interface Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  kind: EntityKind;
  color: string;
}

export interface FruitState {
  entities: Entity[];
  score: number;
  lives: number;
  sliced: number;
  nextId: number;
  outcome: 'in_progress' | 'won' | 'lost';
}

export const GRAVITY = 1.4;
export const MISS_Y = 1.32;

const FRUIT_COLORS = ['#EF4444', '#F59E0B', '#FACC15', '#22C55E', '#A855F7', '#F97316'];
const BOMB_COLOR = '#202124';

export function createFruitGame(lives = 3): FruitState {
  return { entities: [], score: 0, lives, sliced: 0, nextId: 1, outcome: 'in_progress' };
}

export interface SpawnOptions {
  forceBomb?: boolean;
}

/** Launches one entity from the bottom with an upward, spread velocity. */
export function spawnEntity(state: FruitState, opts: SpawnOptions = {}): FruitState {
  const kind: EntityKind = opts.forceBomb ? 'bomb' : 'fruit';
  const x = 0.15 + Math.random() * 0.7;
  const vy = -(1.15 + Math.random() * 0.35);
  const vx = (0.5 - x) * (0.8 + Math.random() * 0.6);
  const entity: Entity = {
    id: state.nextId,
    x,
    y: 1.08,
    vx,
    vy,
    radius: 0.055,
    kind,
    color: kind === 'bomb' ? BOMB_COLOR : FRUIT_COLORS[Math.floor(Math.random() * FRUIT_COLORS.length)],
  };
  return { ...state, entities: [...state.entities, entity], nextId: state.nextId + 1 };
}

/** Advances physics by `dt` seconds, culling entities that fall off-screen. */
export function stepPhysics(state: FruitState, dt: number): FruitState {
  const kept: Entity[] = [];
  let lives = state.lives;
  for (const e of state.entities) {
    const vy = e.vy + GRAVITY * dt;
    const y = e.y + vy * dt;
    const x = e.x + e.vx * dt;
    if (y > MISS_Y) {
      if (e.kind === 'fruit') lives -= 1;
      continue;
    }
    kept.push({ ...e, x, y, vy });
  }
  const outcome = lives <= 0 ? 'lost' : state.outcome;
  return { ...state, entities: kept, lives: Math.max(0, lives), outcome };
}

/** Shortest distance from point C to segment AB. */
export function pointToSegment(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((cx - ax) * dx + (cy - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const px = ax + t * dx;
  const py = ay + t * dy;
  return Math.hypot(cx - px, cy - py);
}

export function segmentHitsCircle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  r: number
): boolean {
  return pointToSegment(ax, ay, bx, by, cx, cy) <= r;
}

/**
 * Slices along the segment A->B. Sliced fruits add to the score and disappear;
 * slicing a bomb ends the run immediately.
 */
export function sliceSegment(
  state: FruitState,
  ax: number,
  ay: number,
  bx: number,
  by: number
): FruitState {
  if (state.outcome !== 'in_progress') return state;
  const removed = new Set<number>();
  let score = state.score;
  let sliced = state.sliced;
  let bomb = false;

  for (const e of state.entities) {
    if (removed.has(e.id)) continue;
    if (segmentHitsCircle(ax, ay, bx, by, e.x, e.y, e.radius)) {
      removed.add(e.id);
      if (e.kind === 'bomb') bomb = true;
      else {
        sliced += 1;
        score += 10;
      }
    }
  }
  if (removed.size === 0) return state;
  const entities = state.entities.filter((e) => !removed.has(e.id));
  return { ...state, entities, score, sliced, outcome: bomb ? 'lost' : state.outcome };
}
