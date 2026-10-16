import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { ROI, KartState, createKart, roadCenter, startKart, stepKart } from './miniKartLogic';
import { HudPill, ResultOverlay, racingStyles } from '../shared/racingHud';

const ROWS = 44;
const VIEW_DIST = 1.3;

export const MiniKartRacingGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled }) => {
  const [area, setArea] = useState({ w: 340, h: 440 });
  const [state, setState] = useState<KartState>(createKart);
  const steerRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    onScoreUpdate(state.score);
  }, [state.score, onScoreUpdate]);

  useEffect(() => {
    const loop = (t: number) => {
      if (!lastRef.current) lastRef.current = t;
      const dt = (t - lastRef.current) / 1000;
      lastRef.current = t;
      setState((prev) => stepKart(prev, dt, steerRef.current));
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
      onGameOver(state.score, { laps: state.laps });
    }
  }, [state.status, state.score, state.laps, onGameOver, isMuted, isHapticsEnabled]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  };

  const restart = useCallback(() => {
    finishedRef.current = false;
    lastRef.current = 0;
    steerRef.current = 0;
    setState(startKart(createKart()));
  }, []);

  const hold = (value: number) => ({
    onPressIn: () => {
      if (state.status === 'ready') setState((s) => startKart(s));
      steerRef.current = value;
    },
    onPressOut: () => {
      steerRef.current = 0;
    },
  });

  const rowH = area.h / ROWS;
  const rows = Array.from({ length: ROWS }).map((_, i) => {
    const f = i / ROWS;
    const dist = state.distance + (1 - f) * VIEW_DIST;
    const c = roadCenter(dist);
    return { left: (c - ROI) * area.w, width: 2 * ROI * area.w, top: f * area.h };
  });

  const kartLeft = state.x * area.w - 16;

  return (
    <View style={racingStyles.container}>
      <View style={racingStyles.hud}>
        <HudPill icon="flag" color={Colors.accentGold} value={`L${state.laps + 1}`} />
        <Text style={racingStyles.hudTitle}>MINI KART RACING</Text>
        <HudPill icon="time" color={Colors.primary} value={`${Math.ceil(state.timeLeft)}s`} />
      </View>

      <View style={styles.area} onLayout={onLayout}>
        <View style={styles.grass} />
        {rows.map((r, i) => (
          <View key={i} style={[styles.road, { left: r.left, width: r.width, top: r.top, height: rowH + 1 }]} />
        ))}
        <View style={[styles.kart, { left: kartLeft }]}>
          <Ionicons name="car-sport" size={32} color={Colors.textInverse} />
        </View>

        {state.status === 'ready' && (
          <View style={styles.readyOverlay} pointerEvents="none">
            <Text style={styles.readyText}>HOLD LEFT / RIGHT</Text>
          </View>
        )}
        {state.status === 'over' && (
          <ResultOverlay icon="flag" title="Finished!" subtitle={`${state.laps} laps · ${state.score} pts`} onRetry={restart} />
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} {...hold(-1)} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={26} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} {...hold(1)} activeOpacity={0.85}>
          <Ionicons name="chevron-forward" size={26} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <Text style={racingStyles.hint}>Hold the arrows to keep the kart on the road</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, backgroundColor: '#3F6212' },
  grass: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#4D7C0F' },
  road: { position: 'absolute', backgroundColor: '#3A3F4C' },
  kart: { position: 'absolute', bottom: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  readyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  readyText: { color: Colors.textInverse, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  controls: { flexDirection: 'row', gap: 12, marginTop: 12 },
  ctrlBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingVertical: 15 },
});
