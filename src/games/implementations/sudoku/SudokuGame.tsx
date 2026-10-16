import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Grid, conflicts, createSudoku, isComplete } from './sudokuLogic';

const BOARD = 342;
const CELL = BOARD / 9;

export const SudokuGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, onExit, isMuted, isHapticsEnabled }) => {
  const initial = useMemo(() => createSudoku(40), []);
  const [puzzle, setPuzzle] = useState<Grid>(initial.puzzle);
  const [grid, setGrid] = useState<Grid>(initial.puzzle.slice());
  const [selected, setSelected] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const finishedRef = useRef(false);

  const bad = useMemo(() => conflicts(grid), [grid]);
  const blanks = useMemo(() => puzzle.filter((v) => v === 0).length, [puzzle]);
  const filled = useMemo(() => grid.filter((v, i) => v !== 0 && puzzle[i] === 0).length, [grid, puzzle]);

  const newGame = useCallback(() => {
    const s = createSudoku(40);
    finishedRef.current = false;
    setPuzzle(s.puzzle);
    setGrid(s.puzzle.slice());
    setSelected(null);
    setWon(false);
    onScoreUpdate(0);
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted, onScoreUpdate]);

  const place = useCallback(
    (value: number) => {
      if (won || selected === null || puzzle[selected] !== 0) return;
      const next = grid.slice();
      next[selected] = value;
      setGrid(next);
      if (!isMuted) audioService.playSound(value === 0 ? 'pop' : 'tap');
      if (isHapticsEnabled) hapticsService.selection();
      const nextBad = conflicts(next);
      const score = Math.max(0, next.filter((v, i) => v !== 0 && puzzle[i] === 0).length * 10 - nextBad.size * 5);
      onScoreUpdate(score);
      if (isComplete(next) && !finishedRef.current) {
        finishedRef.current = true;
        setWon(true);
        if (!isMuted) audioService.playSound('victory');
        if (isHapticsEnabled) hapticsService.success();
        onGameOver(score, { won: true });
      }
    },
    [won, selected, puzzle, grid, isMuted, isHapticsEnabled, onScoreUpdate, onGameOver]
  );

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="grid-outline" size={15} color={Colors.primary} />
          <Text style={styles.pillText}>{filled}/{blanks}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="alert-circle-outline" size={15} color={Colors.accentCoral} />
          <Text style={styles.pillText}>{bad.size} conflicts</Text>
        </View>
      </View>

      <View style={styles.board}>
        {Array.from({ length: 9 }).map((_, r) => (
          <View key={r} style={styles.row}>
            {Array.from({ length: 9 }).map((_, c) => {
              const i = r * 9 + c;
              const given = puzzle[i] !== 0;
              const isSel = selected === i;
              const isBad = bad.has(i);
              return (
                <TouchableOpacity
                  key={c}
                  activeOpacity={given ? 1 : 0.7}
                  onPress={() => !given && !won && setSelected(i)}
                  style={[
                    styles.cell,
                    c % 3 === 2 && c !== 8 && styles.boxRight,
                    r % 3 === 2 && r !== 8 && styles.boxBottom,
                    isSel && styles.cellSel,
                    isBad && styles.cellBad,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      given && styles.cellTextGiven,
                      !given && grid[i] !== 0 && styles.cellTextUser,
                      isBad && styles.cellTextBad,
                    ]}
                  >
                    {grid[i] || ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.pad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <TouchableOpacity
            key={n}
            style={styles.padBtn}
            activeOpacity={0.8}
            onPress={() => place(n)}
          >
            <Text style={styles.padText}>{n}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.padBtn} activeOpacity={0.8} onPress={() => place(0)}>
          <Ionicons name="backspace-outline" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        {won ? 'Puzzle solved!' : 'Tap an empty cell, then a number. Red numbers conflict.'}
      </Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={newGame} activeOpacity={0.85}>
        <Ionicons name="refresh" size={18} color={Colors.textInverse} />
        <Text style={styles.primaryBtnText}>{won ? 'Play Again' : 'New Puzzle'}</Text>
      </TouchableOpacity>

      {won && (
        <View style={styles.doneRow}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.accent} />
          <Text style={styles.doneText}>Solved</Text>
        </View>
      )}
      <View style={styles.spacer} />
      <TouchableOpacity onPress={onExit} style={styles.exitRow}>
        <Ionicons name="chevron-back" size={16} color={Colors.textMuted} />
        <Text style={styles.exitText}>Back to games</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background, alignItems: 'center' },
  hud: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800' },
  board: { backgroundColor: Colors.border, borderRadius: 12, padding: 3, width: BOARD },
  row: { flexDirection: 'row' },
  cell: { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 0.5, borderColor: Colors.borderSubtle },
  boxRight: { borderRightWidth: 2, borderRightColor: Colors.textMuted },
  boxBottom: { borderBottomWidth: 2, borderBottomColor: Colors.textMuted },
  cellSel: { backgroundColor: Colors.secondary },
  cellBad: { backgroundColor: '#FDE7EC' },
  cellText: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  cellTextGiven: { color: Colors.textPrimary, fontWeight: '900' },
  cellTextUser: { color: Colors.primary },
  cellTextBad: { color: Colors.accentCoral },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16, width: BOARD },
  padBtn: { width: (BOARD - 8 * 5) / 5, height: 44, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  padText: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 14, maxWidth: 300 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 26, marginTop: 14 },
  primaryBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  doneText: { color: Colors.accent, fontSize: 13, fontWeight: '800' },
  spacer: { flex: 1 },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 8 },
  exitText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
});
