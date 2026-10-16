import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Retro } from '../shared/gameTheme';
import {
  COLS,
  FrogState,
  GOAL_ROW,
  MEDIAN_ROW,
  ROAD_ROWS,
  RIVER_ROWS,
  ROWS,
  createFrog,
  hop,
  tick,
} from './frogLogic';

const TICK_MS = 480;

function rowKind(row: number): 'goal' | 'river' | 'median' | 'road' | 'start' {
  if (row === GOAL_ROW) return 'goal';
  if (RIVER_ROWS.includes(row)) return 'river';
  if (row === MEDIAN_ROW) return 'median';
  if (ROAD_ROWS.includes(row)) return 'road';
  return 'start';
}

export const FrogRoadCrossingGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, onExit, isMuted, isHapticsEnabled }) => {
  const [area, setArea] = useState({ w: 320, h: 460 });
  const [state, setState] = useState<FrogState>(createFrog);
  const finishedRef = useRef(false);

  useEffect(() => {
    onScoreUpdate(state.score);
  }, [state, onScoreUpdate]);

  useEffect(() => {
    const id = setInterval(() => setState((s) => tick(s)), TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if ((state.outcome === 'won' || state.outcome === 'over') && !finishedRef.current) {
      finishedRef.current = true;
      const won = state.outcome === 'won';
      if (!isMuted) audioService.playSound(won ? 'victory' : 'game_over');
      if (isHapticsEnabled) (won ? hapticsService.success : hapticsService.error)();
      onGameOver(state.score, { outcome: state.outcome });
    }
  }, [state, onGameOver, isMuted, isHapticsEnabled]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  }, []);

  const doHop = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      setState((s) => hop(s, dir));
      if (!isMuted) audioService.playSound('tap');
      if (isHapticsEnabled) hapticsService.selection();
    },
    [isMuted, isHapticsEnabled]
  );

  const restart = useCallback(() => {
    finishedRef.current = false;
    setState(createFrog());
  }, []);

  const cell = Math.max(12, Math.floor(Math.min(area.w / COLS, area.h / ROWS)));
  const boardW = cell * COLS;
  const boardH = cell * ROWS;
  const ox = (area.w - boardW) / 2;
  const oy = (area.h - boardH) / 2;

  return (
    <View style={styles.container}>
      <View style={styles.deviceFrame}>
        <View style={styles.plastic}>
          <View style={styles.hud}>
            <View style={styles.pill}>
              <Ionicons name="trending-up" size={15} color={Retro.ink} />
              <Text style={styles.pillText}>{state.score}</Text>
            </View>
            <View style={styles.pill}>
              {Array.from({ length: 3 }, (_, i) => (
                <Ionicons key={i} name={i < state.lives ? 'heart' : 'heart-outline'} size={14} color={Retro.ink} />
              ))}
            </View>
          </View>

          <View style={styles.boardWrap} onLayout={onLayout}>
        <View style={{ width: boardW, height: boardH, marginLeft: ox, marginTop: oy }}>
          {Array.from({ length: ROWS }).map((_, r) => {
            const kind = rowKind(r);
            const bg =
              kind === 'river'
                ? '#9BB0A8'
                : kind === 'road'
                ? '#514F3F'
                : kind === 'median' || kind === 'start'
                ? Retro.plastic
                : kind === 'goal'
                ? Retro.plasticDark
                : Retro.plastic;
            return <View key={`bg${r}`} style={{ position: 'absolute', left: 0, top: r * cell, width: boardW, height: cell, backgroundColor: bg }} />;
          })}

          {state.lanes.map((lane) =>
            lane.cells.map((present, c) =>
              present ? (
                <View
                  key={`${lane.row}-${c}`}
                  style={[
                    styles.obstacle,
                    {
                      left: c * cell + 1,
                      top: lane.row * cell + 3,
                      width: cell - 2,
                      height: cell - 6,
                      borderRadius: lane.kind === 'river' ? 4 : 5,
                      backgroundColor: lane.kind === 'river' ? '#7A5A34' : Retro.ink,
                    },
                  ]}
                />
              ) : null
            )
          )}

          <View
            style={[
              styles.frog,
              { left: state.frog.c * cell + 2, top: state.frog.r * cell + 2, width: cell - 4, height: cell - 4, borderRadius: (cell - 4) / 2 },
            ]}
          />
        </View>

        {(state.outcome === 'won' || state.outcome === 'over') && (
          <View style={styles.overlay}>
            <View style={styles.resultCard}>
              <Ionicons name={state.outcome === 'won' ? 'trophy' : 'water'} size={40} color={state.outcome === 'won' ? Colors.accentGold : '#2E86C1'} />
              <Text style={styles.resultTitle}>{state.outcome === 'won' ? 'Home Safe!' : 'Game Over'}</Text>
              <Text style={styles.resultSub}>{`${state.score} pts`}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={restart} activeOpacity={0.85}>
                <Ionicons name="refresh" size={18} color={Retro.plastic} />
                <Text style={styles.primaryBtnText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <View style={styles.dpad}>
          <TouchableOpacity style={[styles.dBtn, styles.dUp]} onPress={() => doHop('up')} activeOpacity={0.8}>
            <Ionicons name="chevron-up" size={22} color={Retro.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dBtn, styles.dLeft]} onPress={() => doHop('left')} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color={Retro.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dBtn, styles.dRight]} onPress={() => doHop('right')} activeOpacity={0.8}>
            <Ionicons name="chevron-forward" size={22} color={Retro.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dBtn, styles.dDown]} onPress={() => doHop('down')} activeOpacity={0.8}>
            <Ionicons name="chevron-down" size={22} color={Retro.ink} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onExit} style={styles.exitRow}>
          <Ionicons name="chevron-back" size={16} color={Retro.inkSoft} />
          <Text style={styles.exitText}>Back</Text>
        </TouchableOpacity>
      </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: Colors.background, justifyContent: 'center' },
  deviceFrame: { flex: 1, width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: Retro.frame, borderRadius: 40, padding: 8, borderWidth: 2, borderColor: Retro.frameDark },
  plastic: { flex: 1, backgroundColor: Retro.plastic, borderRadius: 32, padding: 12 },
  hud: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(47,44,28,0.12)', borderRadius: 12, paddingVertical: 7, paddingHorizontal: 14 },
  pillText: { color: Retro.ink, fontSize: 15, fontWeight: '800' },
  boardWrap: { flex: 1, overflow: 'hidden', backgroundColor: Retro.screen, borderRadius: 14, borderWidth: 2, borderColor: Retro.screenEdge },
  obstacle: { position: 'absolute' },
  frog: { position: 'absolute', backgroundColor: Retro.ink, borderWidth: 2, borderColor: Retro.screen },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(47,44,28,0.55)' },
  resultCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, alignItems: 'center', width: 250 },
  resultTitle: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary, marginTop: 8 },
  resultSub: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Retro.ink, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20 },
  primaryBtnText: { color: Retro.plastic, fontSize: 15, fontWeight: '800' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 10 },
  dpad: { width: 132, height: 132 },
  dBtn: { position: 'absolute', width: 44, height: 44, borderRadius: 12, backgroundColor: Retro.plasticDark, borderWidth: 2, borderColor: Retro.ink, alignItems: 'center', justifyContent: 'center' },
  dUp: { left: 44, top: 0 },
  dDown: { left: 44, top: 88 },
  dLeft: { left: 0, top: 44 },
  dRight: { left: 88, top: 44 },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  exitText: { color: Retro.inkSoft, fontSize: 13, fontWeight: '700' },
});
