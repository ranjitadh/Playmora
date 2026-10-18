import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  AI_PADDLE_X,
  BALL_RADIUS,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  PLAYER_PADDLE_X,
  createState,
  movePlayer,
  step,
} from './pongLogic';
import { usePausedRef } from '../shared/usePausedRef';

export const PongGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, isMuted, isHapticsEnabled, isPaused }) => {
  const [court, setCourt] = useState({ w: 340, h: 480 });
  const [state, setState] = useState(createState);
  const stateRef = useRef(state);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const pausedRef = usePausedRef(isPaused);
  const finishedRef = useRef(false);

  stateRef.current = state;

  useEffect(() => {
    onScoreUpdate(state.playerScore);
  }, [state.playerScore, onScoreUpdate]);

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
    if (state.winner && !finishedRef.current) {
      finishedRef.current = true;
      if (!isMuted) audioService.playSound(state.winner === 'player' ? 'victory' : 'game_over');
      if (isHapticsEnabled) (state.winner === 'player' ? hapticsService.success : hapticsService.error)();
      onGameOver(state.playerScore, { winner: state.winner });
    }
  }, [state.winner, state.playerScore, onGameOver, isMuted, isHapticsEnabled]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCourt({ w: width, h: height });
  };

  const handleMove = (e: GestureResponderEvent) => {
    const y = e.nativeEvent.locationY / court.h;
    setState((prev) => movePlayer(prev, y));
  };

  const restart = useCallback(() => {
    finishedRef.current = false;
    lastRef.current = 0;
    setState(createState());
  }, []);

  const ballSize = BALL_RADIUS * 2 * court.w;
  const paddleH = PADDLE_HEIGHT * court.h;

  return (
    <View style={styles.container}>
      <View style={styles.scoreRow}>
        <Text style={[styles.score, styles.playerScore]}>{state.playerScore}</Text>
        <Text style={styles.to}>FIRST TO 7</Text>
        <Text style={[styles.score, styles.aiScore]}>{state.aiScore}</Text>
      </View>

      <View
        style={styles.court}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleMove}
        onResponderMove={handleMove}
      >
        <View style={styles.centerLine} />
        <View
          style={[styles.ball, { width: ballSize, height: ballSize, borderRadius: ballSize / 2, left: state.ballX * court.w - ballSize / 2, top: state.ballY * court.h - ballSize / 2 }]}
        />
        <View
          style={[styles.paddle, styles.playerPaddle, { height: paddleH, top: state.playerY * court.h - paddleH / 2, left: PLAYER_PADDLE_X * court.w }]}
        />
        <View
          style={[styles.paddle, styles.aiPaddle, { height: paddleH, top: state.aiY * court.h - paddleH / 2, left: AI_PADDLE_X * court.w }]}
        />
      </View>

      <Text style={styles.hint}>Drag to move your paddle</Text>

      {state.winner && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Ionicons
              name={state.winner === 'player' ? 'trophy' : 'sad-outline'}
              size={40}
              color={state.winner === 'player' ? Colors.accentGold : Colors.accentCoral}
            />
            <Text style={styles.resultTitle}>
              {state.winner === 'player' ? 'You win!' : 'AI wins!'}
            </Text>
            <Text style={styles.resultSub}>{`${state.playerScore} — ${state.aiScore}`}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={restart} activeOpacity={0.85}>
              <Ionicons name="refresh" size={18} color={Colors.textInverse} />
              <Text style={styles.primaryBtnText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  score: { fontSize: 34, fontWeight: '900' },
  playerScore: { color: Colors.primary },
  aiScore: { color: Colors.accentCoral },
  to: { color: Colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  court: {
    flex: 1,
    backgroundColor: '#1E2233',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  ball: { position: 'absolute', backgroundColor: '#FFFFFF' },
  paddle: { position: 'absolute', width: PADDLE_WIDTH * 1, borderRadius: 6 },
  playerPaddle: { backgroundColor: Colors.primary, width: 12 },
  aiPaddle: { backgroundColor: Colors.accentCoral, width: 12 },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 10 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(32,33,36,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    width: '100%', maxWidth: 300, backgroundColor: Colors.surface, borderRadius: 22,
    padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  resultTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 10 },
  resultSub: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700', marginTop: 4, marginBottom: 18 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary,
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 26,
  },
  primaryBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
});
