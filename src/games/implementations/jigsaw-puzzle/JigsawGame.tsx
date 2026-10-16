import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Brain } from '../shared/gameTheme';
import {
  JigsawState,
  createJigsaw,
  placePiece,
  remaining,
  selectPiece,
} from './jigsawLogic';

const N = 4;
const TOTAL = N * N;
const CELL = 72;

function tileColor(index: number): string {
  const r = Math.floor(index / N);
  const c = index % N;
  const hue = (162 - r * 22 - c * 8 + 360) % 360;
  return `hsl(${hue}, 62%, 52%)`;
}

function letter(piece: number): string {
  return String.fromCharCode(65 + piece);
}

export const JigsawGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, onExit, isMuted, isHapticsEnabled }) => {
  const [state, setState] = useState<JigsawState>(() => createJigsaw(N));
  const finishedRef = useRef(false);
  const won = state.outcome === 'win';

  useEffect(() => {
    onScoreUpdate(Math.max(0, 1000 - state.moves * 20));
  }, [state.moves, onScoreUpdate]);

  useEffect(() => {
    if (won && !finishedRef.current) {
      finishedRef.current = true;
      if (!isMuted) audioService.playSound('victory');
      if (isHapticsEnabled) hapticsService.success();
      onGameOver(Math.max(0, 1000 - state.moves * 20), { won: true, moves: state.moves });
    }
  }, [won, state.moves, isMuted, isHapticsEnabled, onGameOver]);

  const pick = useCallback(
    (piece: number) => {
      if (won) return;
      setState((s) => selectPiece(s, piece));
      if (!isMuted) audioService.playSound('tap');
      if (isHapticsEnabled) hapticsService.selection();
    },
    [won, isMuted, isHapticsEnabled]
  );

  const drop = useCallback(
    (slot: number) => {
      if (won || state.selected === null || state.placed[slot] !== null) return;
      if (state.selected === slot) {
        setState((s) => placePiece(s, slot));
        if (!isMuted) audioService.playSound('match');
        if (isHapticsEnabled) hapticsService.success();
      } else {
        if (!isMuted) audioService.playSound('error');
        if (isHapticsEnabled) hapticsService.error();
      }
    },
    [won, state.selected, state.placed, isMuted, isHapticsEnabled]
  );

  const restart = useCallback(() => {
    finishedRef.current = false;
    setState(createJigsaw(N));
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted]);

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={[styles.pill, styles.pillAccent]}>
          <Ionicons name="extension-puzzle-outline" size={15} color={Brain.accent} />
          <Text style={styles.pillText}>{TOTAL - remaining(state)}/{TOTAL}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="hand-left-outline" size={15} color={Brain.accentDeep} />
          <Text style={styles.pillText}>{state.moves}</Text>
        </View>
      </View>

      <Text style={styles.caption}>Rebuild the picture — tap a piece, then its slot</Text>

      <View style={styles.board}>
        {Array.from({ length: TOTAL }).map((_, slot) => {
          const piece = state.placed[slot];
          const isTarget = state.selected !== null && state.selected === slot;
          return (
            <TouchableOpacity
              key={slot}
              activeOpacity={0.8}
              onPress={() => drop(slot)}
              style={[
                styles.slot,
                { backgroundColor: tileColor(slot), opacity: piece !== null ? 1 : 0.18 },
                isTarget && styles.slotTarget,
              ]}
            >
              {piece !== null && <View style={styles.placedDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.tray}>
        {state.tray.map((piece) => (
          <TouchableOpacity
            key={piece}
            activeOpacity={0.8}
            onPress={() => pick(piece)}
            style={[
              styles.piece,
              { backgroundColor: tileColor(piece) },
              state.selected === piece && styles.pieceSel,
            ]}
          >
            <Text style={styles.pieceText}>{letter(piece)}</Text>
          </TouchableOpacity>
        ))}
        {state.tray.length === 0 && <Text style={styles.trayEmpty}>Every piece is placed — nice work!</Text>}
      </View>

      <Text style={styles.hint}>
        {won
          ? 'Picture complete!'
          : state.selected === null
          ? 'Pick a piece from the tray'
          : `Placing piece ${letter(state.selected)}`}
      </Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={restart} activeOpacity={0.85}>
        <Ionicons name="refresh" size={18} color={Colors.textInverse} />
        <Text style={styles.primaryBtnText}>{won ? 'Play Again' : 'Scatter'}</Text>
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
  hud: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Brain.surface, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: Brain.border },
  pillAccent: { borderColor: Brain.accentBorder },
  pillText: { color: Brain.ink, fontSize: 14, fontWeight: '800' },
  caption: { color: Brain.inkSoft, fontSize: 12, marginBottom: 10 },
  board: { flexDirection: 'row', flexWrap: 'wrap', width: CELL * N + 8, borderRadius: 18, overflow: 'hidden', padding: 4, backgroundColor: Brain.surface, borderWidth: 1, borderColor: Brain.border },
  slot: { width: CELL - 6, height: CELL - 6, margin: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  slotTarget: { borderWidth: 3, borderColor: Brain.accent },
  placedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.7)' },
  tray: { flexDirection: 'row', flexWrap: 'wrap', width: CELL * N + 8, justifyContent: 'center', gap: 6, marginTop: 16, minHeight: 60 },
  piece: { width: 46, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  pieceSel: { borderColor: Brain.ink, transform: [{ scale: 1.08 }] },
  pieceText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '900' },
  trayEmpty: { color: Brain.inkSoft, fontSize: 13, fontWeight: '700' },
  hint: { color: Brain.inkSoft, fontSize: 12, textAlign: 'center', marginTop: 12, maxWidth: 300 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Brain.accent, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 26, marginTop: 14 },
  primaryBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
  spacer: { flex: 1 },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 8 },
  exitText: { color: Brain.inkMuted, fontSize: 13, fontWeight: '700' },
});
