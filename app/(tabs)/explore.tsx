import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, GAME_CATALOG } from '../../src/games/catalog';
import type { GameDefinition } from '../../src/games/types';
import { GameCard } from '../../src/components/GameCard';
import { SearchBar } from '../../src/components/SearchBar';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/theme/colors';
import { ScoreRepository } from '../../src/database/scoreRepository';
import { FavoriteRepository } from '../../src/database/favoriteRepository';
import { filterGames, normalizeSearchQuery } from '../../src/games/search';
import type { BestScore } from '../../src/games/scoreUtils';

export default function ExploreScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<GameDefinition['category'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [highScores, setHighScores] = useState<Record<string, BestScore>>({});
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadUserData = useCallback(async () => {
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
      console.warn('Error loading explore data:', e);
      setLoadError('Could not load favorites and scores.');
    }
  }, []);

  // Refresh favorites/scores whenever the Explore tab (re)gains focus.
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const games = useMemo(
    () =>
      filterGames(GAME_CATALOG, {
        query: searchQuery,
        category: activeCategory === 'all' ? null : activeCategory,
      }),
    [activeCategory, searchQuery]
  );

  const playableCount = games.filter((g) => g.isImplemented).length;
  const normalizedQuery = normalizeSearchQuery(searchQuery);
  const hasActiveFilters = normalizedQuery !== '' || activeCategory !== 'all';

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

  const clearFilters = () => {
    setSearchQuery('');
    setActiveCategory('all');
  };

  const listHeader = (
    <View>
      <View style={styles.searchWrap}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Find a game" />
      </View>

      {/* Horizontal Category Tab Bar */}
      <CategoryTabBar activeCategory={activeCategory} onSelect={setActiveCategory} />

      {/* Category Header Info */}
      <View style={styles.categoryInfoBar}>
        <Text
          style={styles.categoryTitle}
          accessibilityRole="header"
          testID="explore-category-title"
        >
          {activeCategory === 'all' ? 'All Games' : CATEGORIES.find((c) => c.id === activeCategory)?.name}
        </Text>
        <Text style={styles.categoryCount} testID="explore-count">
          {normalizedQuery
            ? `${games.length} of ${GAME_CATALOG.length} match`
            : `${playableCount} of ${games.length} games ready`}
        </Text>
      </View>

      {loadError && (
        <View style={styles.errorBanner} testID="explore-error">
          <Ionicons name="alert-circle-outline" size={16} color={Colors.accentCoral} />
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity
            onPress={loadUserData}
            style={styles.retryBtn}
            testID="explore-retry"
            accessibilityRole="button"
            accessibilityLabel="Retry loading"
            accessibilityHint="Reloads favorites and scores"
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          data={games}
          keyExtractor={(game) => game.id}
          renderItem={({ item: game }) => (
            <GameCard
              game={game}
              variant="list"
              highScore={highScores[game.id] ?? null}
              isFavorite={favoriteIds.has(game.id)}
              onPress={() => handleSelectGame(game)}
              onToggleFavorite={() => handleToggleFavorite(game.id)}
            />
          )}
          contentContainerStyle={styles.gamesList}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              testID="explore-empty-state"
              icon="search-outline"
              title="No Games Found"
              description={
                hasActiveFilters
                  ? 'Nothing matched your search or category. Try another word or reset the filters.'
                  : 'No games are available right now.'
              }
              actionLabel={hasActiveFilters ? 'Clear Search & Filters' : undefined}
              onAction={hasActiveFilters ? clearFilters : undefined}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

interface CategoryTabsProps {
  activeCategory: GameDefinition['category'] | 'all';
  onSelect: (category: GameDefinition['category'] | 'all') => void;
}

type CategoryTabItem = {
  id: GameDefinition['category'] | 'all';
  name: string;
  icon: string;
};

function CategoryTabBar({ activeCategory, onSelect }: CategoryTabsProps) {
  const tabs: CategoryTabItem[] = useMemo(
    () => [
      { id: 'all', name: 'All', icon: 'apps' },
      ...CATEGORIES.map((cat) => ({ id: cat.id as CategoryTabItem['id'], name: cat.name, icon: cat.icon })),
    ],
    []
  );

  return (
    <FlatList
      horizontal
      data={tabs}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryNav}
      renderItem={({ item }) => {
        const isActive = activeCategory === item.id;
        const isAll = item.id === 'all';
        return (
          <TouchableOpacity
            style={[styles.catTab, isActive && styles.catTabActive]}
            onPress={() => onSelect(item.id)}
            activeOpacity={0.7}
            testID={`explore-chip-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={isAll ? 'All categories' : `${item.name} category`}
            accessibilityHint="Filters the explore list to this category"
            accessibilityState={{ selected: isActive }}
          >
            <Ionicons
              name={item.icon as any}
              size={16}
              color={isActive ? Colors.textInverse : Colors.textMuted}
            />
            <Text style={[styles.catTabText, isActive && styles.activeCatTabText]}>
              {isAll ? 'All' : item.name}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  searchWrap: { paddingHorizontal: 16 },
  categoryNav: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  catTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catTabText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  activeCatTabText: { color: Colors.textInverse },
  categoryInfoBar: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
    gap: 12,
  },
  categoryTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800', flexShrink: 1 },
  categoryCount: { color: Colors.textMuted, fontSize: 12, textAlign: 'right' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 12,
  },
  retryBtn: {
    backgroundColor: Colors.accentCoral,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  retryText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  gamesList: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
});
