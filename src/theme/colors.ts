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
