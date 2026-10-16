import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  CheckerState,
  Color,
  N,
  applyMove,
  createCheckers,
  isDark,
  legalMoves,
  movesFrom,
} from './checkersLogic';
import { BoardResultOverlay, TwoPlayerBar, boardStyles } from '../shared/boardUi';

const PIECE: Record<Color, string> = { red: Colors.accentCoral, black: '#202124' };
const NAME: Record<Color, string> = { red: 'Red', black: 'Black' };

export const CheckersGame: React.FC<GameSessionProps> = ({ onExit, isMuted, isHapticsEnabled }) => {
  const [game, setGame] = useState<CheckerState>(() => createCheckers());
  const [selected, setSelected] = useState<number | null>(null);
  const [wins, setWins] = useState<[number, number]>([0, 0]);

  const isOver = game.outcome !== 'in_progress';
  const moves = useMemo(() => legalMoves(game), [game]);
  const movableFrom = useMemo(() => new Set(moves.map((m) => m.from)), [moves]);
  const destForSelected = useMemo(
    () => (selected === null ? [] : movesFrom(game, selected).map((m) => m.to)),
    [game, selected, moves]
  );

  const playAgain = useCallback(() => {
    setGame(createCheckers());
    setSelected(null);
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted]);

  const onCellPress = useCallback(
    (i: number) => {
      if (isOver) return;
      const piece = game.board[i];

      if (selected !== null && destForSelected.includes(i)) {
        const next = applyMove(game, selected, i);
        if (next !== game) {
          setGame(next);
          setSelected(next.chainFrom);
          if (next.outcome === 'win') {
            setWins((w) => (next.winner === 'red' ? [w[0] + 1, w[1]] : [w[0], w[1] + 1]));
            if (!isMuted) audioService.playSound('victory');
            if (isHapticsEnabled) hapticsService.success();
          } else {
            if (!isMuted) audioService.playSound('pop');
            if (isHapticsEnabled) hapticsService.lightImpact();
          }
        }
        return;
      }

      if (piece && piece.color === game.currentPlayer && movableFrom.has(i)) {
        setSelected(i);
        if (!isMuted) audioService.playSound('tap');
        if (isHapticsEnabled) hapticsService.selection();
      } else {
        setSelected(null);
      }
    },
    [game, isOver, selected, destForSelected, movableFrom, isMuted, isHapticsEnabled]
  );

  const activeIndex = game.currentPlayer === 'red' ? 0 : 1;

  return (
    <View style={boardStyles.container}>
      <TwoPlayerBar
        players={[
          { label: 'RED', color: PIECE.red },
          { label: 'BLACK', color: PIECE.black },
        ]}
        activeIndex={activeIndex}
        wins={wins}
        over={isOver}
      />

      <View style={boardStyles.turnRow}>
        <Text style={[boardStyles.turnText, boardStyles.turnStrong]}>
          {isOver ? `${NAME[game.winner as Color]} wins!` : `${NAME[game.currentPlayer]}'s turn`}
        </Text>
        {!isOver && game.chainFrom !== null && <Text style={boardStyles.hint}>Keep jumping!</Text>}
      </View>

      <View style={styles.board}>
        {Array.from({ length: N * N }).map((_, i) => {
          const dark = isDark(i);
          const piece = game.board[i];
          const selectable = !isOver && !!piece && piece.color === game.currentPlayer && movableFrom.has(i);
          const dest = destForSelected.includes(i);
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={dark ? 0.8 : 1}
              disabled={!dark || isOver}
              onPress={() => onCellPress(i)}
              style={[styles.cell, dark ? styles.dark : styles.light]}
            >
              {selected === i && <View style={styles.selectedRing} />}
              {piece && (
                <View style={[styles.piece, { backgroundColor: PIECE[piece.color] }]}>
                  {piece.king && <Ionicons name="star" size={14} color={Colors.accentGold} />}
                </View>
              )}
              {dest && <View style={styles.destDot} />}
              {selectable && !dest && <View style={styles.selectableDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={boardStyles.hint}>Tap a piece, then a highlighted square. Captures are forced.</Text>

      {isOver && (
        <BoardResultOverlay
          icon="radio-button-on"
          tone={PIECE[game.winner as Color]}
          title={`${NAME[game.winner as Color]} wins!`}
          subtitle={`Session — Red ${wins[0]} · Black ${wins[1]}`}
          onPlayAgain={playAgain}
          onExit={onExit}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  board: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'center', width: '100%', maxWidth: 384, aspectRatio: 1, borderWidth: 2, borderColor: '#B08D57', borderRadius: 8, overflow: 'hidden' },
  cell: { width: '12.5%', height: '12.5%', alignItems: 'center', justifyContent: 'center' },
  light: { backgroundColor: '#F0D9B5' },
  dark: { backgroundColor: '#8B5E34' },
  piece: { width: '78%', height: '78%', borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(0,0,0,0.25)' },
  selectedRing: { position: 'absolute', width: '86%', height: '86%', borderRadius: 999, borderWidth: 3, borderColor: Colors.accentGold },
  destDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.accent },
  selectableDot: { position: 'absolute', top: 3, right: 3, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accentGold },
});
