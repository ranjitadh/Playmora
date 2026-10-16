import {
  GAP_H,
  GRAVITY,
  MAX_FALL,
  PLAYER_X,
  THRUST_VELOCITY,
  HeliState,
  createHeliState,
  flap,
  start,
  step,
} from '../src/games/implementations/helicopter-escape/helicopterLogic';

const playing = (): HeliState => start(createHeliState());

describe('Helicopter — gravity and thrust', () => {
  it('starts ready and gravity falls once playing', () => {
    const s = playing();
    const after = step(s, 0.05);
    expect(after.y).toBeGreaterThan(s.y);
    expect(after.vy).toBeCloseTo(GRAVITY * 0.05, 5);
  });

  it('flap gives upward velocity', () => {
    const after = flap(playing());
    expect(after.vy).toBeLessThan(0);
  });

  it('does not move while ready', () => {
    const s = createHeliState();
    expect(step(s, 0.05)).toBe(s);
    expect(flap(s)).toBe(s);
  });
});

describe('Helicopter — collisions', () => {
  it('crashes into the floor', () => {
    const s: HeliState = { ...playing(), y: 0.98, vy: 1 };
    expect(step(s, 0.05).status).toBe('crashed');
  });

  it('crashes into the ceiling', () => {
    const s: HeliState = { ...playing(), y: 0.02, vy: -1 };
    expect(step(s, 0.05).status).toBe('crashed');
  });

  it('crashes into a wall when outside the gap', () => {
    const s: HeliState = {
      ...playing(),
      y: 0.1,
      vy: 0,
      obstacles: [{ x: PLAYER_X, gapY: 0.7, gapH: 0.3, scored: false }],
      spawnTimer: 99,
    };
    expect(step(s, 0.001).status).toBe('crashed');
  });

  it('passes safely through the gap', () => {
    const s: HeliState = {
      ...playing(),
      y: 0.7,
      vy: 0,
      obstacles: [{ x: PLAYER_X, gapY: 0.7, gapH: 0.3, scored: false }],
      spawnTimer: 99,
    };
    expect(step(s, 0.001).status).toBe('playing');
  });
});

describe('Helicopter — scoring', () => {
  it('scores when an obstacle passes the player', () => {
    const s: HeliState = {
      ...playing(),
      y: 0.5,
      vy: 0,
      obstacles: [{ x: PLAYER_X - 0.2, gapY: 0.5, gapH: 0.3, scored: false }],
      spawnTimer: 99,
    };
    const after = step(s, 0.001);
    expect(after.score).toBe(1);
  });

  it('stops updating after a crash', () => {
    const s: HeliState = { ...playing(), status: 'crashed' };
    expect(step(s, 0.05)).toBe(s);
  });
});

describe('Helicopter — controls stay manageable', () => {
  it('a single tap lifts less than 60% of one gap', () => {
    const apex = (THRUST_VELOCITY * THRUST_VELOCITY) / (2 * GRAVITY);
    expect(apex).toBeLessThan(GAP_H * 0.6);
  });

  it('a tap from open air never rockets to the ceiling', () => {
    let s: HeliState = { ...playing(), y: 0.7, vy: 0, obstacles: [], spawnTimer: 99 };
    s = flap(s);
    const from = s.y;
    for (let i = 0; i < 240 && s.vy < 0; i++) s = step(s, 1 / 60);
    expect(s.status).toBe('playing');
    expect(from - s.y).toBeLessThan(GAP_H * 0.6);
  });

  it('caps downward speed', () => {
    const s: HeliState = { ...playing(), y: 0.5, vy: 5, obstacles: [], spawnTimer: 99 };
    expect(step(s, 0.05).vy).toBe(MAX_FALL);
  });

  it('keeps a forgiving gap even at a high score', () => {
    const s: HeliState = { ...playing(), y: 0.5, vy: 0, score: 999, obstacles: [], spawnTimer: 0 };
    const after = step(s, 0.01);
    expect(after.obstacles).toHaveLength(1);
    expect(after.obstacles[0].gapH).toBeGreaterThanOrEqual(0.26);
  });
});
