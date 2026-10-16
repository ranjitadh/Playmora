import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';

import { Board, BOARD_SIZE, createEmptyBoard, spawnRandomTile, slideRow, hasMovesRemaining } from './numberMergeLogic';

const TILE_COLORS: Record<number, { bg: string; text: string }> = {
  2: { bg: '#1E293B', text: '#F8FAFC' },
  4: { bg: '#334155', text: '#F8FAFC' },
  8: { bg: '#F59E0B', text: '#FFFFFF' },
  16: { bg: '#D97706', text: '#FFFFFF' },
  32: { bg: '#F43F5E', text: '#FFFFFF' },
  64: { bg: '#E11D48', text: '#FFFFFF' },
  128: { bg: '#10B981', text: '#FFFFFF' },
  256: { bg: '#059669', text: '#FFFFFF' },
  512: { bg: '#38BDF8', text: '#FFFFFF' },
  1024: { bg: '#0284C7', text: '#FFFFFF' },
  2048: { bg: '#A855F7', text: '#FFFFFF' },
};

export const NumberMergeGame: React.FC<GameSessionProps> = ({
  onScoreUpdate,
  onGameOver,
  isMuted,
  isHapticsEnabled,
}) => {
  const [board, setBoard] = useState<Board>(() => {
    let b = createEmptyBoard();
    b = spawnRandomTile(b);
    b = spawnRandomTile(b);
    return b;
  });
  const [score, setScore] = useState(0);
  const [bestTile, setBestTile] = useState(4);
  const isGameOverRef = useRef(false);

  // Swipe pan responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { dx, dy } = gestureState;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (Math.max(absX, absY) < 25) return; // Ignore small twitches

        if (absX > absY) {
          if (dx > 0) handleMove('right');
          else handleMove('left');
        } else {
          if (dy > 0) handleMove('down');
          else handleMove('up');
        }
      },
    })
  ).current;

  const handleMove = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (isGameOverRef.current) return;

    let changed = false;
    let turnScore = 0;
    const newBoard = createEmptyBoard();

    if (direction === 'left') {
      for (let r = 0; r < BOARD_SIZE; r++) {
        const { newRow, scoreGained } = slideRow(board[r]);
        newBoard[r] = newRow;
        turnScore += scoreGained;
        if (newRow.some((val, idx) => val !== board[r][idx])) changed = true;
      }
    } else if (direction === 'right') {
      for (let r = 0; r < BOARD_SIZE; r++) {
        const reversed = [...board[r]].reverse();
        const { newRow, scoreGained } = slideRow(reversed);
        newBoard[r] = newRow.reverse();
        turnScore += scoreGained;
        if (newBoard[r].some((val, idx) => val !== board[r][idx])) changed = true;
      }
    } else if (direction === 'up') {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const column = [board[0][c], board[1][c], board[2][c], board[3][c]];
        const { newRow, scoreGained } = slideRow(column);
        for (let r = 0; r < BOARD_SIZE; r++) {
          newBoard[r][c] = newRow[r];
        }
        turnScore += scoreGained;
        if (column.some((val, idx) => val !== newRow[idx])) changed = true;
      }
    } else if (direction === 'down') {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const column = [board[3][c], board[2][c], board[1][c], board[0][c]];
        const { newRow, scoreGained } = slideRow(column);
        for (let r = 0; r < BOARD_SIZE; r++) {
          newBoard[3 - r][c] = newRow[r];
        }
        turnScore += scoreGained;
        if (column.some((val, idx) => val !== newRow[idx])) changed = true;
      }
    }

    if (changed) {
      const spawned = spawnRandomTile(newBoard);
      const updatedScore = score + turnScore;

      // Find highest tile
      let maxTile = bestTile;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (spawned[r][c] > maxTile) maxTile = spawned[r][c];
        }
      }

      setBoard(spawned);
      setScore(updatedScore);
      setBestTile(maxTile);
      onScoreUpdate(updatedScore);

      if (turnScore > 0) {
        if (!isMuted) audioService.playSound('match');
        if (isHapticsEnabled) hapticsService.lightImpact();
      }

      // Check game over
      if (!hasMovesRemaining(spawned)) {
        isGameOverRef.current = true;
        if (!isMuted) audioService.playSound('game_over');
        if (isHapticsEnabled) hapticsService.error();
        onGameOver(updatedScore, { highestTile: maxTile });
      }
    }
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Top HUD */}
      <View style={styles.hudRow}>
        <View style={styles.hudBox}>
          <Text style={styles.hudLabel}>SCORE</Text>
          <Text style={styles.hudValue}>{score}</Text>
        </View>

        <View style={styles.tileBadge}>
          <Text style={styles.tileBadgeLabel}>BEST TILE</Text>
          <Text style={styles.tileBadgeValue}>{bestTile}</Text>
        </View>
      </View>

      {/* 4x4 Grid */}
      <View style={styles.gridBoard}>
        {board.map((row, r) => (
          <View key={`row-${r}`} style={styles.row}>
            {row.map((val, c) => {
              const tileStyle = TILE_COLORS[val] || {
                bg: val > 2048 ? '#7C3AED' : Colors.surfaceElevated,
                text: '#FFFFFF',
              };
              return (
                <View
                  key={`cell-${r}-${c}`}
                  style={[
                    styles.cell,
                    val > 0 && { backgroundColor: tileStyle.bg },
                  ]}
                >
                  {val > 0 && (
                    <Text
                      style={[
                        styles.cellText,
                        { color: tileStyle.text },
                        val >= 1024 && styles.cellTextSmall,
                      ]}
                    >
                      {val}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* On-Screen D-Pad for Precision / Accessibility */}
      <View style={styles.dpadContainer}>
        <TouchableOpacity
          style={styles.dpadBtn}
          onPress={() => handleMove('up')}
          activeOpacity={0.7}
        >
          <Text style={styles.dpadArrow}>▲</Text>
        </TouchableOpacity>
        <View style={styles.dpadHorizontalRow}>
          <TouchableOpacity
            style={styles.dpadBtn}
            onPress={() => handleMove('left')}
            activeOpacity={0.7}
          >
            <Text style={styles.dpadArrow}>◀</Text>
          </TouchableOpacity>
          <View style={styles.dpadCenter}>
            <Text style={styles.swipeHint}>SWIPE OR TAP</Text>
          </View>
          <TouchableOpacity
            style={styles.dpadBtn}
            onPress={() => handleMove('right')}
            activeOpacity={0.7}
          >
            <Text style={styles.dpadArrow}>▶</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.dpadBtn}
          onPress={() => handleMove('down')}
          activeOpacity={0.7}
        >
          <Text style={styles.dpadArrow}>▼</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hudBox: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hudLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hudValue: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  tileBadge: {
    backgroundColor: Colors.secondaryDark,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
  },
  tileBadgeLabel: {
    color: '#DDD',
    fontSize: 9,
    fontWeight: '700',
  },
  tileBadgeValue: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
  },
  gridBoard: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cell: {
    flex: 1,
    marginHorizontal: 3,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 24,
    fontWeight: '900',
  },
  cellTextSmall: {
    fontSize: 18,
  },
  dpadContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  dpadHorizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 4,
  },
  dpadBtn: {
    width: 64,
    height: 52,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dpadArrow: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  dpadCenter: {
    width: 100,
    alignItems: 'center',
  },
  swipeHint: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
