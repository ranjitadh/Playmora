import {
  GAP_START,
  MonsterState,
  createMonster,
  overGap,
  startMonster,
  stepMonster,
} from '../src/games/implementations/monster-truck-jump/monsterTruckLogic';

const playing = () => startMonster(createMonster());

describe('Monster Truck — track', () => {
  it('places gaps at the expected positions', () => {
    expect(overGap(GAP_START + 0.02)).toBe(true);
    expect(overGap(GAP_START - 0.05)).toBe(false);
    expect(overGap(GAP_START + 0.3)).toBe(false);
  });
});

describe('Monster Truck — jump physics', () => {
  it('launches into the air on jump', () => {
    const s = stepMonster(playing(), 0.01, true);
    expect(s.airborne).toBe(true);
    expect(s.vy).toBeGreaterThan(0);
  });

  it('rolls forward over time', () => {
    const s = playing();
    expect(stepMonster(s, 0.05, false).x).toBeGreaterThan(s.x);
  });

  it('lands safely on solid ground', () => {
    let s: MonsterState = { ...playing(), x: 0.1, airborne: true, y: 0.05, vy: 0.5 };
    for (let i = 0; i < 60 && s.airborne; i++) s = stepMonster(s, 0.02, false);
    expect(s.status).toBe('playing');
    expect(s.cleared).toBeGreaterThanOrEqual(1);
  });

  it('crashes when rolling into a gap', () => {
    const s: MonsterState = { ...playing(), x: GAP_START + 0.02 };
    expect(stepMonster(s, 0.001, false).status).toBe('over');
  });

  it('clears a gap by jumping over it', () => {
    let s: MonsterState = { ...playing(), x: 0.4 };
    s = stepMonster(s, 0.01, true);
    for (let i = 0; i < 120 && s.status === 'playing' && s.airborne; i++) s = stepMonster(s, 0.02, false);
    expect(s.status).toBe('playing');
    expect(s.cleared).toBeGreaterThanOrEqual(1);
  });
});
