import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  FINISH,
  LPlayer,
  LudoState,
  MAIN,
  TOKENS,
  absoluteSquare,
  applyMove,
  createLudo,
  legalMoves,
  noMoves,
  passTurn,
  roll,
} from './ludoLogic';
import { BoardResultOverlay, TwoPlayerBar, boardStyles } from '../shared/boardUi';

const TOKEN_COLORS: [string, string] = ['#EF4444', '#3B82F6'];
const NAME: [string, string] = ['Red', 'Blue'];
const START_OFFSET: [number, number] = [0, 26];

interface XY {
  x: number;
  y: number;
}

function ringPoint(size: number, square: number): XY {
  const c = size / 2;
  const r = size * 0.4;
  const angle = (-90 + (square * 360) / MAIN) * (Math.PI / 180);
  return { x: c + r * Math.cos(angle), y: c + r * Math.sin(angle) };
}

function homePoint(size: number, player: LPlayer, index: number): XY {
  const c = size / 2;
  const lastMain = (START_OFFSET[player] + MAIN - 1) % MAIN;
  const angle = (-90 + (lastMain * 360) / MAIN) * (Math.PI / 180);
  const r = size * (0.33 - index * 0.055);
  return { x: c + r * Math.cos(angle), y: c + r * Math.sin(angle) };
}

export const LudoGame: React.FC<GameSessionProps> = ({ onExit, isMuted, isHapticsEnabled }) => {
  const [game, setGame] = useState<LudoState>(() => createLudo());
  const [wins, setWins] = useState<[number, number]>([0, 0]);
  const [size, setSize] = useState(0);

  const isOver = game.outcome !== 'in_progress';
  const moves = useMemo(() => legalMoves(game), [game]);
  const movable = useMemo(() => new Set(moves.map((m) => m.token)), [moves]);

  const doRoll = useCallback(() => {
    if (isOver || game.die !== null) return;
    setGame(roll(game));
    if (!isMuted) audioService.playSound('tap');
    if (isHapticsEnabled) hapticsService.lightImpact();
  }, [game, isOver, isMuted, isHapticsEnabled]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setSize(e.nativeEvent.layout.width);
  }, []);

  const commit = useCallback(
    (token: number) => {
      if (!movable.has(token)) return;
      const next = applyMove(game, token);
      setGame(next);
      if (next.outcome === 'win') {
        setWins((w) => (next.winner === 0 ? [w[0] + 1, w[1]] : [w[0], w[1] + 1]));
        if (!isMuted) audioService.playSound('victory');
        if (isHapticsEnabled) hapticsService.success();
      } else if (isHapticsEnabled) {
        hapticsService.lightImpact();
      }
    },
    [game, movable, isMuted, isHapticsEnabled]
  );

  useEffect(() => {
    if (isOver || game.die === null) return;
    if (noMoves(game)) {
      const t = setTimeout(() => setGame(passTurn(game)), 700);
      return () => clearTimeout(t);
    }
  }, [game, isOver]);

  const playAgain = useCallback(() => {
    setGame(createLudo());
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted]);

  const tokenPos = useCallback(
    (player: LPlayer, slot: number, progress: number): XY => {
      if (progress < 0) {
        const col = player === 0 ? 0.12 : 0.78;
        const row = player === 0 ? 0.12 : 0.78;
        const dx = (slot % 2) * size * 0.1;
        const dy = Math.floor(slot / 2) * size * 0.1;
        return { x: size * col + dx, y: size * row + dy };
      }
      if (progress >= FINISH) {
        const p = homePoint(size, player, 5);
        return { x: p.x - size * 0.02 * slot, y: p.y };
      }
      if (progress >= MAIN) return homePoint(size, player, progress - MAIN);
      const abs = absoluteSquare(player, progress) as number;
      const p = ringPoint(size, abs);
      const shift = slot * size * 0.018;
      return { x: p.x + shift, y: p.y + shift };
    },
    [size]
  );

  const t = size * 0.05;
  const dot = size * 0.03;

  const renderTokens = (player: LPlayer) =>
    game.tokens[player].map((progress, slot) => {
      const pos = tokenPos(player, slot, progress);
      const canMove = !isOver && game.current === player && movable.has(slot);
      return (
        <TouchableOpacity
          key={`${player}-${slot}`}
          activeOpacity={0.8}
          onPress={() => commit(slot)}
          disabled={!canMove}
          style={[
            styles.token,
            {
              left: pos.x - t / 2,
              top: pos.y - t / 2,
              width: t,
              height: t,
              borderRadius: t / 2,
              backgroundColor: TOKEN_COLORS[player],
            },
            canMove && styles.tokenActive,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${NAME[player]} token ${slot + 1}`}
        />
      );
    });

  const currentName = NAME[game.current];

  return (
    <View style={boardStyles.container}>
      <TwoPlayerBar
        players={[{ label: 'RED', color: TOKEN_COLORS[0] }, { label: 'BLUE', color: TOKEN_COLORS[1] }]}
        activeIndex={game.current}
        wins={wins}
        over={isOver}
      />

      <View style={boardStyles.turnRow}>
        <Text style={[boardStyles.turnText, boardStyles.turnStrong]}>
          {isOver
            ? `${NAME[game.winner as LPlayer]} wins!`
            : game.die === null
            ? `${currentName} — roll the dice`
            : noMoves(game)
            ? `${currentName} cannot move`
            : `${currentName} — move a token`}
        </Text>
      </View>

      <View style={styles.hud}>
        <View style={[styles.die, game.die === 6 && styles.dieSix]}>
          <Text style={styles.dieText}>{game.die ?? '–'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.rollBtn, (isOver || game.die !== null) && styles.disabled]}
          onPress={doRoll}
          disabled={isOver || game.die !== null}
          activeOpacity={0.85}
        >
          <Ionicons name="dice" size={18} color={Colors.textInverse} />
          <Text style={styles.rollText}>Roll</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.boardWrap}>
        <View style={styles.board} onLayout={onLayout}>
          {size > 0 && (
            <>
              <Text style={styles.baseLabel} >RED BASE</Text>
              <Text style={[styles.baseLabel, styles.baseLabelBR]}>BLUE BASE</Text>
              {Array.from({ length: MAIN }).map((_, k) => {
                const p = ringPoint(size, k);
                const isStart0 = k === absoluteSquare(0, 0);
                const isStart1 = k === absoluteSquare(1, 0);
                return (
                  <View
                    key={`sq-${k}`}
                    style={[
                      styles.dot,
                      {
                        left: p.x - dot / 2,
                        top: p.y - dot / 2,
                        width: dot,
                        height: dot,
                        borderRadius: dot / 2,
                        backgroundColor: isStart0 ? TOKEN_COLORS[0] : isStart1 ? TOKEN_COLORS[1] : Colors.border,
                      },
                    ]}
                  />
                );
              })}
              {([0, 1] as LPlayer[]).flatMap((player) =>
                Array.from({ length: 6 }).map((_, i) => {
                  const p = homePoint(size, player, i);
                  return (
                    <View
                      key={`home-${player}-${i}`}
                      style={[
                        styles.dot,
                        {
                          left: p.x - dot / 2,
                          top: p.y - dot / 2,
                          width: dot,
                          height: dot,
                          borderRadius: dot / 2,
                          backgroundColor: i === 5 ? TOKEN_COLORS[player] : Colors.surfaceHighlight,
                          borderWidth: 1,
                          borderColor: TOKEN_COLORS[player],
                        },
                      ]}
                    />
                  );
                })
              )}
              {renderTokens(0)}
              {renderTokens(1)}
            </>
          )}
        </View>
      </View>

      <Text style={boardStyles.hint}>Roll a six to leave the base. Land on a rival to send them home. Exact roll reaches home.</Text>

      {isOver && (
        <BoardResultOverlay
          icon="dice-outline"
          tone={TOKEN_COLORS[game.winner as LPlayer]}
          title={`${NAME[game.winner as LPlayer]} wins!`}
          subtitle={`Session — Red ${wins[0]} · Blue ${wins[1]}`}
          onPlayAgain={playAgain}
          onExit={onExit}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  die: { width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  dieSix: { borderColor: Colors.accent, borderWidth: 2 },
  dieText: { color: Colors.textPrimary, fontSize: 20, fontWeight: '900' },
  rollBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  disabled: { opacity: 0.45 },
  rollText: { color: Colors.textInverse, fontSize: 14, fontWeight: '800' },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  board: { width: '100%', aspectRatio: 1, maxWidth: 360 },
  dot: { position: 'absolute' },
  token: { position: 'absolute', borderWidth: 2, borderColor: '#FFFFFF' },
  tokenActive: { borderColor: Colors.accentGold, borderWidth: 3, transform: [{ scale: 1.15 }] },
  baseLabel: { position: 'absolute', left: '4%', top: '3%', color: Colors.textMuted, fontSize: 9, fontWeight: '800' },
  baseLabelBR: { left: undefined, top: undefined, right: '4%', bottom: '3%' },
});
