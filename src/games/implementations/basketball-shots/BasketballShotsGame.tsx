import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Modern } from '../shared/gameTheme';
import {
  BACKBOARD_BOTTOM,
  BACKBOARD_TOP,
  BACKBOARD_X,
  GRAVITY,
  HOOP_X,
  HOOP_Y,
  RIM_R,
  ShotState,
  createShotGame,
  shoot,
  stepShot,
} from './basketballLogic';

const K = 3.4;
const DRAG_MIN = 0.05;

interface Pt {
  x: number;
  y: number;
}

export const BasketballShotsGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, onExit, isMuted, isHapticsEnabled }) => {
  const [area, setArea] = useState({ w: 340, h: 460 });
  const [state, setState] = useState<ShotState>(createShotGame);
  const [aim, setAim] = useState<Pt | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const finishedRef = useRef(false);
  const startRef = useRef<Pt | null>(null);

  useEffect(() => {
    onScoreUpdate(state.score);
  }, [state.score, onScoreUpdate]);

  useEffect(() => {
    const loop = (t: number) => {
      if (!lastRef.current) lastRef.current = t;
      const dt = Math.min(0.05, (t - lastRef.current) / 1000);
      lastRef.current = t;
      setState((prev) => (prev.phase === 'flying' || prev.phase === 'ready' ? stepShot(prev, dt) : prev));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = 0;
    };
  }, []);

  useEffect(() => {
    if (state.outcome === 'over' && !finishedRef.current) {
      finishedRef.current = true;
      if (!isMuted) audioService.playSound('game_over');
      if (isHapticsEnabled) hapticsService.error();
      onGameOver(state.score, { makes: state.makes, misses: state.misses });
    }
  }, [state.outcome, state.score, state.makes, state.misses, onGameOver, isMuted, isHapticsEnabled]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  }, []);

  const toNorm = useCallback(
    (x: number, y: number): Pt => ({ x: x / Math.max(1, area.w), y: y / Math.max(1, area.h) }),
    [area]
  );

  const responder = {
    onStartShouldSetResponder: () => state.phase === 'ready',
    onResponderGrant: (e: any) => {
      if (state.phase !== 'ready') return;
      startRef.current = toNorm(e.nativeEvent.locationX, e.nativeEvent.locationY);
      setAim({ x: 0, y: 0 });
    },
    onResponderMove: (e: any) => {
      if (!startRef.current) return;
      const now = toNorm(e.nativeEvent.locationX, e.nativeEvent.locationY);
      setAim({ x: now.x - startRef.current.x, y: now.y - startRef.current.y });
    },
    onResponderRelease: (e: any) => {
      if (!startRef.current) {
        setAim(null);
        return;
      }
      const now = toNorm(e.nativeEvent.locationX, e.nativeEvent.locationY);
      const dx = now.x - startRef.current.x;
      const dy = now.y - startRef.current.y;
      startRef.current = null;
      setAim(null);
      if (Math.hypot(dx, dy) < DRAG_MIN) return;
      setState((s) => shoot(s, dx * K, dy * K));
      if (isHapticsEnabled) hapticsService.mediumImpact();
      if (!isMuted) audioService.playSound('tap');
    },
    onResponderTerminate: () => {
      startRef.current = null;
      setAim(null);
    },
  };

  const preview = useMemo<Pt[]>(() => {
    if (!aim || Math.hypot(aim.x, aim.y) < DRAG_MIN) return [];
    let x = 0.16;
    let y = 0.8;
    let vx = aim.x * K;
    let vy = aim.y * K;
    const pts: Pt[] = [];
    for (let i = 0; i < 90; i++) {
      const dt = 0.02;
      vy += GRAVITY * dt;
      x += vx * dt;
      y += vy * dt;
      if (y > 1.05 || x > 1.05 || x < -0.05) break;
      pts.push({ x, y });
    }
    return pts;
  }, [aim]);

  const restart = useCallback(() => {
    finishedRef.current = false;
    setAim(null);
    startRef.current = null;
    setState(createShotGame());
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted]);

  const px = (nx: number) => nx * area.w;
  const py = (ny: number) => ny * area.h;
  const ballPx = state.ball.r * area.w;

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={[styles.pill, styles.pillAccent]}>
          <Ionicons name="basketball" size={15} color="#F97316" />
          <Text style={styles.pillText}>{state.score}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="time-outline" size={15} color={Modern.accent} />
          <Text style={styles.pillText}>{Math.ceil(state.timeLeft)}s</Text>
        </View>
        <View style={styles.pill}>
          {[0, 1, 2].map((i) => (
            <Ionicons key={i} name="heart" size={15} color={i < state.lives ? Modern.pink : Modern.border} />
          ))}
        </View>
      </View>

      <View style={styles.area} onLayout={onLayout} {...responder}>
        <View style={[styles.backboard, { left: px(BACKBOARD_X) - 3, top: py(BACKBOARD_TOP), height: py(BACKBOARD_BOTTOM - BACKBOARD_TOP) }]} />
        <View style={[styles.rim, { left: px(HOOP_X - RIM_R), width: px(RIM_R * 2), top: py(HOOP_Y) }]} />
        <View style={[styles.net, { left: px(HOOP_X - RIM_R * 0.7), width: px(RIM_R * 1.4), top: py(HOOP_Y), height: py(0.07) }]} />
        <View style={[styles.floor, { top: py(0.93) }]} />

        {preview.map((p, i) => (
          <View key={i} pointerEvents="none" style={[styles.dot, { left: px(p.x) - 3, top: py(p.y) - 3 }]} />
        ))}

        <View
          pointerEvents="none"
          style={[styles.ball, { left: px(state.ball.x) - ballPx, top: py(state.ball.y) - ballPx, width: ballPx * 2, height: ballPx * 2, borderRadius: ballPx }]}
        >
          <View style={styles.ballLine} />
          <View style={[styles.ballLine, styles.ballLineV]} />
        </View>

        {state.phase === 'ready' && preview.length === 0 && (
          <View style={styles.ready} pointerEvents="none">
            <Text style={styles.readyText}>DRAG TO SHOOT</Text>
            <Text style={styles.readySub}>Flick up and right toward the hoop</Text>
          </View>
        )}

        {state.outcome === 'over' && (
          <View style={styles.overlay}>
            <View style={styles.card}>
              <Ionicons name="timer" size={40} color={Modern.accent} />
              <Text style={styles.resultTitle}>Time's Up</Text>
              <Text style={styles.resultSub}>{`${state.score} points · ${state.makes} baskets`}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={restart} activeOpacity={0.85}>
                <Ionicons name="refresh" size={18} color={Colors.textInverse} />
                <Text style={styles.primaryBtnText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.hint}>Drag to aim — the dots show the arc</Text>
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
  area: { flex: 1, backgroundColor: '#E8F2FB', borderRadius: Modern.radius, overflow: 'hidden', borderWidth: 2, borderColor: Modern.sky },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#C7A97E' },
  backboard: { position: 'absolute', width: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D9D4CC' },
  rim: { position: 'absolute', height: 5, backgroundColor: '#F97316', borderRadius: 3 },
  net: { position: 'absolute', borderBottomWidth: 0, borderTopWidth: 0, borderLeftWidth: 2, borderRightWidth: 2, borderLeftColor: 'rgba(255,255,255,0.75)', borderRightColor: 'rgba(255,255,255,0.75)', borderBottomColor: 'rgba(255,255,255,0.75)' },
  dot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(14,165,233,0.5)' },
  ball: { position: 'absolute', backgroundColor: '#F97316', borderWidth: 2, borderColor: '#C25E0A', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  ballLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: '#C25E0A' },
  ballLineV: { left: '48%', right: '48%', top: 0, bottom: 0, width: 2, height: '100%' },
  ready: { position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center' },
  readyText: { color: Modern.accent, fontSize: 17, fontWeight: '900', letterSpacing: 2 },
  readySub: { color: Modern.inkSoft, fontSize: 12, marginTop: 4 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.82)' },
  card: { backgroundColor: Modern.surface, borderRadius: Modern.radius, padding: 24, alignItems: 'center', width: 240 },
  resultTitle: { fontSize: 20, fontWeight: '900', color: Modern.ink, marginTop: 8 },
  resultSub: { fontSize: 13, color: Modern.inkSoft, marginTop: 4, textAlign: 'center' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Modern.accent, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24, marginTop: 16 },
  primaryBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
  hint: { color: Modern.inkSoft, fontSize: 12 },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  exitText: { color: Modern.inkMuted, fontSize: 13, fontWeight: '700' },
});
