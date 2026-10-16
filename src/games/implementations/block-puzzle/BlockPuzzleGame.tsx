import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Grid, SHAPES, Shape, anyPlacement, canPlace, createGrid, place } from './blockPuzzleLogic';

const SIZE = 8;
const COLORS = ['#7557E8', '#F43F5E', '#F59E0B', '#10B981', '#38BDF8'];

function randomShape(prev?: Shape | null): Shape {
  let s = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  let guard = 0;
  while (prev && s.id === prev.id && guard++ < 10) s = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return s;
}

export const BlockPuzzleGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled }) => {
  const [grid, setGrid] = useState<Grid>(() => createGrid(SIZE));
  const [tray, setTray] = useState<Array<Shape | null>>(() => [randomShape(), randomShape(), randomShape()]);
  const [selected, setSelected] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    onScoreUpdate(score);
  }, [score, onScoreUpdate]);

  const endGame = useCallback(
    (finalScore: number) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setOver(true);
      if (!isMuted) audioService.playSound('game_over');
      if (isHapticsEnabled) hapticsService.error();
      onGameOver(finalScore, {});
    },
    [onGameOver, isMuted, isHapticsEnabled]
  );

  const tryPlace = (r: number, c: number) => {
    if (over) return;
    const shape = tray[selected];
    if (!shape) return;
    if (!canPlace(grid, shape, r, c)) {
      if (isHapticsEnabled) hapticsService.error();
      return;
    }
    if (!isMuted) audioService.playSound('pop');
    if (isHapticsEnabled) hapticsService.lightImpact();

    const colorIdx = (selected % COLORS.length) + 1;
    const { grid: placedGrid, cleared } = place(grid, shape, r, c, colorIdx);
    const gained = shape.cells.length + cleared * 10 + (cleared > 1 ? (cleared - 1) * 20 : 0);
    const nextScore = score + gained;
    setScore(nextScore);

    let nextTray = tray.map((s, i) => (i === selected ? null : s));
    if (nextTray.every((s) => s === null)) {
      setSelected(0);
      const fresh = [randomShape(), randomShape(), randomShape()];
      nextTray = fresh;
      setGrid(placedGrid);
      setTray(fresh);
      if (!anyPlacement(placedGrid, fresh.filter(Boolean) as Shape[])) endGame(nextScore);
      return;
    }

    setGrid(placedGrid);
    setTray(nextTray);
    // Auto-select the next available slot.
    const nextIdx = nextTray.findIndex((s) => s !== null);
    setSelected(nextIdx >= 0 ? nextIdx : 0);
    if (!anyPlacement(placedGrid, nextTray.filter(Boolean) as Shape[])) endGame(nextScore);
  };

  const restart = useCallback(() => {
    finishedRef.current = false;
    setGrid(createGrid(SIZE));
    setTray([randomShape(), randomShape(), randomShape()]);
    setSelected(0);
    setScore(0);
    setOver(false);
  }, []);

  const displayScore = over ? score : Math.max(score, best);
  useEffect(() => setBest((b) => Math.max(b, score)), [score]);

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="star" size={15} color={Colors.accentGold} />
          <Text style={styles.pillText}>{displayScore}</Text>
        </View>
      </View>

      <View style={styles.board}>
        {grid.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((v, c) => {
              const shape = tray[selected];
              const preview = shape && canPlace(grid, shape, r, c);
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.cell,
                    v !== 0 ? { backgroundColor: COLORS[(v - 1) % COLORS.length] } : styles.cellEmpty,
                    preview && v === 0 && styles.cellPreview,
                  ]}
                  onPress={() => tryPlace(r, c)}
                  activeOpacity={0.7}
                />
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.tray}>
        {tray.map((shape, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.slot, selected === i && styles.slotActive, !shape && styles.slotUsed]}
            onPress={() => shape && setSelected(i)}
            activeOpacity={0.8}
          >
            {shape && (
              <View style={[styles.mini, { width: shape.w * 12 + (shape.w - 1) * 2, height: shape.h * 12 + (shape.h - 1) * 2 }]}>
                {shape.cells.map(([dr, dc], k) => (
                  <View
                    key={k}
                    style={[styles.miniBlock, { left: dc * 14, top: dr * 14, backgroundColor: COLORS[(i % COLORS.length)] }]}
                  />
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.hint}>Pick a block, then tap the board to place it</Text>

      {over && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Ionicons name="grid" size={38} color={Colors.accentCoral} />
            <Text style={styles.resultTitle}>No moves left</Text>
            <Text style={styles.resultSub}>{`${score} points`}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={restart} activeOpacity={0.85}>
              <Ionicons name="refresh" size={18} color={Colors.textInverse} />
              <Text style={styles.primaryBtnText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background, alignItems: 'center' },
  hud: { marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '800' },
  board: { backgroundColor: Colors.surface, borderRadius: 14, padding: 5, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row' },
  cell: { width: 37, height: 37, margin: 2, borderRadius: 6 },
  cellEmpty: { backgroundColor: Colors.surfaceHighlight },
  cellPreview: { backgroundColor: Colors.secondary, borderWidth: 1.5, borderColor: Colors.primary },
  tray: { flexDirection: 'row', gap: 12, marginTop: 18 },
  slot: { width: 84, height: 84, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  slotActive: { borderColor: Colors.primary, borderWidth: 2, backgroundColor: Colors.secondary },
  slotUsed: { opacity: 0.35 },
  mini: { position: 'relative' },
  miniBlock: { position: 'absolute', width: 12, height: 12, borderRadius: 3 },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32,33,36,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 300, backgroundColor: Colors.surface, borderRadius: 22, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  resultTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 10 },
  resultSub: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700', marginTop: 4, marginBottom: 18 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 26 },
  primaryBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
});
