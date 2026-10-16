import {
  BALL_R,
  BrickState,
  PADDLE_Y,
  POINTS_PER_BRICK,
  brickLeft,
  brickTop,
  createBrickState,
  launch,
  movePaddle,
  step,
} from '../src/games/implementations/brick-breaker/brickBreakerLogic';
import { BRICK_W, BRICK_H } from '../src/games/implementations/brick-breaker/brickBreakerLogic';

const playing = (): BrickState => launch(createBrickState());

describe('Brick Breaker — setup', () => {
  it('starts ready with all bricks alive and 3 lives', () => {
    const s = createBrickState();
    expect(s.status).toBe('ready');
    expect(s.bricks.every((b) => b.alive)).toBe(true);
    expect(s.lives).toBe(3);
  });

  it('launch gives upward velocity', () => {
    const s = playing();
    expect(s.status).toBe('playing');
    expect(s.vy).toBeLessThan(0);
  });

  it('keeps the ball on the paddle before launch', () => {
    const s = movePaddle(createBrickState(), 0.3);
    expect(step(s, 0.05).ballX).toBeCloseTo(0.3, 5);
  });
});

describe('Brick Breaker — physics', () => {
  it('bounces off the left and right walls', () => {
    const left = step({ ...playing(), ballX: BALL_R + 0.001, vx: -0.5, vy: 0.001 }, 0.02);
    expect(left.vx).toBeGreaterThan(0);
    const right = step({ ...playing(), ballX: 1 - BALL_R - 0.001, vx: 0.5, vy: 0.001 }, 0.02);
    expect(right.vx).toBeLessThan(0);
  });

  it('bounces off the top wall', () => {
    const top = step({ ...playing(), ballY: BALL_R + 0.001, vx: 0.001, vy: -0.5 }, 0.02);
    expect(top.vy).toBeGreaterThan(0);
  });

  it('bounces off the paddle', () => {
    const s: BrickState = { ...playing(), ballX: 0.5, ballY: PADDLE_Y - BALL_R - 0.001, vx: 0, vy: 0.5, paddleX: 0.5 };
    const after = step(s, 0.02);
    expect(after.vy).toBeLessThan(0);
  });
});

describe('Brick Breaker — bricks and lives', () => {
  it('removes a brick and scores on contact', () => {
    // Aim the ball straight at the first brick.
    const s: BrickState = {
      ...playing(),
      ballX: brickLeft(0) + BRICK_W / 2,
      ballY: brickTop(0) + BRICK_H + BALL_R + 0.002,
      vx: 0,
      vy: -0.5,
    };
    const after = step(s, 0.02);
    expect(after.bricks.find((b) => b.row === 0 && b.col === 0)?.alive).toBe(false);
    expect(after.score).toBe(POINTS_PER_BRICK);
  });

  it('loses a life and relaunches when the ball drops', () => {
    const s: BrickState = { ...playing(), ballY: 1.05, vy: 0.5, vx: 0 };
    const after = step(s, 0.02);
    expect(after.lives).toBe(2);
    expect(after.status).toBe('playing');
    expect(after.vy).toBeLessThan(0);
  });

  it('loses the game when lives run out', () => {
    const s: BrickState = { ...playing(), ballY: 1.05, vy: 0.5, vx: 0, lives: 1 };
    const after = step(s, 0.02);
    expect(after.status).toBe('lost');
  });

  it('wins when every brick is cleared', () => {
    const base = playing();
    const cleared = base.bricks.map((b, i) => ({
      ...b,
      alive: i === 0, // only brick 0 still alive, aimed at below
    }));
    const s: BrickState = {
      ...base,
      bricks: cleared,
      ballX: brickLeft(cleared[0].col) + BRICK_W / 2,
      ballY: brickTop(cleared[0].row) + BRICK_H + BALL_R + 0.002,
      vx: 0,
      vy: -0.5,
    };
    const after = step(s, 0.02);
    expect(after.status).toBe('won');
  });

  it('ignores updates once the game is over', () => {
    const s: BrickState = { ...playing(), status: 'lost' };
    expect(step(s, 0.02)).toBe(s);
  });
});

describe('Brick Breaker — paddle clamp', () => {
  it('keeps the paddle inside the court', () => {
    expect(movePaddle(createBrickState(), -1).paddleX).toBeGreaterThan(0);
    expect(movePaddle(createBrickState(), 2).paddleX).toBeLessThan(1);
  });
});
