import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { BAND, R0, DriftState, createDrift, startDrift, stepDrift } from './driftLogic';
import { HudPill, ResultOverlay, racingStyles } from '../shared/racingHud';

export const DriftChallengeGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled }) => {
  const [area, setArea] = useState({ w: 340, h: 440 });
  const [state, setState] = useState<DriftState>(createDrift);
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
      setState((prev) => stepDrift(prev, dt, steerRef.current));
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
      onGameOver(state.score, {});
    }
  }, [state.status, state.score, onGameOver, isMuted, isHapticsEnabled]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  };

  const start = () => setState((s) => startDrift(s));
  const restart = useCallback(() => {
    finishedRef.current = false;
    lastRef.current = 0;
    steerRef.current = 0;
    setState(startDrift(createDrift()));
  }, []);

  const hold = (value: number) => ({
    onPressIn: () => {
      if (state.status === 'ready') start();
      steerRef.current = value;
    },
    onPressOut: () => {
      steerRef.current = 0;
    },
  });

  const cx = area.w / 2;
  const cy = area.h / 2;
  const minDim = Math.min(area.w, area.h);
  const ringOuter = (R0 + BAND) * minDim;
  const ringThick = 2 * BAND * minDim;
  const kartR = state.r * minDim;
  const kx = cx + Math.cos(state.angle) * kartR;
  const ky = cy + Math.sin(state.angle) * kartR;
  const onTrack = Math.abs(state.r - R0) <= BAND;

  return (
    <View style={racingStyles.container}>
      <View style={racingStyles.hud}>
        <HudPill icon="star" color={Colors.accentGold} value={state.score} />
        <Text style={racingStyles.hudTitle}>DRIFT CHALLENGE</Text>
        <HudPill icon="time" color={Colors.primary} value={`${Math.ceil(state.timeLeft)}s`} />
      </View>

      <View style={styles.area} onLayout={onLayout}>
        <View style={[styles.ring, { left: cx - ringOuter, top: cy - ringOuter, width: ringOuter * 2, height: ringOuter * 2, borderRadius: ringOuter, borderWidth: ringThick }]} />
        <View style={[styles.kart, { left: kx - 10, top: ky - 10, backgroundColor: onTrack ? Colors.accent : Colors.accentCoral }]} />

        {state.status === 'ready' && (
          <View style={styles.readyOverlay} pointerEvents="none">
            <Text style={styles.readyText}>HOLD TO DRIFT</Text>
          </View>
        )}
        {state.status === 'over' && (
          <ResultOverlay icon="flame" title="Spun Out!" subtitle={`${state.score} drift points`} onRetry={restart} />
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} {...hold(-1)} activeOpacity={0.85}>
          <Ionicons name="refresh-outline" size={24} color={Colors.primary} />
          <Text style={styles.ctrlText}>TURN IN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} {...hold(1)} activeOpacity={0.85}>
          <Ionicons name="expand-outline" size={24} color={Colors.accentCoral} />
          <Text style={styles.ctrlText}>TURN OUT</Text>
        </TouchableOpacity>
      </View>

      <Text style={racingStyles.hint}>Hold TURN IN to fight the drift and stay on the ring</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, backgroundColor: '#22262F' },
  ring: { position: 'absolute', borderColor: '#4B5563' },
  kart: { position: 'absolute', width: 20, height: 20, borderRadius: 10 },
  readyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  readyText: { color: Colors.textInverse, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  controls: { flexDirection: 'row', gap: 12, marginTop: 12 },
  ctrlBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingVertical: 15 },
  ctrlText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800' },
});
