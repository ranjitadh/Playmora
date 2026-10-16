import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  BALL_R,
  BALL_X,
  ColorSwitchState,
  createColorSwitchState,
  startColorSwitch,
  stepColorSwitch,
  tapBounce,
} from './colorSwitchLogic';

const PALETTE = ['#7557E8', '#F43F5E', '#F59E0B', '#10B981'];

export const ColorSwitchGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled }) => {
  const [area, setArea] = useState({ w: 340, h: 480 });
  const [state, setState] = useState<ColorSwitchState>(createColorSwitchState);
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
      setState((prev) => stepColorSwitch(prev, dt));
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
      setState((s) => startColorSwitch(s));
      return;
    }
    if (state.status === 'playing') {
      if (isHapticsEnabled) hapticsService.selection();
      setState((s) => tapBounce(s));
    }
  };

  const restart = useCallback(() => {
    finishedRef.current = false;
    lastRef.current = 0;
    setState(startColorSwitch(createColorSwitchState()));
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  };

  const ballSize = BALL_R * 2 * area.w;
  const barH = Math.max(14, area.h * 0.032);
  const gapHalf = Math.max(20, area.w * 0.11);

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="star" size={15} color={Colors.accentGold} />
          <Text style={styles.pillText}>{state.score}</Text>
        </View>
        <View style={[styles.ballChip, { backgroundColor: PALETTE[state.color] }]} />
      </View>

      <View style={styles.area} onLayout={onLayout} onStartShouldSetResponder={() => true} onResponderGrant={tap}>
        {state.bars.map((b, i) => {
          const top = b.y * area.h - barH / 2;
          return (
            <React.Fragment key={i}>
              <View style={[styles.seg, { top, height: barH, left: 0, width: Math.max(0, area.w / 2 - gapHalf), backgroundColor: PALETTE[b.color] }]} />
              <View style={[styles.seg, { top, height: barH, left: area.w / 2 + gapHalf, width: Math.max(0, area.w / 2 - gapHalf), backgroundColor: PALETTE[b.color] }]} />
            </React.Fragment>
          );
        })}
        {state.changers.map((c, i) => (
          <View key={i} style={[styles.changer, { top: c.y * area.h - 12, left: BALL_X * area.w - 12 }]}>
            <Ionicons name="sync" size={24} color={Colors.primary} />
          </View>
        ))}

        <View style={[styles.ball, { width: ballSize, height: ballSize, borderRadius: ballSize / 2, left: BALL_X * area.w - ballSize / 2, top: state.y * area.h - ballSize / 2, backgroundColor: PALETTE[state.color] }]} />

        {state.status === 'ready' && (
          <View style={styles.readyOverlay} pointerEvents="none">
            <Text style={styles.readyText}>TAP TO BOUNCE</Text>
          </View>
        )}
        {state.status === 'over' && (
          <View style={styles.overlay}>
            <View style={styles.card}>
              <Ionicons name="color-filter" size={40} color={Colors.accentCoral} />
              <Text style={styles.resultTitle}>Wrong colour!</Text>
              <Text style={styles.resultSub}>{`${state.score} points`}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={restart} activeOpacity={0.85}>
                <Ionicons name="refresh" size={18} color={Colors.textInverse} />
                <Text style={styles.primaryBtnText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <Text style={styles.hint}>Match the ball's colour to pass each bar · tap to bounce</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  ballChip: { width: 26, height: 26, borderRadius: 13 },
  area: { flex: 1, backgroundColor: '#161826', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  seg: { position: 'absolute', borderRadius: 3 },
  changer: { position: 'absolute' },
  ball: { position: 'absolute' },
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
