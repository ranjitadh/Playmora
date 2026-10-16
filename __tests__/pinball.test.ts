import {
  BALL_R,
  Bumper,
  PinballState,
  createPinball,
  step,
} from '../src/games/implementations/classic-pinball/pinballLogic';

const noFlip = { left: false, right: false };

function withBall(base: PinballState, x: number, y: number, vx: number, vy: number): PinballState {
  return { ...base, ball: { x, y, vx, vy } };
}

describe('classic-pinball — setup', () => {
  test('starts with three lives, bumpers and a live ball', () => {
    const s = createPinball();
    expect(s.lives).toBe(3);
    expect(s.bumpers.length).toBeGreaterThanOrEqual(3);
    expect(s.score).toBe(0);
    expect(s.outcome).toBe('in_progress');
    expect(s.ball.y).toBeLessThan(0.5);
  });
});

describe('classic-pinball — physics', () => {
  test('gravity pulls the ball downward', () => {
    const s = withBall({ ...createPinball(), bumpers: [] }, 0.5, 0.3, 0, 0.2);
    const out = step(s, noFlip, 0.016);
    expect(out.ball.vy).toBeGreaterThan(0.2);
    expect(out.ball.y).toBeGreaterThan(0.3);
  });

  test('the side wall rebounds the ball', () => {
    const s = withBall({ ...createPinball(), bumpers: [] }, 0.99, 0.4, 0.6, 0);
    const out = step(s, noFlip, 0.016);
    expect(out.ball.x).toBeLessThanOrEqual(1 - BALL_R + 1e-6);
    expect(out.ball.vx).toBeLessThan(0);
  });

  test('the top wall rebounds the ball', () => {
    const s = withBall({ ...createPinball(), bumpers: [] }, 0.5, 0.01, 0, -0.6);
    const out = step(s, noFlip, 0.016);
    expect(out.ball.y).toBeGreaterThanOrEqual(BALL_R - 1e-6);
    expect(out.ball.vy).toBeGreaterThan(0);
  });
});

describe('classic-pinball — scoring', () => {
  test('a bumper rebounds the ball and scores', () => {
    const s = withBall(createPinball(), 0.5, 0.45, 0, 0.5);
    const out = step(s, noFlip, 0.016);
    expect(out.score).toBeGreaterThanOrEqual(150);
    expect(out.hits).toBeGreaterThanOrEqual(1);
    expect(out.ball.vy).toBeLessThan(0);
  });
});

describe('classic-pinball — flippers', () => {
  test('holding a flipper kicks the ball upward', () => {
    const s = withBall(createPinball(), 0.28, 0.9, 0, 0.2);
    const out = step(s, { left: true, right: false }, 0.016);
    expect(out.ball.vy).toBeLessThan(0);
  });

  test('an idle flipper does not save the ball', () => {
    const s = withBall(createPinball(), 0.28, 0.9, 0, 0.2);
    const out = step(s, noFlip, 0.016);
    expect(out.ball.vy).toBeGreaterThan(0);
  });
});

describe('classic-pinball — draining', () => {
  test('a drained ball costs a life and resets', () => {
    const s = withBall(createPinball(), 0.5, 1.2, 0, 0.5);
    const out = step(s, noFlip, 0.016);
    expect(out.lives).toBe(2);
    expect(out.outcome).toBe('in_progress');
    expect(out.ball.y).toBeLessThan(0.5);
  });

  test('the final drain ends the run', () => {
    const s = withBall({ ...createPinball(), lives: 1 }, 0.5, 1.2, 0, 0.5);
    const out = step(s, noFlip, 0.016);
    expect(out.lives).toBe(0);
    expect(out.outcome).toBe('over');
  });

  test('a finished game ignores further steps', () => {
    const s: PinballState = { ...createPinball(), outcome: 'over' };
    expect(step(s, noFlip)).toBe(s);
  });

  test('bumpers can be customised', () => {
    const custom: Bumper = { x: 0.5, y: 0.5, r: 0.08, points: 999 };
    const s: PinballState = { ...createPinball(), bumpers: [custom], ball: { x: 0.5, y: 0.45, vx: 0, vy: 0.5 } };
    const out = step(s, noFlip, 0.016);
    expect(out.score).toBe(999);
  });
});
