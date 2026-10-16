import {
  activeCount,
  availableHoles,
  createHoles,
  pickHole,
  resolveWhack,
  scoreForHit,
  setHole,
} from '../src/games/implementations/whack-a-mole/whackAMoleLogic';

describe('Whack-a-Mole — holes', () => {
  it('creates the requested number of inactive holes', () => {
    const h = createHoles(9);
    expect(h.length).toBe(9);
    expect(activeCount(h)).toBe(0);
    expect(availableHoles(h).length).toBe(9);
  });

  it('sets a hole active and inactive', () => {
    const on = setHole(createHoles(9), 4, true);
    expect(on[4]).toBe(true);
    expect(availableHoles(on)).not.toContain(4);
    expect(setHole(on, 4, false)[4]).toBe(false);
  });
});

describe('Whack-a-Mole — spawning', () => {
  it('picks an available hole', () => {
    const holes = createHoles(4);
    const i = pickHole(holes, () => 0);
    expect(i).toBe(0);
    expect(holes[i]).toBe(false);
  });

  it('returns -1 when every hole is active', () => {
    const allOn = createHoles(3).map(() => true);
    expect(pickHole(allOn)).toBe(-1);
  });
});

describe('Whack-a-Mole — whacking', () => {
  it('registers a hit and hides the mole', () => {
    const holes = setHole(createHoles(6), 2, true);
    const { holes: after, hit } = resolveWhack(holes, 2);
    expect(hit).toBe(true);
    expect(after[2]).toBe(false);
  });

  it('registers a miss on an empty or invalid hole', () => {
    const holes = createHoles(6);
    expect(resolveWhack(holes, 1).hit).toBe(false);
    expect(resolveWhack(holes, -1).hit).toBe(false);
    expect(resolveWhack(holes, 99).hit).toBe(false);
  });

  it('scores more with a streak, capped', () => {
    expect(scoreForHit(0)).toBe(10);
    expect(scoreForHit(5)).toBeGreaterThan(scoreForHit(1));
    expect(scoreForHit(100)).toBeLessThanOrEqual(30);
  });
});
