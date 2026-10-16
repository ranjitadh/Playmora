import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  MTile,
  MahjongState,
  createMahjong,
  hasMoves,
  isFree,
  remaining,
  reshuffle,
  selectTile,
} from './mahjongLogic';

const TILE_W = 34;
const TILE_H = 42;
const OFF = 6;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUV';

function symbolColor(symbol: number): string {
  return `hsl(${(symbol * 47) % 360}, 62%, 45%)`;
}

export const MahjongGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, onExit, isMuted, isHapticsEnabled }) => {
  const [state, setState] = useState<MahjongState>(() => createMahjong());
  const finishedRef = useRef(false);

  const free = useMemo(() => new Set(state.tiles.filter((t) => isFree(state.tiles, t)).map((t) => t.id)), [state.tiles]);
  const left = remaining(state);
  const total = state.tiles.length;
  const matched = (total - left) / 2;
  const stuck = state.outcome === 'in_progress' && !hasMoves(state.tiles);

  const tap = useCallback(
    (id: number) => {
      if (state.outcome !== 'in_progress') return;
      if (!free.has(id)) {
        if (!isMuted) audioService.playSound('error');
        return;
      }
      const next = selectTile(state, id);
      setState(next);
      if (!isMuted) audioService.playSound(next.selected === null && next.tiles.some((t) => t.removed) ? 'match' : 'tap');
      if (isHapticsEnabled) hapticsService.selection();
      const score = ((total - remaining(next)) / 2) * 25;
      onScoreUpdate(score);
      if (next.outcome === 'win' && !finishedRef.current) {
        finishedRef.current = true;
        if (!isMuted) audioService.playSound('victory');
        if (isHapticsEnabled) hapticsService.success();
        onGameOver(score, { won: true });
      }
    },
    [state, free, total, isMuted, isHapticsEnabled, onScoreUpdate, onGameOver]
  );

  const doShuffle = useCallback(() => {
    setState((s) => reshuffle(s));
    if (!isMuted) audioService.playSound('pop');
  }, [isMuted]);

  const newGame = useCallback(() => {
    finishedRef.current = false;
    setState(createMahjong());
    onScoreUpdate(0);
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted, onScoreUpdate]);

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="apps-outline" size={15} color={Colors.primary} />
          <Text style={styles.pillText}>{matched}/{total / 2} pairs</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="layers-outline" size={15} color={Colors.accent} />
          <Text style={styles.pillText}>{left} left</Text>
        </View>
      </View>

      <View style={styles.board}>
        {state.tiles.map((t: MTile) => {
          const blocked = !free.has(t.id);
          const selected = state.selected === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              activeOpacity={blocked ? 1 : 0.7}
              onPress={() => tap(t.id)}
              disabled={t.removed}
              style={[
                styles.tile,
                {
                  left: t.x * TILE_W + t.layer * OFF,
                  top: t.y * TILE_H + t.layer * OFF,
                  zIndex: t.layer * 1000 + t.y * 10 + t.x,
                  opacity: t.removed ? 0 : blocked ? 0.45 : 1,
                },
                !blocked && styles.tileFree,
                selected && styles.tileSel,
              ]}
            >
              <Text style={[styles.tileText, { color: symbolColor(t.symbol) }]}>{LETTERS[t.symbol]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.hint}>
        {state.outcome === 'win'
          ? 'Cleared the board!'
          : stuck
          ? 'No moves left — shuffle the tiles'
          : 'Match two free tiles with the same letter'}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={doShuffle} activeOpacity={0.85} disabled={state.outcome === 'win'}>
          <Ionicons name="shuffle" size={16} color={Colors.primary} />
          <Text style={styles.secondaryText}>Shuffle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={newGame} activeOpacity={0.85}>
          <Ionicons name="refresh" size={16} color={Colors.textInverse} />
          <Text style={styles.primaryText}>{state.outcome === 'win' ? 'Play Again' : 'New Game'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.spacer} />
      <TouchableOpacity onPress={onExit} style={styles.exitRow}>
        <Ionicons name="chevron-back" size={16} color={Colors.textMuted} />
        <Text style={styles.exitText}>Back to games</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background, alignItems: 'center' },
  hud: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800' },
  board: { width: 8 * TILE_W + 2 * OFF + 4, height: 4 * TILE_H + 2 * OFF + 4, backgroundColor: Colors.secondary, borderRadius: 14, padding: 2, borderWidth: 1, borderColor: Colors.border },
  tile: { position: 'absolute', width: TILE_W - 2, height: TILE_H - 2, borderRadius: 6, backgroundColor: '#F6EFDA', borderWidth: 1, borderColor: '#D8CBA6', alignItems: 'center', justifyContent: 'center' },
  tileFree: { borderColor: Colors.primary, borderWidth: 1.5 },
  tileSel: { borderColor: Colors.accentGold, borderWidth: 2.5, backgroundColor: '#FFF6DA' },
  tileText: { fontSize: 19, fontWeight: '900' },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16, maxWidth: 300 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1, borderColor: Colors.border },
  secondaryText: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20 },
  primaryText: { color: Colors.textInverse, fontSize: 14, fontWeight: '800' },
  spacer: { flex: 1 },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 8 },
  exitText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
});
