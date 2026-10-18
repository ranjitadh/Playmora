import {
  BALL_R,
  COLOR_COUNT,
  ColorSwitchState,
  createColorSwitchState,
  startColorSwitch,
  stepColorSwitch,
  tapBounce,
  visibleChangers,
} from '../src/games/implementations/color-switch/colorSwitchLogic';

const playing = (): ColorSwitchState => startColorSwitch(createColorSwitchState());

describe('Color Switch — physics', () => {
  it('falls under gravity', () => {
    const s = playing();
    expect(stepColorSwitch(s, 0.05).y).toBeGreaterThan(s.y);
  });

  it('tap bounces upward', () => {
    expect(tapBounce(playing()).vy).toBeLessThan(0);
  });

  it('bounces off the top and bottom', () => {
    const top = stepColorSwitch({ ...playing(), y: BALL_R + 0.001, vy: -0.9, barTimer: 99, changerTimer: 99 }, 0.02);
    expect(top.vy).toBeGreaterThanOrEqual(0);
    const bottom = stepColorSwitch({ ...playing(), y: 1 - BALL_R - 0.001, vy: 0.9, barTimer: 99, changerTimer: 99 }, 0.02);
    expect(bottom.vy).toBeLessThanOrEqual(0);
  });
});

describe('Color Switch — bars', () => {
  it('scores on a matching-colour bar', () => {
    const s: ColorSwitchState = {
      ...playing(),
      y: 0.5,
      vy: 0,
      color: 2,
      barTimer: 99,
      changerTimer: 99,
      bars: [{ y: 0.5, color: 2, scored: false }],
    };
    const after = stepColorSwitch(s, 0.001);
    expect(after.status).toBe('playing');
    expect(after.score).toBe(5);
  });

  it('ends the run on a mismatched-colour bar', () => {
    const s: ColorSwitchState = {
      ...playing(),
      y: 0.5,
      vy: 0,
      color: 0,
      barTimer: 99,
      changerTimer: 99,
      bars: [{ y: 0.5, color: 1, scored: false }],
    };
    expect(stepColorSwitch(s, 0.001).status).toBe('over');
  });

  it('does not re-evaluate a scored bar', () => {
    const s: ColorSwitchState = {
      ...playing(),
      y: 0.5,
      vy: 0,
      color: 0,
      barTimer: 99,
      changerTimer: 99,
      score: 5,
      bars: [{ y: 0.5, color: 1, scored: true }],
    };
    expect(stepColorSwitch(s, 0.001).status).toBe('playing');
  });
});

describe('Color Switch — changers', () => {
  it('cycles the ball colour when collected', () => {
    const s: ColorSwitchState = {
      ...playing(),
      y: 0.5,
      vy: 0,
      color: 0,
      barTimer: 99,
      changerTimer: 99,
      changers: [{ y: 0.5, taken: false }],
    };
    const after = stepColorSwitch(s, 0.001);
    expect(after.color).toBe(1 % COLOR_COUNT);
  });

  it('renders a changer until it is collected, then hides it', () => {
    const s: ColorSwitchState = {
      ...playing(),
      y: 0.5,
      vy: 0,
      color: 0,
      barTimer: 99,
      changerTimer: 99,
      changers: [{ y: 0.5, taken: false }],
    };
    expect(visibleChangers(s)).toHaveLength(1);
    const after = stepColorSwitch(s, 0.001);
    expect(after.changers[0].taken).toBe(true);
    expect(visibleChangers(after)).toHaveLength(0);
  });

  it('hides a changer that is already taken', () => {
    const s: ColorSwitchState = { ...playing(), changers: [{ y: 0.4, taken: true }, { y: 0.8, taken: false }] };
    expect(visibleChangers(s)).toHaveLength(1);
    expect(visibleChangers(s)[0].y).toBe(0.8);
  });
});
