import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';

/**
 * Shared per-category palettes so every game in a category shares one visual
 * language. The app itself is a light theme; categories differ by accent,
 * surface treatment and shape language.
 */

/** Puzzle & Brain — calm, minimal, emerald, generous whitespace. */
export const Brain = {
  accent: '#10B981',
  accentDark: '#059669',
  accentDeep: '#047857',
  accentSoft: '#ECFDF5',
  accentBorder: '#A7F3D0',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F7F6',
  border: '#E6E8E6',
  ink: '#1F2429',
  inkSoft: '#6B7278',
  inkMuted: '#9AA1A7',
  radius: 18,
} as const;

/** Modern & Addictive — sleek, glossy, vibrant, sky-led neon accents. */
export const Modern = {
  accent: '#0EA5E9',
  accentDark: '#0284C7',
  sky: '#38BDF8',
  violet: '#7C3AED',
  pink: '#EC4899',
  lime: '#84CC16',
  amber: '#F59E0B',
  coral: '#FB7185',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  ink: '#0F172A',
  inkSoft: '#64748B',
  inkMuted: '#94A3B8',
  radius: 22,
} as const;

/** Retro & Nostalgic — vintage handheld LCD: olive screen, dark ink, plastic. */
export const Retro = {
  screen: '#C2C46E',
  screenAlt: '#B9BC62',
  screenEdge: '#A9AB55',
  ink: '#2F2C1C',
  inkSoft: '#5B5636',
  inkFaint: 'rgba(47,44,28,0.16)',
  plastic: '#C6CD5C',
  plasticDark: '#8F9738',
  frame: '#8E8F88',
  frameDark: '#6C6D66',
} as const;

/**
 * Wraps content in the classic handheld device chrome: a gray outer frame and
 * a thick rounded yellow-green plastic bezel around an olive LCD screen.
 */
export const RetroScreen: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
}> = ({ children, style, maxWidth = 420 }) => (
  <View style={[retroStyles.frame, { maxWidth }]}>
    <View style={retroStyles.plastic}>
      <View style={[retroStyles.screen, style]}>{children}</View>
    </View>
  </View>
);

export const retroStyles = StyleSheet.create({
  frame: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: Retro.frame,
    borderRadius: 44,
    padding: 8,
    borderWidth: 2,
    borderColor: Retro.frameDark,
  },
  plastic: {
    width: '100%',
    backgroundColor: Retro.plastic,
    borderRadius: 36,
    padding: 14,
    alignItems: 'center',
  },
  screen: {
    width: '100%',
    backgroundColor: Retro.screen,
    borderRadius: 16,
    padding: 10,
    borderWidth: 2,
    borderColor: Retro.screenEdge,
    overflow: 'hidden',
  },
});
