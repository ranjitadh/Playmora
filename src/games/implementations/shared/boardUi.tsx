import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../theme/colors';

export interface PlayerInfo {
  label: string;
  color: string;
}

/** Two-player header with active-turn highlight and session win counts. */
export const TwoPlayerBar: React.FC<{
  players: [PlayerInfo, PlayerInfo];
  activeIndex: number;
  wins: [number, number];
  draws?: number;
  over?: boolean;
}> = ({ players, activeIndex, wins, draws = 0, over = false }) => (
  <View style={styles.bar}>
    {players.map((p, i) => (
      <React.Fragment key={p.label}>
        {i === 1 && (
          <View style={styles.middle}>
            <Text style={styles.middleLabel}>{over ? 'OVER' : 'VS'}</Text>
            <Text style={styles.middleDraws}>D {draws}</Text>
          </View>
        )}
        <View
          style={[
            styles.playerBox,
            !over && activeIndex === i && { borderColor: p.color, backgroundColor: Colors.surfaceHighlight },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: p.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.playerLabel} numberOfLines={1}>
              {p.label}
            </Text>
            <Text style={styles.playerWins}>{wins[i]}</Text>
          </View>
        </View>
      </React.Fragment>
    ))}
  </View>
);

/** Shared end-of-round overlay for board games. */
export const BoardResultOverlay: React.FC<{
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPlayAgain: () => void;
  onExit?: () => void;
  tone?: string;
}> = ({ icon = 'trophy', title, subtitle, onPlayAgain, onExit, tone = Colors.primary }) => (
  <View style={styles.overlay}>
    <View style={styles.card}>
      <Ionicons name={icon} size={40} color={tone} />
      <Text style={styles.resultTitle}>{title}</Text>
      <Text style={styles.resultSub}>{subtitle}</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={onPlayAgain} activeOpacity={0.85}>
        <Ionicons name="refresh" size={18} color={Colors.textInverse} />
        <Text style={styles.primaryBtnText}>Play Again</Text>
      </TouchableOpacity>
      {onExit && (
        <TouchableOpacity style={styles.secondaryBtn} onPress={onExit} activeOpacity={0.85}>
          <Ionicons name="exit-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.secondaryBtnText}>Back to Multiplayer</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

export const boardStyles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'space-between', backgroundColor: Colors.background },
  turnRow: { alignItems: 'center', paddingVertical: 8 },
  turnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '700' },
  turnStrong: { color: Colors.textPrimary },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 6 },
});

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playerBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 2, borderColor: Colors.border, paddingVertical: 10, paddingHorizontal: 12 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  playerLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  playerWins: { color: Colors.textPrimary, fontSize: 20, fontWeight: '900' },
  middle: { alignItems: 'center', paddingHorizontal: 4 },
  middleLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '900' },
  middleDraws: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32,33,36,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, backgroundColor: Colors.surface, borderRadius: 22, borderWidth: 1, borderColor: Colors.border, padding: 24, alignItems: 'center' },
  resultTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  resultSub: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600', marginTop: 6, marginBottom: 20, textAlign: 'center' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, width: '100%' },
  primaryBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.surfaceElevated, borderRadius: 14, paddingVertical: 14, width: '100%', borderWidth: 1, borderColor: Colors.border, marginTop: 10 },
  secondaryBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '700' },
});
