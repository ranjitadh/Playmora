/**
 * Shared pure engine for top-down "falling obstacle" racers.
 * Obstacles scroll toward a player pinned near the bottom; the player steers
 * horizontally. Used by Traffic Racer, Car Dodge and Endless Highway with
 * different configs and skins. No React Native dependencies.
 */

export interface FallingObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  scored: boolean;
}

export interface FallingDodgeState {
  x: number;
  obstacles: FallingObstacle[];
  score: number;
  status: 'ready' | 'playing' | 'over';
  spawnTimer: number;
  speed: number;
}

export interface FallingDodgeConfig {
  playerY: number;
  playerW: number;
  playerH: number;
  speedStart: number;
  speedMax: number;
  speedRamp: number;
  spawnInterval: number;
  obstacleW: number;
  obstacleH: number;
  /** When set, the player snaps to lane centres and obstacles spawn on lanes. */
  lanes?: number;
}

export function createFallingDodge(): FallingDodgeState {
  return { x: 0.5, obstacles: [], score: 0, status: 'ready', spawnTimer: 0.4, speed: 0 };
}

export function startFallingDodge(state: FallingDodgeState, cfg: FallingDodgeConfig): FallingDodgeState {
  if (state.status !== 'ready') return state;
  return { ...state, status: 'playing', speed: cfg.speedStart };
}

export function laneCenter(lane: number, lanes: number): number {
  return (lane + 0.5) / lanes;
}

export function movePlayerX(state: FallingDodgeState, x: number, cfg: FallingDodgeConfig): FallingDodgeState {
  if (cfg.lanes) {
    const lane = Math.max(0, Math.min(cfg.lanes - 1, Math.floor(x * cfg.lanes)));
    return { ...state, x: laneCenter(lane, cfg.lanes) };
  }
  const half = cfg.playerW / 2;
  return { ...state, x: Math.max(half, Math.min(1 - half, x)) };
}

function collides(state: FallingDodgeState, cfg: FallingDodgeConfig): boolean {
  const px1 = state.x - cfg.playerW / 2;
  const px2 = state.x + cfg.playerW / 2;
  const py1 = cfg.playerY - cfg.playerH / 2;
  const py2 = cfg.playerY + cfg.playerH / 2;
  for (const o of state.obstacles) {
    const ox1 = o.x - o.w / 2;
    const ox2 = o.x + o.w / 2;
    const oy1 = o.y;
    const oy2 = o.y + o.h;
    if (px2 > ox1 && px1 < ox2 && py2 > oy1 && py1 < oy2) return true;
  }
  return false;
}

export function stepFallingDodge(state: FallingDodgeState, dt: number, cfg: FallingDodgeConfig): FallingDodgeState {
  if (state.status !== 'playing') return state;
  const d = Math.max(0, Math.min(0.05, dt));

  let obstacles = state.obstacles.map((o) => ({ ...o, y: o.y + state.speed * d }));
  let spawnTimer = state.spawnTimer - d;

  if (spawnTimer <= 0) {
    const minX = cfg.obstacleW / 2;
    const maxX = 1 - cfg.obstacleW / 2;
    if (cfg.lanes) {
      for (let i = 0; i < cfg.lanes; i++) {
        if (Math.random() < 0.5) {
          const x = laneCenter(i, cfg.lanes);
          obstacles.push({ x, y: -cfg.obstacleH, w: cfg.obstacleW, h: cfg.obstacleH, scored: false });
        }
      }
      // Ensure at least one obstacle so a lane pattern always appears.
      if (obstacles.length === 0) {
        const x = laneCenter(Math.floor(Math.random() * cfg.lanes), cfg.lanes);
        obstacles.push({ x, y: -cfg.obstacleH, w: cfg.obstacleW, h: cfg.obstacleH, scored: false });
      }
    } else {
      const x = minX + Math.random() * (maxX - minX);
      obstacles.push({ x, y: -cfg.obstacleH, w: cfg.obstacleW, h: cfg.obstacleH, scored: false });
      // Occasionally spawn a second obstacle to force weaving.
      if (Math.random() < 0.25 && maxX - minX > cfg.obstacleW * 1.6) {
        const x2 = x < 0.5 ? Math.min(maxX, x + cfg.obstacleW * 1.4) : Math.max(minX, x - cfg.obstacleW * 1.4);
        obstacles.push({ x: x2, y: -cfg.obstacleH, w: cfg.obstacleW, h: cfg.obstacleH, scored: false });
      }
    }
    spawnTimer = cfg.spawnInterval;
  }

  let score = state.score;
  for (const o of obstacles) {
    if (!o.scored && o.y > cfg.playerY + cfg.playerH) {
      o.scored = true;
      score += 1;
    }
  }
  obstacles = obstacles.filter((o) => o.y < 1.25);

  const speed = Math.min(cfg.speedMax, state.speed + cfg.speedRamp * d);
  const next: FallingDodgeState = { ...state, obstacles, score, spawnTimer, speed };
  if (collides(next, cfg)) return { ...next, status: 'over' };
  return next;
}
