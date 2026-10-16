import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Retro } from '../shared/gameTheme';
import {
  BALL_R,
  LEFT_FLIPPER,
  PinballState,
  RIGHT_FLIPPER,
  createPinball,
  step,
} from './pinballLogic';

const FLIPPER_LEN = 0.2;

export const ClassicPinballGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, onExit, isMuted, isHapticsEnabled }) => {
  const [area, setArea] = useState({ w: 320, h: 480 });
  const [state, setState] = useState<PinballState>(createPinball);
  const flipRef = useRef({ left: false, right: false });
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const finishedRef = useRef(false);
  const lastHitsRef = useRef(0);

  useEffect(() => {
    onScoreUpdate(state.score);
  }, [state, onScoreUpdate]);

  useEffect(() => {
    if (state.outcome === 'over' && !finishedRef.current) {
      finishedRef.current = true;
      if (!isMuted) audioService.playSound('game_over');
      if (isHapticsEnabled) hapticsService.error();
      onGameOver(state.score, { hits: state.hits });
    }
  }, [state, onGameOver, isMuted, isHapticsEnabled]);

  useEffect(() => {
    const loop = (t: number) => {
      if (!lastRef.current) lastRef.current = t;
      let dt = (t - lastRef.current) / 1000;
      lastRef.current = t;
      if (dt > 0.05) dt = 0.05;
      setState((s) => step(s, flipRef.current, dt));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = 0;
    };
  }, []);

  useEffect(() => {
    if (state.hits !== lastHitsRef.current) {
      lastHitsRef.current = state.hits;
      if (!isMuted) audioService.playSound('score');
      if (isHapticsEnabled) hapticsService.lightImpact();
    }
  }, [state.hits, isMuted, isHapticsEnabled]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  }, []);

  const setFlip = useCallback((side: 'left' | 'right', value: boolean) => {
    flipRef.current = { ...flipRef.current, [side]: value };
  }, []);

  const restart = useCallback(() => {
    finishedRef.current = false;
    lastHitsRef.current = 0;
    setState(createPinball());
  }, []);

  const px = (n: number) => n * area.w;
  const py = (n: number) => n * area.h;
  const ballD = Math.max(10, BALL_R * 2 * area.w);

  return (
    <View style={styles.container}>
      <View style={styles.deviceFrame}>
        <View style={styles.plastic}>
          <View style={styles.hud}>
            <View style={styles.pill}>
              <Ionicons name="trending-up" size={15} color={Retro.ink} />
              <Text style={styles.pillText}>{state.score}</Text>
            </View>
            <View style={styles.pill}>
              {Array.from({ length: 3 }, (_, i) => (
                <Ionicons key={i} name={i < state.lives ? 'heart' : 'heart-outline'} size={14} color={Retro.ink} />
              ))}
            </View>
          </View>

          <View style={styles.table} onLayout={onLayout}>
        {/* Bumpers */}
        {state.bumpers.map((b, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={[
              styles.bumper,
              {
                left: px(b.x - b.r),
                top: py(b.y - b.r),
                width: px(b.r * 2),
                height: py(b.r * 2),
                borderRadius: px(b.r),
                backgroundColor: i % 2 === 0 ? Retro.ink : Retro.inkSoft,
              },
            ]}
          />
        ))}

        {/* Flippers */}
        <View pointerEvents="none" style={[styles.flipper, { left: px(LEFT_FLIPPER.x - FLIPPER_LEN / 2), top: py(LEFT_FLIPPER.y), width: px(FLIPPER_LEN), height: 10, backgroundColor: Retro.ink }]} />
        <View pointerEvents="none" style={[styles.flipper, { left: px(RIGHT_FLIPPER.x - FLIPPER_LEN / 2), top: py(RIGHT_FLIPPER.y), width: px(FLIPPER_LEN), height: 10, backgroundColor: Retro.ink }]} />

        {/* Ball */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: px(state.ball.x) - ballD / 2,
            top: py(state.ball.y) - ballD / 2,
            width: ballD,
            height: ballD,
            borderRadius: ballD / 2,
            backgroundColor: Retro.screen,
            borderWidth: 2,
            borderColor: Retro.ink,
          }}
        />

        {state.outcome === 'over' && (
          <View style={styles.overlay}>
            <View style={styles.resultCard}>
              <Ionicons name="game-controller" size={40} color={Colors.primary} />
              <Text style={styles.resultTitle}>Game Over</Text>
              <Text style={styles.resultSub}>{`${state.score} pts · ${state.hits} bumper hits`}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={restart} activeOpacity={0.85}>
                <Ionicons name="refresh" size={18} color={Retro.plastic} />
                <Text style={styles.primaryBtnText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.flipBtn}
          onPressIn={() => setFlip('left', true)}
          onPressOut={() => setFlip('left', false)}
          activeOpacity={0.85}
        >
          <Ionicons name="return-down-back" size={20} color={Retro.ink} />
          <Text style={styles.flipText}>Left</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onExit} style={styles.exitRow}>
          <Ionicons name="chevron-back" size={16} color={Retro.inkSoft} />
          <Text style={styles.exitText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.flipBtn}
          onPressIn={() => setFlip('right', true)}
          onPressOut={() => setFlip('right', false)}
          activeOpacity={0.85}
        >
          <Text style={styles.flipText}>Right</Text>
          <Ionicons name="return-down-forward" size={20} color={Retro.ink} />
        </TouchableOpacity>
      </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: Colors.background, justifyContent: 'center' },
  deviceFrame: { flex: 1, width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: Retro.frame, borderRadius: 40, padding: 8, borderWidth: 2, borderColor: Retro.frameDark },
  plastic: { flex: 1, backgroundColor: Retro.plastic, borderRadius: 32, padding: 12 },
  hud: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(47,44,28,0.12)', borderRadius: 12, paddingVertical: 7, paddingHorizontal: 14 },
  pillText: { color: Retro.ink, fontSize: 15, fontWeight: '800' },
  table: { flex: 1, backgroundColor: Retro.screen, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: Retro.screenEdge },
  bumper: { position: 'absolute' },
  flipper: { position: 'absolute', borderRadius: 5 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(47,44,28,0.55)' },
  resultCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, alignItems: 'center', width: 250 },
  resultTitle: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary, marginTop: 8 },
  resultSub: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Retro.ink, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20 },
  primaryBtnText: { color: Retro.plastic, fontSize: 15, fontWeight: '800' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 },
  flipBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Retro.plasticDark, borderWidth: 2, borderColor: Retro.ink, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18 },
  flipText: { color: Retro.ink, fontSize: 14, fontWeight: '800' },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  exitText: { color: Retro.inkSoft, fontSize: 13, fontWeight: '700' },
});
