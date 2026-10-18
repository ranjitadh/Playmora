/**
 * Pure "Snake Classic" step logic on a wrapped grid. No React Native
 * dependencies — safe for unit testing.
 */

export type Point = [number, number];
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export const GRID_SIZE = 16;

export interface SnakeStep {
  /** The snake body after the step (head first). Unchanged on death. */
  snake: Point[];
  /** The food cell after the step (a fresh cell when eaten). */
  food: Point;
  /** The score after the step. */
  score: number;
  /** Whether the snake ate food this step. */
  ate: boolean;
  /** Whether the snake collided with itself this step. */
  died: boolean;
}

export function getRandomFoodCoord(snake: Point[], rng: () => number = Math.random): Point {
  const occupied = new Set(snake.map(([r, c]) => `${r},${c}`));
  const available: Point[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!occupied.has(`${r},${c}`)) {
        available.push([r, c]);
      }
    }
  }

  if (available.length === 0) return [0, 0];
  return available[Math.floor(rng() * available.length)];
}

export function isOpposite(a: Direction, b: Direction): boolean {
  return (
    (a === 'UP' && b === 'DOWN') ||
    (a === 'DOWN' && b === 'UP') ||
    (a === 'LEFT' && b === 'RIGHT') ||
    (a === 'RIGHT' && b === 'LEFT')
  );
}

/**
 * Advances the snake one cell. Walls wrap, self-collision ends the run, and
 * eating grows the snake and awards 10 points. Side effects (sound, haptics,
 * callbacks) are the caller's responsibility; this stays pure.
 */
export function stepSnake(
  snake: Point[],
  food: Point,
  score: number,
  direction: Direction,
  rng: () => number = Math.random
): SnakeStep {
  const head = snake[0];
  const newHead: Point = [head[0], head[1]];

  switch (direction) {
    case 'UP':
      newHead[0] -= 1;
      break;
    case 'DOWN':
      newHead[0] += 1;
      break;
    case 'LEFT':
      newHead[1] -= 1;
      break;
    case 'RIGHT':
      newHead[1] += 1;
      break;
  }

  // Wrap around walls — the snake never dies on an edge.
  if (newHead[0] < 0) newHead[0] = GRID_SIZE - 1;
  else if (newHead[0] >= GRID_SIZE) newHead[0] = 0;
  if (newHead[1] < 0) newHead[1] = GRID_SIZE - 1;
  else if (newHead[1] >= GRID_SIZE) newHead[1] = 0;

  const willEat = newHead[0] === food[0] && newHead[1] === food[1];

  // Self collision — the tail cell frees up unless the snake is growing.
  const bodyToCheck = willEat ? snake : snake.slice(0, -1);
  for (const seg of bodyToCheck) {
    if (seg[0] === newHead[0] && seg[1] === newHead[1]) {
      return { snake, food, score, ate: false, died: true };
    }
  }

  const newSnake: Point[] = [newHead, ...snake];

  if (willEat) {
    const newScore = score + 10;
    return {
      snake: newSnake,
      food: getRandomFoodCoord(newSnake, rng),
      score: newScore,
      ate: true,
      died: false,
    };
  }

  newSnake.pop();
  return { snake: newSnake, food, score, ate: false, died: false };
}
