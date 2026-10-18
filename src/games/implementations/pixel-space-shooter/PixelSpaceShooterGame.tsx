import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Retro } from '../shared/gameTheme';
import {
  ALIEN_COLS,
  ALIEN_ROWS,
  COLS,
  PLAYER_ROW,
  ROWS,
  ShooterState,
  createShooter,
  fire,
  movePlayer,
  step,
} from './shooterLogic';
import { usePausedRef } from '../shared/usePausedRef';

const TICK_MS = 110;

export const PixelSpaceShooterGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, onExit, isMuted, isHapticsEnabled, isPaused }) => {
  const [area, setArea] = useState({ w: 320, h: 460 });
  const [state, setState] = useState<ShooterState>(createShooter);
  const autoFire = useRef(false);
  const finishedRef = useRef(false);
  const pausedRef = usePausedRef(isPaused);

  useEffect(() => {
    onScoreUpdate(state.score);
  }, [state, onScoreUpdate]);

  useEffect(() => {
    if (state.outcome === 'over' && !finishedRef.current) {
      finishedRef.current = true;
      if (!isMuted) audioService.playSound('game_over');
      if (isHapticsEnabled) hapticsService.error();
      onGameOver(state.score, { wave: state.wave });
    }
  }, [state, onGameOver, isMuted, isHapticsEnabled]);

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setState((s) => {
        let next = step(s);
        if (autoFire.current) next = fire(next);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  }, []);

  const steer = useCallback(
    (dir: number) => {
      setState((s) => movePlayer(s, dir));
      if (isHapticsEnabled) hapticsService.selection();
    },
    [isHapticsEnabled]
  );

  const tapFire = useCallback(() => {
    setState((s) => fire(s));
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted]);

  const cell = Math.max(10, Math.floor(Math.min(area.w / COLS, area.h / ROWS)));
  const boardW = cell * COLS;
  const boardH = cell * ROWS;
  const ox = (area.w - boardW) / 2;
  const oy = (area.h - boardH) / 2;

  const bullets = [
    ...state.playerBullets.map((b, i) => ({ ...b, kind: 'p' as const, key: `p${i}` })),
    ...state.enemyBullets.map((b, i) => ({ ...b, kind: 'e' as const, key: `e${i}` })),
  ];

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
              <Ionicons name="layers" size={14} color={Retro.ink} />
              <Text style={styles.pillText}>Wave {state.wave}</Text>
            </View>
            <View style={styles.pill}>
              {Array.from({ length: 3 }, (_, i) => (
                <Ionicons key={i} name={i < state.lives ? 'heart' : 'heart-outline'} size={14} color={Retro.ink} />
              ))}
            </View>
          </View>

          <View style={styles.boardWrap} onLayout={onLayout}>
        <View style={{ width: boardW, height: boardH, marginLeft: ox, marginTop: oy }}>
          {state.aliens.map((row, ar) =>
            row.map((alive, ac) => {
              if (!alive) return null;
              const r = state.fRow + ar;
              const c = state.fCol + ac;
              return (
                <View
                  key={`a${ar}-${ac}`}
                  style={[
                    styles.alien,
                    { left: c * cell + 1, top: r * cell + 1, width: cell - 2, height: cell - 2, backgroundColor: ar % 2 === 0 ? Retro.ink : Retro.inkSoft },
                  ]}
                >
                  <View style={styles.alienEye} />
                  <View style={styles.alienEye} />
                </View>
              );
            })
          )}

          {bullets.map((b) => (
            <View
              key={b.key}
              style={[
                styles.bullet,
                {
                  left: b.col * cell + cell / 2 - 2,
                  top: b.row * cell + cell / 2 - 3,
                  backgroundColor: b.kind === 'p' ? Retro.ink : Retro.plasticDark,
                },
              ]}
            />
          ))}

          <View
            style={[
              styles.ship,
              { left: state.player * cell + 1, top: PLAYER_ROW * cell + 2, width: cell - 2, height: cell - 6, backgroundColor: Retro.ink },
            ]}
          />
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.moveRow}>
          <TouchableOpacity style={styles.ctlBtn} onPress={() => steer(-1)} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color={Retro.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctlBtn, styles.fireBtn]}
            onPress={tapFire}
            onLongPress={() => (autoFire.current = true)}
            onPressOut={() => (autoFire.current = false)}
            activeOpacity={0.85}
          >
            <Ionicons name="rocket" size={22} color={Retro.plastic} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctlBtn} onPress={() => steer(1)} activeOpacity={0.8}>
            <Ionicons name="chevron-forward" size={24} color={Retro.ink} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onExit} style={styles.exitRow}>
          <Ionicons name="chevron-back" size={16} color={Retro.inkSoft} />
          <Text style={styles.exitText}>Back</Text>
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
  boardWrap: { flex: 1, overflow: 'hidden', backgroundColor: Retro.screen, borderRadius: 14, borderWidth: 2, borderColor: Retro.screenEdge },
  alien: { position: 'absolute', borderRadius: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  alienEye: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Retro.screen },
  bullet: { position: 'absolute', width: 4, height: 10, borderRadius: 2 },
  ship: { position: 'absolute', borderRadius: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 10 },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ctlBtn: { width: 56, height: 56, borderRadius: 16, backgroundColor: Retro.plasticDark, borderWidth: 2, borderColor: Retro.ink, alignItems: 'center', justifyContent: 'center' },
  fireBtn: { backgroundColor: Retro.ink },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  exitText: { color: Retro.inkSoft, fontSize: 13, fontWeight: '700' },
});
