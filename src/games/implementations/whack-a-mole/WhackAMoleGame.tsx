import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  armHole,
  createTimers,
  holeSizeFor,
  holesFromTimers,
  pickHole,
  randomMoleLife,
  resolveWhack,
  scoreForHit,
  tickTimers,
} from './whackAMoleLogic';
import { usePausedRef } from '../shared/usePausedRef';

const HOLES = 9;
const DURATION = 30;

export const WhackAMoleGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled, isPaused }) => {
  const [timers, setTimers] = useState<number[]>(() => createTimers(HOLES));
  const [boardW, setBoardW] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [over, setOver] = useState(false);
  const streakRef = useRef(0);
  const finishedRef = useRef(false);
  const pausedRef = usePausedRef(isPaused);
  const timersRef = useRef(timers);
  const holes = useMemo(() => holesFromTimers(timers), [timers]);

  const holeSize = holeSizeFor(boardW - 24, 3);

  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  useEffect(() => {
    onScoreUpdate(score);
  }, [score, onScoreUpdate]);

  const scheduleMole = useCallback(() => {
    const idx = pickHole(holesFromTimers(timersRef.current));
    if (idx < 0) return;
    setTimers((ts) => armHole(ts, idx, randomMoleLife()));
  }, []);

  const onBoardLayout = useCallback((e: LayoutChangeEvent) => {
    setBoardW(e.nativeEvent.layout.width);
  }, []);

  useEffect(() => {
    if (over || timeLeft <= 0) return;
    const spawn = setInterval(() => {
      if (!pausedRef.current) scheduleMole();
    }, 620);
    const tick = setInterval(() => {
      if (pausedRef.current) return;
      setTimers((ts) => tickTimers(ts, 0.1));
      setTimeLeft((t) => Math.max(0, +(t - 0.1).toFixed(1)));
    }, 100);
    return () => {
      clearInterval(spawn);
      clearInterval(tick);
    };
  }, [over, timeLeft <= 0, scheduleMole]);

  useEffect(() => {
    if (timeLeft <= 0 && !over) {
      setOver(true);
      setTimers(createTimers(HOLES));
      if (!finishedRef.current) {
        finishedRef.current = true;
        if (!isMuted) audioService.playSound('game_over');
        if (isHapticsEnabled) hapticsService.error();
        onGameOver(score, {});
      }
    }
  }, [timeLeft, over, score, onGameOver, isMuted, isHapticsEnabled]);

  const whack = (i: number) => {
    if (over) return;
    const { hit } = resolveWhack(holes, i);
    if (hit) {
      const gained = scoreForHit(streakRef.current);
      streakRef.current += 1;
      setStreak(streakRef.current);
      setScore((s) => s + gained);
      if (!isMuted) audioService.playSound('pop');
      if (isHapticsEnabled) hapticsService.mediumImpact();
      setTimers((ts) => armHole(ts, i, 0));
    } else {
      streakRef.current = 0;
      setStreak(0);
      if (isHapticsEnabled) hapticsService.error();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="star" size={15} color={Colors.accentGold} />
          <Text style={styles.pillText}>{score}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="flame" size={15} color={Colors.accentCoral} />
          <Text style={styles.pillText}>{streak}</Text>
        </View>
        <View style={[styles.pill, timeLeft <= 8 && styles.pillDanger]}>
          <Ionicons name="time-outline" size={15} color={timeLeft <= 8 ? Colors.error : Colors.primary} />
          <Text style={styles.pillText}>{Math.ceil(timeLeft)}s</Text>
        </View>
      </View>

      <View style={styles.board} onLayout={onBoardLayout}>
        {[0, 1, 2].map((r) => (
          <View key={r} style={styles.row}>
            {[0, 1, 2].map((c) => {
              const i = r * 3 + c;
              const active = holes[i];
              const iconSize = Math.round(holeSize * (active ? 0.49 : 0.33));
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.hole, { width: holeSize, height: holeSize }]}
                  onPress={() => whack(i)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={active ? 'happy' : 'ellipse-outline'} size={iconSize} color={active ? Colors.accentGold : Colors.border} />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <Text style={styles.hint}>Tap the moles before they hide!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  hud: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillDanger: { borderColor: Colors.error },
  pillText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '800' },
  board: { backgroundColor: Colors.surface, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center' },
  hole: { alignItems: 'center', justifyContent: 'center' },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16 },
});
