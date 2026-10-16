import {
  BALL_RADIUS,
  AI_PADDLE_X,
  PADDLE_HEIGHT,
  PLAYER_PADDLE_X,
  WIN_SCORE,
  clampPaddle,
  createState,
  movePlayer,
  serve,
  step,
} from '../src/games/implementations/pong/pongLogic';

describe('Pong — setup', () => {
  it('starts centered with no score', () => {
    const s = createState('player');
    expect(s.playerScore).toBe(0);
    expect(s.aiScore).toBe(0);
    expect(s.winner).toBeNull();
    expect(s.vx).toBeLessThan(0); // served toward the player (left)
  });
});

describe('Pong — ball physics', () => {
  it('bounces off the top wall', () => {
    const s = { ...createState('player'), ballY: BALL_RADIUS + 0.001, vy: -0.5, vx: 0 };
    const next = step(s, 0.02);
    expect(next.vy).toBeGreaterThan(0);
    expect(next.ballY).toBeGreaterThanOrEqual(BALL_RADIUS - 1e-9);
  });

  it('bounces off the bottom wall', () => {
    const s = { ...createState('player'), ballY: 1 - BALL_RADIUS - 0.001, vy: 0.5, vx: 0 };
    const next = step(s, 0.02);
    expect(next.vy).toBeLessThan(0);
  });

  it('bounces off the player paddle and heads right', () => {
    const s = {
      ...createState('player'),
      ballX: PLAYER_PADDLE_X + 0.03,
      ballY: 0.5,
      playerY: 0.5,
      vx: -0.8,
      vy: 0,
    };
    const next = step(s, 0.02);
    expect(next.vx).toBeGreaterThan(0);
  });

  it('bounces off the AI paddle and heads left', () => {
    const s = {
      ...createState('player'),
      ballX: AI_PADDLE_X - 0.01,
      ballY: 0.5,
      aiY: 0.5,
      vx: 0.8,
      vy: 0,
    };
    const next = step(s, 0.02);
    expect(next.vx).toBeLessThan(0);
  });
});

describe('Pong — scoring and match end', () => {
  it('awards the AI a point when the ball passes the left edge', () => {
    const s = { ...createState('player'), ballX: -BALL_RADIUS - 0.01, vx: -0.8, vy: 0 };
    const next = step(s, 0.001);
    expect(next.aiScore).toBe(1);
    expect(next.ballX).toBeCloseTo(0.5, 5);
  });

  it('awards the player a point when the ball passes the right edge', () => {
    const s = { ...createState('player'), ballX: 1 + BALL_RADIUS + 0.01, vx: 0.8, vy: 0 };
    const next = step(s, 0.001);
    expect(next.playerScore).toBe(1);
  });

  it('declares a winner at the win score', () => {
    const s = { ...createState('player'), playerScore: WIN_SCORE - 1, ballX: 1.2, vx: 0.8, vy: 0 };
    const next = step(s, 0.001);
    expect(next.playerScore).toBe(WIN_SCORE);
    expect(next.winner).toBe('player');
  });

  it('ignores updates after a winner is decided', () => {
    const s = { ...createState('player'), winner: 'ai' as const };
    expect(step(s, 0.02)).toBe(s);
  });
});

describe('Pong — controls', () => {
  it('clamps the player paddle inside the court', () => {
    const s = createState('player');
    expect(movePlayer(s, -5).playerY).toBeCloseTo(PADDLE_HEIGHT / 2, 5);
    expect(movePlayer(s, 5).playerY).toBeCloseTo(1 - PADDLE_HEIGHT / 2, 5);
  });

  it('serve sends the ball toward the requested side', () => {
    const s = createState('player');
    expect(serve(s, 'player').vx).toBeLessThan(0);
    expect(serve(s, 'ai').vx).toBeGreaterThan(0);
  });

  it('the AI paddle moves toward the ball over time', () => {
    const s = { ...createState('player'), ballY: 0.9, aiY: 0.1, vx: 0, vy: 0 };
    const next = step(s, 0.05);
    expect(next.aiY).toBeGreaterThan(0.1);
    expect(next.aiY).toBeLessThanOrEqual(clampPaddle(0.9));
  });
});
