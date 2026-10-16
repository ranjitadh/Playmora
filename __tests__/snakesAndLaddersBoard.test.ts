import {
  PIP_LAYOUTS,
  cellCenter,
  ladderGeometry,
  pipsFor,
  snakePath,
} from '../src/games/implementations/snakes-and-ladders/boardGeometry';
import { LADDERS, SNAKES } from '../src/games/implementations/snakes-and-ladders/snakesAndLaddersLogic';

describe('cellCenter', () => {
  it('places first row along the bottom, left to right', () => {
    expect(cellCenter(1)).toEqual({ x: 0.05, y: 0.95 });
    expect(cellCenter(10)).toEqual({ x: 0.95, y: 0.95 });
  });

  it('snakes back on the second row (boustrophedon)', () => {
    expect(cellCenter(11)).toEqual({ x: 0.95, y: 0.85 });
    expect(cellCenter(20)).toEqual({ x: 0.05, y: 0.85 });
  });

  it('places square 100 at the top-left as the final square', () => {
    expect(cellCenter(100)).toEqual({ x: 0.05, y: 0.05 });
    expect(cellCenter(91)).toEqual({ x: 0.95, y: 0.05 });
  });

  it('clamps out-of-range squares', () => {
    expect(cellCenter(0)).toEqual(cellCenter(1));
    expect(cellCenter(1000)).toEqual(cellCenter(100));
  });
});

describe('snakePath', () => {
  it('starts and ends exactly on the two cell centers', () => {
    Object.entries(SNAKES).forEach(([head, tail], i) => {
      const path = snakePath(Number(head), Number(tail), 14, i);
      expect(path.head.x).toBeCloseTo(cellCenter(Number(head)).x, 5);
      expect(path.head.y).toBeCloseTo(cellCenter(Number(head)).y, 5);
      expect(path.tail.x).toBeCloseTo(cellCenter(Number(tail)).x, 5);
      expect(path.tail.y).toBeCloseTo(cellCenter(Number(tail)).y, 5);
    });
  });

  it('keeps every point on the board', () => {
    Object.entries(SNAKES).forEach(([head, tail], i) => {
      const path = snakePath(Number(head), Number(tail), 14, i);
      path.points.forEach((p) => {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(1);
      });
    });
  });

  it('tapers from a wide head to a narrow tail', () => {
    const path = snakePath(16, 6, 14, 0);
    expect(path.headWidth).toBeGreaterThan(path.tailWidth);
    path.segments.forEach((seg) => {
      expect(seg.width).toBeGreaterThan(0);
      expect(seg.length).toBeGreaterThan(0);
      expect(Number.isFinite(seg.angle)).toBe(true);
    });
  });

  it('faces the head away from the body', () => {
    const path = snakePath(16, 6, 14, 0);
    const towardTail = (Math.atan2(
      path.tail.y - path.head.y,
      path.tail.x - path.head.x
    ) * 180) / Math.PI;
    let diff = Math.abs(path.headAngle - towardTail);
    if (diff > 180) diff = 360 - diff;
    expect(diff).toBeCloseTo(180, 0);
  });
});

describe('ladderGeometry', () => {
  it('connects the two cell centers with correct length and angle', () => {
    const g = ladderGeometry(1, 38);
    expect(g.start).toEqual(cellCenter(1));
    expect(g.end).toEqual(cellCenter(38));
    expect(g.length).toBeCloseTo(Math.hypot(0.2, -0.3), 5);
    expect(g.angle).toBeCloseTo((Math.atan2(-0.3, 0.2) * 180) / Math.PI, 5);
    expect(g.mid.x).toBeCloseTo((g.start.x + g.end.x) / 2, 5);
    expect(g.mid.y).toBeCloseTo((g.start.y + g.end.y) / 2, 5);
  });

  it('covers every ladder in the rules', () => {
    Object.entries(LADDERS).forEach(([from, to]) => {
      const g = ladderGeometry(Number(from), Number(to));
      expect(g.length).toBeGreaterThan(0);
      expect(Number.isFinite(g.angle)).toBe(true);
    });
  });
});

describe('dice pips', () => {
  it('uses the standard 1-6 pip counts', () => {
    expect(pipsFor(1)).toHaveLength(1);
    expect(pipsFor(2)).toHaveLength(2);
    expect(pipsFor(3)).toHaveLength(3);
    expect(pipsFor(4)).toHaveLength(4);
    expect(pipsFor(5)).toHaveLength(5);
    expect(pipsFor(6)).toHaveLength(6);
  });

  it('returns no pips for invalid faces', () => {
    expect(pipsFor(0)).toEqual([]);
    expect(pipsFor(7)).toEqual([]);
    expect(Object.keys(PIP_LAYOUTS)).toHaveLength(6);
  });
});
