import {
  Entity,
  FruitState,
  createFruitGame,
  pointToSegment,
  segmentHitsCircle,
  sliceSegment,
  spawnEntity,
  stepPhysics,
} from '../src/games/implementations/fruit-slice/fruitSliceLogic';

function entity(partial: Partial<Entity>): Entity {
  return {
    id: 1,
    x: 0.5,
    y: 0.5,
    vx: 0,
    vy: 0,
    radius: 0.05,
    kind: 'fruit',
    color: '#EF4444',
    ...partial,
  };
}

function stateWith(entities: Entity[], extra: Partial<FruitState> = {}): FruitState {
  return { entities, score: 0, lives: 3, sliced: 0, nextId: 99, outcome: 'in_progress', ...extra };
}

describe('Fruit Slice — geometry', () => {
  it('measures distance to a segment', () => {
    expect(pointToSegment(0, 0, 1, 0, 0.5, 0.5)).toBeCloseTo(0.5);
    expect(pointToSegment(0, 0, 1, 0, 0.5, 0)).toBeCloseTo(0);
    expect(pointToSegment(0, 0, 1, 0, 2, 0)).toBeCloseTo(1); // clamped to endpoint
  });

  it('detects when a swipe crosses a circle', () => {
    expect(segmentHitsCircle(0, 0, 1, 0, 0.5, 0.02, 0.05)).toBe(true);
    expect(segmentHitsCircle(0, 0, 1, 0, 0.5, 0.5, 0.05)).toBe(false);
  });
});

describe('Fruit Slice — spawning & physics', () => {
  it('launches upward from below the screen', () => {
    const s = spawnEntity(createFruitGame());
    expect(s.entities).toHaveLength(1);
    expect(s.entities[0].y).toBeGreaterThan(1);
    expect(s.entities[0].vy).toBeLessThan(0);
  });

  it('applies gravity over time', () => {
    const s = stateWith([entity({ y: 0.5, vy: -0.5 })]);
    const next = stepPhysics(s, 0.1);
    expect(next.entities[0].vy).toBeGreaterThan(-0.5);
  });

  it('loses a life when a fruit falls off the bottom', () => {
    const s = stateWith([entity({ y: 1.35 })]);
    const next = stepPhysics(s, 0.016);
    expect(next.entities).toHaveLength(0);
    expect(next.lives).toBe(2);
  });

  it('does not penalise a missed bomb', () => {
    const s = stateWith([entity({ y: 1.35, kind: 'bomb' })]);
    const next = stepPhysics(s, 0.016);
    expect(next.lives).toBe(3);
  });

  it('ends the run at zero lives', () => {
    const s = stateWith([entity({ y: 1.35 })], { lives: 1 });
    expect(stepPhysics(s, 0.016).outcome).toBe('lost');
  });
});

describe('Fruit Slice — slicing', () => {
  it('scores and removes sliced fruit', () => {
    const s = stateWith([entity({ x: 0.5, y: 0.5 })]);
    const next = sliceSegment(s, 0, 0.5, 1, 0.5);
    expect(next.score).toBe(10);
    expect(next.sliced).toBe(1);
    expect(next.entities).toHaveLength(0);
  });

  it('scores a multi-fruit swipe in one pass', () => {
    const s = stateWith([entity({ id: 1, x: 0.4, y: 0.5 }), entity({ id: 2, x: 0.6, y: 0.5 })]);
    const next = sliceSegment(s, 0, 0.5, 1, 0.5);
    expect(next.score).toBe(20);
    expect(next.sliced).toBe(2);
  });

  it('stops simulating once the run is over', () => {
    const lost = stateWith([entity({ y: 0.5, vy: -0.5 })], { outcome: 'lost' });
    expect(stepPhysics(lost, 0.05)).toBe(lost);
    const won = stateWith([entity({ y: 0.5, vy: -0.5 })], { outcome: 'won' });
    expect(stepPhysics(won, 0.05)).toBe(won);
  });

  it('stops spawning once the run is over', () => {
    const lost = stateWith([], { outcome: 'lost' });
    expect(spawnEntity(lost).entities).toHaveLength(0);
    expect(spawnEntity(lost)).toBe(lost);
    const won = stateWith([], { outcome: 'won' });
    expect(spawnEntity(won, { forceBomb: true })).toBe(won);
  });

  it('ends the run when a bomb is sliced', () => {
    const s = stateWith([entity({ kind: 'bomb' })]);
    expect(sliceSegment(s, 0, 0.5, 1, 0.5).outcome).toBe('lost');
  });

  it('ignores swipes that hit nothing', () => {
    const s = stateWith([entity({ x: 0.1, y: 0.1 })]);
    expect(sliceSegment(s, 0, 0.9, 1, 0.9)).toBe(s);
  });
});
