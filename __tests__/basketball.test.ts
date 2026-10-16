import {
  BACKBOARD_X,
  HOOP_X,
  HOOP_Y,
  RIM_LEFT,
  RIM_RIGHT,
  ShotState,
  createShotGame,
  shoot,
  stepShot,
} from '../src/games/implementations/basketball-shots/basketballLogic';

function flying(partial: Partial<ShotState>): ShotState {
  return { ...createShotGame(), phase: 'flying', ...partial };
}

describe('Basketball Shots — launch', () => {
  it('starts in the ready phase at the launch spot', () => {
    const s = createShotGame();
    expect(s.phase).toBe('ready');
    expect(s.ball.y).toBeGreaterThan(0.7);
    expect(s.outcome).toBe('in_progress');
  });

  it('shoots the ball and locks out a second shot while flying', () => {
    const s = shoot(createShotGame(), 0.5, -1);
    expect(s.phase).toBe('flying');
    expect(s.ball.vy).toBe(-1);
    expect(shoot(s, 0.1, -0.2)).toBe(s);
  });
});

describe('Basketball Shots — physics', () => {
  it('applies gravity each step', () => {
    const s = stepShot(flying({ ball: { x: 0.5, y: 0.5, vx: 0, vy: -1, r: 0.035 } }), 0.1);
    expect(s.ball.vy).toBeGreaterThan(-1);
  });

  it('deflects off the backboard', () => {
    const s = stepShot(flying({ ball: { x: 0.89, y: 0.3, vx: 1, vy: 0.4, r: 0.035 } }), 0.1);
    expect(s.ball.vx).toBeLessThan(0);
    expect(s.ball.x).toBeLessThanOrEqual(BACKBOARD_X);
  });
});

describe('Basketball Shots — baskets', () => {
  it('scores when the ball crosses the rim line inside the opening', () => {
    const s = stepShot(flying({ ball: { x: HOOP_X, y: HOOP_Y - 0.01, vx: 0, vy: 0.5, r: 0.035 } }), 0.1);
    expect(s.score).toBe(2);
    expect(s.makes).toBe(1);
    expect(s.phase).toBe('ready');
    expect(s.ball.y).toBeGreaterThan(0.7);
  });

  it('does not score when the ball is outside the rim', () => {
    const s = stepShot(flying({ ball: { x: 0.5, y: HOOP_Y - 0.01, vx: 0, vy: 0.5, r: 0.035 } }), 0.1);
    expect(s.score).toBe(0);
    expect(s.makes).toBe(0);
    expect(s.phase).toBe('flying');
  });

  it('keeps the rim bounds consistent with the hoop centre', () => {
    expect(RIM_LEFT).toBeLessThan(HOOP_X);
    expect(RIM_RIGHT).toBeGreaterThan(HOOP_X);
  });
});

describe('Basketball Shots — misses, lives and clock', () => {
  it('costs a life when the ball falls out of play', () => {
    const s = stepShot(flying({ ball: { x: 0.5, y: 1.04, vx: 0, vy: 1, r: 0.035 } }), 0.1);
    expect(s.misses).toBe(1);
    expect(s.lives).toBe(2);
    expect(s.phase).toBe('ready');
  });

  it('ends the game at zero lives', () => {
    const s = stepShot(flying({ lives: 1, ball: { x: 0.5, y: 1.04, vx: 0, vy: 1, r: 0.035 } }), 0.1);
    expect(s.outcome).toBe('over');
    expect(s.lives).toBe(0);
  });

  it('ticks the clock and ends when it expires', () => {
    const s = stepShot(flying({ phase: 'ready', timeLeft: 0.05 }), 0.1);
    expect(s.timeLeft).toBe(0);
    expect(s.outcome).toBe('over');
  });

  it('does nothing after the game is over', () => {
    const over = { ...createShotGame(), outcome: 'over' as const };
    expect(stepShot(over, 0.1)).toBe(over);
  });
});
