import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  MineState,
  MinesweeperProgress,
  createGame,
  parseMinesweeperProgress,
  revealCell,
  serializeMinesweeperProgress,
  toggleFlag,
} from './minesweeperLogic';
import { usePausedRef } from '../shared/usePausedRef';

const ROWS = 9;
const COLS = 9;
const MINES = 10;

const NUMBER_COLORS = [
  '',
  '#1976D2',
  '#388E3C',
  '#D32F2F',
  '#7B1FA2',
  '#F57C00',
  '#0097A7',
  '#424242',
  '#6D4C41',
];

export const MinesweeperGame: React.FC<GameSessionProps> = ({
  onScoreUpdate,
  onGameOver,
  isMuted,
  isHapticsEnabled,
  isPaused,
  initialProgress,
  onSaveProgress,
}) => {
  const [game, setGame] = useState<MineState | null>(null);
  const [flagMode, setFlagMode] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const finishedRef = useRef(false);
  const pausedRef = usePausedRef(isPaused);
  const resumedRef = useRef<MinesweeperProgress | null>(parseMinesweeperProgress(initialProgress));

  const newGame = useCallback(() => {
    finishedRef.current = false;
    setSeconds(0);
    setFlagMode(false);
    setGame(createGame(ROWS, COLS, MINES, Math.floor(ROWS / 2), Math.floor(COLS / 2)));
  }, []);

  useEffect(() => {
    const saved = resumedRef.current;
    resumedRef.current = null;
    if (saved && saved.game.status === 'playing') {
      finishedRef.current = false;
      setGame(saved.game);
      setSeconds(saved.seconds);
      setFlagMode(saved.flagMode);
      return;
    }
    newGame();
  }, [newGame]);

  // Persist an in-progress snapshot so the session can be resumed later.
  useEffect(() => {
    if (!onSaveProgress || !game || game.status !== 'playing') return;
    onSaveProgress(serializeMinesweeperProgress(game, seconds, flagMode));
  }, [game, seconds, flagMode, onSaveProgress]);

  useEffect(() => {
    if (!game || game.status !== 'playing') return;
    const id = setInterval(() => {
      if (!pausedRef.current) setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [game?.status]);

  useEffect(() => {
    if (!game) return;
    const score = game.status === 'won' ? 1000 - seconds : game.revealedCount;
    onScoreUpdate(Math.max(0, score));
    if ((game.status === 'won' || game.status === 'lost') && !finishedRef.current) {
      finishedRef.current = true;
      if (!isMuted) audioService.playSound(game.status === 'won' ? 'victory' : 'game_over');
      if (isHapticsEnabled) (game.status === 'won' ? hapticsService.success : hapticsService.error)();
      const finalScore = game.status === 'won' ? Math.max(0, 1000 - seconds) : game.revealedCount;
      onGameOver(finalScore, { won: game.status === 'won', time: seconds });
    }
  }, [game, seconds, onScoreUpdate, onGameOver, isMuted, isHapticsEnabled]);

  const handlePress = (r: number, c: number) => {
    if (!game || game.status !== 'playing') return;
    if (flagMode) {
      if (isHapticsEnabled) hapticsService.selection();
      setGame((g) => (g ? toggleFlag(g, r, c) : g));
      return;
    }
    if (!isMuted) audioService.playSound('tap');
    if (isHapticsEnabled) hapticsService.lightImpact();
    setGame((g) => (g ? revealCell(g, r, c) : g));
  };

  const handleLongPress = (r: number, c: number) => {
    if (!game || game.status !== 'playing') return;
    if (isHapticsEnabled) hapticsService.mediumImpact();
    setGame((g) => (g ? toggleFlag(g, r, c) : g));
  };

  if (!game) return <View style={styles.container} />;

  const remaining = MINES - game.flagCount;

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.hudItem}>
          <Ionicons name="flag" size={16} color={Colors.accentCoral} />
          <Text style={styles.hudValue}>{remaining}</Text>
        </View>
        <TouchableOpacity
          style={[styles.modeToggle, flagMode && styles.modeToggleActive]}
          onPress={() => setFlagMode((m) => !m)}
          activeOpacity={0.85}
        >
          <Ionicons name={flagMode ? 'flag' : 'search'} size={15} color={flagMode ? Colors.textInverse : Colors.textPrimary} />
          <Text style={[styles.modeText, flagMode && styles.modeTextActive]}>{flagMode ? 'Flag' : 'Dig'}</Text>
        </TouchableOpacity>
        <View style={styles.hudItem}>
          <Ionicons name="time-outline" size={16} color={Colors.primary} />
          <Text style={styles.hudValue}>{seconds}s</Text>
        </View>
      </View>

      <View style={styles.board}>
        {game.board.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((cell, c) => {
              const showMine = cell.revealed && cell.mine;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.cell,
                    cell.revealed ? styles.cellRevealed : styles.cellHidden,
                    game.status === 'lost' && cell.mine && styles.cellMine,
                  ]}
                  onPress={() => handlePress(r, c)}
                  onLongPress={() => handleLongPress(r, c)}
                  activeOpacity={0.7}
                >
                  {cell.flagged && !cell.revealed ? (
                    <Ionicons name="flag" size={14} color={Colors.accentCoral} />
                  ) : showMine ? (
                    <Ionicons name="skull" size={15} color="#FFFFFF" />
                  ) : cell.revealed && cell.adjacent > 0 ? (
                    <Text style={[styles.num, { color: NUMBER_COLORS[cell.adjacent] }]}>{cell.adjacent}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <Text style={styles.hint}>
        {game.status === 'won' ? 'Cleared! 🎉' : game.status === 'lost' ? 'Boom! Tap Play Again.' : 'Tap to dig · long-press to flag'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background, alignItems: 'center' },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  hudItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  hudValue: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  modeToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 16 },
  modeToggleActive: { backgroundColor: Colors.primary },
  modeText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '800' },
  modeTextActive: { color: Colors.textInverse },
  board: { backgroundColor: Colors.surface, borderRadius: 12, padding: 6, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row' },
  cell: { width: 34, height: 34, margin: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  cellHidden: { backgroundColor: Colors.primary },
  cellRevealed: { backgroundColor: Colors.surfaceHighlight },
  cellMine: { backgroundColor: Colors.error },
  num: { fontSize: 16, fontWeight: '900' },
  hint: { color: Colors.textMuted, fontSize: 12, marginTop: 14 },
});
