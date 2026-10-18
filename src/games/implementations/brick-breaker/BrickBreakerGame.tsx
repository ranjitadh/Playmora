import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  BALL_R,
  BRICK_H,
  BRICK_W,
  PADDLE_H,
  PADDLE_W,
  PADDLE_Y,
  BrickState,
  brickLeft,
  brickTop,
  createBrickState,
  launch,
  movePaddle,
  step,
} from './brickBreakerLogic';
import { usePausedRef } from '../shared/usePausedRef';

const ROW_COLORS = ['#F43F5E', '#F59E0B', '#10B981', '#38BDF8', '#7557E8'];

export const BrickBreakerGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled, isPaused }) => {
  const [area, setArea] = useState({ w: 340, h: 480 });
  const [state, setState] = useState<BrickState>(createBrickState);
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
    if ((state.status === 'won' || state.status === 'lost') && !finishedRef.current) {
      finishedRef.current = true;
      if (!isMuted) audioService.playSound(state.status === 'won' ? 'victory' : 'game_over');
      if (isHapticsEnabled) (state.status === 'won' ? hapticsService.success : hapticsService.error)();
      onGameOver(state.score, { won: state.status === 'won' });
    }
  }, [state.status, state.score, onGameOver, isMuted, isHapticsEnabled]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  };

  const handlePointer = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX / area.w;
    setState((prev) => movePaddle(prev, x));
  };

  const startGame = () => {
    if (state.status === 'ready') {
      if (!isMuted) audioService.playSound('tap');
      setState((prev) => launch(prev));
    }
  };

  const ballSize = BALL_R * 2 * area.w;

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.pill}>
          <Ionicons name="heart" size={15} color={Colors.accentCoral} />
          <Text style={styles.pillText}>{state.lives}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="star" size={15} color={Colors.accentGold} />
          <Text style={styles.pillText}>{state.score}</Text>
        </View>
      </View>

      <View
        style={styles.area}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          handlePointer(e);
          startGame();
        }}
        onResponderMove={handlePointer}
      >
        {state.bricks.map((brick) =>
          brick.alive ? (
            <View
              key={`${brick.row}-${brick.col}`}
              style={[
                styles.brick,
                {
                  left: brickLeft(brick.col) * area.w,
                  top: brickTop(brick.row) * area.h,
                  width: BRICK_W * area.w - 3,
                  height: BRICK_H * area.h,
                  backgroundColor: ROW_COLORS[brick.row % ROW_COLORS.length],
                },
              ]}
            />
          ) : null
        )}

        <View
          style={[styles.ball, { width: ballSize, height: ballSize, borderRadius: ballSize / 2, left: state.ballX * area.w - ballSize / 2, top: state.ballY * area.h - ballSize / 2 }]}
        />
        <View
          style={[styles.paddle, { width: PADDLE_W * area.w, height: PADDLE_H * area.h, left: state.paddleX * area.w - (PADDLE_W * area.w) / 2, top: PADDLE_Y * area.h }]}
        />

        {state.status === 'ready' && (
          <View style={styles.readyOverlay} pointerEvents="none">
            <Text style={styles.readyText}>TAP TO LAUNCH</Text>
          </View>
        )}
      </View>

      <Text style={styles.hint}>Drag to slide the paddle · tap to launch</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  hud: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  pillText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  area: { flex: 1, backgroundColor: Colors.surface, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  brick: { position: 'absolute', borderRadius: 4 },
  ball: { position: 'absolute', backgroundColor: Colors.textPrimary },
  paddle: { position: 'absolute', backgroundColor: Colors.primary, borderRadius: 6 },
  readyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  readyText: { color: Colors.primary, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 10 },
});
