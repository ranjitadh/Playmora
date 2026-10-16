import {
  Dir,
  FRIGHT_TICKS,
  MazeState,
  PLAYER_START,
  collides,
  createMaze,
  isWall,
  resolveCollision,
  stepPlayer,
  tick,
} from '../src/games/implementations/maze-chaser/mazeLogic';

/** A state with ghosts parked far away so movement tests are deterministic. */
function quiet(): MazeState {
  const s = createMaze();
  return {
    ...s,
    ghosts: [
      { r: 1, c: 1, dir: 'up', start: { r: 1, c: 1 } },
      { r: 1, c: 13, dir: 'up', start: { r: 1, c: 13 } },
    ],
  };
}

describe('maze-chaser — board', () => {
  test('creates the maze with dots, pellets and actors', () => {
    const s = createMaze();
    expect(s.player).toEqual(PLAYER_START);
    expect(s.ghosts).toHaveLength(2);
    expect(s.lives).toBe(3);
    expect(s.outcome).toBe('in_progress');
    expect(s.total).toBeGreaterThan(50);
    expect(s.dots.flat().filter(Boolean).length + s.pellets.flat().filter(Boolean).length).toBe(s.total);
    expect(s.pellets.flat().filter(Boolean)).toHaveLength(4);
  });

  test('walls are solid and open corridors are not', () => {
    expect(isWall(0, 0)).toBe(true);
    expect(isWall(13, 7)).toBe(false);
    expect(isWall(-1, 5)).toBe(true);
    expect(isWall(13, 99)).toBe(true);
  });
});

describe('maze-chaser — eating', () => {
  test('a dot is eaten for ten points', () => {
    const s = quiet();
    const moved = tick({ ...s, player: { r: 13, c: 3 }, dir: 'left' as Dir });
    expect(moved.player).toEqual({ r: 13, c: 2 });
    expect(moved.dots[13][2]).toBe(false);
    expect(moved.score).toBe(10);
    expect(moved.eaten).toBe(1);
  });

  test('a power pellet scores and frightens the ghosts', () => {
    const s = quiet();
    const moved = tick({ ...s, player: { r: 13, c: 2 }, dir: 'left' as Dir });
    expect(moved.player).toEqual({ r: 13, c: 1 });
    expect(moved.pellets[13][1]).toBe(false);
    expect(moved.score).toBe(50);
    expect(moved.frightened).toBe(FRIGHT_TICKS - 1);
  });

  test('running out of food wins the level', () => {
    const s = quiet();
    const dots = s.dots.map((row) => row.map(() => false));
    const pellets = s.pellets.map((row) => row.map(() => false));
    dots[13][2] = true;
    const near: MazeState = { ...s, dots, pellets, eaten: s.total - 1, player: { r: 13, c: 3 }, dir: 'left' };
    const moved = stepPlayer(near);
    expect(moved.outcome).toBe('won');
    expect(moved.eaten).toBe(moved.total);
  });
});

describe('maze-chaser — movement', () => {
  test('walking into a wall does not move the player', () => {
    const s = quiet();
    const up = stepPlayer({ ...s, dir: 'up' as Dir });
    expect(up.player).toEqual(PLAYER_START);
  });

  test('the player moves one cell in open corridors', () => {
    const s = quiet();
    const moved = stepPlayer({ ...s, dir: 'left' as Dir });
    expect(moved.player).toEqual({ r: PLAYER_START.r, c: PLAYER_START.c - 1 });
  });
});

describe('maze-chaser — ghosts', () => {
  test('a normal catch costs a life and resets the board', () => {
    const s = quiet();
    const caught: MazeState = {
      ...s,
      player: { r: 5, c: 7 },
      ghosts: [{ r: 5, c: 7, dir: 'up', start: { r: 1, c: 5 } }, { r: 1, c: 13, dir: 'up', start: { r: 1, c: 13 } }],
    };
    expect(collides(caught)).toBe(true);
    const out = resolveCollision(caught);
    expect(out.lives).toBe(2);
    expect(out.player).toEqual(PLAYER_START);
    expect(out.outcome).toBe('in_progress');
  });

  test('the final catch ends the run', () => {
    const s = quiet();
    const caught: MazeState = {
      ...s,
      lives: 1,
      player: { r: 5, c: 7 },
      ghosts: [{ r: 5, c: 7, dir: 'up', start: { r: 1, c: 5 } }, { r: 1, c: 13, dir: 'up', start: { r: 1, c: 13 } }],
    };
    const out = resolveCollision(caught);
    expect(out.lives).toBe(0);
    expect(out.outcome).toBe('over');
  });

  test('a frightened ghost is eaten for a bonus and sent home', () => {
    const s = quiet();
    const caught: MazeState = {
      ...s,
      frightened: 10,
      ghosts: [{ r: 5, c: 7, dir: 'up', start: { r: 1, c: 5 } }, { r: 1, c: 13, dir: 'up', start: { r: 1, c: 13 } }],
    };
    const out = resolveCollision({ ...caught, player: { r: 5, c: 7 } });
    expect(out.lives).toBe(3);
    expect(out.score).toBe(200);
    expect(out.ghosts[0]).toMatchObject({ r: 1, c: 5 });
  });

  test('a quiet tick leaves the player safe', () => {
    const s = quiet();
    const moved = tick({ ...s, player: { r: 7, c: 7 }, dir: 'left' as Dir });
    expect(moved.outcome).toBe('in_progress');
    expect(moved.lives).toBe(3);
  });
});
