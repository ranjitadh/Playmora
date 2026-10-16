import { hapticsService } from '../src/services/hapticsService';
import { audioService } from '../src/services/audioService';

describe('Service methods keep their binding when detached', () => {
  test('hapticsService methods can be invoked unbound without throwing', () => {
    const methods = [
      hapticsService.lightImpact,
      hapticsService.mediumImpact,
      hapticsService.heavyImpact,
      hapticsService.success,
      hapticsService.error,
      hapticsService.selection,
    ];

    methods.forEach((method) => {
      expect(() => method()).not.toThrow();
    });
  });

  test('a ternary-selected haptics reference stays bound', () => {
    // Reproduces the pattern: (cond ? hapticsService.success : hapticsService.error)()
    const pick = (won: boolean) => (won ? hapticsService.success : hapticsService.error);

    expect(() => pick(true)()).not.toThrow();
    expect(() => pick(false)()).not.toThrow();
  });

  test('audioService.playSound can be invoked unbound without throwing', () => {
    const playSound = audioService.playSound;
    expect(() => playSound('tap')).not.toThrow();
  });

  test('setEnabled/isEnabled still work when detached', () => {
    const setEnabled = hapticsService.setEnabled;
    const isEnabled = hapticsService.isEnabled;

    setEnabled(false);
    expect(isEnabled()).toBe(false);
    setEnabled(true);
    expect(isEnabled()).toBe(true);
  });
});
