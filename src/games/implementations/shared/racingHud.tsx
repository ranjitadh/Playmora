import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../theme/colors';

/**
 * Shared in-game HUD for the racing games. End-of-session results are shown by
 * the engine's GameContainer dialog (the single canonical result screen for
 * single-player games), so games only render the live HUD and a ready hint.
 */
export const HudPill: React.FC<{ icon: keyof typeof Ionicons.glyphMap; color: string; value: string | number }> = ({ icon, color, value }) => (
  <View style={styles.pill}>
    <Ionicons name={icon} size={15} color={color} />
    <Text style={styles.pillText}>{value}</Text>
  </View>
);

export const racingStyles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  hudTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 10 },
});

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
});
