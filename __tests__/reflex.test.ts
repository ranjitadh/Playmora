import {
  createReflexState,
  safeOffset,
  stepReflex,
  tapTarget,
  type ReflexState,
  type TargetType,
} from '../src/games/implementations/reflex-tap/reflexLogic';

describe('Reflex rush — rush clock', () => {
  it('starts with a full combo and full rush time', () => {
    const s = createReflexState();
    expect(s.score).toBe(0);
    expect(s.combo).toBe(1);
    expect(s.timeLeft).toBe(30);
    expect(s.status).toBe('playing');
    expect(s.targets).toHaveLength(0);
  });

  it('counts the rush down and ends exactly at zero', () => {
    let s = createReflexState();
    for (let i = 0; i < 29; i++) s = stepReflex(s, 1);
    expect(s.status).toBe('playing');
    expect(s.timeLeft).toBeCloseTo(1, 5);
    s = stepReflex(s, 1);
    expect(s.status).toBe('over');
    expect(s.timeLeft).toBe(0);
  });

  it('reports the real final score when the rush ends', () => {
    let s = createReflexState();
    s = { ...s, targets: [{ id: 1, x: 0.5, y: 0.5, type: 'star', ttl: 1 }], timeLeft: 0.2 };
    s = tapTarget(s, 1).state;
    expect(s.score).toBe(35);
    s = stepReflex(s, 0.2);
    expect(s.status).toBe('over');
    expect(s.score).toBe(35);
  });

  it('is idempotent once over and never spawns again', () => {
    let s = { ...createReflexState(), timeLeft: 0.3 };
    s = stepReflex(s, 0.3);
    expect(s.status).toBe('over');
    expect(s.targets).toHaveLength(0);
    const clamped = stepReflex(s, 5);
    expect(clamped).toBe(s);
    expect(stepReflex(s, 5).targets).toHaveLength(0);
  });
});

describe('Reaction Time Challenge — game-logic-time lifetimes (pause safe)', () => {
  it('does not advance or expire anything for a zero-length step', () => {
    const s = { ...createReflexState(), targets: [{ id: 1, x: 0.5, y: 0.5, type: 'green' as const, ttl: 1 }] };
    expect(stepReflex(s, 0)).toBe(s);
  });

  it('only expires a target after its lifetime elapses in game time', () => {
    let s = createReflexState();
    s = stepReflex(s, 0.4);
    expect(s.targets.length).toBeGreaterThan(0);
    const firstId = s.targets[0].id;
    // "Paused": no steps happen. A tiny in-game tick keeps it alive.
    expect(stepReflex(s, 0.05).targets.some((t) => t.id === firstId)).toBe(true);
    expect(s.targets.some((t) => t.id === firstId)).toBe(true);
  });

  it('expires a target after its lifetime elapses in game time', () => {
    const s: ReflexState = { ...createReflexState(), targets: [{ id: 9, x: 0.5, y: 0.5, type: 'star', ttl: 1.1 }] };
    const stillThere = stepReflex(s, 1.0);
    expect(stillThere.targets.some((t) => t.id === 9)).toBe(true);
    const gone = stepReflex(stillThere, 0.2);
    expect(gone.targets.some((t) => t.id === 9)).toBe(false);
  });

  it('keeps the arena populated but respects the target cap', () => {
    let s = createReflexState();
    for (let i = 0; i < 60; i++) s = stepReflex(s, 0.05);
    expect(s.targets.length).toBeGreaterThan(0);
    expect(s.targets.length).toBeLessThanOrEqual(4);
  });
});

describe('Reaction Time Challenge — tapping', () => {
  const withTarget = (type: TargetType, ttl = 1) => {
    const base = createReflexState();
    return { ...base, targets: [{ id: 7, x: 0.5, y: 0.5, type, ttl }] };
  };

  it('awards points scaled by combo and raises the combo', () => {
    const s = withTarget('green');
    const { state, event } = tapTarget(s, 7);
    expect(state.score).toBe(10);
    expect(state.combo).toBe(2);
    expect(state.targets).toHaveLength(0);
    expect(event).toEqual({ kind: 'hit', score: 10, combo: 2, sound: 'pop' });
  });

  it('caps the multiplier at 5x', () => {
    let s = withTarget('green');
    for (let i = 0; i < 10; i++) s = { ...tapTarget(s, 7).state, targets: [{ id: 7, x: 0.5, y: 0.5, type: 'green', ttl: 1 }] };
    expect(s.combo).toBe(5);
  });

  it('penalises skull taps and resets the combo', () => {
    const s: ReflexState = { ...withTarget('skull'), score: 50, combo: 4 };
    const { state, event } = tapTarget(s, 7);
    expect(state.score).toBe(30);
    expect(state.combo).toBe(1);
    expect(event).toEqual({ kind: 'penalty', score: 30 });
  });

  it('ignores taps on unknown or already-removed targets', () => {
    const s = withTarget('green');
    expect(tapTarget(s, 999).event).toBeNull();
    const removed = tapTarget(s, 7).state;
    expect(tapTarget(removed, 7).event).toBeNull();
  });

  it('ignores taps once the rush is over', () => {
    const over: ReflexState = { ...withTarget('green'), status: 'over' };
    expect(tapTarget(over, 7).event).toBeNull();
    expect(tapTarget(over, 7).state).toBe(over);
  });
});

describe('Reaction Time Challenge — safe placement', () => {
  it('maps edges to the exact inside bounds', () => {
    expect(safeOffset(0, 64, 300)).toBe(0);
    expect(safeOffset(1, 64, 300)).toBe(236);
    expect(safeOffset(0.5, 64, 300)).toBe(118);
  });

  it('never lets a target overhang or go negative when the arena fits it', () => {
    const sizes = [52, 58, 60, 64];
    const arenas = [64, 120, 300, 481];
    for (const size of sizes) {
      for (const available of arenas) {
        for (let f = -0.5; f <= 1.5; f += 0.1) {
          const offset = safeOffset(f, size, available);
          expect(offset).toBeGreaterThanOrEqual(0);
          expect(offset + size).toBeLessThanOrEqual(available);
        }
      }
    }
  });

  it('pins to the top-left when the arena is smaller than the target', () => {
    expect(safeOffset(0.9, 64, 50)).toBe(0);
  });
});
