import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { OBST_W, PLAYER_H, PLAYER_W, PLAYER_X, HeliState, createHeliState, flap, start, step } from './helicopterLogic';
import { usePausedRef } from '../shared/usePausedRef';

export const HelicopterEscapeGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled, isPaused }) => {
  const [area, setArea] = useState({ w: 340, h: 480 });
  const [state, setState] = useState<HeliState>(createHeliState);
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
      if (!pausedRef.current) setState((prev) => step(prev, dt));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = 0;
    };
  }, []);

  useEffect(() => {
    if (state.status === 'crashed' && !finishedRef.current) {
      finishedRef.current = true;
      if (!isMuted) audioService.playSound('game_over');
      if (isHapticsEnabled) hapticsService.error();
      onGameOver(state.score, { distance: state.score });
    }
  }, [state.status, state.score, onGameOver, isMuted, isHapticsEnabled]);

  const tap = () => {
    if (state.status === 'ready') {
      setState((s) => start(s));
      return;
    }
    if (state.status === 'playing') {
      if (isHapticsEnabled) hapticsService.selection();
      if (!isMuted) audioService.playSound('tap');
      setState((s) => flap(s));
    }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  };

  const heliW = PLAYER_W * area.w;
  const heliH = PLAYER_H * area.h;

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="git-branch-outline" size={15} color={Colors.accentGold} />
          <Text style={styles.pillText}>{state.score}m</Text>
        </View>
        <Text style={styles.hudTitle}>HELICOPTER ESCAPE</Text>
      </View>

      <View
        testID="heli-area"
        style={styles.area}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onResponderGrant={tap}
      >
        <View
          testID="heli"
          style={[
            styles.heli,
            { width: heliW, height: heliH, left: PLAYER_X * area.w - heliW / 2, top: state.y * area.h - heliH / 2 },
          ]}
        >
          <Ionicons name="rocket" size={Math.min(heliW, heliH) * 1.1} color={Colors.primary} />
        </View>

        {state.obstacles.map((ob, i) => {
          const gapTop = (ob.gapY - ob.gapH / 2) * area.h;
          const gapBottom = (ob.gapY + ob.gapH / 2) * area.h;
          const left = ob.x * area.w - (OBST_W * area.w) / 2;
          const w = OBST_W * area.w;
          return (
            <React.Fragment key={i}>
              <View style={[styles.wall, { left, width: w, top: 0, height: Math.max(0, gapTop) }]} />
              <View style={[styles.wall, { left, width: w, top: gapBottom, height: Math.max(0, area.h - gapBottom) }]} />
            </React.Fragment>
          );
        })}

        {state.status === 'ready' && (
          <View style={styles.readyOverlay} pointerEvents="none">
            <Text style={styles.readyText}>TAP TO FLY</Text>
          </View>
        )}
      </View>

      <Text style={styles.hint}>Tap to thrust upward · avoid the cave walls</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  hudTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  area: { flex: 1, backgroundColor: '#EAF2FF', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  heli: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  wall: { position: 'absolute', backgroundColor: Colors.accent },
  readyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  readyText: { color: Colors.primary, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 10 },
});
