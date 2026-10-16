import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { createHoles, pickHole, resolveWhack, scoreForHit } from './whackAMoleLogic';

const HOLES = 9;
const DURATION = 30;

export const WhackAMoleGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled }) => {
  const [holes, setHoles] = useState<boolean[]>(() => createHoles(HOLES));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [over, setOver] = useState(false);
  const streakRef = useRef(0);
  const finishedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const holesRef = useRef(holes);

  useEffect(() => {
    holesRef.current = holes;
  }, [holes]);

  useEffect(() => {
    onScoreUpdate(score);
  }, [score, onScoreUpdate]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const scheduleMole = useCallback(() => {
    const idx = pickHole(holesRef.current);
    if (idx < 0) return;
    setHoles((h) => (h[idx] ? h : h.map((v, i) => (i === idx ? true : v))));
    const t = setTimeout(() => setHoles((h) => h.map((v, i) => (i === idx ? false : v))), 700 + Math.random() * 600);
    timeoutsRef.current.push(t);
  }, []);

  useEffect(() => {
    if (over || timeLeft <= 0) return;
    const spawn = setInterval(scheduleMole, 620);
    const tick = setInterval(() => setTimeLeft((t) => Math.max(0, +(t - 0.1).toFixed(1))), 100);
    return () => {
      clearInterval(spawn);
      clearInterval(tick);
    };
  }, [over, timeLeft <= 0, scheduleMole]);

  useEffect(() => {
    if (timeLeft <= 0 && !over) {
      setOver(true);
      clearTimeouts();
      setHoles(createHoles(HOLES));
      if (!finishedRef.current) {
        finishedRef.current = true;
        if (!isMuted) audioService.playSound('game_over');
        if (isHapticsEnabled) hapticsService.error();
        onGameOver(score, {});
      }
    }
  }, [timeLeft, over, score, clearTimeouts, onGameOver, isMuted, isHapticsEnabled]);

  useEffect(() => clearTimeouts, [clearTimeouts]);

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
      setHoles((h) => resolveWhack(h, i).holes);
    } else {
      streakRef.current = 0;
      setStreak(0);
      if (isHapticsEnabled) hapticsService.error();
    }
  };

  const restart = useCallback(() => {
    finishedRef.current = false;
    streakRef.current = 0;
    setScore(0);
    setStreak(0);
    setTimeLeft(DURATION);
    setOver(false);
    setHoles(createHoles(HOLES));
  }, []);

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

      <View style={styles.board}>
        {[0, 1, 2].map((r) => (
          <View key={r} style={styles.row}>
            {[0, 1, 2].map((c) => {
              const i = r * 3 + c;
              const active = holes[i];
              return (
                <TouchableOpacity key={c} style={styles.hole} onPress={() => whack(i)} activeOpacity={0.8}>
                  <Ionicons name={active ? 'happy' : 'ellipse-outline'} size={active ? 44 : 30} color={active ? Colors.accentGold : Colors.border} />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <Text style={styles.hint}>Tap the moles before they hide!</Text>

      {over && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Ionicons name="trophy" size={40} color={Colors.accentGold} />
            <Text style={styles.resultTitle}>Time's up!</Text>
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
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  hud: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillDanger: { borderColor: Colors.error },
  pillText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '800' },
  board: { backgroundColor: Colors.surface, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row' },
  hole: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32,33,36,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 300, backgroundColor: Colors.surface, borderRadius: 22, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  resultTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 10 },
  resultSub: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700', marginTop: 4, marginBottom: 18 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 26 },
  primaryBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
});
