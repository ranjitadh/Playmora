import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { ParkingState, createParking, startParking, stepParking } from './parkingLogic';
import { HudPill, racingStyles } from '../shared/racingHud';
import { usePausedRef } from '../shared/usePausedRef';

export const ParkingMasterGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, onGameWin, isMuted, isHapticsEnabled, isPaused }) => {
  const [area, setArea] = useState({ w: 340, h: 440 });
  const [state, setState] = useState<ParkingState>(createParking);
  const controls = useRef({ throttle: 0, steer: 0 });
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const finishedRef = useRef(false);
  const pausedRef = usePausedRef(isPaused);

  useEffect(() => {
    onScoreUpdate(state.status === 'won' ? 100 : 0);
  }, [state.status, onScoreUpdate]);

  useEffect(() => {
    const loop = (t: number) => {
      if (!lastRef.current) lastRef.current = t;
      const dt = (t - lastRef.current) / 1000;
      lastRef.current = t;
      if (!pausedRef.current) setState((prev) => stepParking(prev, dt, controls.current));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = 0;
    };
  }, []);

  useEffect(() => {
    if ((state.status === 'over' || state.status === 'won') && !finishedRef.current) {
      finishedRef.current = true;
      if (state.status === 'won') {
        if (!isMuted) audioService.playSound('victory');
        if (isHapticsEnabled) hapticsService.success();
        onGameWin?.(100);
        onGameOver(100, { parked: true });
      } else {
        if (!isMuted) audioService.playSound('game_over');
        if (isHapticsEnabled) hapticsService.error();
        onGameOver(0, { parked: false });
      }
    }
  }, [state.status, onGameOver, onGameWin, onScoreUpdate, isMuted, isHapticsEnabled]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  };

  const start = () => setState((s) => startParking(s));

  const hold = (key: 'throttle' | 'steer', value: number) => ({
    onPressIn: () => {
      if (state.status === 'ready') start();
      controls.current[key] = value;
    },
    onPressOut: () => {
      controls.current[key] = 0;
    },
  });

  const pad = (o: { x: number; y: number; w: number; h: number }, key: string) => ({
    left: o.x * area.w,
    top: o.y * area.h,
    width: o.w * area.w,
    height: o.h * area.h,
  });

  const carX = state.x * area.w;
  const carY = state.y * area.h;

  return (
    <View style={racingStyles.container}>
      <View style={racingStyles.hud}>
        <HudPill icon="time" color={Colors.accentGold} value={`${Math.ceil(state.timeLeft)}s`} />
        <Text style={racingStyles.hudTitle}>PARKING MASTER</Text>
        <HudPill icon="speedometer" color={Colors.primary} value={`${Math.abs(state.speed).toFixed(2)}`} />
      </View>

      <View style={styles.area} onLayout={onLayout}>
        {state.obstacles.map((o, i) => (
          <View key={i} style={[styles.obstacle, pad(o, `o${i}`)]} />
        ))}

        <View
          style={[
            styles.bay,
            { left: state.target.x * area.w - 48, top: state.target.y * area.h - 34, transform: [{ rotate: `${state.target.angle + Math.PI / 2}rad` }] },
          ]}
        />

        <View style={[styles.car, { left: carX - 24, top: carY - 16, transform: [{ rotate: `${state.angle + Math.PI / 2}rad` }] }]}>
          <Ionicons name="car-sport" size={32} color={Colors.textInverse} />
        </View>

        {state.status === 'ready' && (
          <View style={styles.readyOverlay} pointerEvents="none">
            <Text style={styles.readyText}>REVERSE INTO THE BAY</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <View style={styles.steerCol}>
          <TouchableOpacity style={styles.ctrlBtn} {...hold('steer', -1)} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={26} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.driveCol}>
          <TouchableOpacity style={styles.ctrlBtn} {...hold('throttle', 1)} activeOpacity={0.8}>
            <Ionicons name="arrow-up" size={24} color={Colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn} {...hold('throttle', -1)} activeOpacity={0.8}>
            <Ionicons name="arrow-down" size={24} color={Colors.accentCoral} />
          </TouchableOpacity>
        </View>
        <View style={styles.steerCol}>
          <TouchableOpacity style={styles.ctrlBtn} {...hold('steer', 1)} activeOpacity={0.8}>
            <Ionicons name="chevron-forward" size={26} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={racingStyles.hint}>Hold the arrows to drive; reverse into the bay and stop</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, backgroundColor: '#EDEFF3' },
  obstacle: { position: 'absolute', backgroundColor: Colors.textMuted, borderRadius: 6 },
  bay: { position: 'absolute', width: 96, height: 68, borderRadius: 10, borderWidth: 3, borderColor: Colors.accent, borderStyle: 'dashed', backgroundColor: 'rgba(16,185,129,0.12)' },
  car: { position: 'absolute', width: 48, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 8 },
  readyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  readyText: { color: Colors.primary, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  steerCol: { justifyContent: 'center' },
  driveCol: { flexDirection: 'row', gap: 14 },
  ctrlBtn: { width: 62, height: 58, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
});
