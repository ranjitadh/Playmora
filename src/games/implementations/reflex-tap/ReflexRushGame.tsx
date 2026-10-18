import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { usePausedRef } from '../shared/usePausedRef';
import {
  ReflexState,
  Target,
  TOTAL_RUSH_SECONDS,
  createReflexState,
  safeOffset,
  stepReflex,
  tapTarget,
  targetSize,
} from './reflexLogic';

const MAX_STEP_SECONDS = 0.1;

export const ReflexRushGame: React.FC<GameSessionProps> = ({
  onScoreUpdate,
  onGameOver,
  isMuted,
  isHapticsEnabled,
  isPaused,
}) => {
  const [state, setState] = useState<ReflexState>(createReflexState);
  const [arena, setArena] = useState({ w: 0, h: 0 });
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
      const dt = Math.min(MAX_STEP_SECONDS, (t - lastRef.current) / 1000);
      lastRef.current = t;
      if (!pausedRef.current) setState((prev) => stepReflex(prev, dt));
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
      if (!isMuted) audioService.playSound('victory');
      onGameOver(state.score, { timeSeconds: TOTAL_RUSH_SECONDS });
    }
  }, [state.status, state.score, onGameOver, isMuted]);

  const handleTargetTap = (target: Target) => {
    const { event } = tapTarget(state, target.id);
    setState((prev) => tapTarget(prev, target.id).state);
    if (!event) return;

    if (event.kind === 'penalty') {
      if (!isMuted) audioService.playSound('error');
      if (isHapticsEnabled) hapticsService.heavyImpact();
    } else {
      if (!isMuted) audioService.playSound(event.sound);
      if (isHapticsEnabled) hapticsService.lightImpact();
    }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArena({ w: width, h: height });
  };

  const seconds = Math.ceil(state.timeLeft);

  return (
    <View style={styles.container}>
      {/* Top HUD */}
      <View style={styles.hudRow}>
        <View style={styles.hudBox}>
          <Text style={styles.hudLabel}>SCORE</Text>
          <Text style={styles.hudValue}>{state.score}</Text>
        </View>

        {state.combo > 1 && (
          <View style={styles.comboBadge}>
            <Text style={styles.comboText}>{state.combo}x MULTIPLIER</Text>
          </View>
        )}

        <View style={styles.hudBox}>
          <Text style={styles.hudLabel}>RUSH TIME</Text>
          <Text style={[styles.hudValue, seconds <= 5 && styles.urgentText]}>
            {seconds}s
          </Text>
        </View>
      </View>

      {/* Target Arena */}
      <View style={styles.arena} onLayout={onLayout}>
        {state.targets.map((t) => {
          let bg = Colors.accent;
          let label = '⚡';

          if (t.type === 'cyan') {
            bg = Colors.primary;
            label = '◆';
          } else if (t.type === 'star') {
            bg = Colors.accentGold;
            label = '★';
          } else if (t.type === 'skull') {
            bg = Colors.accentCoral;
            label = '☠';
          }

          const size = targetSize(t.type);

          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.targetBubble,
                {
                  left: safeOffset(t.x, size, arena.w),
                  top: safeOffset(t.y, size, arena.h),
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: bg,
                },
              ]}
              activeOpacity={0.6}
              onPress={() => handleTargetTap(t)}
            >
              <Text style={styles.targetLabel}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer warning */}
      <View style={styles.footer}>
        <Text style={styles.warningText}>
          TAP NEON TARGETS! AVOID RED SKULLS ☠
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hudBox: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hudLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hudValue: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  urgentText: {
    color: Colors.accentCoral,
  },
  comboBadge: {
    backgroundColor: Colors.secondaryDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  comboText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  arena: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
    overflow: 'hidden',
    marginVertical: 12,
  },
  targetBubble: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  targetLabel: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  warningText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
