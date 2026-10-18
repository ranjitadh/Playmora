import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { BIRD_X, FlappyState, GROUND, PIPE_W, birdHitbox, createFlappyState, flap, startFlappy, step } from './flappyLogic';
import { usePausedRef } from '../shared/usePausedRef';

export const FlappyFlightGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled, isPaused }) => {
  const [area, setArea] = useState({ w: 340, h: 480 });
  const [state, setState] = useState<FlappyState>(createFlappyState);
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
    if (state.status === 'over' && !finishedRef.current) {
      finishedRef.current = true;
      if (!isMuted) audioService.playSound('game_over');
      if (isHapticsEnabled) hapticsService.error();
      onGameOver(state.score, { pipes: state.score });
    }
  }, [state.status, state.score, onGameOver, isMuted, isHapticsEnabled]);

  const tap = () => {
    if (state.status === 'ready') {
      setState((s) => startFlappy(s));
      return;
    }
    if (state.status === 'playing') {
      if (isHapticsEnabled) hapticsService.selection();
      setState((s) => flap(s));
    }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  };

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="star" size={15} color={Colors.accentGold} />
          <Text style={styles.pillText}>{state.score}</Text>
        </View>
        <Text style={styles.hudTitle}>FLAPPY FLIGHT</Text>
      </View>

      <View style={styles.area} onLayout={onLayout} onStartShouldSetResponder={() => true} onResponderGrant={tap}>
        {state.pipes.map((p, i) => {
          const gapTop = (p.gapY - p.gapH / 2) * area.h;
          const gapBottom = (p.gapY + p.gapH / 2) * area.h;
          const left = p.x * area.w - (PIPE_W * area.w) / 2;
          const w = PIPE_W * area.w;
          return (
            <React.Fragment key={i}>
              <View style={[styles.pipe, { left, width: w, top: 0, height: Math.max(0, gapTop) }]} />
              <View style={[styles.pipe, { left, width: w, top: gapBottom, height: Math.max(0, area.h - gapBottom) }]} />
            </React.Fragment>
          );
        })}

        {/* The visible ground must line up with the GROUND death plane, otherwise
            the bird appears to die in mid-air above the strip. */}
        <View style={[styles.ground, { height: Math.max(6, (1 - GROUND) * area.h) }]} />
        {(() => {
          const { halfW, halfH } = birdHitbox(area.w, area.h);
          const iconSize = 2 * Math.min(halfW, halfH);
          return (
            <View style={[styles.bird, { width: halfW * 2, height: halfH * 2, left: BIRD_X * area.w - halfW, top: state.y * area.h - halfH }]}>
              <Ionicons name="airplane" size={iconSize} color={Colors.accentGold} />
            </View>
          );
        })()}

        {state.status === 'ready' && (
          <View style={styles.readyOverlay} pointerEvents="none">
            <Text style={styles.readyText}>TAP TO FLAP</Text>
          </View>
        )}
      </View>

      <Text style={styles.hint}>Tap anywhere to flap · avoid the pipes</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  hudTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  area: { flex: 1, backgroundColor: '#DCEBFF', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  pipe: { position: 'absolute', backgroundColor: Colors.accent },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, backgroundColor: '#C2A27A' },
  bird: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  readyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  readyText: { color: Colors.primary, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 10 },
});
