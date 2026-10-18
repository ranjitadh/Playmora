import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { StackState, cameraStartIndex, createStackState, dropBlock, startStack, updateMotion } from './stackTowerLogic';
import { usePausedRef } from '../shared/usePausedRef';

const BLOCK_COLORS = ['#7557E8', '#F43F5E', '#F59E0B', '#10B981', '#38BDF8'];

export const StackTowerGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled, isPaused }) => {
  const [area, setArea] = useState({ w: 340, h: 480 });
  const [state, setState] = useState<StackState>(createStackState);
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
      if (!pausedRef.current) setState((prev) => updateMotion(prev, dt));
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

  const drop = () => {
    if (state.status === 'ready') {
      setState((s) => startStack(s));
      return;
    }
    if (state.status === 'playing') {
      if (!isMuted) audioService.playSound('pop');
      if (isHapticsEnabled) hapticsService.mediumImpact();
      setState((s) => dropBlock(s));
    }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  };

  const blockH = Math.min(34, area.h / 14);
  const baseY = area.h - 20;
  const maxVisible = Math.max(6, Math.floor((area.h - 40) / blockH));
  const startIndex = cameraStartIndex(state.blocks.length, maxVisible);

  const yFor = (index: number) => baseY - (index - startIndex + 1) * blockH;

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="layers" size={15} color={Colors.primary} />
          <Text style={styles.pillText}>{state.score}</Text>
        </View>
      </View>

      <View style={styles.area} onLayout={onLayout} onStartShouldSetResponder={() => true} onResponderGrant={drop}>
        {state.blocks.map((b, i) =>
          i < startIndex ? null : (
            <View
              key={i}
              style={[styles.block, { left: b.x * area.w, width: b.w * area.w, top: yFor(i), height: blockH, backgroundColor: BLOCK_COLORS[i % BLOCK_COLORS.length] }]}
            />
          )
        )}
        {state.status === 'playing' && (
          <View
            style={[
              styles.block,
              styles.moving,
              { left: state.movingX * area.w, width: state.movingW * area.w, top: yFor(state.blocks.length), height: blockH },
            ]}
          />
        )}

        {state.status === 'ready' && (
          <View style={styles.readyOverlay} pointerEvents="none">
            <Text style={styles.readyText}>TAP TO STACK</Text>
          </View>
        )}
      </View>

      <Text style={styles.hint}>Tap to drop the block — line it up for a perfect stack</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  hud: { alignItems: 'center', marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  area: { flex: 1, backgroundColor: '#F1EEFF', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  block: { position: 'absolute', borderRadius: 4 },
  moving: { backgroundColor: Colors.primary, opacity: 0.85 },
  readyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  readyText: { color: Colors.primary, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 10 },
});
