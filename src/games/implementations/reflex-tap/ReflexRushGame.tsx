import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';

interface Target {
  id: number;
  xPercent: number; // 10% - 85%
  yPercent: number; // 10% - 85%
  type: 'green' | 'cyan' | 'star' | 'skull';
  expiresAt: number;
}

const TOTAL_RUSH_SECONDS = 30;

export const ReflexRushGame: React.FC<GameSessionProps> = ({
  onScoreUpdate,
  onGameOver,
  isMuted,
  isHapticsEnabled,
}) => {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [timeLeft, setTimeLeft] = useState(TOTAL_RUSH_SECONDS);
  const [targets, setTargets] = useState<Target[]>([]);
  const isGameOverRef = useRef(false);
  const targetIdCounter = useRef(0);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          isGameOverRef.current = true;
          handleEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleEnd = () => {
    setTargets([]);
    if (!isMuted) audioService.playSound('victory');
    onGameOver(score, { timeSeconds: TOTAL_RUSH_SECONDS });
  };

  // Target spawner and cleanup loop
  useEffect(() => {
    if (isGameOverRef.current) return;

    const spawner = setInterval(() => {
      const now = Date.now();

      setTargets((prev) => {
        // Remove expired targets
        const filtered = prev.filter((t) => t.expiresAt > now);

        // Keep 3 to 5 targets on screen
        if (filtered.length < 4) {
          const rand = Math.random();
          let type: Target['type'] = 'green';
          let lifetime = 1600;

          if (rand < 0.25) {
            type = 'skull'; // 25% hazard
            lifetime = 2000;
          } else if (rand < 0.55) {
            type = 'cyan';
            lifetime = 1300;
          } else if (rand < 0.7) {
            type = 'star';
            lifetime = 1100;
          }

          filtered.push({
            id: ++targetIdCounter.current,
            xPercent: 10 + Math.random() * 75,
            yPercent: 10 + Math.random() * 75,
            type,
            expiresAt: now + lifetime,
          });
        }
        return filtered;
      });
    }, 400);

    return () => clearInterval(spawner);
  }, []);

  const handleTargetTap = (target: Target) => {
    if (isGameOverRef.current) return;

    // Remove tapped target
    setTargets((prev) => prev.filter((t) => t.id !== target.id));

    if (target.type === 'skull') {
      // Danger decoy tapped
      setCombo(1);
      const penalizedScore = Math.max(0, score - 20);
      setScore(penalizedScore);
      onScoreUpdate(penalizedScore);

      if (!isMuted) audioService.playSound('error');
      if (isHapticsEnabled) hapticsService.heavyImpact();
    } else {
      // Valid target tapped
      let basePoints = 10;
      if (target.type === 'cyan') basePoints = 20;
      if (target.type === 'star') basePoints = 35;

      const gained = basePoints * combo;
      const newScore = score + gained;
      const nextCombo = Math.min(5, combo + 1);

      setScore(newScore);
      setCombo(nextCombo);
      onScoreUpdate(newScore);

      if (!isMuted) audioService.playSound(combo > 2 ? 'combo' : 'pop');
      if (isHapticsEnabled) hapticsService.lightImpact();
    }
  };

  return (
    <View style={styles.container}>
      {/* Top HUD */}
      <View style={styles.hudRow}>
        <View style={styles.hudBox}>
          <Text style={styles.hudLabel}>SCORE</Text>
          <Text style={styles.hudValue}>{score}</Text>
        </View>

        {combo > 1 && (
          <View style={styles.comboBadge}>
            <Text style={styles.comboText}>{combo}x MULTIPLIER</Text>
          </View>
        )}

        <View style={styles.hudBox}>
          <Text style={styles.hudLabel}>RUSH TIME</Text>
          <Text style={[styles.hudValue, timeLeft <= 5 && styles.urgentText]}>
            {timeLeft}s
          </Text>
        </View>
      </View>

      {/* Target Arena */}
      <View style={styles.arena}>
        {targets.map((t) => {
          let bg = Colors.accent;
          let label = '⚡';
          let size = 64;

          if (t.type === 'cyan') {
            bg = Colors.primary;
            label = '◆';
            size = 58;
          } else if (t.type === 'star') {
            bg = Colors.accentGold;
            label = '★';
            size = 52;
          } else if (t.type === 'skull') {
            bg = Colors.accentCoral;
            label = '☠';
            size = 60;
          }

          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.targetBubble,
                {
                  left: `${t.xPercent}%`,
                  top: `${t.yPercent}%`,
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
