import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Problem, checkAnswer, createProblem, formatProblem, scoreForAnswer } from './mathRushLogic';

const DURATION = 45;

export const MathRushGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled }) => {
  const [problem, setProblem] = useState<Problem>(() => createProblem(2));
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [over, setOver] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    onScoreUpdate(score);
  }, [score, onScoreUpdate]);

  useEffect(() => {
    if (over) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, +(t - 0.1).toFixed(1))), 100);
    return () => clearInterval(id);
  }, [over]);

  useEffect(() => {
    if (timeLeft <= 0 && !over) {
      setOver(true);
      if (!finishedRef.current) {
        finishedRef.current = true;
        if (!isMuted) audioService.playSound('game_over');
        if (isHapticsEnabled) hapticsService.error();
        onGameOver(score, { streak });
      }
    }
  }, [timeLeft, over, score, streak, onGameOver, isMuted, isHapticsEnabled]);

  const submit = useCallback(() => {
    if (over || input === '') return;
    const value = parseInt(input, 10);
    if (checkAnswer(problem, value)) {
      const bonus = scoreForAnswer(level, timeLeft / DURATION) + streak * 2;
      const nextScore = score + bonus;
      const nextStreak = streak + 1;
      setScore(nextScore);
      setStreak(nextStreak);
      if (nextStreak % 5 === 0) setLevel((l) => Math.min(5, l + 1));
      if (!isMuted) audioService.playSound('score');
      if (isHapticsEnabled) hapticsService.success();
      setProblem(createProblem(nextStreak % 5 === 0 ? Math.min(5, level + 1) : level));
      setInput('');
    } else {
      setStreak(0);
      setTimeLeft((t) => Math.max(0, t - 3));
      if (!isMuted) audioService.playSound('error');
      if (isHapticsEnabled) hapticsService.error();
      setInput('');
    }
  }, [over, input, problem, level, timeLeft, streak, score, isMuted, isHapticsEnabled]);

  const pressKey = (k: string) => {
    if (over) return;
    if (k === 'del') setInput((v) => v.slice(0, -1));
    else if (k === 'ok') submit();
    else if (input.length < 4) setInput((v) => v + k);
  };

  const restart = useCallback(() => {
    finishedRef.current = false;
    setProblem(createProblem(1));
    setInput('');
    setScore(0);
    setStreak(0);
    setLevel(1);
    setTimeLeft(DURATION);
    setOver(false);
  }, []);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];

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
        <View style={[styles.pill, timeLeft <= 10 && styles.pillDanger]}>
          <Ionicons name="time-outline" size={15} color={timeLeft <= 10 ? Colors.error : Colors.primary} />
          <Text style={styles.pillText}>{Math.ceil(timeLeft)}s</Text>
        </View>
      </View>

      <View style={styles.problemCard}>
        <Text style={styles.problemText}>{formatProblem(problem)}</Text>
        <Text style={styles.answerText}>{input === '' ? '?' : input}</Text>
      </View>

      <View style={styles.pad}>
        {keys.map((k) => (
          <TouchableOpacity
            key={k}
            style={[styles.key, k === 'ok' && styles.keyOk, k === 'del' && styles.keyDel]}
            onPress={() => pressKey(k)}
            activeOpacity={0.8}
          >
            {k === 'del' ? (
              <Ionicons name="backspace" size={22} color={Colors.textPrimary} />
            ) : k === 'ok' ? (
              <Ionicons name="checkmark" size={24} color={Colors.textInverse} />
            ) : (
              <Text style={styles.keyText}>{k}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

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
  hud: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillDanger: { borderColor: Colors.error },
  pillText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '800' },
  problemCard: { backgroundColor: Colors.surface, borderRadius: 20, paddingVertical: 28, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginBottom: 14 },
  problemText: { color: Colors.textSecondary, fontSize: 30, fontWeight: '800' },
  answerText: { color: Colors.primary, fontSize: 46, fontWeight: '900', marginTop: 6 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  key: { width: '30%', height: 60, backgroundColor: Colors.surface, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  keyOk: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  keyDel: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  keyText: { color: Colors.textPrimary, fontSize: 24, fontWeight: '800' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32,33,36,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 300, backgroundColor: Colors.surface, borderRadius: 22, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  resultTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 10 },
  resultSub: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700', marginTop: 4, marginBottom: 18 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 26 },
  primaryBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
});
