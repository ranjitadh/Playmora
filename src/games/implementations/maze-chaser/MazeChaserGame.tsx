import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Retro } from '../shared/gameTheme';
import { COLS, Dir, MazeState, ROWS, createMaze, isWall, setDirection, tick } from './mazeLogic';

const TICK_MS = 175;

export const MazeChaserGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, onExit, isMuted, isHapticsEnabled }) => {
  const [area, setArea] = useState({ w: 320, h: 420 });
  const [state, setState] = useState<MazeState>(createMaze);
  const finishedRef = useRef(false);

  useEffect(() => {
    onScoreUpdate(state.score);
  }, [state, onScoreUpdate]);

  useEffect(() => {
    const id = setInterval(() => setState((s) => tick(s)), TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if ((state.outcome === 'won' || state.outcome === 'over') && !finishedRef.current) {
      finishedRef.current = true;
      const won = state.outcome === 'won';
      if (!isMuted) audioService.playSound(won ? 'victory' : 'game_over');
      if (isHapticsEnabled) (won ? hapticsService.success : hapticsService.error)();
      onGameOver(state.score, { outcome: state.outcome });
    }
  }, [state, onGameOver, isMuted, isHapticsEnabled]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  }, []);

  const steer = useCallback(
    (dir: Dir) => {
      setState((s) => (s.outcome === 'in_progress' ? setDirection(s, dir) : s));
      if (isHapticsEnabled) hapticsService.selection();
    },
    [isHapticsEnabled]
  );

  const restart = useCallback(() => {
    finishedRef.current = false;
    setState(createMaze());
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted]);

  const cell = Math.max(12, Math.floor(Math.min(area.w / COLS, area.h / ROWS)));
  const boardW = cell * COLS;
  const boardH = cell * ROWS;
  const offsetX = (area.w - boardW) / 2;
  const offsetY = (area.h - boardH) / 2;
  const dotsLeft = state.total - state.eaten;

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
              <Ionicons name="ellipse" size={13} color={Retro.ink} />
              <Text style={styles.pillText}>{dotsLeft}</Text>
            </View>
            <View style={styles.pill}>
              {Array.from({ length: 3 }, (_, i) => (
                <Ionicons key={i} name={i < state.lives ? 'heart' : 'heart-outline'} size={14} color={Retro.ink} />
              ))}
            </View>
          </View>

          <View style={styles.boardWrap} onLayout={onLayout}>
        <View style={{ width: boardW, height: boardH, marginLeft: offsetX, marginTop: offsetY }}>
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) =>
              isWall(r, c) ? (
                <View
                  key={`w${r}-${c}`}
                  style={[styles.wall, { left: c * cell, top: r * cell, width: cell, height: cell, borderRadius: Math.max(2, cell * 0.18) }]}
                />
              ) : null
            )
          )}
          {state.dots.map((row, r) =>
            row.map((present, c) => {
              if (!present) return null;
              return (
                <View
                  key={`d${r}-${c}`}
                  style={[styles.dot, { left: c * cell + cell / 2 - 2, top: r * cell + cell / 2 - 2 }]}
                />
              );
            })
          )}
          {state.pellets.map((row, r) =>
            row.map((present, c) => {
              if (!present) return null;
              return (
                <View
                  key={`p${r}-${c}`}
                  style={[
                    styles.pellet,
                    { left: c * cell + cell / 2 - cell * 0.22, top: r * cell + cell / 2 - cell * 0.22, width: cell * 0.44, height: cell * 0.44, borderRadius: cell * 0.22 },
                  ]}
                />
              );
            })
          )}
          {state.ghosts.map((g) => (
            <View
              key={`g${g.r}-${g.c}`}
              style={[
                styles.ghost,
                {
                  left: g.c * cell + 2,
                  top: g.r * cell + 2,
                  width: cell - 4,
                  height: cell - 4,
                  borderRadius: (cell - 4) / 2,
                  backgroundColor: state.frightened > 0 ? Retro.screenEdge : Retro.inkSoft,
                },
              ]}
            />
          ))}
          <View
            style={[
              styles.player,
              { left: state.player.c * cell + 1, top: state.player.r * cell + 1, width: cell - 2, height: cell - 2, borderRadius: (cell - 2) / 2 },
            ]}
          />
        </View>

        {(state.outcome === 'won' || state.outcome === 'over') && (
          <View style={styles.overlay}>
            <View style={styles.resultCard}>
              <Ionicons name={state.outcome === 'won' ? 'trophy' : 'skull'} size={40} color={state.outcome === 'won' ? Colors.accentGold : Colors.accentCoral} />
              <Text style={styles.resultTitle}>{state.outcome === 'won' ? 'Maze Cleared!' : 'Game Over'}</Text>
              <Text style={styles.resultSub}>{`${state.score} pts · ${dotsLeft} dots left`}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={restart} activeOpacity={0.85}>
                <Ionicons name="refresh" size={18} color={Colors.textInverse} />
                <Text style={styles.primaryBtnText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <View style={styles.dpad}>
          <TouchableOpacity style={[styles.dBtn, styles.dUp]} onPress={() => steer('up')} activeOpacity={0.8}>
            <Ionicons name="chevron-up" size={22} color={Retro.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dBtn, styles.dLeft]} onPress={() => steer('left')} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color={Retro.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dBtn, styles.dRight]} onPress={() => steer('right')} activeOpacity={0.8}>
            <Ionicons name="chevron-forward" size={22} color={Retro.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dBtn, styles.dDown]} onPress={() => steer('down')} activeOpacity={0.8}>
            <Ionicons name="chevron-down" size={22} color={Retro.ink} />
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
  wall: { position: 'absolute', backgroundColor: Retro.ink },
  dot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: Retro.ink },
  pellet: { position: 'absolute', backgroundColor: Retro.ink },
  ghost: { position: 'absolute' },
  player: { position: 'absolute', backgroundColor: Retro.ink, borderWidth: 2, borderColor: Retro.screen },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(47,44,28,0.55)' },
  resultCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, alignItems: 'center', width: 250 },
  resultTitle: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary, marginTop: 8 },
  resultSub: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Retro.ink, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20 },
  primaryBtnText: { color: Retro.plastic, fontSize: 15, fontWeight: '800' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 10 },
  dpad: { width: 132, height: 132 },
  dBtn: { position: 'absolute', width: 44, height: 44, borderRadius: 12, backgroundColor: Retro.plasticDark, borderWidth: 2, borderColor: Retro.ink, alignItems: 'center', justifyContent: 'center' },
  dUp: { left: 44, top: 0 },
  dDown: { left: 44, top: 88 },
  dLeft: { left: 0, top: 44 },
  dRight: { left: 88, top: 44 },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  exitText: { color: Retro.inkSoft, fontSize: 13, fontWeight: '700' },
});
