/**
 * Pure "Color Switch" logic (normalized coordinates).
 * A ball bounces vertically in a fixed column. Bars scroll down; each bar has a
 * coloured gap. Pass through a bar whose colour matches the ball's colour — a
 * mismatch ends the run. Colour-changer pickups cycle the ball's colour.
 */

export interface Bar {
  y: number;
  color: number;
  scored: boolean;
}

export interface Changer {
  y: number;
  taken: boolean;
}

export interface ColorSwitchState {
  y: number;
  vy: number;
  color: number;
  bars: Bar[];
  changers: Changer[];
  score: number;
  status: 'ready' | 'playing' | 'over';
  barTimer: number;
  changerTimer: number;
}

export const COLOR_COUNT = 4;
export const BALL_R = 0.03;
export const BALL_X = 0.5;
export const GRAVITY = 1.35;
export const BOUNCE_VELOCITY = -0.92;
export const MAX_FALL = 1.6;
export const BAR_SPEED = 0.5;
export const BAR_INTERVAL = 1.5;
export const CROSS_TOLERANCE = 0.045;

export function createColorSwitchState(): ColorSwitchState {
  return {
    y: 0.6,
    vy: 0,
    color: 0,
    bars: [],
    changers: [],
    score: 0,
    status: 'ready',
    barTimer: 0.4,
    changerTimer: 3,
  };
}

export function startColorSwitch(state: ColorSwitchState): ColorSwitchState {
  if (state.status !== 'ready') return state;
  return { ...state, status: 'playing' };
}

export function tapBounce(state: ColorSwitchState): ColorSwitchState {
  if (state.status !== 'playing') return state;
  return { ...state, vy: BOUNCE_VELOCITY };
}

/** Changers that should still be drawn — collected ones are hidden. */
export function visibleChangers(state: ColorSwitchState): Changer[] {
  return state.changers.filter((c) => !c.taken);
}

export function stepColorSwitch(state: ColorSwitchState, dt: number): ColorSwitchState {
  if (state.status !== 'playing') return state;
  const d = Math.max(0, Math.min(0.05, dt));

  let vy = Math.min(MAX_FALL, state.vy + GRAVITY * d);
  let y = state.y + vy * d;
  if (y < BALL_R) {
    y = BALL_R;
    vy = Math.abs(vy);
  } else if (y > 1 - BALL_R) {
    y = 1 - BALL_R;
    vy = -Math.abs(vy);
  }

  let bars = state.bars.map((b) => ({ ...b, y: b.y + BAR_SPEED * d }));
  let changers = state.changers.map((c) => ({ ...c, y: c.y + BAR_SPEED * d }));

  let barTimer = state.barTimer - d;
  let changerTimer = state.changerTimer - d;
  if (barTimer <= 0) {
    bars.push({ y: -0.1, color: Math.floor(Math.random() * COLOR_COUNT), scored: false });
    barTimer = BAR_INTERVAL;
  }
  if (changerTimer <= 0) {
    changers.push({ y: -0.1, taken: false });
    changerTimer = 3 + Math.random() * 2;
  }

  let score = state.score;
  let color = state.color;
  let over = false;

  // Collect changers first.
  for (const c of changers) {
    if (!c.taken && Math.abs(c.y - y) < CROSS_TOLERANCE) {
      c.taken = true;
      color = (color + 1) % COLOR_COUNT;
      score += 1;
    }
  }

  for (const b of bars) {
    if (!b.scored && Math.abs(b.y - y) < CROSS_TOLERANCE) {
      b.scored = true;
      if (b.color === color) {
        score += 5;
      } else {
        over = true;
      }
    }
  }

  bars = bars.filter((b) => b.y < 1.3);
  changers = changers.filter((c) => c.y < 1.3);

  const next: ColorSwitchState = { ...state, y, vy, color, bars, changers, score, barTimer, changerTimer };
  if (over) return { ...next, status: 'over' };
  return next;
}
