export const Colors = {
  background: '#F8F7F4', // warm off-white
  surface: '#FFFFFF',    // cards
  surfaceElevated: '#FFFFFF',
  surfaceHighlight: '#F5F3FF',
  border: '#EAE8E3',      // subtle gray
  borderSubtle: '#F0EEE7',

  // Primary brand / accents
  primary: '#7557E8',      // purple
  primaryDark: '#5F47D6',
  primaryGlow: 'rgba(117, 87, 232, 0.15)',

  secondary: '#EEE8FF',   // soft lavender
  secondaryDark: '#D8CCFF',
  secondaryGlow: 'rgba(117, 87, 232, 0.1)',

  accent: '#10B981',      // emerald green
  accentGold: '#F59E0B',  // amber
  accentCoral: '#F43F5E', // rose

  // Typography
  textPrimary: '#202124',   // near-black
  textSecondary: '#6F6F6F',
  textMuted: '#777777',
  textInverse: '#FFFFFF',

  // Category specific colors for badges and cards
  categories: {
    retro: '#F59E0B',
    traditional: '#7557E8',
    racing: '#F43F5E',
    brain: '#10B981',
    modern: '#38BDF8',
    sports: '#38BDF8',
  },

  // Game UI specifics
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  overlay: 'rgba(32, 33, 36, 0.6)',
};

export type ThemeColors = typeof Colors;

/**
 * Returns a readable foreground color (near-black or white) for the given
 * background hex, based on WCAG relative luminance. Used to keep text/icon
 * contrast correct when a background can be either a light or dark accent.
 */
export function getReadableTextColor(backgroundHex: string): string {
  const hex = backgroundHex.replace('#', '').trim();
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  // 0.179 is the luminance where black and white yield equal contrast.
  return luminance > 0.179 ? '#1A1A1A' : Colors.textInverse;
}
