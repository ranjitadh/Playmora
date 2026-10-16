import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { TaxiState, createTaxi, startTaxi, stepTaxi } from './taxiLogic';
import { HudPill, ResultOverlay, racingStyles } from '../shared/racingHud';

export const TaxiDriverChallengeGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled }) => {
  const [area, setArea] = useState({ w: 340, h: 440 });
  const [state, setState] = useState<TaxiState>(createTaxi);
  const inputRef = useRef({ x: 0, y: 0 });

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const finishedRef = useRef(false);
  const prevDelivered = useRef(0);

  useEffect(() => {
    onScoreUpdate(state.score);
  }, [state.score, onScoreUpdate]);

  useEffect(() => {
    if (state.delivered > prevDelivered.current) {
      prevDelivered.current = state.delivered;
      if (!isMuted) audioService.playSound('score');
      if (isHapticsEnabled) hapticsService.success();
    }
  }, [state.delivered, isMuted, isHapticsEnabled]);

  useEffect(() => {
    const loop = (t: number) => {
      if (!lastRef.current) lastRef.current = t;
      const dt = (t - lastRef.current) / 1000;
      lastRef.current = t;
      setState((prev) => stepTaxi(prev, dt, inputRef.current));
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
      onGameOver(state.score, { delivered: state.delivered });
    }
  }, [state.status, state.score, state.delivered, onGameOver, isMuted, isHapticsEnabled]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  };

  const restart = useCallback(() => {
    finishedRef.current = false;
    lastRef.current = 0;
    prevDelivered.current = 0;
    inputRef.current = { x: 0, y: 0 };
    setState(startTaxi(createTaxi()));
  }, []);

  const hold = (x: number, y: number) => ({
    onPressIn: () => {
      if (state.status === 'ready') setState((s) => startTaxi(s));
      inputRef.current = { x, y };
    },
    onPressOut: () => {
      inputRef.current = { x: 0, y: 0 };
    },
  });

  const marker = (p: { x: number; y: number }, icon: keyof typeof Ionicons.glyphMap, color: string) => (
    <View style={[styles.marker, { left: p.x * area.w - 14, top: p.y * area.h - 14 }]}>
      <Ionicons name={icon} size={26} color={color} />
    </View>
  );

  return (
    <View style={racingStyles.container}>
      <View style={racingStyles.hud}>
        <HudPill icon="cash" color={Colors.accent} value={state.score} />
        <Text style={racingStyles.hudTitle}>TAXI DRIVER</Text>
        <HudPill icon="time" color={Colors.primary} value={`${Math.ceil(state.timeLeft)}s`} />
      </View>

      <View style={styles.area} onLayout={onLayout}>
        {!state.carrying && marker(state.pickup, 'person', Colors.accentGold)}
        {state.carrying && marker(state.dropoff, 'flag', Colors.accent)}
        <View style={[styles.taxi, { left: state.x * area.w - 18, top: state.y * area.h - 14 }]}>
          <Ionicons name="car" size={30} color={state.carrying ? Colors.accent : Colors.textInverse} />
        </View>

        {state.status === 'ready' && (
          <View style={styles.readyOverlay} pointerEvents="none">
            <Text style={styles.readyText}>PICK UP RIDERS</Text>
          </View>
        )}
        {state.status === 'over' && (
          <ResultOverlay icon="time" title="Shift Over!" subtitle={`${state.delivered} fares · ${state.score} pts`} onRetry={restart} />
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} {...hold(0, -1)} activeOpacity={0.8}>
          <Ionicons name="arrow-up" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.midRow}>
          <TouchableOpacity style={styles.ctrlBtn} {...hold(-1, 0)} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn} {...hold(1, 0)} activeOpacity={0.8}>
            <Ionicons name="arrow-forward" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn} {...hold(0, 1)} activeOpacity={0.8}>
            <Ionicons name="arrow-down" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={racingStyles.hint}>Drive over a rider to collect, then reach the flag</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, backgroundColor: '#EDEFF3' },
  marker: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  taxi: { position: 'absolute', width: 36, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 8 },
  readyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  readyText: { color: Colors.primary, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  controls: { alignItems: 'center', marginTop: 12 },
  midRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  ctrlBtn: { width: 62, height: 54, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
});
