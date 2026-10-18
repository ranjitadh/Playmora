import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { CAR_W, LANE_COUNT, PLAYER_W, CrossState, createCross, moveCross, startCross, stepCross } from './roadCrossingLogic';
import { usePausedRef } from '../shared/usePausedRef';

export const RoadCrossingGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled, isPaused }) => {
  const [area, setArea] = useState({ w: 340, h: 420 });
  const [state, setState] = useState<CrossState>(createCross);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const finishedRef = useRef(false);
  const pausedRef = usePausedRef(isPaused);

  useEffect(() => {
    onScoreUpdate(state.score);
  }, [state.score, onScoreUpdate]);

  useEffect(() => {
    const loop = (t: number) => {
      if (!lastRef.current) lastRef.current = t;
      const dt = (t - lastRef.current) / 1000;
      lastRef.current = t;
      if (!pausedRef.current) setState((prev) => stepCross(prev, dt));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = 0;
    };
  }, []);

  useEffect(() => {
    if (state.status === 'over' && !finishedRef.current) {
      finishedRef.current = true;
      if (!isMuted) audioService.playSound('game_over');
      if (isHapticsEnabled) hapticsService.error();
      onGameOver(state.score, { crossings: state.crossings });
    }
  }, [state.status, state.score, state.crossings, onGameOver, isMuted, isHapticsEnabled]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  };

  const move = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (state.status === 'ready') {
      setState((s) => moveCross(startCross(s), dir));
      return;
    }
    if (state.status !== 'playing') return;
    if (!isMuted) audioService.playSound('tap');
    if (isHapticsEnabled) hapticsService.selection();
    setState((s) => moveCross(s, dir));
  };

  const laneY = (lane: number) => (1 - (lane + 0.5) / LANE_COUNT) * area.h;
  const laneH = area.h / LANE_COUNT;

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="walk" size={15} color={Colors.accentGold} />
          <Text style={styles.pillText}>{state.score}</Text>
        </View>
        <Text style={styles.hudTitle}>ROAD CROSSING</Text>
      </View>

      <View style={styles.area} onLayout={onLayout}>
        {Array.from({ length: LANE_COUNT }).map((_, lane) => (
          <View key={lane} style={[styles.lane, { top: lane * laneH, height: laneH, backgroundColor: lane % 2 === 0 ? '#E8EAF0' : '#DDE1EA' }]} />
        ))}
        {state.lanes.map((lane, li) =>
          lane.cars.map((car, ci) => (
            <View key={`${li}-${ci}`} style={[styles.car, { left: car.x * area.w - (CAR_W * area.w) / 2, top: laneY(li) - laneH * 0.28, width: CAR_W * area.w, height: laneH * 0.56 }]} />
          ))
        )}
        <View style={[styles.player, { left: state.x * area.w - (PLAYER_W * area.w) / 2, top: laneY(state.lane) - laneH * 0.32, width: PLAYER_W * area.w, height: laneH * 0.64 }]}>
          <Ionicons name="person" size={laneH * 0.5} color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.pad}>
        <TouchableOpacity style={styles.padBtn} onPress={() => move('up')} activeOpacity={0.8}>
          <Ionicons name="chevron-up" size={28} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.padRow}>
          <TouchableOpacity style={styles.padBtn} onPress={() => move('left')} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={28} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.padBtn} onPress={() => move('down')} activeOpacity={0.8}>
            <Ionicons name="chevron-down" size={28} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.padBtn} onPress={() => move('right')} activeOpacity={0.8}>
            <Ionicons name="chevron-forward" size={28} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.hint}>Hop upward and weave between the cars</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  hudTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  area: { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  lane: { position: 'absolute', left: 0, right: 0 },
  car: { position: 'absolute', backgroundColor: Colors.accentCoral, borderRadius: 6 },
  player: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 6 },
  pad: { alignItems: 'center', marginTop: 10 },
  padRow: { flexDirection: 'row' },
  padBtn: { width: 56, height: 48, margin: 4, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
