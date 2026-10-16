import {
  KartState,
  LAP_LEN,
  createKart,
  roadCenter,
  startKart,
  stepKart,
} from '../src/games/implementations/mini-kart-racing/miniKartLogic';

const playing = () => startKart(createKart());

describe('Mini Kart — steering and speed', () => {
  it('starts ready in the middle', () => {
    const s = createKart();
    expect(s.status).toBe('ready');
    expect(s.x).toBe(0.5);
  });

  it('steers left and right', () => {
    const s = playing();
    expect(stepKart(s, 0.05, 1).x).toBeGreaterThan(s.x);
    expect(stepKart(s, 0.05, -1).x).toBeLessThan(s.x);
  });

  it('accelerates toward top speed', () => {
    const s: KartState = { ...playing(), x: roadCenter(0), speed: 0.3 };
    expect(stepKart(s, 0.05, 0).speed).toBeGreaterThan(s.speed);
  });

  it('advances distance over time', () => {
    const s: KartState = { ...playing(), x: roadCenter(0) };
    expect(stepKart(s, 0.05, 0).distance).toBeGreaterThan(0);
  });
});

describe('Mini Kart — track and laps', () => {
  it('stays alive while on the road', () => {
    const s: KartState = { ...playing(), x: roadCenter(0) };
    expect(stepKart(s, 0.05, 0).status).toBe('playing');
  });

  it('counts laps as distance accrues', () => {
    const s: KartState = { ...playing(), distance: LAP_LEN - 0.001, x: roadCenter(LAP_LEN) };
    expect(stepKart(s, 0.05, 0).laps).toBe(1);
  });

  it('spins out after leaving the road too long', () => {
    let s: KartState = { ...playing(), x: 0.02, distance: 0, speed: 0.3 };
    for (let i = 0; i < 40 && s.status === 'playing'; i++) s = stepKart(s, 0.05, 0);
    expect(s.status).toBe('over');
  });

  it('ends when time runs out', () => {
    const s: KartState = { ...playing(), x: roadCenter(0), timeLeft: 0.01 };
    expect(stepKart(s, 0.02, 0).status).toBe('over');
  });
});
