import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { GAP_START, GAP_WIDTH, MonsterState, SPACING, createMonster, startMonster, stepMonster } from './monsterTruckLogic';
import { HudPill, ResultOverlay, racingStyles } from '../shared/racingHud';

const VIEW_SPAN = 1.2;
const CAM_LEFT = 0.35;

export const MonsterTruckJumpGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled }) => {
  const [area, setArea] = useState({ w: 340, h: 440 });
  const [state, setState] = useState<MonsterState>(createMonster);
  const jumpRef = useRef(false);
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
      const j = jumpRef.current;
      jumpRef.current = false;
      setState((prev) => stepMonster(prev, dt, j));
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
      onGameOver(state.score, { cleared: state.cleared });
    }
  }, [state.status, state.score, state.cleared, onGameOver, isMuted, isHapticsEnabled]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  };

  const restart = useCallback(() => {
    finishedRef.current = false;
    lastRef.current = 0;
    jumpRef.current = false;
    setState(startMonster(createMonster()));
  }, []);

  const jump = () => {
    if (state.status === 'ready') setState((s) => startMonster(s));
    jumpRef.current = true;
    if (isHapticsEnabled) hapticsService.lightImpact();
  };

  const scale = area.w / VIEW_SPAN;
  const camX = state.x - CAM_LEFT;
  const worldToScreen = (wx: number) => (wx - camX) * scale;
  const groundY = area.h * 0.82;
  const heightScale = area.h * 0.85;

  const firstK = Math.floor((camX - GAP_START) / SPACING) - 1;
  const groundPieces: { left: number; width: number }[] = [];
  for (let k = firstK; k < firstK + 6; k++) {
    const prevEnd = GAP_START + k * SPACING + GAP_WIDTH;
    const nextStart = GAP_START + (k + 1) * SPACING;
    const left = worldToScreen(prevEnd);
    const right = worldToScreen(nextStart);
    if (right > 0 && left < area.w) groundPieces.push({ left: Math.max(0, left), width: Math.max(0, Math.min(area.w, right) - Math.max(0, left)) });
  }

  const truckLeft = worldToScreen(state.x) - 22;
  const truckTop = groundY - state.y * heightScale - 30;

  return (
    <View style={racingStyles.container}>
      <View style={racingStyles.hud}>
        <HudPill icon="flag" color={Colors.accentGold} value={state.cleared} />
        <Text style={racingStyles.hudTitle}>MONSTER TRUCK JUMP</Text>
        <HudPill icon="speedometer" color={Colors.primary} value={state.speed.toFixed(1)} />
      </View>

      <View
        style={styles.area}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onResponderGrant={jump}
      >
        <View style={styles.sky} />
        {groundPieces.map((p, i) => (
          <View key={i} style={[styles.ground, { left: p.left, width: p.width, top: groundY }]} />
        ))}
        <View style={[styles.truck, { left: truckLeft, top: truckTop, transform: [{ rotate: `${-state.vy * 0.15}rad` }] }]}>
          <Ionicons name="car-sport" size={34} color={Colors.primary} />
        </View>

        {state.status === 'ready' && (
          <View style={styles.readyOverlay} pointerEvents="none">
            <Text style={styles.readyText}>TAP TO JUMP GAPS</Text>
          </View>
        )}
        {state.status === 'over' && (
          <ResultOverlay icon="warning" title="Crashed!" subtitle={`${state.cleared} gaps cleared`} onRetry={restart} />
        )}
      </View>

      <TouchableOpacity style={styles.jumpBtn} onPress={jump} activeOpacity={0.85}>
        <Ionicons name="arrow-up-circle" size={22} color={Colors.textInverse} />
        <Text style={styles.jumpText}>JUMP</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, backgroundColor: '#BFE3FF' },
  sky: { position: 'absolute', top: 0, left: 0, right: 0, height: '82%', backgroundColor: '#BFE3FF' },
  ground: { position: 'absolute', bottom: 0, height: '18%', backgroundColor: '#8B5E34' },
  truck: { position: 'absolute', width: 44, height: 30, alignItems: 'center', justifyContent: 'center' },
  readyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  readyText: { color: Colors.primary, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  jumpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, marginTop: 12 },
  jumpText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});
