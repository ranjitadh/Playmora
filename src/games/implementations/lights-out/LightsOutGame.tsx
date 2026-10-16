import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Grid, countOn, createPuzzle, isSolved, toggleCell } from './lightsOutLogic';

const SIZE = 5;

export const LightsOutGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled }) => {
  const [grid, setGrid] = useState<Grid>(() => createPuzzle(SIZE, 10));
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    onScoreUpdate(Math.max(0, 1000 - moves * 10));
  }, [moves, onScoreUpdate]);

  const press = (r: number, c: number) => {
    if (won) return;
    if (!isMuted) audioService.playSound('tap');
    if (isHapticsEnabled) hapticsService.selection();
    setGrid((g) => {
      const next = toggleCell(g, r, c);
      const nextMoves = moves + 1;
      setMoves(nextMoves);
      if (isSolved(next)) {
        setWon(true);
        if (!finishedRef.current) {
          finishedRef.current = true;
          if (!isMuted) audioService.playSound('victory');
          if (isHapticsEnabled) hapticsService.success();
          onGameOver(Math.max(0, 1000 - nextMoves * 10), { moves: nextMoves, won: true });
        }
      }
      return next;
    });
  };

  const restart = useCallback(() => {
    finishedRef.current = false;
    setMoves(0);
    setWon(false);
    setGrid(createPuzzle(SIZE, 10));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="hand-left-outline" size={15} color={Colors.primary} />
          <Text style={styles.pillText}>{moves}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="bulb-outline" size={15} color={Colors.accentGold} />
          <Text style={styles.pillText}>{countOn(grid)} lit</Text>
        </View>
      </View>

      <View style={styles.board}>
        {grid.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((on, c) => (
              <TouchableOpacity
                key={c}
                style={[styles.cell, on ? styles.cellOn : styles.cellOff]}
                onPress={() => press(r, c)}
                activeOpacity={0.8}
              >
                {on && <Ionicons name="bulb" size={20} color="#FFFFFF" />}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <Text style={styles.hint}>{won ? 'All lights out! 🎉' : 'Turn off every light — each tap flips its neighbours'}</Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={restart} activeOpacity={0.85}>
        <Ionicons name="refresh" size={18} color={Colors.textInverse} />
        <Text style={styles.primaryBtnText}>{won ? 'Play Again' : 'New Puzzle'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background, alignItems: 'center' },
  hud: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '800' },
  board: { backgroundColor: Colors.surface, borderRadius: 16, padding: 8, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row' },
  cell: { width: 56, height: 56, margin: 3, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cellOn: { backgroundColor: Colors.accentGold },
  cellOff: { backgroundColor: Colors.secondary },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16, maxWidth: 260 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 26, marginTop: 16 },
  primaryBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
});
