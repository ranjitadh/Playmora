import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Image,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GAME_CATALOG } from '../../src/games/catalog';
import type { GameDefinition } from '../../src/games/types';
import { getGameArtwork } from '../../src/games/artwork';
import { SearchBar } from '../../src/components/SearchBar';
import { CategoryChip } from '../../src/components/CategoryChip';
import { EmptyState } from '../../src/components/EmptyState';
import { GameCard } from '../../src/components/GameCard';
import { Colors } from '../../src/theme/colors';
import { ScoreRepository } from '../../src/database/scoreRepository';
import { FavoriteRepository } from '../../src/database/favoriteRepository';
import { DailyChallengeService, DailyChallengeState } from '../../src/services/dailyChallengeService';
import { filterGames, normalizeSearchQuery } from '../../src/games/search';
import type { BestScore } from '../../src/games/scoreUtils';

type HomeRow =
  | { kind: 'intro'; key: 'intro' }
  | { kind: 'daily'; key: 'daily' }
  | { kind: 'recents'; key: 'recents' }
  | { kind: 'chips'; key: 'chips' }
  | { kind: 'results'; key: 'results' }
  | { kind: 'section'; key: string; title: string; tone: 'playable' | 'upcoming' }
  | { kind: 'cards'; key: string; games: GameDefinition[] }
  | { kind: 'empty'; key: 'empty' };

function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) return [items];
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columns = width > 700 ? 3 : 2;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [highScores, setHighScores] = useState<Record<string, BestScore>>({});
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [recentGameIds, setRecentGameIds] = useState<string[]>([]);
  const [dailyState, setDailyState] = useState<DailyChallengeState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAppData = useCallback(async () => {
    try {
      const [stats, favs, recents, daily] = await Promise.all([
        ScoreRepository.getAllStats(),
        FavoriteRepository.getAllFavorites(),
        ScoreRepository.getRecentGames(5),
        DailyChallengeService.getTodayState(),
      ]);

      const hsMap: Record<string, BestScore> = {};
      for (const [gid, s] of Object.entries(stats)) {
        hsMap[gid] = s.bestScore;
      }
      setHighScores(hsMap);
      setFavoriteIds(new Set(favs));
      setRecentGameIds(recents);
      setDailyState(daily);
      setLoadError(null);
    } catch (e) {
      console.warn('Error loading app data:', e);
      setLoadError('Could not load your local arcade data. Pull to retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh whenever the Home tab (re)gains focus.
  useFocusEffect(
    useCallback(() => {
      loadAppData();
    }, [loadAppData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppData();
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

  const hasActiveFilters = searchQuery.trim() !== '' || selectedCategory !== null;

  const filteredGames = useMemo(
    () => filterGames(GAME_CATALOG, { query: searchQuery, category: selectedCategory }),
    [selectedCategory, searchQuery]
  );

  const recentGames = useMemo(() => {
    return recentGameIds
      .map((id) => GAME_CATALOG.find((g) => g.id === id))
      .filter((g): g is GameDefinition => !!g);
  }, [recentGameIds]);

  const playableGames = useMemo(
    () => filteredGames.filter((g) => g.isImplemented),
    [filteredGames]
  );

  const upcomingGames = useMemo(
    () => filteredGames.filter((g) => !g.isImplemented),
    [filteredGames]
  );

  const dailyGame = useMemo(
    () => (dailyState?.spec ? GAME_CATALOG.find((g) => g.id === dailyState.spec!.gameId) : undefined),
    [dailyState]
  );

  const rows = useMemo(() => {
    const list: HomeRow[] = [{ kind: 'intro', key: 'intro' }];

    if (!hasActiveFilters && dailyState?.available && dailyState.spec) {
      list.push({ kind: 'daily', key: 'daily' });
    }
    if (!hasActiveFilters && recentGames.length > 0) {
      list.push({ kind: 'recents', key: 'recents' });
    }
    list.push({ kind: 'chips', key: 'chips' });

    if (normalizeSearchQuery(searchQuery)) {
      list.push({ kind: 'results', key: 'results' });
    }

    if (filteredGames.length === 0) {
      list.push({ kind: 'empty', key: 'empty' });
      return list;
    }

    if (playableGames.length > 0) {
      list.push({
        kind: 'section',
        key: 'section-playable',
        title: `Playable Games (${playableGames.length})`,
        tone: 'playable',
      });
      chunk(playableGames, columns).forEach((cards, index) => {
        list.push({ kind: 'cards', key: `playable-row-${index}`, games: cards });
      });
    }

    if (upcomingGames.length > 0) {
      list.push({
        kind: 'section',
        key: 'section-upcoming',
        title: `More Games (${upcomingGames.length} In Development)`,
        tone: 'upcoming',
      });
      chunk(upcomingGames, columns).forEach((cards, index) => {
        list.push({ kind: 'cards', key: `upcoming-row-${index}`, games: cards });
      });
    }

    return list;
  }, [
    hasActiveFilters,
    columns,
    dailyState,
    filteredGames.length,
    playableGames,
    recentGames,
    searchQuery,
    upcomingGames,
  ]);

  const renderRow = ({ item }: { item: HomeRow }) => {
    switch (item.kind) {
      case 'intro':
        return (
          <View style={styles.header}>
            <View>
              <View style={styles.brandRow}>
                <Text
                  style={styles.brandTitle}
                  accessibilityRole="header"
                  testID="home-brand-title"
                >
                  Playmora
                </Text>
                <View
                  style={styles.offlineBadge}
                  testID="home-offline-badge"
                  accessibilityLabel="Offline ready"
                >
                  <View style={styles.pulseDot} />
                  <Text style={styles.offlineText}>OFFLINE READY</Text>
                </View>
              </View>
              <Text style={styles.brandSubtitle}>Your pocket-sized arcade of mini games</Text>
            </View>
          </View>
        );

      case 'daily': {
        const spec = dailyState?.spec;
        if (!spec) return null;
        const completed = dailyState?.completed ?? false;
        const targetText =
          spec.scoreType === 'time_lower_is_better'
            ? `Target: ${spec.targetScore} or lower`
            : spec.scoreType === 'moves_lower_is_better'
              ? `Target: ${spec.targetScore} or lower`
              : `Target: ${spec.targetScore} Points`;

        return (
          <TouchableOpacity
            style={styles.dailyCard}
            activeOpacity={0.85}
            onPress={() => {
              const target = GAME_CATALOG.find((g) => g.id === spec.gameId);
              if (target) handleSelectGame(target);
            }}
            testID="daily-challenge-card"
            accessibilityRole="button"
            accessibilityLabel={`Today's challenge, ${spec.gameTitle}. ${targetText}. ${
              completed ? 'Completed' : 'Not completed yet'
            }`}
            accessibilityHint="Opens today's featured challenge game"
          >
            <View style={styles.dailyLeft}>
              {dailyGame ? (
                <View style={styles.dailyArtWrap}>
                  <Image
                    source={getGameArtwork(dailyGame.id) ?? undefined}
                    style={styles.dailyArt}
                    resizeMode="cover"
                  />
                </View>
              ) : null}
              <View style={styles.dailyText}>
                <View style={styles.dailyTag}>
                  <Ionicons name="flame" size={12} color="#000" />
                  <Text style={styles.dailyTagText}>
                    {completed ? "TODAY'S CHALLENGE — DONE" : "TODAY'S CHALLENGE"}
                  </Text>
                </View>
                <Text style={styles.dailyTitle}>{spec.gameTitle}</Text>
                <Text style={styles.dailyTarget}>{targetText}</Text>
                {completed && (
                  <View style={styles.dailyDoneRow} testID="daily-challenge-completed">
                    <Ionicons name="checkmark-circle" size={14} color={Colors.accent} />
                    <Text style={styles.dailyDoneText}>Completed</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.dailyAction}>
              <View
                style={[styles.dailyPlayBtn, completed && styles.dailyPlayBtnDone]}
                testID="daily-challenge-cta"
                accessibilityLabel={completed ? 'Replay challenge' : 'Start challenge'}
              >
                <Ionicons
                  name={completed ? 'refresh' : 'play'}
                  size={18}
                  color={completed ? Colors.accent : '#000'}
                />
              </View>
            </View>
          </TouchableOpacity>
        );
      }

      case 'recents':
        return (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Recently Played
              </Text>
            </View>
            <FlatList
              horizontal
              data={recentGames}
              keyExtractor={(game) => `recent-${game.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScroll}
              renderItem={({ item: game }) => {
                const art = getGameArtwork(game.id);
                return (
                  <TouchableOpacity
                    style={styles.recentItem}
                    onPress={() => handleSelectGame(game)}
                    activeOpacity={0.8}
                    testID={`recent-game-${game.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Recently played: ${game.title}`}
                    accessibilityHint="Opens this game"
                  >
                    <View style={styles.recentIconBox}>
                      {art ? (
                        <Image source={art} style={styles.recentArt} resizeMode="cover" />
                      ) : (
                        <Ionicons
                          name={game.iconName as any}
                          size={22}
                          color={game.badgeColor}
                        />
                      )}
                    </View>
                    <Text style={styles.recentTitle} numberOfLines={1}>
                      {game.title}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        );

      case 'chips':
        return (
          <CategoryChip
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        );

      case 'results':
        return (
          <Text style={styles.resultsCount} testID="search-results-count">
            {filteredGames.length} of {GAME_CATALOG.length} games match “{searchQuery.trim()}”
          </Text>
        );

      case 'section':
        return (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name={item.tone === 'playable' ? 'sparkles' : 'calendar-outline'}
                size={18}
                color={item.tone === 'playable' ? Colors.accent : Colors.accentGold}
              />
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {item.title}
              </Text>
            </View>
          </View>
        );

      case 'cards':
        return (
          <View style={styles.cardRow}>
            {item.games.map((game) => (
              <View key={game.id} style={{ width: `${100 / columns - 2}%` }}>
                <GameCard
                  game={game}
                  highScore={highScores[game.id] ?? null}
                  isFavorite={favoriteIds.has(game.id)}
                  onPress={() => handleSelectGame(game)}
                  onToggleFavorite={() => handleToggleFavorite(game.id)}
                />
              </View>
            ))}
          </View>
        );

      case 'empty':
        return (
          <EmptyState
            testID="home-empty-state"
            icon="search-outline"
            title="No Mini Games Found"
            description={
              hasActiveFilters
                ? `Nothing matched your search or filters. Try colors, snake, cards, or numbers.`
                : 'No mini games are available right now.'
            }
            actionLabel={hasActiveFilters ? 'Clear Search & Filters' : undefined}
            onAction={
              hasActiveFilters
                ? () => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                  }
                : undefined
            }
          />
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer} testID="home-loading">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your arcade…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        style={styles.container}
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={renderRow}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={7}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
            {loadError && (
              <View style={styles.errorBanner} testID="home-error">
                <Ionicons name="alert-circle-outline" size={18} color={Colors.accentCoral} />
                <Text style={styles.errorText}>{loadError}</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={loadAppData}
                  testID="home-retry"
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading"
                  accessibilityHint="Reloads your local arcade data"
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  errorText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 12,
    lineHeight: 17,
  },
  retryBtn: {
    backgroundColor: Colors.accentCoral,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  retryText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTitle: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  offlineText: {
    color: '#0A7A57',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  dailyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    elevation: 4,
    minHeight: 96,
  },
  dailyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dailyArtWrap: {
    width: 64,
    height: 64,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceHighlight,
  },
  dailyArt: {
    width: '100%',
    height: '100%',
  },
  dailyText: {
    flex: 1,
  },
  dailyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentGold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginBottom: 6,
  },
  dailyTagText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dailyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  dailyTarget: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  dailyDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dailyDoneText: {
    color: '#0A7A57',
    fontSize: 12,
    fontWeight: '800',
  },
  dailyAction: {
    marginLeft: 12,
  },
  dailyPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyPlayBtnDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  sectionContainer: {
    marginTop: 18,
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
  resultsCount: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recentScroll: {
    gap: 12,
    paddingVertical: 4,
    paddingRight: 8,
  },
  recentItem: {
    alignItems: 'center',
    width: 76,
    minHeight: 44,
  },
  recentIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 6,
  },
  recentArt: {
    width: '100%',
    height: '100%',
  },
  recentTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
