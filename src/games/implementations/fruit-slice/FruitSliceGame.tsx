import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Modern } from '../shared/gameTheme';
import {
  FruitState,
  createFruitGame,
  sliceSegment,
  spawnEntity,
  stepPhysics,
} from './fruitSliceLogic';
import { usePausedRef } from '../shared/usePausedRef';

const SPAWN_EVERY = 0.8;
const BOMB_CHANCE = 0.18;

export const FruitSliceGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, onExit, isMuted, isHapticsEnabled, isPaused }) => {
  const [area, setArea] = useState({ w: 340, h: 460 });
  const [state, setState] = useState<FruitState>(createFruitGame);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const spawnAccRef = useRef(0);
  const finishedRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const stateRef = useRef<FruitState>(state);
  const pausedRef = usePausedRef(isPaused);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    onScoreUpdate(state.score);
  }, [state.score, onScoreUpdate]);

  useEffect(() => {
    const loop = (t: number) => {
      if (!lastRef.current) lastRef.current = t;
      const dt = Math.min(0.05, (t - lastRef.current) / 1000);
      lastRef.current = t;
      if (!pausedRef.current) {
        spawnAccRef.current += dt;
        setState((prev) => {
          let s = stepPhysics(prev, dt);
          if (spawnAccRef.current >= SPAWN_EVERY) {
            spawnAccRef.current -= SPAWN_EVERY;
            s = spawnEntity(s, { forceBomb: Math.random() < BOMB_CHANCE });
          }
          return s;
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = 0;
    };
  }, []);

  useEffect(() => {
    if (state.outcome === 'lost' && !finishedRef.current) {
      finishedRef.current = true;
      if (!isMuted) audioService.playSound('game_over');
      if (isHapticsEnabled) hapticsService.error();
      onGameOver(state.score, { sliced: state.sliced });
    }
  }, [state.outcome, state.score, state.sliced, onGameOver, isMuted, isHapticsEnabled]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  }, []);

  const sliceTo = useCallback(
    (nx: number, ny: number) => {
      const prev = lastPointRef.current;
      lastPointRef.current = { x: nx, y: ny };
      if (!prev) return;
      const cur = stateRef.current;
      if (cur.outcome !== 'in_progress') return;
      const next = sliceSegment(cur, prev.x, prev.y, nx, ny);
      if (next === cur) return;
      const gained = next.sliced > cur.sliced;
      stateRef.current = next;
      setState(next);
      if (gained) {
        if (!isMuted) audioService.playSound('match');
        if (isHapticsEnabled) hapticsService.lightImpact();
      }
    },
    [isMuted, isHapticsEnabled]
  );

  const responder = {
    onStartShouldSetResponder: () => true,
    onResponderGrant: () => {
      lastPointRef.current = null;
    },
    onResponderMove: (e: any) => {
      const { locationX, locationY } = e.nativeEvent;
      if (area.w > 0 && area.h > 0) sliceTo(locationX / area.w, locationY / area.h);
    },
    onResponderRelease: () => {
      lastPointRef.current = null;
    },
  };

  const rpx = 0.055 * area.w;

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={[styles.pill, styles.pillAccent]}>
          <Ionicons name="flash" size={15} color={Modern.accent} />
          <Text style={styles.pillText}>{state.score}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="ribbon" size={15} color={Modern.amber} />
          <Text style={styles.pillText}>{state.sliced}</Text>
        </View>
        <View style={styles.pill}>
          {[0, 1, 2].map((i) => (
            <Ionicons key={i} name="heart" size={15} color={i < state.lives ? Modern.pink : Modern.border} />
          ))}
        </View>
      </View>

      <View style={styles.area} onLayout={onLayout} {...responder}>
        {state.entities.map((e) => (
          <View
            key={e.id}
            pointerEvents="none"
            style={[
              styles.blob,
              { left: e.x * area.w - rpx, top: e.y * area.h - rpx, width: rpx * 2, height: rpx * 2, borderRadius: rpx, backgroundColor: e.color },
            ]}
          >
            <View style={[styles.blobShine, { width: rpx * 0.7, height: rpx * 0.7, borderRadius: rpx * 0.35 }]} />
            {e.kind === 'bomb' && <Ionicons name="close" size={rpx * 0.9} color="#F8F7F4" />}
          </View>
        ))}

        {state.outcome === 'in_progress' && state.entities.length === 0 && (
          <View style={styles.ready} pointerEvents="none">
            <Text style={styles.readyText}>SLICE THE FRUIT</Text>
            <Text style={styles.readySub}>Avoid the black bombs</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.hint}>Swipe across the fruit to slice it</Text>
        <TouchableOpacity onPress={onExit} style={styles.exitRow}>
          <Ionicons name="chevron-back" size={16} color={Modern.inkMuted} />
          <Text style={styles.exitText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  hud: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Modern.surface, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: Modern.border },
  pillAccent: { borderColor: Modern.sky, backgroundColor: 'rgba(56,189,248,0.12)' },
  pillText: { color: Modern.ink, fontSize: 15, fontWeight: '800' },
  area: { flex: 1, backgroundColor: '#0F172A', borderRadius: Modern.radius, overflow: 'hidden', borderWidth: 2, borderColor: Modern.sky },
  blob: { position: 'absolute', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  blobShine: { position: 'absolute', top: '18%', left: '20%', backgroundColor: 'rgba(255,255,255,0.4)' },
  ready: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  readyText: { color: Modern.sky, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  readySub: { color: '#8A93A6', fontSize: 13, marginTop: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
  hint: { color: Modern.inkSoft, fontSize: 12 },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  exitText: { color: Modern.inkMuted, fontSize: 13, fontWeight: '700' },
});
