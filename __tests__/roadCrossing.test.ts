import {
  LANE_COUNT,
  CrossState,
  createCross,
  moveCross,
  startCross,
  stepCross,
} from '../src/games/implementations/road-crossing-challenge/roadCrossingLogic';

const playing = (): CrossState => startCross(createCross());

describe('Road Crossing — movement', () => {
  it('starts at the bottom lane', () => {
    const s = createCross();
    expect(s.lane).toBe(0);
    expect(s.status).toBe('ready');
  });

  it('hops up and scores', () => {
    const s = moveCross(playing(), 'up');
    expect(s.lane).toBe(1);
    expect(s.score).toBe(1);
  });

  it('clamps horizontal movement', () => {
    let s = playing();
    for (let i = 0; i < 20; i++) s = moveCross(s, 'left');
    expect(s.x).toBeGreaterThan(0);
    for (let i = 0; i < 40; i++) s = moveCross(s, 'right');
    expect(s.x).toBeLessThan(1);
  });

  it('cannot move below the bottom lane', () => {
    expect(moveCross(playing(), 'down').lane).toBe(0);
  });

  it('recycles the road after reaching the top', () => {
    let s = playing();
    for (let i = 0; i < LANE_COUNT - 1; i++) s = moveCross(s, 'up');
    expect(s.lane).toBe(LANE_COUNT - 1);
    s = moveCross(s, 'up');
    expect(s.lane).toBe(0);
    expect(s.crossings).toBe(1);
  });
});

describe('Road Crossing — traffic', () => {
  it('moves cars over time', () => {
    const s: CrossState = { ...playing(), lanes: [{ cars: [{ x: 0.5, dir: 1, speed: 0.4 }] }] };
    const after = stepCross({ ...s, lane: 0 }, 0.05);
    expect(after.lanes[0].cars[0].x).toBeGreaterThan(0.5);
  });

  it('wraps cars around the screen', () => {
    const s: CrossState = { ...playing(), lane: 0, lanes: [{ cars: [{ x: 1.14, dir: 1, speed: 0.5 }] }] };
    const after = stepCross(s, 0.05);
    expect(after.lanes[0].cars[0].x).toBeLessThan(0);
  });

  it('ends the game on a car collision', () => {
    const s: CrossState = { ...playing(), x: 0.5, lane: 0, lanes: [{ cars: [{ x: 0.5, dir: 1, speed: 0.3 }] }] };
    expect(stepCross(s, 0.001).status).toBe('over');
  });

  it('is safe when a car is in another lane', () => {
    const s: CrossState = { ...playing(), x: 0.5, lane: 0, lanes: [{ cars: [] }, { cars: [{ x: 0.5, dir: 1, speed: 0.3 }] }] };
    expect(stepCross(s, 0.001).status).toBe('playing');
  });
});
