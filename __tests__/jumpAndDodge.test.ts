import {
  GROUND,
  MAX_JUMPS,
  PLAYER_X,
  RunnerState,
  createRunnerState,
  jump,
  playerCenterY,
  startRun,
  step,
} from '../src/games/implementations/jump-and-dodge/jumpAndDodgeLogic';

const playing = (): RunnerState => startRun(createRunnerState());

describe('Jump and Dodge — movement', () => {
  it('stands on the ground when ready', () => {
    const s = createRunnerState();
    expect(s.y).toBeCloseTo(playerCenterY(), 5);
    expect(s.jumpsLeft).toBe(MAX_JUMPS);
  });

  it('jumps from the ground on the first tap', () => {
    const jumped = jump(playing());
    expect(jumped.vy).toBeLessThan(0);
    expect(jumped.jumpsLeft).toBe(MAX_JUMPS - 1);
  });

  it('allows a second jump in mid-air', () => {
    const first = jump(playing());
    const second = jump({ ...first, y: playerCenterY() - 0.2, vy: 0 });
    expect(second.vy).toBeLessThan(0);
    expect(second.jumpsLeft).toBe(0);
  });

  it('ignores further jumps once both are used', () => {
    const first = jump(playing());
    const second = jump({ ...first, y: playerCenterY() - 0.2 });
    const airborne: RunnerState = { ...second, y: playerCenterY() - 0.25 };
    const third = jump(airborne);
    expect(third).toBe(airborne);
    expect(third.vy).toBe(second.vy);
    expect(third.jumpsLeft).toBe(0);
  });

  it('refreshes the double jump after landing', () => {
    let s = jump(playing());
    s = jump({ ...s, y: playerCenterY() - 0.2 });
    for (let i = 0; i < 20; i++) s = step(s, 0.05);
    expect(s.y).toBeCloseTo(playerCenterY(), 3);
    expect(s.jumpsLeft).toBe(MAX_JUMPS);
  });

  it('falls back to the ground under gravity', () => {
    let s = jump(playing());
    for (let i = 0; i < 20; i++) s = step(s, 0.05);
    expect(s.y).toBeCloseTo(playerCenterY(), 3);
    expect(s.vy).toBe(0);
  });
});

describe('Jump and Dodge — obstacles', () => {
  it('crashes into an obstacle at ground level', () => {
    const s: RunnerState = {
      ...playing(),
      y: playerCenterY(),
      vy: 0,
      spawnTimer: 99,
      obstacles: [{ x: PLAYER_X - 0.03, w: 0.06, h: 0.12, scored: false }],
    };
    expect(step(s, 0.001).status).toBe('over');
  });

  it('clears an obstacle while airborne', () => {
    const s: RunnerState = {
      ...playing(),
      y: GROUND - 0.4, // high above the ground
      vy: -0.01,
      spawnTimer: 99,
      obstacles: [{ x: PLAYER_X - 0.03, w: 0.06, h: 0.12, scored: false }],
    };
    expect(step(s, 0.001).status).toBe('playing');
  });

  it('scores when an obstacle passes behind the player', () => {
    const s: RunnerState = {
      ...playing(),
      y: playerCenterY(),
      vy: 0,
      spawnTimer: 99,
      obstacles: [{ x: PLAYER_X - 0.3, w: 0.06, h: 0.1, scored: false }],
    };
    expect(step(s, 0.001).score).toBe(1);
  });
});
