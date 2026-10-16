import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Board, blankIndex, createShuffled, isSolved, move } from './slidingPuzzleLogic';

const SIZE = 4;

export const SlidingPuzzleGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled }) => {
  const [board, setBoard] = useState<Board>(() => createShuffled(SIZE, 80));
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    onScoreUpdate(Math.max(0, 5000 - moves * 5));
  }, [moves, onScoreUpdate]);

  const tryMove = (tileIndex: number) => {
    if (won) return;
    const b = blankIndex(board);
    const size = SIZE;
    const sameRow = Math.floor(tileIndex / size) === Math.floor(b / size);
    const sameCol = tileIndex % size === b % size;
    const adjacent = (sameRow && Math.abs(tileIndex - b) === 1) || (sameCol && Math.abs(tileIndex - b) === size);
    if (!adjacent) return;

    const dir = tileIndex > b
      ? (sameRow ? 'right' : 'down')
      : (sameRow ? 'left' : 'up');
    const next = move(board, dir as 'up' | 'down' | 'left' | 'right');
    if (next === board) return;

    if (!isMuted) audioService.playSound('tap');
    if (isHapticsEnabled) hapticsService.selection();
    const nextMoves = moves + 1;
    setBoard(next);
    setMoves(nextMoves);
    if (isSolved(next) && !finishedRef.current) {
      finishedRef.current = true;
      setWon(true);
      if (!isMuted) audioService.playSound('victory');
      if (isHapticsEnabled) hapticsService.success();
      onGameOver(Math.max(0, 5000 - nextMoves * 5), { moves: nextMoves, won: true });
    }
  };

  const restart = useCallback(() => {
    finishedRef.current = false;
    setMoves(0);
    setWon(false);
    setBoard(createShuffled(SIZE, 80));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="hand-left-outline" size={15} color={Colors.primary} />
          <Text style={styles.pillText}>{moves}</Text>
        </View>
        <Text style={styles.hudTitle}>SLIDE TO ORDER</Text>
      </View>

      <View style={styles.board}>
        {Array.from({ length: SIZE }).map((_, r) => (
          <View key={r} style={styles.row}>
            {Array.from({ length: SIZE }).map((__, c) => {
              const idx = r * SIZE + c;
              const value = board[idx];
              if (value === 0) return <View key={c} style={[styles.tile, styles.blank]} />;
              const correct = value === idx + 1;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.tile, correct ? styles.tileCorrect : styles.tileNormal]}
                  onPress={() => tryMove(idx)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.tileText, correct && styles.tileTextCorrect]}>{value}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <Text style={styles.hint}>{won ? 'Solved! 🎉' : 'Tap a tile next to the gap to slide it'}</Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={restart} activeOpacity={0.85}>
        <Ionicons name="refresh" size={18} color={Colors.textInverse} />
        <Text style={styles.primaryBtnText}>{won ? 'Play Again' : 'Shuffle'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background, alignItems: 'center' },
  hud: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 },
  hudTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '800' },
  board: { backgroundColor: Colors.surface, borderRadius: 16, padding: 8, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row' },
  tile: { width: 68, height: 68, margin: 3, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  blank: { backgroundColor: 'transparent' },
  tileNormal: { backgroundColor: Colors.primary },
  tileCorrect: { backgroundColor: Colors.accent },
  tileText: { color: Colors.textInverse, fontSize: 26, fontWeight: '900' },
  tileTextCorrect: { color: Colors.textInverse },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 26, marginTop: 16 },
  primaryBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
});
