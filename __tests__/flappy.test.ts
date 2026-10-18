import {
  BIRD_R,
  BIRD_X,
  FlappyState,
  GROUND,
  birdBottom,
  birdHitbox,
  birdTop,
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

describe('Flappy — ground plane / hitbox alignment', () => {
  it('puts the death plane exactly at the visible ground strip', () => {
    // The strip is drawn from GROUND; the bird dies once its bottom reaches it.
    expect(birdBottom(GROUND - BIRD_R)).toBeCloseTo(GROUND, 10);
    // A bird resting with its bottom exactly on the strip is already fatal.
    const touching: FlappyState = { ...playing(), y: GROUND - BIRD_R, vy: 0, spawnTimer: 99 };
    expect(step(touching, 0.001).status).toBe('over');
  });

  it('does not die while still clearly above the strip', () => {
    const safe: FlappyState = { ...playing(), y: GROUND - BIRD_R - 0.05, vy: 0, spawnTimer: 99 };
    expect(step(safe, 0.02).status).toBe('playing');
  });

  it('puts the ceiling death plane at the top edge of the hitbox', () => {
    expect(birdTop(BIRD_R)).toBeCloseTo(0, 10);
    const above: FlappyState = { ...playing(), y: BIRD_R - 0.01, vy: 0, spawnTimer: 99 };
    expect(step(above, 0.001).status).toBe('over');
  });

  it('reports a hitbox that matches the bird sprite dimensions (size-aware)', () => {
    const wide = birdHitbox(400, 400);
    expect(wide.halfW).toBeCloseTo(BIRD_R * 400, 10);
    expect(wide.halfH).toBeCloseTo(BIRD_R * 400, 10);
    // Non-square arenas: the vertical extent must follow the arena height,
    // which is what the collision math uses (not the width).
    const tall = birdHitbox(300, 600);
    expect(wide.halfW).toBeCloseTo(BIRD_R * 400, 10);
    expect(birdHitbox(400, 400).halfW).toBeCloseTo(BIRD_R * 400, 10);
    expect(wide.halfH).toBeCloseTo(wide.halfW, 10);
    expect((birdHitbox(300, 600)).halfH).toBeCloseTo(BIRD_R * 600, 10);
    void BIRD_X;
  });
});
