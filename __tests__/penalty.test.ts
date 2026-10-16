import {
  MAX_ATTEMPTS,
  ZONES,
  createPenalty,
  keeperChoice,
  keeperSkillFor,
  resolveShot,
  scoreOf,
  shoot,
} from '../src/games/implementations/penalty-shootout/penaltyLogic';

describe('Penalty Shootout — shot resolution', () => {
  it('scores a goal when the keeper dives elsewhere', () => {
    expect(resolveShot(0, 3, 0.9)).toBe('goal');
  });

  it('is saved when the keeper reads the right zone', () => {
    expect(resolveShot(4, 4, 0.9)).toBe('saved');
  });

  it('misses when the strike is too wild', () => {
    expect(resolveShot(0, 3, 0.1)).toBe('miss');
  });
});

describe('Penalty Shootout — keeper', () => {
  it('reads the shot when the skill draw succeeds', () => {
    expect(keeperChoice(2, 0.1, 0.9, 0.5)).toBe(2);
  });

  it('dives elsewhere when the skill draw fails', () => {
    const z = keeperChoice(2, 0.9, 0.5, 0.5);
    expect(z).not.toBe(2);
    expect(z).toBeGreaterThanOrEqual(0);
    expect(z).toBeLessThan(ZONES);
  });

  it('gets more skilled each attempt', () => {
    expect(keeperSkillFor(4)).toBeGreaterThan(keeperSkillFor(0));
  });
});

describe('Penalty Shootout — run of penalties', () => {
  it('records goals and ends after the maximum attempts', () => {
    let s = createPenalty();
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      // r1 = 0 forces a dive to a different zone when skill > 0 => goal
      s = shoot(s, 1, 0.9, 1, 0.0);
    }
    expect(s.outcomes).toHaveLength(MAX_ATTEMPTS);
    expect(s.goals).toBe(MAX_ATTEMPTS);
    expect(s.attempt).toBe(MAX_ATTEMPTS);
    expect(s.outcome).toBe('over');
  });

  it('counts saves when the keeper matches the target', () => {
    const s = shoot(createPenalty(), 3, 0.9, 0.0, 0.0); // r1<skill -> dive == target
    expect(s.saved).toBe(1);
    expect(s.goals).toBe(0);
    expect(s.outcomes[0]).toBe('saved');
  });

  it('refuses to shoot once the run is over', () => {
    let s = createPenalty();
    for (let i = 0; i < MAX_ATTEMPTS; i++) s = shoot(s, 1, 0.9, 1, 0);
    const before = s;
    expect(shoot(s, 1, 0.9, 1, 0)).toBe(before);
  });

  it('scores more for goals', () => {
    let s = createPenalty();
    for (let i = 0; i < MAX_ATTEMPTS; i++) s = shoot(s, 1, 0.9, 1, 0);
    expect(scoreOf(s)).toBeGreaterThan(500);
  });
});
