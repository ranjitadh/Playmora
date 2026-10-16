import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Brain } from '../shared/gameTheme';
import {
  MAX_GUESSES,
  WORD_LENGTH,
  evaluateGuess,
  isValidWord,
  keyboardStatus,
  outcome,
  pickSecret,
} from './wordGuessLogic';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const CELL = 52;

const STATUS_COLOR: Record<string, string> = {
  correct: Brain.accent,
  present: Colors.accentGold,
  absent: Brain.inkMuted,
};

export const WordGuessGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, onExit, isMuted, isHapticsEnabled }) => {
  const [secret, setSecret] = useState(() => pickSecret());
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const finishedRef = useRef(false);

  const result = outcome(secret, guesses);
  const done = result !== 'in_progress';
  const kb = useMemo(() => keyboardStatus(secret, guesses), [secret, guesses]);

  const finish = useCallback(
    (won: boolean, guessCount: number) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const score = won ? (MAX_GUESSES - guessCount + 1) * 200 : 0;
      onScoreUpdate(score);
      if (!isMuted) audioService.playSound(won ? 'victory' : 'game_over');
      if (isHapticsEnabled) (won ? hapticsService.success : hapticsService.error)();
      onGameOver(score, { won, secret });
    },
    [isMuted, isHapticsEnabled, onScoreUpdate, onGameOver, secret]
  );

  const submit = useCallback(() => {
    if (done || current.length !== WORD_LENGTH) return;
    if (!isValidWord(current)) {
      if (!isMuted) audioService.playSound('error');
      if (isHapticsEnabled) hapticsService.error();
      return;
    }
    const next = [...guesses, current];
    setGuesses(next);
    setCurrent('');
    if (!isMuted) audioService.playSound('score');
    if (isHapticsEnabled) hapticsService.lightImpact();
    const out = outcome(secret, next);
    if (out === 'won') finish(true, next.length);
    else if (out === 'lost') finish(false, next.length);
    else onScoreUpdate(next.length * 10);
  }, [done, current, guesses, secret, isMuted, isHapticsEnabled, onScoreUpdate, finish]);

  const press = useCallback(
    (key: string) => {
      if (done) return;
      if (key === 'enter') return submit();
      if (key === 'back') {
        setCurrent((c) => c.slice(0, -1));
        return;
      }
      if (current.length < WORD_LENGTH) {
        setCurrent((c) => c + key);
        if (isHapticsEnabled) hapticsService.selection();
      }
    },
    [done, current, submit, isHapticsEnabled]
  );

  const newGame = useCallback(() => {
    finishedRef.current = false;
    setSecret(pickSecret());
    setGuesses([]);
    setCurrent('');
    onScoreUpdate(0);
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted, onScoreUpdate]);

  const rows: { letter: string; status?: string; filled: boolean }[][] = [];
  for (let r = 0; r < MAX_GUESSES; r++) {
    const guess = guesses[r];
    const marks = guess ? evaluateGuess(secret, guess) : [];
    const active = r === guesses.length && !done;
    const row = [];
    for (let c = 0; c < WORD_LENGTH; c++) {
      const letter = guess ? guess[c] : active ? current[c] ?? '' : '';
      row.push({ letter, status: guess ? marks[c] : undefined, filled: letter !== '' });
    }
    rows.push(row);
  }

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="text-outline" size={15} color={Brain.accent} />
          <Text style={styles.pillText}>{guesses.length}/{MAX_GUESSES}</Text>
        </View>
        <View style={[styles.pill, styles.pillSecret]}>
          <Ionicons name={done ? 'eye-outline' : 'help-circle-outline'} size={15} color={Colors.accentGold} />
          <Text style={styles.pillText}>{done ? secret.toUpperCase() : '?????'}</Text>
        </View>
      </View>

      <View style={styles.board}>
        {rows.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((cell, c) => (
              <View
                key={c}
                style={[
                  styles.cell,
                  cell.filled && !cell.status && styles.cellFilled,
                  cell.status && { backgroundColor: STATUS_COLOR[cell.status], borderColor: STATUS_COLOR[cell.status] },
                ]}
              >
                <Text style={[styles.cellText, cell.status && styles.cellTextOn]}>{cell.letter.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      <Text style={styles.hint}>
        {result === 'won'
          ? 'Brilliant — you got it!'
          : result === 'lost'
          ? `Out of guesses. The word was ${secret.toUpperCase()}.`
          : 'Guess a five-letter word and press Enter'}
      </Text>

      <View style={styles.keyboard}>
        {ROWS.map((row, i) => (
          <View key={i} style={styles.kbRow}>
            {i === 2 && (
              <TouchableOpacity style={[styles.key, styles.keyWide]} onPress={() => press('enter')} activeOpacity={0.8}>
                <Ionicons name="return-down-back" size={18} color={Brain.ink} />
              </TouchableOpacity>
            )}
            {row.split('').map((ch) => {
              const st = kb[ch];
              return (
                <TouchableOpacity
                  key={ch}
                  style={[styles.key, st && { backgroundColor: STATUS_COLOR[st], borderColor: STATUS_COLOR[st] }]}
                  onPress={() => press(ch)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.keyText, st && styles.keyTextOn]}>{ch.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
            {i === 2 && (
              <TouchableOpacity style={[styles.key, styles.keyWide]} onPress={() => press('back')} activeOpacity={0.8}>
                <Ionicons name="backspace-outline" size={18} color={Brain.ink} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={newGame} activeOpacity={0.85}>
        <Ionicons name="refresh" size={16} color={Colors.textInverse} />
        <Text style={styles.primaryText}>{done ? 'Play Again' : 'New Word'}</Text>
      </TouchableOpacity>

      <View style={styles.spacer} />
      <TouchableOpacity onPress={onExit} style={styles.exitRow}>
        <Ionicons name="chevron-back" size={16} color={Brain.inkMuted} />
        <Text style={styles.exitText}>Back to games</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background, alignItems: 'center' },
  hud: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Brain.surface, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: Brain.accentBorder },
  pillSecret: { borderColor: Brain.border },
  pillText: { color: Brain.ink, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  board: { gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  cell: { width: CELL, height: CELL, borderRadius: 10, borderWidth: 2, borderColor: Brain.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Brain.surface },
  cellFilled: { borderColor: Brain.inkSoft },
  cellText: { fontSize: 22, fontWeight: '900', color: Brain.ink },
  cellTextOn: { color: '#FFFFFF' },
  hint: { color: Brain.inkSoft, fontSize: 12, textAlign: 'center', marginTop: 12, maxWidth: 300, minHeight: 16 },
  keyboard: { marginTop: 12, gap: 6 },
  kbRow: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  key: { minWidth: 28, height: 42, paddingHorizontal: 8, borderRadius: 9, backgroundColor: Brain.surfaceAlt, borderWidth: 1, borderColor: Brain.border, alignItems: 'center', justifyContent: 'center' },
  keyWide: { minWidth: 46 },
  keyText: { fontSize: 15, fontWeight: '800', color: Brain.ink },
  keyTextOn: { color: '#FFFFFF' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Brain.accent, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24, marginTop: 14 },
  primaryText: { color: Colors.textInverse, fontSize: 14, fontWeight: '800' },
  spacer: { flex: 1 },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 8 },
  exitText: { color: Brain.inkMuted, fontSize: 13, fontWeight: '700' },
});
