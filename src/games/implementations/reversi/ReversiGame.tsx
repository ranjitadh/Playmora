import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  Faction,
  N,
  ReversiState,
  countDiscs,
  createReversi,
  idx,
  legalMoves,
  playReversi,
} from './reversiLogic';
import { BoardResultOverlay, TwoPlayerBar, boardStyles } from '../shared/boardUi';

const DISC_COLOR: Record<Faction, string> = { black: '#202124', white: '#FFFFFF' };
const NAME: Record<Faction, string> = { black: 'Black', white: 'White' };

export const ReversiGame: React.FC<GameSessionProps> = ({ onExit, isMuted, isHapticsEnabled }) => {
  const [game, setGame] = useState<ReversiState>(() => createReversi());
  const [wins, setWins] = useState<[number, number]>([0, 0]);
  const [draws, setDraws] = useState(0);

  const isOver = game.outcome !== 'in_progress';
  const moves = useMemo(
    () => (isOver ? [] : legalMoves(game.board, game.currentPlayer)),
    [game, isOver]
  );
  const moveSet = useMemo(() => new Set(moves), [moves]);
  const counts = countDiscs(game.board);

  const play = useCallback(
    (i: number) => {
      if (game.outcome !== 'in_progress') return;
      const next = playReversi(game, i);
      if (next === game) return;
      setGame(next);
      if (next.outcome === 'win') {
        setWins((w) => (next.winner === 'black' ? [w[0] + 1, w[1]] : [w[0], w[1] + 1]));
        if (!isMuted) audioService.playSound('victory');
        if (isHapticsEnabled) hapticsService.success();
      } else if (next.outcome === 'draw') {
        setDraws((d) => d + 1);
        if (!isMuted) audioService.playSound('game_over');
        if (isHapticsEnabled) hapticsService.mediumImpact();
      } else {
        if (!isMuted) audioService.playSound(next.lastPassed ? 'combo' : 'pop');
        if (isHapticsEnabled) hapticsService.lightImpact();
      }
    },
    [game, isMuted, isHapticsEnabled]
  );

  const playAgain = useCallback(() => {
    setGame(createReversi());
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted]);

  const activeIndex = game.currentPlayer === 'black' ? 0 : 1;

  return (
    <View style={boardStyles.container}>
      <TwoPlayerBar
        players={[
          { label: 'BLACK', color: '#202124' },
          { label: 'WHITE', color: '#C9CBD3' },
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
              ? 'Drawn board'
              : `${NAME[game.winner as Faction]} wins`
            : `${NAME[game.currentPlayer]}'s turn · ${counts.black}–${counts.white}`}
        </Text>
        {!isOver && game.lastPassed && <Text style={boardStyles.hint}>Opponent had no move and passed</Text>}
      </View>

      <View style={styles.board}>
        {Array.from({ length: N * N }).map((_, i) => {
          const disc = game.board[i];
          const canPlay = moveSet.has(i);
          return (
            <TouchableOpacity
              key={i}
              style={styles.cell}
              activeOpacity={0.75}
              disabled={!canPlay || isOver}
              onPress={() => play(i)}
              accessibilityRole="button"
              accessibilityLabel={`Square ${i + 1}${disc ? `: ${disc}` : canPlay ? ': legal move' : ''}`}
            >
              {disc ? (
                <View style={[styles.disc, { backgroundColor: DISC_COLOR[disc] }, disc === 'white' && styles.discWhite]} />
              ) : canPlay ? (
                <View style={styles.hintDot} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={boardStyles.hint}>Crucially, place a disc to flank and flip the enemy.</Text>

      {isOver && (
        <BoardResultOverlay
          icon={game.outcome === 'draw' ? 'remove' : 'ellipse'}
          tone={game.winner === 'white' ? '#8892A6' : Colors.primary}
          title={game.outcome === 'draw' ? "It's a draw!" : `${NAME[game.winner as Faction]} wins!`}
          subtitle={`${counts.black}–${counts.white} · Session Black ${wins[0]} · White ${wins[1]}`}
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
    flexWrap: 'wrap',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 384,
    aspectRatio: 1,
    backgroundColor: '#2E7D4F',
    borderRadius: 12,
    padding: 4,
  },
  cell: { width: '12.5%', height: '12.5%', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)' },
  disc: { width: '82%', height: '82%', borderRadius: 999 },
  discWhite: { borderWidth: 1.5, borderColor: '#9AA3B2' },
  hintDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.65)' },
});
