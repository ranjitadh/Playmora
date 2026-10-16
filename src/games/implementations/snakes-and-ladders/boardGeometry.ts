/**
 * Pure geometry for rendering the Snakes and Ladders board.
 * All coordinates are in "board units": 0..1 on both axes (the board is square).
 * No React Native imports — kept testable in isolation.
 */

export const GRID = 10;

export interface XY {
  x: number;
  y: number;
}

export interface SnakeSegment {
  x: number;
  y: number;
  length: number;
  width: number;
  angle: number;
}

export interface SnakePath {
  points: XY[];
  segments: SnakeSegment[];
  head: XY;
  tail: XY;
  headWidth: number;
  tailWidth: number;
  headAngle: number;
}

/** Center of square n (1..100) in board units, honoring boustrophedon layout. */
export function cellCenter(square: number): XY {
  const clamped = Math.max(1, Math.min(GRID * GRID, Math.floor(square)));
  const idx = clamped - 1;
  const rowFromBottom = Math.floor(idx / GRID);
  const within = idx % GRID;
  const colFromLeft = rowFromBottom % 2 === 0 ? within : GRID - 1 - within;
  return {
    x: (colFromLeft + 0.5) / GRID,
    y: (GRID - 1 - rowFromBottom + 0.5) / GRID,
  };
}

const HEAD_WIDTH = 0.054;
const TAIL_WIDTH = 0.016;
const MIN_OFFSET = 0.02;
const MAX_OFFSET = 0.98;

const clamp = (v: number) => Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, v));

/**
 * Sinusoidal, gently tapering path from the head square to the tail square.
 * Endpoints sit exactly on the two cell centers.
 */
export function snakePath(
  headSquare: number,
  tailSquare: number,
  sampleCount = 14,
  seed = 0
): SnakePath {
  const a = cellCenter(headSquare);
  const b = cellCenter(tailSquare);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const nx = -dy / dist;
  const ny = dx / dist;
  const amplitude = Math.min(0.08, dist * 0.32);
  const waves = dist > 0.35 ? 1.75 : 1.15;
  const phase = (seed % 2) * Math.PI + (seed % 3) * 0.35;

  const points: XY[] = [];
  const widths: number[] = [];
  const count = Math.max(4, sampleCount);
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const bend = Math.sin(t * Math.PI * waves + phase) * Math.sin(Math.PI * t);
    points.push({
      x: clamp(a.x + dx * t + nx * amplitude * bend),
      y: clamp(a.y + dy * t + ny * amplitude * bend),
    });
    widths.push(HEAD_WIDTH + (TAIL_WIDTH - HEAD_WIDTH) * Math.pow(t, 0.85));
  }

  const segments: SnakeSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i];
    const q = points[i + 1];
    const ddx = q.x - p.x;
    const ddy = q.y - p.y;
    const d = Math.hypot(ddx, ddy);
    const w = (widths[i] + widths[i + 1]) / 2;
    segments.push({
      x: (p.x + q.x) / 2,
      y: (p.y + q.y) / 2,
      // Slight over-extension closes seams between capsule segments.
      length: d + w * 0.55,
      width: w,
      angle: (Math.atan2(ddy, ddx) * 180) / Math.PI,
    });
  }

  return {
    points,
    segments,
    head: points[0],
    tail: points[points.length - 1],
    headWidth: HEAD_WIDTH,
    tailWidth: TAIL_WIDTH,
    // Face away from the body: reverse the straight-line head->tail direction.
    headAngle: (Math.atan2(dy, dx) * 180) / Math.PI + 180,
  };
}

export interface LadderGeometry {
  start: XY;
  end: XY;
  mid: XY;
  length: number;
  angle: number;
  width: number;
}

/** Positioned/rotated ladder from the lower square up to the higher square. */
export function ladderGeometry(
  bottomSquare: number,
  topSquare: number,
  width = 0.052
): LadderGeometry {
  const a = cellCenter(bottomSquare);
  const b = cellCenter(topSquare);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return {
    start: a,
    end: b,
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    length: Math.hypot(dx, dy),
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    width,
  };
}

/** Standard die pip positions, as percentages of the die face. */
export const PIP_LAYOUTS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 50, y: 50 }],
  2: [
    { x: 28, y: 28 },
    { x: 72, y: 72 },
  ],
  3: [
    { x: 26, y: 26 },
    { x: 50, y: 50 },
    { x: 74, y: 74 },
  ],
  4: [
    { x: 28, y: 28 },
    { x: 72, y: 28 },
    { x: 28, y: 72 },
    { x: 72, y: 72 },
  ],
  5: [
    { x: 27, y: 27 },
    { x: 73, y: 27 },
    { x: 50, y: 50 },
    { x: 27, y: 73 },
    { x: 73, y: 73 },
  ],
  6: [
    { x: 30, y: 24 },
    { x: 30, y: 50 },
    { x: 30, y: 76 },
    { x: 70, y: 24 },
    { x: 70, y: 50 },
    { x: 70, y: 76 },
  ],
};

export function pipsFor(value: number): { x: number; y: number }[] {
  return PIP_LAYOUTS[value] ?? [];
}
