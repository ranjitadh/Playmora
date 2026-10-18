import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { BAND, R0, DriftState, createDrift, startDrift, stepDrift } from './driftLogic';
import { usePausedRef } from '../shared/usePausedRef';
import { HudPill, racingStyles } from '../shared/racingHud';

export const DriftChallengeGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled, isPaused }) => {
  const [area, setArea] = useState({ w: 340, h: 440 });
  const [state, setState] = useState<DriftState>(createDrift);
  const steerRef = useRef(0);
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
      if (!pausedRef.current && state.status === 'playing') {
        setState((prev) => stepDrift(prev, dt, steerRef.current));
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = 0;
    };
  }, [state.status]);

  useEffect(() => {
    if (state.status === 'over' && !finishedRef.current) {
      finishedRef.current = true;
      if (!isPaused && !isMuted) audioService.playSound('game_over');
      if (isHapticsEnabled) hapticsService.error();
      onGameOver(state.score, {});
    }
  }, [state.status, state.score, onGameOver, isPaused, isMuted, isHapticsEnabled]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  };

  const start = () => setState((s) => startDrift(s));

  const hold = (value: number) => ({
    onPressIn: () => {
      if (state.status === 'ready') start();
      if (!isPaused) steerRef.current = value;
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
        <View
          style={[
            styles.kart,
            {
              left: kx - 14,
              top: ky - 20,
              transform: [
                { rotate: `${state.angle}rad` },
                { translateY: state.r > R0 ? 1 : 0 },
              ],
              backgroundColor: onTrack ? Colors.accent : Colors.accentCoral,
            },
          ]}
        >
          <View style={styles.kartBody} />
          <View style={[styles.kartWheel, styles.kartWheelFront]} />
          <View style={[styles.kartWheel, styles.kartWheelRear]} />
        </View>

        {state.status === 'ready' && (
          <View style={styles.readyOverlay} pointerEvents="none">
            <Text style={styles.readyText}>HOLD TO DRIFT</Text>
          </View>
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
  kart: {
    position: 'absolute',
    width: 28,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  kartBody: {
    width: 20,
    height: 24,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  kartWheel: {
    position: 'absolute',
    width: 6,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#1F2937',
  },
  kartWheelFront: { top: 8, left: -3 },
  kartWheelRear: { bottom: 8, left: -3 },
  readyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  readyText: { color: Colors.textInverse, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  controls: { flexDirection: 'row', gap: 12, marginTop: 12 },
  ctrlBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingVertical: 15 },
  ctrlText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800' },
});
