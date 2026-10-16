import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  ADJACENCY,
  MEN_EACH,
  MColor,
  MorrisState,
  createMorris,
  isInMill,
  moveMorris,
  placeMorris,
  removeMorris,
} from './nineMensMorrisLogic';
import { BoardResultOverlay, TwoPlayerBar, boardStyles } from '../shared/boardUi';

const PIECE: Record<MColor, string> = { white: '#F4F4F6', black: '#202124' };
const NAME: Record<MColor, string> = { white: 'White', black: 'Black' };
const INSETS = [0, 1 / 6, 1 / 3];

function pointCoord(i: number): { u: number; v: number } {
  const r = Math.floor(i / 8);
  const j = i % 8;
  const min = INSETS[r];
  const max = 1 - INSETS[r];
  switch (j) {
    case 0: return { u: min, v: min };
    case 1: return { u: 0.5, v: min };
    case 2: return { u: max, v: min };
    case 3: return { u: max, v: 0.5 };
    case 4: return { u: max, v: max };
    case 5: return { u: 0.5, v: max };
    case 6: return { u: min, v: max };
    default: return { u: min, v: 0.5 };
  }
}

export const NineMensMorrisGame: React.FC<GameSessionProps> = ({ onExit, isMuted, isHapticsEnabled }) => {
  const [game, setGame] = useState<MorrisState>(() => createMorris());
  const [selected, setSelected] = useState<number | null>(null);
  const [wins, setWins] = useState<[number, number]>([0, 0]);
  const [size, setSize] = useState(320);

  const isOver = game.outcome !== 'in_progress';
  const flying = game.onBoard[game.currentPlayer] === 3;

  const removable = useMemo(() => {
    if (!game.pendingRemoval) return new Set<number>();
    const opp = game.currentPlayer === 'white' ? 'black' : 'white';
    const allInMills = game.board.every((p, i) => p !== opp || isInMill(game.board, i));
    const set = new Set<number>();
    game.board.forEach((p, i) => {
      if (p === opp && (!isInMill(game.board, i) || allInMills)) set.add(i);
    });
    return set;
  }, [game]);

  const targets = useMemo(() => {
    if (selected === null || game.phase !== 'moving') return new Set<number>();
    const set = new Set<number>();
    if (flying) {
      game.board.forEach((p, i) => { if (p === null) set.add(i); });
    } else {
      for (const n of ADJACENCY[selected]) if (game.board[n] === null) set.add(n);
    }
    return set;
  }, [selected, game, flying]);

  const won = useCallback(
    (next: MorrisState) => {
      if (next.outcome === 'win') {
        setWins((w) => (next.winner === 'white' ? [w[0] + 1, w[1]] : [w[0], w[1] + 1]));
        if (!isMuted) audioService.playSound('victory');
        if (isHapticsEnabled) hapticsService.success();
      } else {
        if (!isMuted) audioService.playSound('pop');
        if (isHapticsEnabled) hapticsService.lightImpact();
      }
    },
    [isMuted, isHapticsEnabled]
  );

  const onPoint = useCallback(
    (i: number) => {
      if (isOver) return;

      if (game.pendingRemoval) {
        if (!removable.has(i)) return;
        const next = removeMorris(game, i);
        if (next !== game) { setGame(next); won(next); }
        return;
      }

      if (game.phase === 'placing') {
        if (game.board[i] !== null) return;
        const next = placeMorris(game, i);
        if (next !== game) { setGame(next); won(next); }
        return;
      }

      // moving phase
      if (game.board[i] === game.currentPlayer) {
        setSelected(i);
        if (!isMuted) audioService.playSound('tap');
        return;
      }
      if (selected !== null && targets.has(i)) {
        const next = moveMorris(game, selected, i);
        if (next !== game) { setGame(next); setSelected(null); won(next); }
      }
    },
    [game, isOver, removable, selected, targets, won, isMuted]
  );

  const playAgain = useCallback(() => {
    setGame(createMorris());
    setSelected(null);
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize(Math.min(width, height));
  };

  const activeIndex = game.currentPlayer === 'white' ? 0 : 1;
  const pad = 22;
  const board = size - pad * 2;

  const pointStyle = (i: number) => {
    const { u, v } = pointCoord(i);
    return { left: pad + u * board, top: pad + v * board };
  };

  const statusLine = isOver
    ? `${NAME[game.winner as MColor]} wins!`
    : game.pendingRemoval
    ? `${NAME[game.currentPlayer]} — remove an enemy man`
    : game.phase === 'placing'
    ? `${NAME[game.currentPlayer]} — place a man (${game.placed[game.currentPlayer]}/${MEN_EACH})`
    : `${NAME[game.currentPlayer]} — move a man`;

  return (
    <View style={boardStyles.container}>
      <TwoPlayerBar
        players={[{ label: 'WHITE', color: '#C9CBD3' }, { label: 'BLACK', color: '#202124' }]}
        activeIndex={activeIndex}
        wins={wins}
        over={isOver}
      />

      <View style={boardStyles.turnRow}>
        <Text style={[boardStyles.turnText, boardStyles.turnStrong]}>{statusLine}</Text>
      </View>

      <View style={styles.area} onLayout={onLayout}>
        <View style={[styles.boardFrame, { width: board, height: board, left: pad, top: pad }]}>
          {INSETS.map((inset, k) => {
            const s = (1 - inset * 2) * board;
            const off = inset * board;
            return <View key={k} style={[styles.ring, { left: off, top: off, width: s, height: s }]} />;
          })}
          <View style={[styles.spoke, { left: board / 2 - 1, top: 0, width: 2, height: board / 3 }]} />
          <View style={[styles.spoke, { left: board / 2 - 1, top: (2 * board) / 3, width: 2, height: board / 3 }]} />
          <View style={[styles.spoke, { left: 0, top: board / 2 - 1, width: board / 3, height: 2 }]} />
          <View style={[styles.spoke, { left: (2 * board) / 3, top: board / 2 - 1, width: board / 3, height: 2 }]} />

          {game.board.map((p, i) => {
            const removableHere = removable.has(i);
            const target = targets.has(i);
            const canPlace = game.phase === 'placing' && !isOver && p === null;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.point, pointStyle(i)]}
                activeOpacity={0.7}
                onPress={() => onPoint(i)}
                accessibilityRole="button"
                accessibilityLabel={`Point ${i}${p ? `: ${p}` : ''}`}
              >
                {p ? (
                  <View style={[styles.man, { backgroundColor: PIECE[p] }, p === 'white' && styles.manWhite, selected === i && styles.manSelected, removableHere && styles.manRemovable]} />
                ) : (
                  <View style={[styles.empty, (canPlace || target) && styles.emptyHint]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={boardStyles.hint}>
        {game.phase === 'placing' ? 'Place your nine men, then slide them into lines of three.' : 'Line up three men to claim an enemy.'}
      </Text>

      {isOver && (
        <BoardResultOverlay
          icon="share-social"
          tone={PIECE[game.winner as MColor]}
          title={`${NAME[game.winner as MColor]} wins!`}
          subtitle={`Session — White ${wins[0]} · Black ${wins[1]}`}
          onPlayAgain={playAgain}
          onExit={onExit}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  boardFrame: { position: 'relative' },
  ring: { position: 'absolute', borderWidth: 3, borderColor: '#8B5E34', borderRadius: 2 },
  spoke: { position: 'absolute', backgroundColor: '#8B5E34' },
  point: { position: 'absolute', width: 30, height: 30, marginLeft: -15, marginTop: -15, alignItems: 'center', justifyContent: 'center' },
  man: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: Colors.border },
  manWhite: { backgroundColor: '#F4F4F6' },
  manSelected: { borderColor: Colors.accentGold, borderWidth: 3 },
  manRemovable: { borderColor: Colors.accentCoral, borderWidth: 3 },
  empty: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(32,33,36,0.18)' },
  emptyHint: { backgroundColor: Colors.accent, width: 16, height: 16, borderRadius: 8 },
});
