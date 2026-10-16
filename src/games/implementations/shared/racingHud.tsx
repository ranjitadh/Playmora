import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../theme/colors';

export const HudPill: React.FC<{ icon: keyof typeof Ionicons.glyphMap; color: string; value: string | number }> = ({ icon, color, value }) => (
  <View style={styles.pill}>
    <Ionicons name={icon} size={15} color={color} />
    <Text style={styles.pillText}>{value}</Text>
  </View>
);

export const ResultOverlay: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  buttonLabel?: string;
  onRetry: () => void;
  tone?: string;
}> = ({ icon, title, subtitle, buttonLabel = 'Play Again', onRetry, tone = Colors.accentCoral }) => (
  <View style={styles.overlay}>
    <View style={styles.card}>
      <Ionicons name={icon} size={40} color={tone} />
      <Text style={styles.resultTitle}>{title}</Text>
      <Text style={styles.resultSub}>{subtitle}</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={onRetry} activeOpacity={0.85}>
        <Ionicons name="refresh" size={18} color={Colors.textInverse} />
        <Text style={styles.primaryBtnText}>{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
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
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32,33,36,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 300, backgroundColor: Colors.surface, borderRadius: 22, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  resultTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 10 },
  resultSub: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700', marginTop: 4, marginBottom: 18, textAlign: 'center' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 26 },
  primaryBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
});
