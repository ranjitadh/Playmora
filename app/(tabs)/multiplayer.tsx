import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMultiplayerGames } from '../../src/games/catalog';
import type { GameDefinition } from '../../src/games/types';
import { GameCard } from '../../src/components/GameCard';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/theme/colors';
import { ScoreRepository } from '../../src/database/scoreRepository';
import { FavoriteRepository } from '../../src/database/favoriteRepository';
import type { BestScore } from '../../src/games/scoreUtils';

export default function MultiplayerScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columns = width > 700 ? 3 : 2;
  const [highScores, setHighScores] = useState<Record<string, BestScore>>({});
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const games = useMemo(() => getMultiplayerGames(), []);

  const loadData = useCallback(async () => {
    try {
      const [stats, favs] = await Promise.all([
        ScoreRepository.getAllStats(),
        FavoriteRepository.getAllFavorites(),
      ]);
      const hsMap: Record<string, BestScore> = {};
      for (const [gid, s] of Object.entries(stats)) {
        hsMap[gid] = s.bestScore;
      }
      setHighScores(hsMap);
      setFavoriteIds(new Set(favs));
      setLoadError(null);
    } catch (e) {
      console.warn('Error loading multiplayer data:', e);
      setLoadError('Could not load favorites and scores.');
    }
  }, []);

  // Refresh whenever the Multiplayer tab (re)gains focus.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleFavorite = async (gameId: string) => {
    await FavoriteRepository.toggleFavorite(gameId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };

  const handleSelectGame = (game: GameDefinition) => {
    router.push({
      pathname: '/game/[gameId]',
      params: { gameId: game.id },
    });
  };

  const playableCount = games.filter((g) => g.isImplemented).length;

  const listHeader = (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Multiplayer
        </Text>
        <Text style={styles.subtitle}>Pass &amp; play with a friend</Text>
      </View>

      {/* Info banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="people" size={22} color={Colors.primary} />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Local 2-player games</Text>
          <Text style={styles.bannerDesc}>
            Share one device and take turns. Kept separate from the single-player
            arcade.
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Ionicons name="people-outline" size={18} color={Colors.primary} />
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {playableCount > 0
            ? `Multiplayer Games (${playableCount})`
            : `Multiplayer Games (${games.length})`}
        </Text>
      </View>

      {loadError && (
        <View style={styles.errorBanner} testID="multiplayer-error">
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          key={`multiplayer-columns-${columns}`}
          data={games}
          numColumns={columns}
          keyExtractor={(game) => game.id}
          columnWrapperStyle={styles.cardRow}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item: game }) => (
            <View style={{ width: `${100 / columns - 2}%` }}>
              <GameCard
                game={game}
                highScore={highScores[game.id] ?? null}
                isFavorite={favoriteIds.has(game.id)}
                onPress={() => handleSelectGame(game)}
                onToggleFavorite={() => handleToggleFavorite(game.id)}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              testID="multiplayer-empty-state"
              icon="people-outline"
              title="No Multiplayer Games Yet"
              description="Multiplayer titles are on the way. Check back soon for pass & play games!"
            />
          }
        />
      </View>
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
  header: {
    marginBottom: 14,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 20,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  bannerDesc: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  cardRow: {
    justifyContent: 'space-between',
  },
  errorBanner: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: Colors.textPrimary,
    fontSize: 12,
    lineHeight: 17,
  },
});
