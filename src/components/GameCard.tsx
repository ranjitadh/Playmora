import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameDefinition } from '../games/types';
import { Colors } from '../theme/colors';
import { getGameArtwork } from '../games/artwork';
import { isGamePlayable } from '../games/registry';
import {
  BestScore,
  formatBestScore,
  getBestScoreLabel,
  toBestScore,
} from '../games/scoreUtils';

interface GameCardProps {
  game: GameDefinition;
  /** Best score for this game; `null` when nothing has been recorded. */
  highScore?: BestScore;
  isFavorite?: boolean;
  variant?: 'grid' | 'list';
  onPress: () => void;
  onToggleFavorite?: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  highScore = null,
  isFavorite = false,
  variant = 'grid',
  onPress,
  onToggleFavorite,
}) => {
  const artwork = getGameArtwork(game.id);
  const isList = variant === 'list';

  // Truthful registry-backed state: only registered components are playable.
  const isPlayable = isGamePlayable(game.id);
  const statusLabel = isPlayable ? 'PLAYABLE' : 'SOON';

  const bestLabel = getBestScoreLabel(game.scoreType);
  const best = toBestScore(highScore, game.scoreType);
  const bestText = best === null ? null : `${bestLabel} ${formatBestScore(best, game.scoreType)}`;

  const art = artwork ? (
    <Image source={artwork} style={styles.artwork} resizeMode="cover" />
  ) : (
    <View style={[styles.artwork, styles.artFallback]}>
      <Ionicons name={game.iconName as any} size={isList ? 24 : 40} color={Colors.primary} />
    </View>
  );

  const favoriteBtn = onToggleFavorite ? (
    <TouchableOpacity
      onPress={(e) => {
        e.stopPropagation?.();
        onToggleFavorite();
      }}
      style={[styles.favBtn, isList && styles.favBtnList]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      testID={`favorite-button-${game.id}`}
      accessibilityRole="button"
      accessibilityLabel={
        isFavorite
          ? `Remove ${game.title} from favorites`
          : `Add ${game.title} to favorites`
      }
      accessibilityHint="Toggles this game as a favorite"
      accessibilityState={{ selected: isFavorite }}
    >
      <Ionicons
        name={isFavorite ? 'heart' : 'heart-outline'}
        size={isList ? 20 : 18}
        color={isFavorite ? Colors.accentCoral : isList ? Colors.textMuted : Colors.textPrimary}
      />
    </TouchableOpacity>
  ) : null;

  const accessibilityLabel = [
    game.title,
    game.description,
    isPlayable ? 'Playable now' : 'Coming soon',
    bestText ? `${bestLabel} ${formatBestScore(best, game.scoreType)}` : null,
    isFavorite ? 'Favorite' : null,
  ]
    .filter(Boolean)
    .join('. ');

  const meta = (
    <View style={isList ? styles.metaList : styles.meta}>
      <Text style={isList ? styles.titleList : styles.title} numberOfLines={1}>
        {game.title}
      </Text>
      <Text style={styles.category} numberOfLines={isList ? 2 : 3}>
        {game.description}
      </Text>
      <View style={styles.badgeRow}>
        <View style={styles.catBadge}>
          <Text style={styles.catBadgeText}>{game.category.toUpperCase()}</Text>
        </View>
        <View
          style={isPlayable ? styles.playBadge : styles.soonBadge}
          testID={`game-status-${game.id}`}
        >
          {isPlayable && <View style={styles.greenDot} />}
          <Text style={isPlayable ? styles.playBadgeText : styles.soonBadgeText}>
            {statusLabel}
          </Text>
        </View>
        {bestText && (
          <View style={styles.score}>
            <Ionicons name="trophy" size={10} color={Colors.accentGold} />
            <Text style={styles.scoreText} numberOfLines={1}>
              {bestText}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (isList) {
    return (
      <TouchableOpacity
        style={styles.listCard}
        activeOpacity={0.85}
        onPress={onPress}
        testID={`game-card-${game.id}`}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Opens the game"
      >
        <View style={styles.artWrapList}>{art}</View>
        {meta}
        {favoriteBtn}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
      testID={`game-card-${game.id}`}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens the game"
    >
      <View style={styles.artWrap}>
        {art}
        {favoriteBtn}
      </View>
      {meta}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ---- Grid variant ----
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  artWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.surfaceHighlight,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  favBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  meta: {
    padding: 12,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },

  // ---- List variant ----
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    marginBottom: 12,
    minHeight: 104,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  artWrapList: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceHighlight,
  },
  favBtnList: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -17,
  },
  metaList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingRight: 44,
  },
  titleList: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },

  // ---- Shared ----
  category: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  catBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  playBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  playBadgeText: {
    color: Colors.accent,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  soonBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  soonBadgeText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
    maxWidth: '100%',
  },
  scoreText: {
    color: Colors.accentGold,
    fontSize: 10,
    fontWeight: '800',
  },
});
