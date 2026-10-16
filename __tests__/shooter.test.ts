import {
  ALIEN_COLS,
  COLS,
  FIRE_CD,
  PLAYER_ROW,
  ShooterState,
  alienInterval,
  aliveCount,
  createShooter,
  fire,
  movePlayer,
  step,
} from '../src/games/implementations/pixel-space-shooter/shooterLogic';

const noRng = () => 0.999;

describe('pixel-space-shooter — setup', () => {
  test('starts with a full block, three lives and one wave', () => {
    const s = createShooter();
    expect(s.lives).toBe(3);
    expect(s.wave).toBe(1);
    expect(s.player).toBe(Math.floor(COLS / 2));
    expect(aliveCount(s)).toBe(4 * ALIEN_COLS);
    expect(s.outcome).toBe('in_progress');
  });

  test('later waves move faster', () => {
    expect(alienInterval(3)).toBeLessThan(alienInterval(1));
    expect(alienInterval(50)).toBe(3);
  });
});

describe('pixel-space-shooter — player', () => {
  test('slides along the bottom row and clamps at the edges', () => {
    let s = createShooter();
    for (let i = 0; i < 20; i++) s = movePlayer(s, -1);
    expect(s.player).toBe(0);
    for (let i = 0; i < 20; i++) s = movePlayer(s, 1);
    expect(s.player).toBe(COLS - 1);
  });

  test('firing respects the cooldown', () => {
    const s = fire(createShooter());
    expect(s.playerBullets).toHaveLength(1);
    expect(s.playerBullets[0]).toEqual({ col: s.player, row: PLAYER_ROW - 1 });
    expect(s.fireCooldown).toBe(FIRE_CD);
    expect(fire(s).playerBullets).toHaveLength(1);
  });
});

describe('pixel-space-shooter — bullets', () => {
  test('a bullet destroys the alien above it and scores', () => {
    const base = createShooter();
    const s: ShooterState = { ...base, playerBullets: [{ col: 1, row: 2 }] };
    const out = step(s, noRng);
    expect(out.score).toBe(10);
    expect(aliveCount(out)).toBe(4 * ALIEN_COLS - 1);
    expect(out.playerBullets).toHaveLength(0);
  });

  test('a bullet that reaches the top is discarded', () => {
    const base = createShooter();
    const s: ShooterState = { ...base, playerBullets: [{ col: 10, row: 0 }] };
    const out = step(s, noRng);
    expect(out.playerBullets).toHaveLength(0);
  });

  test('enemy fire costs a life and a final hit ends the run', () => {
    const base = createShooter();
    const s: ShooterState = { ...base, enemyBullets: [{ col: base.player, row: PLAYER_ROW - 1 }] };
    const hit = step(s, noRng);
    expect(hit.lives).toBe(2);
    expect(hit.outcome).toBe('in_progress');
    const fatal = step({ ...s, lives: 1 }, noRng);
    expect(fatal.lives).toBe(0);
    expect(fatal.outcome).toBe('over');
  });
});

describe('pixel-space-shooter — formation', () => {
  test('the block drops down and reverses at the right edge', () => {
    const base = createShooter();
    const s: ShooterState = { ...base, fCol: COLS - ALIEN_COLS, dir: 1, frame: alienInterval(1) - 1 };
    const out = step(s, noRng);
    expect(out.fRow).toBe(2);
    expect(out.dir).toBe(-1);
  });

  test('reaching the player row ends the run', () => {
    const base = createShooter();
    const s: ShooterState = { ...base, fRow: PLAYER_ROW - 1 - 3, frame: 1 };
    const out = step(s, noRng);
    expect(out.outcome).toBe('over');
  });

  test('clearing the block starts a faster wave', () => {
    const base = createShooter();
    const cleared: ShooterState = { ...base, aliens: base.aliens.map((r) => r.map(() => false)), frame: 1 };
    const out = step(cleared, noRng);
    expect(out.wave).toBe(2);
    expect(aliveCount(out)).toBe(4 * ALIEN_COLS);
    expect(out.fRow).toBe(1);
    expect(out.aliens[0][0]).toBe(true);
  });
});
