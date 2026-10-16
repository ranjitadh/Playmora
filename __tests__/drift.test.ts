import {
  DriftState,
  R0,
  createDrift,
  onTrack,
  startDrift,
  stepDrift,
} from '../src/games/implementations/drift-challenge/driftLogic';

const playing = () => startDrift(createDrift());

describe('Drift Challenge', () => {
  it('starts on the track', () => {
    const s = createDrift();
    expect(s.status).toBe('ready');
    expect(onTrack(s.r)).toBe(true);
  });

  it('advances the angle over time', () => {
    const s = playing();
    expect(stepDrift(s, 0.05, 0).angle).toBeGreaterThan(s.angle);
  });

  it('steering inward pulls the radius down', () => {
    const s = playing();
    expect(stepDrift(s, 0.05, -1).r).toBeLessThan(s.r);
  });

  it('steering outward pushes the radius up', () => {
    const s = playing();
    expect(stepDrift(s, 0.05, 1).r).toBeGreaterThan(s.r);
  });

  it('drifts outward and leaves the track without correction', () => {
    let s = playing();
    for (let i = 0; i < 40 && s.status === 'playing'; i++) s = stepDrift(s, 0.05, 0);
    expect(s.status).toBe('over');
  });

  it('scores while holding the track', () => {
    const s = playing();
    expect(stepDrift(s, 0.05, -1).score).toBeGreaterThanOrEqual(0);
    const held = stepDrift({ ...s, r: R0 }, 0.05, -1);
    expect(held.score).toBeGreaterThan(s.score);
  });

  it('ends when time runs out', () => {
    const s: DriftState = { ...playing(), r: R0, timeLeft: 0.01 };
    expect(stepDrift(s, 0.02, -1).status).toBe('over');
  });
});
