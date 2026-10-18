import { getRandomFoodCoord, GRID_SIZE, Point, stepSnake } from '../src/games/implementations/snake/snakeLogic';

describe('Snake Classic — step logic', () => {
  it('advances the head and trims the tail when not eating', () => {
    const snake: Point[] = [[8, 7], [8, 6], [8, 5]];
    const r = stepSnake(snake, [0, 0], 0, 'RIGHT');
    expect(r.snake[0]).toEqual([8, 8]);
    expect(r.snake.length).toBe(3);
    expect(r.ate).toBe(false);
    expect(r.died).toBe(false);
    expect(r.score).toBe(0);
  });

  it('wraps around the top and left edges', () => {
    const top: Point[] = [[0, 5], [1, 5], [2, 5]];
    expect(stepSnake(top, [10, 10], 0, 'UP').snake[0]).toEqual([GRID_SIZE - 1, 5]);

    const left: Point[] = [[5, 0], [5, 1], [5, 2]];
    expect(stepSnake(left, [10, 10], 0, 'LEFT').snake[0]).toEqual([5, GRID_SIZE - 1]);
  });

  it('grows, scores and respawns food when eating', () => {
    const snake: Point[] = [[8, 7], [8, 6], [8, 5]];
    const r = stepSnake(snake, [8, 8], 20, 'RIGHT', () => 0.5);
    expect(r.ate).toBe(true);
    expect(r.died).toBe(false);
    expect(r.score).toBe(30);
    expect(r.snake.length).toBe(4);
    expect(r.snake[0]).toEqual([8, 8]);
    // The new food must never overlap the snake.
    const occupied = new Set(r.snake.map(([a, b]) => `${a},${b}`));
    expect(occupied.has(`${r.food[0]},${r.food[1]}`)).toBe(false);
  });

  it('dies on self-collision and leaves the body untouched', () => {
    const snake: Point[] = [[3, 3], [3, 4], [4, 4], [4, 3], [5, 3]];
    const r = stepSnake(snake, [10, 10], 0, 'DOWN');
    expect(r.died).toBe(true);
    expect(r.snake).toBe(snake);
    expect(r.score).toBe(0);
  });

  it('allows following the tail cell (it frees up this step)', () => {
    const snake: Point[] = [[5, 5], [5, 4], [6, 4], [6, 5]];
    const r = stepSnake(snake, [10, 10], 0, 'RIGHT');
    expect(r.died).toBe(false);
  });
});

describe('Snake Classic — food placement', () => {
  it('never places food on the snake', () => {
    const snake: Point[] = [[0, 0], [0, 1], [1, 0]];
    for (let i = 0; i < 50; i++) {
      const f = getRandomFoodCoord(snake);
      expect(snake.some(([r, c]) => r === f[0] && c === f[1])).toBe(false);
    }
  });
});
