import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Modern } from '../shared/gameTheme';
import {
  BubbleState,
  COLS,
  MISS_LIMIT,
  ROWS,
  createBubbles,
  fire,
  isSignificantAim,
  offsetOf,
  simulatePath,
} from './bubbleLogic';

const BUBBLE_COLORS = ['#F59E0B', '#F43F5E', '#10B981', '#7557E8', '#38BDF8'];
const MAX_ANGLE = (78 * Math.PI) / 180;

type Aim = { x: number; y: number };

export const BubbleShooterGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, onExit, isMuted, isHapticsEnabled }) => {
  const [area, setArea] = useState({ w: 340, h: 480 });
  const [state, setState] = useState<BubbleState>(createBubbles);
  const [aim, setAim] = useState<Aim>({ x: 0, y: -1 });
  const finishedRef = useRef(false);

  const cellW = area.w / COLS;
  const bubbleD = cellW - 4;
  const cellH = bubbleD * 0.9;
  const shooterX = area.w / 2;
  const shooterY = area.h - 44;

  const originX = (shooterX - 2 - bubbleD / 2) / cellW;
  const originY = (shooterY - 2 - bubbleD / 2) / cellH;
  const gridToX = useCallback((gx: number) => gx * cellW + 2 + bubbleD / 2, [cellW, bubbleD]);
  const gridToY = useCallback((gy: number) => gy * cellH + 2 + bubbleD / 2, [cellH, bubbleD]);

  useEffect(() => {
    onScoreUpdate(state.score);
  }, [state, onScoreUpdate]);

  useEffect(() => {
    if (state.outcome === 'over' && !finishedRef.current) {
      finishedRef.current = true;
      if (!isMuted) audioService.playSound(state.score > 400 ? 'victory' : 'game_over');
      if (isHapticsEnabled) (state.score > 400 ? hapticsService.success : hapticsService.error)();
      onGameOver(state.score, { score: state.score, shots: state.shots });
    }
  }, [state, onGameOver, isMuted, isHapticsEnabled]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  }, []);

  const updateAim = useCallback(
    (px: number, py: number) => {
      const rawX = px - shooterX;
      const rawY = py - shooterY;
      const ang = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, Math.atan2(rawX, -rawY)));
      setAim({ x: Math.sin(ang), y: -Math.cos(ang) });
    },
    [shooterX, shooterY]
  );

  const dragRef = useRef({ moved: false, startX: 0, startY: 0 });

  const onGrant = useCallback(
    (e: GestureResponderEvent) => {
      const { locationX, locationY } = e.nativeEvent;
      dragRef.current = { moved: false, startX: locationX, startY: locationY };
      updateAim(locationX, locationY);
    },
    [updateAim]
  );

  const onMove = useCallback(
    (e: GestureResponderEvent) => {
      const { locationX, locationY } = e.nativeEvent;
      const drag = dragRef.current;
      if (!drag.moved && !isSignificantAim(locationX - drag.startX, locationY - drag.startY)) return;
      drag.moved = true;
      updateAim(locationX, locationY);
    },
    [updateAim]
  );

  const shootNow = useCallback(() => {
    if (state.outcome !== 'in_progress') return;
    setState((s) => fire(s, aim.x / cellW, aim.y / cellH, originX, originY));
    if (!isMuted) audioService.playSound('pop');
    if (isHapticsEnabled) hapticsService.lightImpact();
  }, [state.outcome, aim, cellW, cellH, originX, originY, isMuted, isHapticsEnabled]);

  const onRelease = useCallback(() => {
    if (!dragRef.current.moved) return;
    dragRef.current.moved = false;
    shootNow();
  }, [shootNow]);

  const preview = useMemo(() => {
    const points: { x: number; y: number }[] = [{ x: shooterX, y: shooterY }];
    const cells = simulatePath(state.grid, originX, originY, aim.x / cellW, aim.y / cellH);
    for (const [r, c] of cells) {
      points.push({ x: gridToX(c + offsetOf(r)), y: gridToY(r) });
    }
    return points;
  }, [state.grid, originX, originY, aim, cellW, cellH, shooterX, shooterY, gridToX, gridToY]);

  const dropsLeft = Math.max(0, MISS_LIMIT - state.misses);

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={[styles.pill, styles.pillAccent]}>
          <Ionicons name="trending-up" size={15} color={Modern.accent} />
          <Text style={styles.pillText}>{state.score}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="arrow-down-circle-outline" size={15} color={Modern.pink} />
          <Text style={styles.pillText}>Row in {dropsLeft}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="ellipse" size={15} color={BUBBLE_COLORS[state.next]} />
          <View style={styles.nextDot} />
        </View>
      </View>

      <View style={styles.area} onLayout={onLayout}>
        {/* Bubbles */}
        {state.grid.map((row, r) =>
          row.map((cell, c) =>
            cell === null ? null : (
              <View
                key={`${r}-${c}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: (c + offsetOf(r)) * cellW + 2,
                  top: r * cellH + 2,
                  width: bubbleD,
                  height: bubbleD,
                  borderRadius: bubbleD / 2,
                  backgroundColor: BUBBLE_COLORS[cell],
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.5)',
                }}
              />
            )
          )
        )}

        {/* Aim line */}
        {state.outcome === 'in_progress' &&
          preview.slice(1).map((p, i) => (
            <View
              key={`p-${i}`}
              pointerEvents="none"
              style={[styles.previewDot, { left: p.x - 3, top: p.y - 3, opacity: Math.max(0.15, 1 - i * 0.1) }]}
            />
          ))}

        {/* Shooter */}
        <View pointerEvents="none" style={[styles.shooter, { left: shooterX - 20, top: shooterY - 6 }]}>
          <View style={[styles.shooterBody, { backgroundColor: BUBBLE_COLORS[state.current], width: 40, height: 40, borderRadius: 20 }]} />
        </View>
        <View pointerEvents="none" style={[styles.nextBubble, { left: shooterX + 34, top: shooterY + 6 }]}>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: BUBBLE_COLORS[state.next] }} />
        </View>

        {/* Aim surface */}
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={onGrant}
          onResponderMove={onMove}
          onResponderRelease={onRelease}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={shootNow} activeOpacity={0.85} disabled={state.outcome === 'over'}>
          <Ionicons name="radio-button-off" size={18} color={Colors.textInverse} />
          <Text style={styles.primaryBtnText}>Shoot</Text>
        </TouchableOpacity>
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
  nextDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'transparent' },
  area: { flex: 1, backgroundColor: '#0F172A', borderRadius: Modern.radius, overflow: 'hidden', borderWidth: 2, borderColor: Modern.sky },
  previewDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(226,232,240,0.7)' },
  shooter: { position: 'absolute', width: 40, height: 40 },
  shooterBody: { borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  nextBubble: { position: 'absolute' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Modern.accent, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 20 },
  primaryBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14 },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  exitText: { color: Modern.inkMuted, fontSize: 13, fontWeight: '700' },
});
