import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { getGameArtwork } from '../../artwork';
import {
  GameState,
  Player,
  createInitialState,
  isCellEmpty,
  playMove,
  resetGame,
} from './ticTacToeLogic';

interface SessionScore {
  X: number;
  O: number;
  draws: number;
}

const EMPTY_SCORE: SessionScore = { X: 0, O: 0, draws: 0 };

/** Delay before the result card appears, so the winning line is visible first. */
const RESULT_REVEAL_DELAY_MS = 650;

export const TicTacToeGame: React.FC<GameSessionProps> = ({
  onExit,
  isMuted,
  isHapticsEnabled,
}) => {
  const [game, setGame] = useState<GameState>(() => createInitialState());
  const [score, setScore] = useState<SessionScore>(EMPTY_SCORE);
  const [showResult, setShowResult] = useState(false);
  const artwork = getGameArtwork('tic-tac-toe');

  const isOver = game.outcome !== 'in_progress';

  // Reveal the result card shortly after the round ends.
  useEffect(() => {
    if (!isOver) {
      setShowResult(false);
      return;
    }
    const timer = setTimeout(() => setShowResult(true), RESULT_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isOver]);

  const handleCellPress = useCallback(
    (index: number) => {
      // Prevent moves after the game has ended.
      if (game.outcome !== 'in_progress') return;
      // Prevent selecting an occupied cell.
      if (!isCellEmpty(game.board, index)) return;

      const next = playMove(game, index);
      if (next === game) return; // move rejected by the engine

      setGame(next);

      if (next.outcome === 'win') {
        setScore((prev) => ({ ...prev, [next.winner as Player]: prev[next.winner as Player] + 1 }));
        if (!isMuted) audioService.playSound('victory');
        if (isHapticsEnabled) hapticsService.success();
      } else if (next.outcome === 'draw') {
        setScore((prev) => ({ ...prev, draws: prev.draws + 1 }));
        if (!isMuted) audioService.playSound('game_over');
        if (isHapticsEnabled) hapticsService.mediumImpact();
      } else {
        if (!isMuted) audioService.playSound('pop');
        if (isHapticsEnabled) hapticsService.lightImpact();
      }
    },
    [game, isMuted, isHapticsEnabled]
  );

  const handlePlayAgain = useCallback(() => {
    setShowResult(false);
    setGame(resetGame());
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted]);

  const handleResetScores = useCallback(() => {
    setScore(EMPTY_SCORE);
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted]);

  const turn: Player = game.currentPlayer;

  return (
    <View style={styles.container}>
      {/* Session scoreboard */}
      <View style={styles.scoreboard}>
        <View style={[styles.scoreBox, !isOver && turn === 'X' && styles.scoreBoxActive]}>
          <Text style={[styles.scoreMark, styles.markX]}>X</Text>
          <Text style={styles.scoreLabel}>PLAYER X</Text>
          <Text style={styles.scoreValue}>{score.X}</Text>
        </View>

        <View style={[styles.scoreBox, styles.scoreBoxDraws]}>
          <Ionicons name="remove" size={22} color={Colors.textMuted} />
          <Text style={styles.scoreLabel}>DRAWS</Text>
          <Text style={styles.scoreValue}>{score.draws}</Text>
        </View>

        <View style={[styles.scoreBox, !isOver && turn === 'O' && styles.scoreBoxActive]}>
          <Text style={[styles.scoreMark, styles.markO]}>O</Text>
          <Text style={styles.scoreLabel}>PLAYER O</Text>
          <Text style={styles.scoreValue}>{score.O}</Text>
        </View>
      </View>

      {/* Turn indicator */}
      <View style={styles.turnRow}>
        {isOver ? (
          <Text style={styles.turnText}>
            {game.outcome === 'draw' ? "Round drawn" : `Player ${game.winner} wins the round`}
          </Text>
        ) : (
          <>
            <Text style={[styles.turnText, styles.turnTextStrong]}>
              {`Player ${turn}'s turn`}
            </Text>
            <View style={[styles.turnChip, turn === 'X' ? styles.turnChipX : styles.turnChipO]}>
              <Text style={styles.turnChipText}>{turn}</Text>
            </View>
          </>
        )}
      </View>

      {/* Board */}
      <View style={styles.board}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.boardRow}>
            {[0, 1, 2].map((col) => {
              const index = row * 3 + col;
              const value = game.board[index];
              const isWinning = !!game.winningLine?.includes(index);
              const disabled = value !== null || isOver;

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.cell, isWinning && styles.cellWinning]}
                  activeOpacity={0.7}
                  disabled={disabled}
                  onPress={() => handleCellPress(index)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    value ? `Cell ${index + 1}: ${value}` : `Cell ${index + 1}: empty`
                  }
                >
                  {value && (
                    <Text style={[styles.markText, value === 'X' ? styles.markX : styles.markO]}>
                      {value}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.hintText}>Pass the device to your friend after each move.</Text>
        {(score.X > 0 || score.O > 0 || score.draws > 0) && (
          <TouchableOpacity onPress={handleResetScores} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.resetText}>Reset scores</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Result card */}
      {showResult && (
        <View style={styles.overlay}>
          <View style={styles.resultCard}>
            {artwork ? (
              <Image source={artwork} style={styles.resultArt} resizeMode="cover" />
            ) : (
              <View style={[styles.resultArt, styles.resultArtFallback]}>
                <Ionicons name="grid-outline" size={34} color={Colors.primary} />
              </View>
            )}

            <Text style={styles.resultTitle}>
              {game.outcome === 'draw' ? "It's a draw!" : `Player ${game.winner} wins!`}
            </Text>
            <Text style={styles.resultSub}>
              {`Session — X ${score.X}  ·  O ${score.O}  ·  Draws ${score.draws}`}
            </Text>

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handlePlayAgain}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={18} color={Colors.textInverse} />
                <Text style={styles.primaryBtnText}>Play Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={onExit}
                activeOpacity={0.85}
              >
                <Ionicons name="people-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.secondaryBtnText}>Back to Multiplayer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  scoreboard: {
    flexDirection: 'row',
    gap: 10,
  },
  scoreBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  scoreBoxActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceHighlight,
  },
  scoreBoxDraws: {
    flex: 0.8,
  },
  scoreMark: {
    fontSize: 20,
    fontWeight: '900',
  },
  markX: {
    color: Colors.primary,
  },
  markO: {
    color: Colors.accentCoral,
  },
  scoreLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  scoreValue: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  turnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  turnText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  turnTextStrong: {
    color: Colors.textPrimary,
  },
  turnChip: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  turnChipX: {
    backgroundColor: Colors.secondary,
  },
  turnChipO: {
    backgroundColor: 'rgba(244, 63, 94, 0.14)',
  },
  turnChipText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  board: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 1,
    alignSelf: 'center',
    gap: 10,
    justifyContent: 'space-between',
  },
  boardRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  cell: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellWinning: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
  markText: {
    fontSize: 56,
    fontWeight: '900',
    lineHeight: 64,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  hintText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  resetText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(32, 33, 36, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 22,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  resultArt: {
    width: 76,
    height: 76,
    borderRadius: 18,
    marginBottom: 14,
  },
  resultArtFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHighlight,
  },
  resultTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  resultSub: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 20,
    textAlign: 'center',
  },
  resultActions: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryBtnText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
});
