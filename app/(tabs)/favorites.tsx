import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { FavoriteRepository } from '../../src/database/favoriteRepository';
import { ScoreRepository } from '../../src/database/scoreRepository';
import { GAME_CATALOG } from '../../src/games/catalog';
import type { GameDefinition } from '../../src/games/types';
import { GameCard } from '../../src/components/GameCard';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/theme/colors';
import type { BestScore } from '../../src/games/scoreUtils';

export default function FavoritesScreen() {
  const router = useRouter();
  const [favoriteGames, setFavoriteGames] = useState<GameDefinition[]>([]);
  const [highScores, setHighScores] = useState<Record<string, BestScore>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    try {
      const [favIds, stats] = await Promise.all([
        FavoriteRepository.getAllFavorites(),
        ScoreRepository.getAllStats(),
      ]);

      const games = favIds
        .map((id) => GAME_CATALOG.find((g) => g.id === id))
        .filter((g): g is GameDefinition => !!g);
      setFavoriteGames(games);

      const hsMap: Record<string, BestScore> = {};
      for (const [gid, s] of Object.entries(stats)) {
        hsMap[gid] = s.bestScore;
      }
      setHighScores(hsMap);
      setLoadError(null);
    } catch (e) {
      console.warn('Error loading favorites:', e);
      setLoadError('Could not load your favorites. Pull to retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh whenever the Favorites tab (re)gains focus.
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleToggleFavorite = async (gameId: string) => {
    await FavoriteRepository.toggleFavorite(gameId);
    setFavoriteGames((prev) => prev.filter((g) => g.id !== gameId));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer} testID="favorites-loading">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading favorites…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        style={styles.container}
        data={favoriteGames}
        keyExtractor={(game) => game.id}
        contentContainerStyle={
          favoriteGames.length === 0 ? styles.emptyContent : styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item: game }) => (
          <GameCard
            game={game}
            variant="list"
            highScore={highScores[game.id] ?? null}
            isFavorite={true}
            onPress={() =>
              router.push({
                pathname: '/game/[gameId]',
                params: { gameId: game.id },
              })
            }
            onToggleFavorite={() => handleToggleFavorite(game.id)}
          />
        )}
        ListHeaderComponent={
          loadError ? (
            <View style={styles.errorBanner} testID="favorites-error">
              <Text style={styles.errorText}>{loadError}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            testID="favorites-empty-state"
            icon="heart-outline"
            title="No Favorites Yet"
            description="Tap the heart icon on any game card to bookmark your favorite mini games here for quick access!"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  errorText: {
    color: Colors.textPrimary,
    fontSize: 12,
    lineHeight: 17,
  },
});
