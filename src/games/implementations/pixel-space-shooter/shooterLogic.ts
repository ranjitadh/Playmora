/**
 * Pure Pixel Space Shooter logic. No RN dependencies.
 *
 * A 4x8 block of invaders drifts left and right, dropping a row each time the
 * block reaches an edge. The player slides along the bottom row and fires
 * upward; every alien hit scores. Invaders return fire, and the run ends if the
 * block reaches the player's row or the player loses all lives. Clearing the
 * block starts a faster wave.
 */

export const ROWS = 13;
export const COLS = 11;
export const ALIEN_ROWS = 4;
export const ALIEN_COLS = 8;
export const PLAYER_ROW = 12;
export const FIRE_CD = 6;

export interface Bullet {
  col: number;
  row: number;
}

export interface ShooterState {
  player: number;
  aliens: boolean[][];
  fRow: number;
  fCol: number;
  dir: 1 | -1;
  playerBullets: Bullet[];
  enemyBullets: Bullet[];
  score: number;
  lives: number;
  wave: number;
  frame: number;
  fireCooldown: number;
  enemyCooldown: number;
  outcome: 'in_progress' | 'over';
}

function freshAliens(): boolean[][] {
  return Array.from({ length: ALIEN_ROWS }, () => new Array<boolean>(ALIEN_COLS).fill(true));
}

export function aliveCount(state: ShooterState): number {
  return state.aliens.flat().filter(Boolean).length;
}

export function createShooter(): ShooterState {
  return {
    player: Math.floor(COLS / 2),
    aliens: freshAliens(),
    fRow: 1,
    fCol: 1,
    dir: 1,
    playerBullets: [],
    enemyBullets: [],
    score: 0,
    lives: 3,
    wave: 1,
    frame: 0,
    fireCooldown: 0,
    enemyCooldown: 18,
    outcome: 'in_progress',
  };
}

export function alienInterval(wave: number): number {
  return Math.max(3, 11 - wave);
}

export function enemyInterval(wave: number): number {
  return Math.max(12, 30 - wave * 3);
}

export function movePlayer(state: ShooterState, dir: number): ShooterState {
  if (state.outcome !== 'in_progress') return state;
  const player = Math.max(0, Math.min(COLS - 1, state.player + dir));
  return { ...state, player };
}

/** Fires a bullet from the player's column when the cooldown has elapsed. */
export function fire(state: ShooterState): ShooterState {
  if (state.outcome !== 'in_progress' || state.fireCooldown > 0) return state;
  const blocker = state.playerBullets.some((b) => b.col === state.player && b.row === PLAYER_ROW - 1);
  if (blocker) return state;
  return {
    ...state,
    playerBullets: [...state.playerBullets, { col: state.player, row: PLAYER_ROW - 1 }],
    fireCooldown: FIRE_CD,
  };
}

function alienAt(state: ShooterState, row: number, col: number): boolean {
  const ar = row - state.fRow;
  const ac = col - state.fCol;
  if (ar < 0 || ar >= ALIEN_ROWS || ac < 0 || ac >= ALIEN_COLS) return false;
  return state.aliens[ar][ac];
}

function killAlien(state: ShooterState, row: number, col: number): boolean[][] {
  const ar = row - state.fRow;
  const ac = col - state.fCol;
  const aliens = state.aliens.map((r) => r.slice());
  aliens[ar][ac] = false;
  return aliens;
}

function drift(state: ShooterState): ShooterState {
  const next = state.fCol + state.dir;
  const minCol = next;
  const maxCol = next + ALIEN_COLS - 1;
  if (minCol < 0 || maxCol > COLS - 1) {
    return { ...state, fRow: state.fRow + 1, dir: (state.dir === 1 ? -1 : 1) as 1 | -1 };
  }
  return { ...state, fCol: next };
}

function respawnWave(state: ShooterState): ShooterState {
  return {
    ...state,
    aliens: freshAliens(),
    fRow: 1,
    fCol: 1,
    dir: 1,
    enemyBullets: [],
    wave: state.wave + 1,
  };
}

/** Advances the whole simulation one frame. `rng` allows deterministic tests. */
export function step(state: ShooterState, rng: () => number = Math.random): ShooterState {
  if (state.outcome !== 'in_progress') return state;
  let s: ShooterState = { ...state, frame: state.frame + 1 };
  s.fireCooldown = Math.max(0, state.fireCooldown - 1);
  s.enemyCooldown = Math.max(0, state.enemyCooldown - 1);

  let score = s.score;
  let aliens = s.aliens;

  const playerBullets: Bullet[] = [];
  for (const b of s.playerBullets) {
    const row = b.row - 1;
    if (row < 0) continue;
    if (alienAt({ ...s, aliens }, row, b.col)) {
      aliens = killAlien({ ...s, aliens }, row, b.col);
      score += 10;
    } else {
      playerBullets.push({ col: b.col, row });
    }
  }

  let lives = s.lives;
  const enemyBullets: Bullet[] = [];
  for (const b of s.enemyBullets) {
    const row = b.row + 1;
    if (row >= ROWS) continue;
    if (row === PLAYER_ROW && b.col === s.player) {
      lives -= 1;
      continue;
    }
    enemyBullets.push({ col: b.col, row });
  }

  s = { ...s, aliens, playerBullets, enemyBullets, score, lives };

  // Invaders return fire from the lowest alien in a random occupied column.
  if (s.enemyCooldown === 0 && aliveCount(s) > 0) {
    const columns: number[] = [];
    for (let ac = 0; ac < ALIEN_COLS; ac++) {
      if (s.aliens.some((row) => row[ac])) columns.push(s.fCol + ac);
    }
    if (columns.length > 0) {
      const col = columns[Math.floor(rng() * columns.length)];
      let lowest = -1;
      for (let ar = ALIEN_ROWS - 1; ar >= 0; ar--) {
        if (s.aliens[ar][col - s.fCol]) {
          lowest = ar;
          break;
        }
      }
      if (lowest >= 0) {
        s = { ...s, enemyBullets: [...s.enemyBullets, { col, row: s.fRow + lowest + 1 }] };
      }
    }
    s = { ...s, enemyCooldown: enemyInterval(s.wave) };
  }

  if (s.frame % alienInterval(s.wave) === 0) s = drift(s);

  if (s.lives <= 0) {
    return { ...s, lives: 0, outcome: 'over' };
  }

  const invasion = s.aliens.some((row, ar) => row.some((alive, ac) => alive && s.fRow + ar >= PLAYER_ROW - 1));
  if (invasion) return { ...s, outcome: 'over' };

  if (aliveCount(s) === 0) s = respawnWave(s);

  return s;
}
