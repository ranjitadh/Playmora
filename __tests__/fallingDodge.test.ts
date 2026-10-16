import {
  FallingDodgeConfig,
  createFallingDodge,
  laneCenter,
  movePlayerX,
  startFallingDodge,
  stepFallingDodge,
} from '../src/games/implementations/shared/fallingDodge';

const cfg: FallingDodgeConfig = {
  playerY: 0.82,
  playerW: 0.12,
  playerH: 0.14,
  speedStart: 0.5,
  speedMax: 1,
  speedRamp: 0.02,
  spawnInterval: 99,
  obstacleW: 0.12,
  obstacleH: 0.12,
};

const cfgLanes: FallingDodgeConfig = { ...cfg, lanes: 3 };

describe('Falling Dodge — setup and steering', () => {
  it('starts ready in the middle', () => {
    const s = createFallingDodge();
    expect(s.status).toBe('ready');
    expect(s.x).toBe(0.5);
  });

  it('starts moving once launched', () => {
    const s = startFallingDodge(createFallingDodge(), cfg);
    expect(s.status).toBe('playing');
    expect(s.speed).toBe(cfg.speedStart);
  });

  it('free-steering is clamped to the play area', () => {
    const s = startFallingDodge(createFallingDodge(), cfg);
    expect(movePlayerX(s, -1, cfg).x).toBeGreaterThanOrEqual(cfg.playerW / 2);
    expect(movePlayerX(s, 2, cfg).x).toBeLessThanOrEqual(1 - cfg.playerW / 2);
  });

  it('lane mode snaps the player to lane centres', () => {
    const s = startFallingDodge(createFallingDodge(), cfgLanes);
    expect(movePlayerX(s, 0.05, cfgLanes).x).toBeCloseTo(laneCenter(0, 3), 5);
    expect(movePlayerX(s, 0.9, cfgLanes).x).toBeCloseTo(laneCenter(2, 3), 5);
  });
});

describe('Falling Dodge — physics, scoring, collisions', () => {
  it('moves obstacles and ramps speed', () => {
    const base = startFallingDodge(createFallingDodge(), cfg);
    const s: typeof base = { ...base, obstacles: [{ x: 0.5, y: 0.1, w: 0.12, h: 0.12, scored: false }] };
    const after = stepFallingDodge(s, 0.05, cfg);
    expect(after.obstacles[0].y).toBeGreaterThan(0.1);
    expect(after.speed).toBeGreaterThan(cfg.speedStart);
  });

  it('scores when an obstacle passes the player', () => {
    const base = startFallingDodge(createFallingDodge(), cfg);
    const s: typeof base = { ...base, obstacles: [{ x: 0.5, y: cfg.playerY + cfg.playerH + 0.01, w: 0.12, h: 0.12, scored: false }] };
    expect(stepFallingDodge(s, 0.001, cfg).score).toBe(1);
  });

  it('ends the run on collision', () => {
    const base = startFallingDodge(createFallingDodge(), cfg);
    const s: typeof base = { ...base, x: 0.5, obstacles: [{ x: 0.5, y: cfg.playerY - 0.05, w: 0.12, h: 0.12, scored: false }] };
    expect(stepFallingDodge(s, 0.001, cfg).status).toBe('over');
  });

  it('ignores input after the run ends', () => {
    const s = { ...startFallingDodge(createFallingDodge(), cfg), status: 'over' as const };
    expect(stepFallingDodge(s, 0.05, cfg)).toBe(s);
  });
});
