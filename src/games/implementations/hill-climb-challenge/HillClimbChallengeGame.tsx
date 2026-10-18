import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { HillState, createHillState, startHill, stepHill, terrainHeight } from './hillClimbLogic';
import { usePausedRef } from '../shared/usePausedRef';

const SAMPLES = 56;
const VIEW_LEFT = 0.25;
const VIEW_SPAN = 1.2;

export const HillClimbChallengeGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled, isPaused }) => {
  const [area, setArea] = useState({ w: 340, h: 420 });
  const [state, setState] = useState<HillState>(createHillState);
  const [throttle, setThrottle] = useState(false);
  const throttleRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const finishedRef = useRef(false);
  const pausedRef = usePausedRef(isPaused);

  throttleRef.current = throttle;

  useEffect(() => {
    onScoreUpdate(state.score);
  }, [state.score, onScoreUpdate]);

  useEffect(() => {
    const loop = (t: number) => {
      if (!lastRef.current) lastRef.current = t;
      const dt = (t - lastRef.current) / 1000;
      lastRef.current = t;
      if (!pausedRef.current) setState((prev) => stepHill(prev, dt, throttleRef.current));
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
      onGameOver(state.score, { distance: Math.floor(state.x * 100) });
    }
  }, [state.status, state.score, state.x, onGameOver, isMuted, isHapticsEnabled]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  };

  const begin = () => {
    if (state.status === 'ready') setState((s) => startHill(s));
    setThrottle(true);
    if (isHapticsEnabled) hapticsService.lightImpact();
  };
  const end = () => setThrottle(false);

  const screenX = (absX: number) => ((absX - (state.x - VIEW_LEFT)) / VIEW_SPAN) * area.w;
  const groundY = (h: number) => (1 - h) * area.h;
  const carScreenX = (VIEW_LEFT / VIEW_SPAN) * area.w;

  const bars = Array.from({ length: SAMPLES }).map((_, i) => {
    const absX = state.x - VIEW_LEFT + (i / SAMPLES) * VIEW_SPAN;
    const h = terrainHeight(absX);
    const nextH = terrainHeight(absX + VIEW_SPAN / SAMPLES);
    const top = Math.min(groundY(h), groundY(nextH));
    const bottom = Math.max(groundY(h), groundY(nextH));
    return { left: (i / SAMPLES) * area.w, width: area.w / SAMPLES + 1, top, height: Math.max(area.h - top, bottom - top + area.h * 0.5) };
  });

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="map" size={15} color={Colors.accentGold} />
          <Text style={styles.pillText}>{Math.floor(state.x * 100)}m</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="cash" size={15} color={Colors.accent} />
          <Text style={styles.pillText}>{state.collected}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="water" size={15} color={Colors.primary} />
          <Text style={styles.pillText}>{Math.round(state.fuel)}</Text>
        </View>
      </View>

      <View style={styles.area} onLayout={onLayout}>
        <View style={styles.sky} />
        {bars.map((b, i) => (
          <View key={i} style={[styles.terrain, { left: b.left, width: b.width, top: b.top, height: b.height }]} />
        ))}
        {state.coins.map((c, i) =>
          c.taken ? null : (
            <View key={i} style={[styles.coin, { left: screenX(c.x) - 9, top: groundY(terrainHeight(c.x)) - 26 }]}>
              <Ionicons name="ellipse" size={16} color={Colors.accentGold} />
            </View>
          )
        )}
        <View style={[styles.car, { left: carScreenX - 20, top: groundY(terrainHeight(state.x)) - 34 }]}>
          <Ionicons name="car-sport" size={34} color={Colors.primary} />
        </View>

        {state.status === 'ready' && (
          <View style={styles.readyOverlay} pointerEvents="none">
            <Text style={styles.readyText}>HOLD GAS TO CLIMB</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.gas, throttle && styles.gasActive]}
        onPressIn={begin}
        onPressOut={end}
        activeOpacity={0.9}
      >
        <Ionicons name="speedometer" size={20} color={Colors.textInverse} />
        <Text style={styles.gasText}>{throttle ? 'CLIMBING…' : 'HOLD FOR GAS'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  hud: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border },
  pillText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '800' },
  area: { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, backgroundColor: '#BFE3FF' },
  sky: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%', backgroundColor: '#BFE3FF' },
  terrain: { position: 'absolute', backgroundColor: '#6DA34D' },
  coin: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  car: { position: 'absolute' },
  readyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  readyText: { color: Colors.primary, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  gas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, marginTop: 12 },
  gasActive: { backgroundColor: Colors.accent },
  gasText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});
