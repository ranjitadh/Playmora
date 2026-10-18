import {
  MOLE_MAX_LIFE,
  MOLE_MIN_LIFE,
  activeCount,
  armHole,
  availableHoles,
  createHoles,
  createTimers,
  holeSizeFor,
  holesFromTimers,
  pickHole,
  randomMoleLife,
  resolveWhack,
  scoreForHit,
  setHole,
  tickTimers,
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

describe('Whack-a-Mole — mole lifetimes', () => {
  it('starts with every hole empty', () => {
    const timers = createTimers(9);
    expect(timers).toHaveLength(9);
    expect(timers.every((t) => t === 0)).toBe(true);
    expect(holesFromTimers(timers).some(Boolean)).toBe(false);
  });

  it('arms a hole and reflects it in the derived holes', () => {
    const armed = armHole(createTimers(4), 2, 1);
    expect(holesFromTimers(armHole(createTimers(4), 2, 0.5))[2]).toBe(true);
    expect(holesFromTimers(armHole(createTimers(4), 2, 0))[2]).toBe(false);
  });

  it('ignores arming an out-of-range hole', () => {
    const timers = createTimers(4);
    expect(armHole(timers, -1, 1)).toBe(timers);
    expect(armHole(timers, 9, 1)).toBe(timers);
  });

  it('decrements live moles and hides them when their life runs out', () => {
    const armed = armHole(createTimers(4), 1, 0.25);
    const after = tickTimers(armed, 0.3);
    expect(after[1]).toBe(0);
    expect(holesFromTimers(after)[1]).toBe(false);
  });

  it('does not advance while paused (dt of 0)', () => {
    const armed = armHole(createTimers(4), 1, 1);
    const paused = tickTimers(armed, 0);
    expect(paused).toBe(armed);
    expect(paused[1]).toBe(1);
  });

  it('keeps a mole up across several sub-life ticks', () => {
    let timers = armHole(createTimers(9), 3, 1);
    timers = tickTimers(timers, 0.1);
    timers = tickTimers(timers, 0.1);
    expect(holesFromTimers(timers)[3]).toBe(true);
    timers = tickTimers(timers, 0.9);
    expect(holesFromTimers(timers)[3]).toBe(false);
  });

  it('spawns moles with a life inside the configured range', () => {
    expect(randomMoleLife(() => 0)).toBe(MOLE_MIN_LIFE);
    expect(randomMoleLife(() => 1)).toBe(MOLE_MAX_LIFE);
    const mid = randomMoleLife(() => 0.5);
    expect(mid).toBeGreaterThanOrEqual(MOLE_MIN_LIFE);
    expect(mid).toBeLessThanOrEqual(MOLE_MAX_LIFE);
  });
});

describe('Whack-a-Mole — responsive board', () => {
  it('fits three columns inside the available width', () => {
    const size = holeSizeFor(300, 3);
    expect(size * 3).toBeLessThanOrEqual(300);
  });

  it('never shrinks a hole below the minimum', () => {
    expect(holeSizeFor(90, 3)).toBe(56);
  });

  it('never grows a hole beyond the maximum', () => {
    expect(holeSizeFor(1200, 3)).toBe(96);
  });

  it('falls back to the minimum before the board is measured', () => {
    expect(holeSizeFor(0, 3)).toBe(56);
  });
});
