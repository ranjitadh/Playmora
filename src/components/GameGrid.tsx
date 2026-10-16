import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { GameDefinition } from '../games/types';
import type { BestScore } from '../games/scoreUtils';
import { GameCard } from './GameCard';

interface GameGridProps {
  games: GameDefinition[];
  highScores?: Record<string, BestScore>;
  favorites?: Set<string>;
  onSelectGame: (game: GameDefinition) => void;
  onToggleFavorite?: (gameId: string) => void;
}

export const GameGrid: React.FC<GameGridProps> = ({
  games,
  highScores = {},
  favorites = new Set(),
  onSelectGame,
  onToggleFavorite,
}) => {
  const { width } = useWindowDimensions();
  const numColumns = width > 700 ? 3 : 2;
  const columnWidth = `${100 / numColumns - 2}%` as any;

  return (
    <View style={styles.gridContainer}>
      {games.map((game) => (
        <View key={game.id} style={{ width: columnWidth }}>
          <GameCard
            game={game}
            highScore={highScores[game.id] ?? null}
            isFavorite={favorites.has(game.id)}
            onPress={() => onSelectGame(game)}
            onToggleFavorite={
              onToggleFavorite ? () => onToggleFavorite(game.id) : undefined
            }
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
