import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  COLS,
  GameState,
  Player,
  ROWS,
  createInitialState,
  getAvailableColumns,
  idx,
  playMove,
  resetGame,
} from './connectFourLogic';
import { BoardResultOverlay, TwoPlayerBar, boardStyles } from '../shared/boardUi';

const DISC: Record<Player, string> = { red: Colors.accentCoral, yellow: Colors.accentGold };
const NAME: Record<Player, string> = { red: 'Red', yellow: 'Yellow' };

export const ConnectFourGame: React.FC<GameSessionProps> = ({ onExit, isMuted, isHapticsEnabled }) => {
  const [game, setGame] = useState<GameState>(() => createInitialState());
  const [wins, setWins] = useState<[number, number]>([0, 0]);
  const [draws, setDraws] = useState(0);

  const isOver = game.outcome !== 'in_progress';
  const available = new Set(getAvailableColumns(game.board));

  const play = useCallback(
    (col: number) => {
      if (game.outcome !== 'in_progress') return;
      const next = playMove(game, col);
      if (next === game) return;
      setGame(next);
      if (next.outcome === 'win') {
        setWins((w) => (next.winner === 'red' ? [w[0] + 1, w[1]] : [w[0], w[1] + 1]));
        if (!isMuted) audioService.playSound('victory');
        if (isHapticsEnabled) hapticsService.success();
      } else if (next.outcome === 'draw') {
        setDraws((d) => d + 1);
        if (!isMuted) audioService.playSound('game_over');
        if (isHapticsEnabled) hapticsService.mediumImpact();
      } else {
        if (!isMuted) audioService.playSound('pop');
        if (isHapticsEnabled) hapticsService.lightImpact();
      }
    },
    [game, isMuted, isHapticsEnabled]
  );

  const playAgain = useCallback(() => {
    setGame(resetGame());
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted]);

  const activeIndex = game.currentPlayer === 'red' ? 0 : 1;

  return (
    <View style={boardStyles.container}>
      <TwoPlayerBar
        players={[
          { label: 'RED', color: DISC.red },
          { label: 'YELLOW', color: DISC.yellow },
        ]}
        activeIndex={activeIndex}
        wins={wins}
        draws={draws}
        over={isOver}
      />

      <View style={boardStyles.turnRow}>
        <Text style={[boardStyles.turnText, boardStyles.turnStrong]}>
          {isOver
            ? game.outcome === 'draw'
              ? "It's a draw"
              : `${NAME[game.winner as Player]} connects four!`
            : `${NAME[game.currentPlayer]}'s turn`}
        </Text>
      </View>

      <View style={styles.board}>
        {Array.from({ length: COLS }).map((_, col) => {
          const full = !available.has(col);
          return (
            <TouchableOpacity
              key={col}
              style={styles.column}
              activeOpacity={0.75}
              disabled={full || isOver}
              onPress={() => play(col)}
              accessibilityRole="button"
              accessibilityLabel={`Drop in column ${col + 1}`}
            >
              {Array.from({ length: ROWS }).map((_, row) => {
                const cell = game.board[idx(row, col)];
                const winning = !!game.winningLine?.includes(idx(row, col));
                return (
                  <View key={row} style={styles.slot}>
                    <View
                      style={[
                        styles.disc,
                        cell ? { backgroundColor: DISC[cell] } : styles.discEmpty,
                        winning && styles.discWinning,
                      ]}
                    />
                  </View>
                );
              })}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={boardStyles.hint}>
        {isOver && game.outcome === 'win'
          ? 'Tap Play Again for a rematch.'
          : 'Tap a column to drop your disc.'}
      </Text>

      {isOver && (
        <BoardResultOverlay
          tone={game.winner ? DISC[game.winner] : Colors.primary}
          icon={game.outcome === 'draw' ? 'remove' : 'grid'}
          title={game.outcome === 'draw' ? "It's a draw!" : `${NAME[game.winner as Player]} wins!`}
          subtitle={`Session — Red ${wins[0]} · Yellow ${wins[1]} · Draws ${draws}`}
          onPlayAgain={playAgain}
          onExit={onExit}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  board: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 18,
    padding: 8,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 380,
  },
  column: { flex: 1, gap: 6, borderRadius: 12, paddingVertical: 2 },
  slot: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  disc: { width: '86%', height: '86%', borderRadius: 999 },
  discEmpty: { backgroundColor: Colors.background },
  discWinning: { borderWidth: 3, borderColor: Colors.textInverse },
});
