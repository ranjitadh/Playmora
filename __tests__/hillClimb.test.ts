import {
  MAX_SLOPE,
  createHillState,
  slopeAt,
  startHill,
  stepHill,
  terrainHeight,
} from '../src/games/implementations/hill-climb-challenge/hillClimbLogic';

const playing = () => startHill(createHillState());

describe('Hill Climb — terrain', () => {
  it('is deterministic and bounded', () => {
    expect(terrainHeight(3.2)).toBe(terrainHeight(3.2));
    for (let x = 0; x < 40; x += 0.37) {
      const h = terrainHeight(x);
      expect(h).toBeGreaterThan(0);
      expect(h).toBeLessThan(1);
    }
  });

  it('has some steep slope somewhere on the track', () => {
    let found = false;
    for (let x = 0; x < 60; x += 0.01) {
      if (Math.abs(slopeAt(x)) > MAX_SLOPE) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});

describe('Hill Climb — physics', () => {
  it('accelerates when throttling on flat ground', () => {
    const s = { ...playing(), x: 0, speed: 0, slope: 0 };
    const after = stepHill(s, 0.05, true);
    expect(after.speed).toBeGreaterThan(0);
    expect(after.x).toBeGreaterThan(0);
  });

  it('coasts down without throttle', () => {
    const s = { ...playing(), speed: 0.5 };
    const after = stepHill(s, 0.05, false);
    expect(after.speed).toBeLessThan(0.5);
  });

  it('drains fuel while throttling and stops draining when empty', () => {
    const s = { ...playing(), fuel: 100 };
    expect(stepHill(s, 0.05, true).fuel).toBeLessThan(100);
    const empty = { ...s, fuel: 0 };
    expect(stepHill(empty, 0.05, true).fuel).toBe(0);
  });

  it('collects coins as it drives past them', () => {
    const s = { ...playing(), x: 2.0, speed: 0.5, coins: [{ x: 2.05, taken: false }] };
    const after = stepHill(s, 0.05, false);
    expect(after.collected).toBe(1);
  });

  it('crashes on a too-steep slope', () => {
    let crashX = -1;
    for (let x = 0; x < 60; x += 0.01) {
      if (Math.abs(slopeAt(x)) > MAX_SLOPE) {
        crashX = x;
        break;
      }
    }
    expect(crashX).toBeGreaterThan(0);
    const s = { ...playing(), x: crashX, speed: 0.4 };
    expect(stepHill(s, 0.001, true).status).toBe('over');
  });
});
