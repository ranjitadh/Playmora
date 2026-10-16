import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  GROUND,
  PLAYER_H,
  PLAYER_W,
  PLAYER_X,
  RunnerState,
  createRunnerState,
  jump,
  startRun,
  step,
} from './jumpAndDodgeLogic';

export const JumpAndDodgeGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled }) => {
  const [area, setArea] = useState({ w: 340, h: 480 });
  const [state, setState] = useState<RunnerState>(createRunnerState);
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
      setState((prev) => step(prev, dt));
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

  const tap = () => {
    if (state.status === 'ready') {
      setState((s) => startRun(s));
      return;
    }
    if (state.status === 'playing') {
      if (isHapticsEnabled) hapticsService.lightImpact();
      setState((s) => jump(s));
    }
  };

  const restart = useCallback(() => {
    finishedRef.current = false;
    lastRef.current = 0;
    setState(startRun(createRunnerState()));
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  };

  const playerW = PLAYER_W * area.w;
  const playerH = PLAYER_H * area.h;

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="footsteps" size={15} color={Colors.accentGold} />
          <Text style={styles.pillText}>{state.score}m</Text>
        </View>
      </View>

      <View style={styles.area} onLayout={onLayout} onStartShouldSetResponder={() => true} onResponderGrant={tap}>
        <View style={[styles.ground, { top: GROUND * area.h }]} />

        {state.obstacles.map((o, i) => (
          <View
            key={i}
            style={[styles.obstacle, { left: o.x * area.w, width: o.w * area.w, height: o.h * area.h, top: (GROUND - o.h) * area.h }]}
          />
        ))}

        <View
          style={[styles.player, { width: playerW, height: playerH, left: PLAYER_X * area.w - playerW / 2, top: state.y * area.h - playerH / 2 }]}
        >
          <Ionicons name="walk" size={playerH * 0.9} color={Colors.primary} />
        </View>

        {state.status === 'ready' && (
          <View style={styles.readyOverlay} pointerEvents="none">
            <Text style={styles.readyText}>TAP TO START</Text>
          </View>
        )}
        {state.status === 'over' && (
          <View style={styles.overlay}>
            <View style={styles.card}>
              <Ionicons name="alert-circle" size={40} color={Colors.accentCoral} />
              <Text style={styles.resultTitle}>Crashed!</Text>
              <Text style={styles.resultSub}>{`${state.score}m`}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={restart} activeOpacity={0.85}>
                <Ionicons name="refresh" size={18} color={Colors.textInverse} />
                <Text style={styles.primaryBtnText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <Text style={styles.hint}>Tap to jump over the obstacles</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  hud: { alignItems: 'center', marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  area: { flex: 1, backgroundColor: '#EAF2FF', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#C2A27A' },
  obstacle: { position: 'absolute', backgroundColor: Colors.accentCoral, borderRadius: 4 },
  player: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  readyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  readyText: { color: Colors.primary, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32,33,36,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 300, backgroundColor: Colors.surface, borderRadius: 22, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  resultTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 10 },
  resultSub: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700', marginTop: 4, marginBottom: 18 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 26 },
  primaryBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 10 },
});
