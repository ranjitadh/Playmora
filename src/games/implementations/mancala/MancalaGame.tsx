import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  MancalaState,
  NORTH_STORE,
  SOUTH_STORE,
  createMancala,
  ownPits,
  playMancala,
} from './mancalaLogic';
import { BoardResultOverlay, TwoPlayerBar, boardStyles } from '../shared/boardUi';

const SOUTH_COLOR = Colors.primary;
const NORTH_COLOR = Colors.accentCoral;

function Stones({ count, color }: { count: number; color: string }) {
  const shown = Math.min(count, 10);
  return (
    <View style={styles.stones}>
      {Array.from({ length: shown }).map((_, i) => (
        <View key={i} style={[styles.stone, { backgroundColor: color }]} />
      ))}
      {count > 10 && <Text style={styles.stoneOverflow}>+{count - 10}</Text>}
    </View>
  );
}

export const MancalaGame: React.FC<GameSessionProps> = ({ onExit, isMuted, isHapticsEnabled }) => {
  const [game, setGame] = useState<MancalaState>(() => createMancala());
  const [wins, setWins] = useState<[number, number]>([0, 0]);
  const [draws, setDraws] = useState(0);

  const isOver = game.outcome !== 'in_progress';
  const movable = useMemo(() => new Set(ownPits(game.currentPlayer).filter((i) => game.pits[i] > 0)), [game]);

  const play = useCallback(
    (pit: number) => {
      if (isOver || !movable.has(pit)) return;
      const next = playMancala(game, pit);
      if (next === game) return;
      setGame(next);
      if (next.outcome === 'win') {
        setWins((w) => (next.winner === 'south' ? [w[0] + 1, w[1]] : [w[0], w[1] + 1]));
        if (!isMuted) audioService.playSound('victory');
        if (isHapticsEnabled) hapticsService.success();
      } else if (next.outcome === 'draw') {
        setDraws((d) => d + 1);
        if (!isMuted) audioService.playSound('game_over');
      } else {
        if (!isMuted) audioService.playSound('pop');
        if (isHapticsEnabled) hapticsService.lightImpact();
      }
    },
    [game, isOver, movable, isMuted, isHapticsEnabled]
  );

  const playAgain = useCallback(() => {
    setGame(createMancala());
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted]);

  const activeIndex = game.currentPlayer === 'south' ? 0 : 1;

  const pit = (i: number, color: string, canTap: boolean) => (
    <TouchableOpacity
      key={i}
      style={[styles.pit, canTap && styles.pitActive]}
      activeOpacity={0.8}
      disabled={!canTap}
      onPress={() => play(i)}
      accessibilityRole="button"
      accessibilityLabel={`Pit ${i + 1}: ${game.pits[i]} stones`}
    >
      <Stones count={game.pits[i]} color={color} />
      <Text style={styles.pitCount}>{game.pits[i]}</Text>
    </TouchableOpacity>
  );

  const store = (i: number, color: string, label: string) => (
    <View style={[styles.store, { borderColor: color }]}>
      <Text style={styles.storeLabel}>{label}</Text>
      <Text style={styles.storeCount}>{game.pits[i]}</Text>
    </View>
  );

  return (
    <View style={boardStyles.container}>
      <TwoPlayerBar
        players={[{ label: 'SOUTH', color: SOUTH_COLOR }, { label: 'NORTH', color: NORTH_COLOR }]}
        activeIndex={activeIndex}
        wins={wins}
        draws={draws}
        over={isOver}
      />

      <View style={boardStyles.turnRow}>
        <Text style={[boardStyles.turnText, boardStyles.turnStrong]}>
          {isOver
            ? game.outcome === 'draw'
              ? 'All square'
              : `${game.winner === 'south' ? 'South' : 'North'} wins!`
            : `${game.currentPlayer === 'south' ? 'South' : 'North'}'s turn`}
        </Text>
      </View>

      <View style={styles.board}>
        {store(NORTH_STORE, NORTH_COLOR, 'N')}
        <View style={styles.grid}>
          <View style={styles.row}>
            {[12, 11, 10, 9, 8, 7].map((i) =>
              pit(i, NORTH_COLOR, !isOver && game.currentPlayer === 'north' && game.pits[i] > 0)
            )}
          </View>
          <View style={styles.row}>
            {[0, 1, 2, 3, 4, 5].map((i) =>
              pit(i, SOUTH_COLOR, !isOver && game.currentPlayer === 'south' && game.pits[i] > 0)
            )}
          </View>
        </View>
        {store(SOUTH_STORE, SOUTH_COLOR, 'S')}
      </View>

      <Text style={boardStyles.hint}>Tap one of your pits to sow its stones counter-clockwise.</Text>

      {isOver && (
        <BoardResultOverlay
          icon={game.outcome === 'draw' ? 'remove' : 'ellipse'}
          tone={game.winner === 'north' ? NORTH_COLOR : SOUTH_COLOR}
          title={game.outcome === 'draw' ? "It's a draw!" : `${game.winner === 'south' ? 'South' : 'North'} wins!`}
          subtitle={`Stores — South ${game.pits[SOUTH_STORE]} · North ${game.pits[NORTH_STORE]}`}
          onPlayAgain={playAgain}
          onExit={onExit}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  board: { flexDirection: 'row', alignItems: 'stretch', gap: 8, alignSelf: 'center', width: '100%', maxWidth: 420, backgroundColor: '#B08D57', borderRadius: 20, padding: 10 },
  grid: { flex: 1, gap: 8 },
  row: { flexDirection: 'row', gap: 6 },
  pit: { flex: 1, aspectRatio: 1, borderRadius: 999, backgroundColor: '#8B5E34', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)' },
  pitActive: { borderColor: Colors.accentGold, borderWidth: 3 },
  pitCount: { position: 'absolute', bottom: -2, right: 2, color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '800' },
  stones: { flexDirection: 'row', flexWrap: 'wrap', width: 26, height: 26, alignItems: 'center', justifyContent: 'center', gap: 1 },
  stone: { width: 6, height: 6, borderRadius: 3 },
  stoneOverflow: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  store: { width: 46, borderRadius: 14, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  storeLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '900' },
  storeCount: { color: '#FFF', fontSize: 20, fontWeight: '900' },
});
