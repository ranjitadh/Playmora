import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { FallingDodgeConfig, FallingDodgeState, createFallingDodge, movePlayerX, startFallingDodge, stepFallingDodge } from './fallingDodge';

interface Props extends GameSessionProps {
  config: FallingDodgeConfig;
  title: string;
  roadColor?: string;
  obstacleColor?: string;
  playerIcon?: keyof typeof Ionicons.glyphMap;
}

export const FallingDodgeGame: React.FC<Props> = ({
  config,
  title,
  roadColor = '#2B2F3A',
  obstacleColor = '#F43F5E',
  playerIcon = 'car-sport',
  onScoreUpdate,
  onGameOver,
  isMuted,
  isHapticsEnabled,
}) => {
  const [area, setArea] = useState({ w: 340, h: 480 });
  const [state, setState] = useState<FallingDodgeState>(createFallingDodge);
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
      setState((prev) => stepFallingDodge(prev, dt, config));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = 0;
    };
  }, [config]);

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

  const handlePointer = (e: GestureResponderEvent) => {
    if (state.status === 'ready') {
      setState((s) => startFallingDodge(s, config));
      return;
    }
    if (state.status !== 'playing') return;
    const x = e.nativeEvent.locationX / area.w;
    setState((s) => movePlayerX(s, x, config));
  };

  const restart = useCallback(() => {
    finishedRef.current = false;
    lastRef.current = 0;
    setState(startFallingDodge(createFallingDodge(), config));
  }, [config]);

  const pw = config.playerW * area.w;
  const ph = config.playerH * area.h;
  const lanes = config.lanes ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="speedometer" size={15} color={Colors.accentGold} />
          <Text style={styles.pillText}>{state.score}</Text>
        </View>
        <Text style={styles.hudTitle}>{title}</Text>
      </View>

      <View
        style={[styles.area, { backgroundColor: roadColor }]}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handlePointer}
        onResponderMove={handlePointer}
      >
        {lanes > 0 &&
          Array.from({ length: lanes - 1 }).map((_, i) => (
            <View key={i} style={[styles.laneLine, { left: ((i + 1) / lanes) * area.w }]} />
          ))}

        {state.obstacles.map((o, i) => (
          <View
            key={i}
            style={[styles.obstacle, { left: o.x * area.w - (o.w * area.w) / 2, top: o.y * area.h, width: o.w * area.w, height: o.h * area.h, backgroundColor: obstacleColor }]}
          />
        ))}

        <View style={[styles.player, { left: state.x * area.w - pw / 2, top: config.playerY * area.h - ph / 2, width: pw, height: ph }]}>
          <Ionicons name={playerIcon as never} size={ph * 0.85} color="#FFFFFF" />
        </View>

        {state.status === 'ready' && (
          <View style={styles.readyOverlay} pointerEvents="none">
            <Text style={styles.readyText}>TAP TO DRIVE</Text>
          </View>
        )}
        {state.status === 'over' && (
          <View style={styles.overlay}>
            <View style={styles.card}>
              <Ionicons name="car" size={40} color={Colors.accentCoral} />
              <Text style={styles.resultTitle}>Crashed!</Text>
              <Text style={styles.resultSub}>{`${state.score} passed`}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={restart} activeOpacity={0.85}>
                <Ionicons name="refresh" size={18} color={Colors.textInverse} />
                <Text style={styles.primaryBtnText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <Text style={styles.hint}>{lanes > 0 ? 'Tap a lane to move into it' : 'Drag to steer left and right'}</Text>
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
  laneLine: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  obstacle: { position: 'absolute', borderRadius: 6 },
  player: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  readyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  readyText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32,33,36,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 300, backgroundColor: Colors.surface, borderRadius: 22, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  resultTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 10 },
  resultSub: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700', marginTop: 4, marginBottom: 18 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 26 },
  primaryBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 10 },
});
