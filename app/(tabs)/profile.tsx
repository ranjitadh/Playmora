import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SettingsRepository, AppSettings } from '../../src/database/settingsRepository';
import { ScoreRepository } from '../../src/database/scoreRepository';
import { FavoriteRepository } from '../../src/database/favoriteRepository';
import { GAME_CATALOG, getGameById } from '../../src/games/catalog';
import type { ScoreType } from '../../src/games/types';
import { Achievement, AchievementService } from '../../src/services/achievementService';
import { audioService } from '../../src/services/audioService';
import { hapticsService } from '../../src/services/hapticsService';
import { adService } from '../../src/services/adService';
import { Colors } from '../../src/theme/colors';
import { isLowerIsBetter, getBestScoreLabel } from '../../src/games/scoreUtils';

interface LocalStats {
  gamesPlayed: number;
  distinctGames: number;
  favorites: number;
  best: { label: string; value: string; title: string } | null;
}

const EMPTY_STATS: LocalStats = {
  gamesPlayed: 0,
  distinctGames: 0,
  favorites: 0,
  best: null,
};

export default function ProfileScreen() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [testAdsEnabled, setTestAdsEnabled] = useState(false);

  const [stats, setStats] = useState<LocalStats>(EMPTY_STATS);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadLocalData = useCallback(async () => {
    try {
      const [settings, scoreStats, favoriteIds, achievementList] = await Promise.all([
        SettingsRepository.getSettings(),
        ScoreRepository.getAllStats(),
        FavoriteRepository.getAllFavorites(),
        AchievementService.getAchievements(),
      ]);

      setSoundEnabled(settings.soundEnabled);
      setHapticsEnabled(settings.hapticsEnabled);
      audioService.setEnabled(settings.soundEnabled);
      hapticsService.setEnabled(settings.hapticsEnabled);

      let gamesPlayed = 0;
      let bestHigher: { score: number; scoreType: ScoreType; title: string } | null = null;
      let bestLower: { score: number; scoreType: ScoreType; title: string } | null = null;

      for (const [gid, s] of Object.entries(scoreStats)) {
        gamesPlayed += s.timesPlayed;
        if (s.bestScore === null) continue;
        const title = getGameById(gid)?.title ?? gid;
        if (isLowerIsBetter(s.scoreType)) {
          if (!bestLower || s.bestScore < bestLower.score) {
            bestLower = { score: s.bestScore, scoreType: s.scoreType, title };
          }
        } else if (!bestHigher || s.bestScore > bestHigher.score) {
          bestHigher = { score: s.bestScore, scoreType: s.scoreType, title };
        }
      }

      const bestEntry = bestHigher ?? bestLower;
      setStats({
        gamesPlayed,
        distinctGames: Object.keys(scoreStats).length,
        favorites: favoriteIds.length,
        best: bestEntry
          ? {
              label: getBestScoreLabel(bestEntry.scoreType),
              value: String(bestEntry.score),
              title: bestEntry.title,
            }
          : null,
      });
      setAchievements(achievementList);
      setLoadError(null);
    } catch (e) {
      console.warn('Error loading profile data:', e);
      setLoadError('Could not load your local stats. Pull to retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh stats/achievements/settings whenever the Profile tab gains focus.
  useFocusEffect(
    useCallback(() => {
      loadLocalData();
    }, [loadLocalData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLocalData();
    setRefreshing(false);
  }, [loadLocalData]);

  const handleSoundToggle = async (val: boolean) => {
    setSoundEnabled(val);
    audioService.setEnabled(val);
    await SettingsRepository.setSetting('soundEnabled', val);
    if (val) audioService.playSound('pop');
  };

  const handleHapticsToggle = async (val: boolean) => {
    setHapticsEnabled(val);
    hapticsService.setEnabled(val);
    await SettingsRepository.setSetting('hapticsEnabled', val);
    if (val) hapticsService.lightImpact();
  };

  const handleTestAdsToggle = (val: boolean) => {
    setTestAdsEnabled(val);
    adService.setEnabled(val);
  };

  const handleShowPrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Playmora does not collect personal identifiers, device telemetry, or personal data. All scores, settings, and progress remain 100% local on your device. No accounts, no cloud sync, no online services.',
      [{ text: 'Understood' }]
    );
  };

  const unlockedCount = achievements.filter((a) => a.unlockedAt !== null).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Local Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            YOUR STATS
          </Text>

          {isLoading ? (
            <View style={styles.card} testID="profile-loading">
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>Loading your local stats…</Text>
            </View>
          ) : loadError ? (
            <View style={styles.errorCard} testID="profile-error">
              <Text style={styles.errorText}>{loadError}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={loadLocalData}
                testID="profile-retry"
                accessibilityRole="button"
                accessibilityLabel="Retry loading stats"
                accessibilityHint="Reloads local stats and achievements"
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.statsGrid} testID="profile-stats">
                <StatBox
                  testID="stat-games-played"
                  icon="game-controller-outline"
                  color={Colors.primary}
                  label="Games Played"
                  value={String(stats.gamesPlayed)}
                />
                <StatBox
                  testID="stat-distinct-games"
                  icon="albums-outline"
                  color={Colors.accent}
                  label="Distinct Games"
                  value={`${stats.distinctGames} / ${GAME_CATALOG.length}`}
                />
                <StatBox
                  testID="stat-favorites"
                  icon="heart-outline"
                  color={Colors.accentCoral}
                  label="Favorites"
                  value={String(stats.favorites)}
                />
                <StatBox
                  testID="stat-best-score"
                  icon="trophy-outline"
                  color={Colors.accentGold}
                  label="Best Score"
                  value={stats.best ? stats.best.value : '—'}
                />
              </View>
              {stats.best && (
                <Text style={styles.bestCaption} testID="stat-best-caption">
                  {stats.best.label}: {stats.best.value} in {stats.best.title}
                </Text>
              )}
              {stats.gamesPlayed === 0 && (
                <Text style={styles.emptyCaption} testID="profile-stats-empty">
                  Play a mini game to start building your stats — everything is stored
                  offline on this device.
                </Text>
              )}
            </>
          )}
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeader} accessibilityRole="header">
              ACHIEVEMENTS
            </Text>
            <Text style={styles.sectionMeta} testID="achievements-count">
              {unlockedCount} of {achievements.length} unlocked
            </Text>
          </View>

          <View style={styles.card}>
            {isLoading ? (
              <Text style={styles.emptyCaption}>Loading achievements…</Text>
            ) : achievements.length === 0 ? (
              <Text style={styles.emptyCaption}>No achievements available yet.</Text>
            ) : (
              achievements.map((ach) => {
                const unlocked = ach.unlockedAt !== null;
                const progress = Math.min(
                  100,
                  Math.round((ach.progress / Math.max(1, ach.maxProgress)) * 100)
                );
                return (
                  <View
                    key={ach.id}
                    style={styles.achievementRow}
                    testID={`achievement-${ach.id}`}
                    accessibilityLabel={`${ach.title}. ${ach.description}. ${
                      unlocked ? 'Unlocked' : `Progress ${ach.progress} of ${ach.maxProgress}`
                    }`}
                  >
                    <View
                      style={[
                        styles.achievementIcon,
                        unlocked && styles.achievementIconUnlocked,
                      ]}
                    >
                      <Ionicons
                        name={(unlocked ? 'trophy' : ach.icon) as any}
                        size={16}
                        color={unlocked ? Colors.accentGold : Colors.textMuted}
                      />
                    </View>
                    <View style={styles.achievementBody}>
                      <View style={styles.achievementTitleRow}>
                        <Text style={styles.achievementTitle} numberOfLines={1}>
                          {ach.title}
                        </Text>
                        {unlocked && (
                          <View style={styles.unlockedBadge}>
                            <Text style={styles.unlockedBadgeText}>UNLOCKED</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.achievementDesc} numberOfLines={2}>
                        {ach.description}
                      </Text>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${progress}%` },
                            unlocked && styles.progressFillUnlocked,
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Game Feedback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            AUDIO & CONTROLS
          </Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="volume-high-outline"
                  size={22}
                  color={Colors.primary}
                  style={styles.icon}
                />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Sound Effects</Text>
                  <Text style={styles.rowSubtitle}>Synthesized retro game audio</Text>
                </View>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={handleSoundToggle}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#FFF"
                testID="toggle-sound"
                accessibilityRole="switch"
                accessibilityLabel="Sound effects"
                accessibilityHint="Toggles synthesized game sounds"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={22}
                  color={Colors.accent}
                  style={styles.icon}
                />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Haptic Feedback</Text>
                  <Text style={styles.rowSubtitle}>Tactile vibration pulses on action</Text>
                </View>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={handleHapticsToggle}
                trackColor={{ false: Colors.border, true: Colors.accent }}
                thumbColor="#FFF"
                testID="toggle-haptics"
                accessibilityRole="switch"
                accessibilityLabel="Haptic feedback"
                accessibilityHint="Toggles vibration feedback during games"
              />
            </View>
          </View>
        </View>

        {/* Offline & Architecture */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            STORAGE & PRIVACY
          </Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={22}
                  color={Colors.accentGold}
                  style={styles.icon}
                />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Offline Architecture</Text>
                  <Text style={styles.rowSubtitle}>Local SQLite database on device</Text>
                </View>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>ACTIVE</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.row}
              onPress={handleShowPrivacyPolicy}
              testID="privacy-policy"
              accessibilityRole="button"
              accessibilityLabel="Privacy policy"
              accessibilityHint="Opens the Playmora privacy policy"
            >
              <View style={styles.rowLeft}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color={Colors.primary}
                  style={styles.icon}
                />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Privacy Policy</Text>
                  <Text style={styles.rowSubtitle}>Zero tracking, zero remote servers</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Monetization / Dev settings */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            DEVELOPER AD CONFIGURATION
          </Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="pricetag-outline"
                  size={22}
                  color={Colors.accentCoral}
                  style={styles.icon}
                />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>AdMob Test Mode</Text>
                  <Text style={styles.rowSubtitle}>Google test ad units toggle</Text>
                </View>
              </View>
              <Switch
                value={testAdsEnabled}
                onValueChange={handleTestAdsToggle}
                trackColor={{ false: Colors.border, true: Colors.accentCoral }}
                thumbColor="#FFF"
                testID="toggle-test-ads"
                accessibilityRole="switch"
                accessibilityLabel="AdMob test mode"
                accessibilityHint="Toggles Google test advertisement units"
              />
            </View>
          </View>
        </View>

        {/* About App */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            ABOUT
          </Text>

          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Application</Text>
              <Text style={styles.aboutValue}>Playmora</Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Version</Text>
              <Text style={styles.aboutValue}>1.0.0 (Release Candidate 1)</Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Architecture</Text>
              <Text style={styles.aboutValue}>Expo / React Native / SQLite</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({
  icon,
  color,
  label,
  value,
  testID,
}: {
  icon: string;
  color: string;
  label: string;
  value: string;
  testID: string;
}) {
  return (
    <View
      style={styles.statBox}
      testID={testID}
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="summary"
    >
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
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
  section: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginLeft: 4,
    gap: 8,
  },
  sectionHeader: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionMeta: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    marginRight: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statBox: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    alignItems: 'flex-start',
    gap: 4,
    minHeight: 92,
    justifyContent: 'center',
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  bestCaption: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 10,
    marginLeft: 4,
  },
  emptyCaption: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    marginLeft: 4,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: Colors.textPrimary,
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: Colors.accentCoral,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  achievementIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  achievementIconUnlocked: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  achievementBody: {
    flex: 1,
  },
  achievementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  achievementTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  unlockedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unlockedBadgeText: {
    color: '#0A7A57',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  achievementDesc: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  progressFillUnlocked: {
    backgroundColor: Colors.accent,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 56,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowText: {
    flex: 1,
    paddingRight: 8,
  },
  icon: {
    marginRight: 14,
  },
  rowTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  badge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#8A5A05',
    fontSize: 10,
    fontWeight: '800',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    minHeight: 40,
    alignItems: 'center',
    gap: 12,
  },
  aboutLabel: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  aboutValue: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
});
