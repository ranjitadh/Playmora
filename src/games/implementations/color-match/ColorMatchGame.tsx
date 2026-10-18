import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { usePausedRef } from '../shared/usePausedRef';

interface ColorItem {
  name: string;
  value: string;
}

const COLOR_PALETTE: ColorItem[] = [
  { name: 'RED', value: '#EF4444' },
  { name: 'BLUE', value: '#3B82F6' },
  { name: 'GREEN', value: '#10B981' },
  { name: 'YELLOW', value: '#FBBF24' },
  { name: 'PURPLE', value: '#A855F7' },
  { name: 'CYAN', value: '#06B6D4' },
];

export const ColorMatchGame: React.FC<GameSessionProps> = ({
  onScoreUpdate,
  onGameOver,
  isMuted,
  isHapticsEnabled,
  isPaused,
}) => {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(4.0);
  const [targetWord, setTargetWord] = useState<ColorItem>(COLOR_PALETTE[0]);
  const [targetTextColor, setTargetTextColor] = useState<ColorItem>(COLOR_PALETTE[1]);
  const [mode, setMode] = useState<'word' | 'color'>('word');
  const [options, setOptions] = useState<ColorItem[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = usePausedRef(isPaused);
  const maxTimeRef = useRef(4.0);

  const generateRound = useCallback(() => {
    // Pick 4 distinct colors
    const shuffled = [...COLOR_PALETTE].sort(() => Math.random() - 0.5);
    const roundColors = shuffled.slice(0, 4);

    const wordItem = roundColors[Math.floor(Math.random() * roundColors.length)];
    // Conflicting font color
    const otherColors = roundColors.filter((c) => c.name !== wordItem.name);
    const colorItem = otherColors[Math.floor(Math.random() * otherColors.length)];

    const roundMode: 'word' | 'color' = Math.random() > 0.4 ? 'word' : 'color';

    setTargetWord(wordItem);
    setTargetTextColor(colorItem);
    setMode(roundMode);
    setOptions(roundColors.sort(() => Math.random() - 0.5));

    // Time speedup as score climbs
    const calculatedMax = Math.max(1.4, 3.5 - Math.floor(score / 5) * 0.2);
    maxTimeRef.current = calculatedMax;
    setTimeLeft(calculatedMax);
  }, [score]);

  // Initial round
  useEffect(() => {
    generateRound();
  }, []);

  // Timer loop
  useEffect(() => {
    if (isGameOver) return;

    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(timerRef.current!);
          handleGameEnd(score);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameOver, score]);

  const handleGameEnd = (finalScore: number) => {
    setIsGameOver(true);
    if (!isMuted) audioService.playSound('game_over');
    if (isHapticsEnabled) hapticsService.error();
    onGameOver(finalScore, { reason: 'timeout' });
  };

  const handleSelect = (selected: ColorItem) => {
    if (isGameOver) return;

    const correctAnswer = mode === 'word' ? targetWord : targetTextColor;
    const isCorrect = selected.name === correctAnswer.name;

    if (isCorrect) {
      const nextCombo = combo + 1;
      const points = 10 + Math.min(nextCombo * 2, 20);
      const newScore = score + points;

      setScore(newScore);
      setCombo(nextCombo);
      onScoreUpdate(newScore);

      if (!isMuted) audioService.playSound(nextCombo > 3 ? 'combo' : 'score');
      if (isHapticsEnabled) hapticsService.lightImpact();

      generateRound();
    } else {
      setIsGameOver(true);
      if (!isMuted) audioService.playSound('error');
      if (isHapticsEnabled) hapticsService.heavyImpact();
      onGameOver(score, { reason: 'wrong_selection' });
    }
  };

  const timerRatio = Math.max(0, Math.min(1, timeLeft / maxTimeRef.current));

  return (
    <View style={styles.container}>
      {/* Top HUD */}
      <View style={styles.hudRow}>
        <View style={styles.hudBox}>
          <Text style={styles.hudLabel}>SCORE</Text>
          <Text style={styles.hudValue}>{score}</Text>
        </View>

        {combo > 1 && (
          <View style={styles.comboBadge}>
            <Text style={styles.comboText}>{combo}x COMBO!</Text>
          </View>
        )}

        <View style={styles.hudBox}>
          <Text style={styles.hudLabel}>TIME</Text>
          <Text style={[styles.hudValue, timeLeft < 1.2 && styles.urgentText]}>
            {timeLeft.toFixed(1)}s
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.timerTrack}>
        <View
          style={[
            styles.timerFill,
            {
              width: `${timerRatio * 100}%`,
              backgroundColor: timerRatio > 0.4 ? Colors.primary : Colors.accentCoral,
            },
          ]}
        />
      </View>

      {/* Challenge Card */}
      <View style={styles.challengeCard}>
        <Text style={styles.instructionPrompt}>
          TAP THE {mode === 'word' ? 'MEANING OF THE WORD' : 'INK COLOR'}:
        </Text>
        <Text style={[styles.targetWordText, { color: targetTextColor.value }]}>
          {targetWord.name}
        </Text>
      </View>

      {/* Color Choice Grid */}
      <View style={styles.optionsGrid}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.name}
            style={[styles.optionTile, { backgroundColor: opt.value }]}
            activeOpacity={0.7}
            onPress={() => handleSelect(opt)}
          >
            <Text style={styles.optionTileText}>{opt.name}</Text>
          </TouchableOpacity>
        ))}
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
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
    fontSize: 20,
    fontWeight: '800',
  },
  urgentText: {
    color: Colors.accentCoral,
  },
  comboBadge: {
    backgroundColor: Colors.accentGold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  comboText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 12,
  },
  timerTrack: {
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 12,
  },
  timerFill: {
    height: '100%',
    borderRadius: 4,
  },
  challengeCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginVertical: 16,
  },
  instructionPrompt: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  targetWordText: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  optionTile: {
    width: '48%',
    height: 72,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  optionTileText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
