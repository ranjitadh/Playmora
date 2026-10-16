import {
  BIRD_R,
  FlappyState,
  createFlappyState,
  flap,
  startFlappy,
  step,
} from '../src/games/implementations/flappy-flight/flappyLogic';

const playing = (): FlappyState => startFlappy(createFlappyState());

describe('Flappy — physics', () => {
  it('falls under gravity once playing', () => {
    const s = playing();
    const after = step(s, 0.05);
    expect(after.y).toBeGreaterThan(s.y);
  });

  it('flap gives an upward impulse', () => {
    expect(flap(playing()).vy).toBeLessThan(0);
  });

  it('does nothing while ready', () => {
    const s = createFlappyState();
    expect(step(s, 0.05)).toBe(s);
    expect(flap(s)).toBe(s);
  });
});

describe('Flappy — collisions', () => {
  it('crashes into the ground', () => {
    const s: FlappyState = { ...playing(), y: 0.98, vy: 1, spawnTimer: 99 };
    expect(step(s, 0.02).status).toBe('over');
  });

  it('crashes into the ceiling', () => {
    const s: FlappyState = { ...playing(), y: 0.01, vy: -1, spawnTimer: 99 };
    expect(step(s, 0.02).status).toBe('over');
  });

  it('crashes into a pipe when outside the gap', () => {
    const s: FlappyState = {
      ...playing(),
      y: 0.15,
      vy: 0,
      spawnTimer: 99,
      pipes: [{ x: 0.26, gapY: 0.7, gapH: 0.3, scored: false }],
    };
    expect(step(s, 0.001).status).toBe('over');
  });

  it('passes through a pipe gap', () => {
    const s: FlappyState = {
      ...playing(),
      y: 0.7,
      vy: 0,
      spawnTimer: 99,
      pipes: [{ x: 0.26, gapY: 0.7, gapH: 0.3, scored: false }],
    };
    expect(step(s, 0.001).status).toBe('playing');
  });

  it('scores when a pipe passes the bird', () => {
    const s: FlappyState = {
      ...playing(),
      y: 0.5,
      vy: 0,
      spawnTimer: 99,
      pipes: [{ x: 0.26 - 0.2, gapY: 0.5, gapH: 0.3, scored: false }],
    };
    expect(step(s, 0.001).score).toBe(1);
    expect(BIRD_R).toBeGreaterThan(0);
  });
});
