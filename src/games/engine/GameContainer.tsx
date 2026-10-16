import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  BackHandler,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameDefinition } from '../types';
import { getGameComponent } from '../registry';
import { isMultiplayerGame } from '../catalog';
import { Colors } from '../../theme/colors';
import { ScoreRepository } from '../../database/scoreRepository';
import { SettingsRepository } from '../../database/settingsRepository';
import { AchievementService } from '../../services/achievementService';
import { DailyChallengeService } from '../../services/dailyChallengeService';
import { adService } from '../../services/adService';
import { audioService } from '../../services/audioService';
import { hapticsService } from '../../services/hapticsService';
import {
  BestScore,
  formatBestScore,
  getBestScoreLabel,
  getFinalScoreLabel,
  isLowerIsBetter,
} from '../scoreUtils';

interface GameContainerProps {
  game: GameDefinition;
  onExit: () => void;
}

export const GameContainer: React.FC<GameContainerProps> = ({ game, onExit }) => {
  const [sessionKey, setSessionKey] = useState(1);
  const [currentScore, setCurrentScore] = useState(0);
  const [bestScore, setBestScore] = useState<BestScore>(null);
  const [isGameOverModalVisible, setIsGameOverModalVisible] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [didWin, setDidWin] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isHapticsEnabled, setIsHapticsEnabled] = useState(true);
  const [isHowToPlayVisible, setIsHowToPlayVisible] = useState(false);

  // A session may record GAME OVER only once; restart fully resets it.
  const gameOverHandledRef = useRef(false);

  const isMultiplayer = isMultiplayerGame(game);
  const bestLabel = getBestScoreLabel(game.scoreType);
  const finalLabel = getFinalScoreLabel(game.scoreType);

  // Initialize sound/haptics from persisted settings and keep services in sync.
  useEffect(() => {
    let cancelled = false;
    SettingsRepository.getSettings()
      .then((settings) => {
        if (cancelled) return;
        setIsMuted(!settings.soundEnabled);
        setIsHapticsEnabled(settings.hapticsEnabled);
        audioService.setEnabled(settings.soundEnabled);
        hapticsService.setEnabled(settings.hapticsEnabled);
      })
      .catch((e) => console.warn('Failed to load settings:', e));
    return () => {
      cancelled = true;
    };
  }, []);

  // Load existing best score for the current session.
  useEffect(() => {
    let cancelled = false;
    ScoreRepository.getBestScore(game.id)
      .then((best) => {
        if (!cancelled) setBestScore(best);
      })
      .catch((e) => console.warn('Failed to load best score:', e));
    return () => {
      cancelled = true;
    };
  }, [game.id, sessionKey]);

  // Reset session state when switching to a different game.
  useEffect(() => {
    gameOverHandledRef.current = false;
    setIsGameOverModalVisible(false);
    setIsHowToPlayVisible(false);
    setCurrentScore(0);
    setFinalScore(0);
    setIsNewHighScore(false);
    setDidWin(false);
  }, [game.id]);

  // Android back button handling
  useEffect(() => {
    const backAction = () => {
      onExit();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onExit]);

  const handleScoreUpdate = useCallback((score: number) => {
    if (gameOverHandledRef.current) return;
    setCurrentScore(score);
  }, []);

  // Shared finish path for both losses and wins. A session may finish only once;
  // whichever of onGameOver/onGameWin arrives first wins.
  const finishGame = useCallback(
    async (score: number, metadata: Record<string, unknown> | undefined, won: boolean) => {
      if (gameOverHandledRef.current) return;
      gameOverHandledRef.current = true;

      setFinalScore(score);
      setDidWin(won);

      try {
        // Record score in the local database using the game's score mode.
        const result = await ScoreRepository.recordScore(game.id, score, metadata);
        setIsNewHighScore(result.isNewHighScore);
        setBestScore(result.bestScore);

        // Persist today's daily challenge completion when the finish qualifies.
        const daily = await DailyChallengeService.completeIfSatisfied({
          gameId: game.id,
          score,
        });
        if (daily.newlyCompleted) {
          await AchievementService.markDailyChallengeCompleted();
        }

        // Check achievements
        const allStats = await ScoreRepository.getAllStats();
        const distinctCount = Object.keys(allStats).length;
        const totalCount = Object.values(allStats).reduce((acc, s) => acc + s.timesPlayed, 0);

        await AchievementService.checkOnGameFinished({
          gameId: game.id,
          score,
          isNewHighScore: result.isNewHighScore,
          totalGamesPlayedCount: totalCount,
          distinctGamesPlayedCount: distinctCount,
        });
      } catch (e) {
        console.warn('Failed to persist game result:', e);
      }

      // Show interstitial ad if eligible (non-intrusive break between sessions)
      adService.onGameSessionCompleted();

      setIsGameOverModalVisible(true);
    },
    [game.id]
  );

  const handleGameOver = useCallback(
    (score: number, metadata?: Record<string, unknown>) => {
      void finishGame(score, metadata, false);
    },
    [finishGame]
  );

  const handleGameWin = useCallback(
    (score: number, metadata?: Record<string, unknown>) => {
      void finishGame(score, metadata, true);
    },
    [finishGame]
  );

  // Restart fully resets session state before the game remounts.
  const restartGame = useCallback(() => {
    gameOverHandledRef.current = false;
    setIsGameOverModalVisible(false);
    setIsHowToPlayVisible(false);
    setCurrentScore(0);
    setFinalScore(0);
    setIsNewHighScore(false);
    setDidWin(false);
    setSessionKey((prev) => prev + 1);
  }, []);

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    const soundEnabled = !nextMuted;
    setIsMuted(nextMuted);
    audioService.setEnabled(soundEnabled);
    SettingsRepository.setSetting('soundEnabled', soundEnabled).catch((e) =>
      console.warn('Failed to persist sound setting:', e)
    );
  }, [isMuted]);

  const openHowToPlay = useCallback(() => setIsHowToPlayVisible(true), []);
  const closeHowToPlay = useCallback(() => setIsHowToPlayVisible(false), []);

  const GameComponent = getGameComponent(game.id);

  const bestDisplay = formatBestScore(bestScore, game.scoreType);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Game Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={onExit}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID="game-back"
            accessibilityRole="button"
            accessibilityLabel="Back to games hub"
            accessibilityHint="Leaves the game and returns to the games hub"
          >
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.gameTitle} numberOfLines={1}>
              {game.title}
            </Text>
            {isMultiplayer ? (
              <Text
                style={styles.multiplayerTagText}
                testID="game-status"
                accessibilityRole="text"
                accessibilityLabel="Multiplayer game, pass and play"
              >
                PASS &amp; PLAY
              </Text>
            ) : (
              <Text
                style={styles.highScoreText}
                testID="game-best-score"
                accessibilityRole="text"
                accessibilityLabel={
                  bestScore === null
                    ? `${bestLabel}: no score yet`
                    : `${bestLabel}: ${bestDisplay}`
                }
              >
                {bestLabel}: {bestDisplay}
              </Text>
            )}
          </View>

          <View style={styles.rightActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={toggleMute}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="game-mute"
              accessibilityRole="switch"
              accessibilityLabel="Sound"
              accessibilityHint="Toggles game sound effects"
              accessibilityState={{ checked: !isMuted }}
            >
              <Ionicons
                name={isMuted ? 'volume-mute' : 'volume-high'}
                size={20}
                color={isMuted ? Colors.accentCoral : Colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerBtn}
              onPress={openHowToPlay}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="game-how-to-play"
              accessibilityRole="button"
              accessibilityLabel="How to play"
              accessibilityHint={`Opens instructions and rules for ${game.title}`}
            >
              <Ionicons name="help-circle-outline" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerBtn}
              onPress={restartGame}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="game-restart"
              accessibilityRole="button"
              accessibilityLabel="Restart game"
              accessibilityHint={`Restarts ${game.title} from the beginning`}
            >
              <Ionicons name="refresh" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Gameplay Area */}
        <View
          style={styles.gameContent}
          testID="game-region"
          accessibilityRole="summary"
          accessibilityLabel={`${game.title} game area`}
          accessibilityHint={game.instructions}
        >
          {GameComponent ? (
            <GameComponent
              key={`game-${game.id}-${sessionKey}`}
              gameId={game.id}
              onScoreUpdate={handleScoreUpdate}
              onGameOver={handleGameOver}
              onGameWin={handleGameWin}
              onExit={onExit}
              isMuted={isMuted}
              isHapticsEnabled={isHapticsEnabled}
            />
          ) : (
            <View style={styles.unimplementedContainer}>
              <Ionicons name="construct-outline" size={48} color={Colors.accentGold} />
              <Text style={styles.unimplementedTitle}>{game.title} is Coming Soon!</Text>
              <Text style={styles.unimplementedDesc}>{game.description}</Text>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={onExit}
                testID="game-coming-soon-exit"
                accessibilityRole="button"
                accessibilityLabel="Return to games hub"
                accessibilityHint="Closes this game and returns to the games hub"
              >
                <Text style={styles.backBtnText}>Return to Games Hub</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* How to Play */}
        <Modal
          visible={isHowToPlayVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeHowToPlay}
        >
          <View style={styles.howtoOverlay} accessibilityViewIsModal={true}>
            <View style={styles.howtoCard}>
              <View style={styles.howtoHeader}>
                <Text
                  style={styles.howtoTitle}
                  accessibilityRole="header"
                  testID="howto-title"
                >
                  How to Play: {game.title}
                </Text>
                <TouchableOpacity
                  style={styles.howtoCloseBtn}
                  onPress={closeHowToPlay}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  testID="howto-close"
                  accessibilityRole="button"
                  accessibilityLabel="Close how to play"
                  accessibilityHint="Closes the instructions and returns to the game"
                >
                  <Ionicons name="close" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.howtoScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.howtoSectionLabel} accessibilityRole="header">
                  INSTRUCTIONS
                </Text>
                <Text style={styles.howtoBody} testID="howto-instructions">
                  {game.instructions}
                </Text>

                <Text style={styles.howtoSectionLabel} accessibilityRole="header">
                  RULES
                </Text>
                {game.rules.map((rule, index) => (
                  <View key={`rule-${index}`} style={styles.ruleRow}>
                    <View style={styles.ruleDot} />
                    <Text style={styles.ruleText}>{rule}</Text>
                  </View>
                ))}

                <Text style={styles.howtoSectionLabel} accessibilityRole="header">
                  SCORING
                </Text>
                <Text style={styles.howtoBody} testID="howto-scoring">
                  {bestLabel} — {isLowerIsBetter(game.scoreType)
                    ? 'lower is better.'
                    : 'higher is better.'}
                </Text>
              </ScrollView>

              <TouchableOpacity
                style={styles.howtoDoneBtn}
                onPress={closeHowToPlay}
                activeOpacity={0.85}
                testID="howto-done"
                accessibilityRole="button"
                accessibilityLabel="Got it"
                accessibilityHint="Closes the instructions and returns to the game"
              >
                <Text style={styles.howtoDoneText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Game Over Modal */}
        <Modal
          visible={isGameOverModalVisible && !isMultiplayer}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsGameOverModalVisible(false)}
        >
          <View style={styles.modalOverlay} accessibilityViewIsModal={true}>
            <View style={styles.modalCard}>
              {isNewHighScore ? (
                <View style={styles.trophyBanner}>
                  <Ionicons name="trophy" size={32} color={Colors.accentGold} />
                  <Text style={styles.newPbText}>NEW PERSONAL BEST!</Text>
                </View>
              ) : (
                <Text
                  style={styles.modalGameOverText}
                  accessibilityRole="header"
                  testID="gameover-title"
                >
                  {didWin ? 'YOU WIN!' : 'GAME OVER'}
                </Text>
              )}

              <View style={styles.scoreRow}>
                <View
                  style={styles.scoreBox}
                  testID="gameover-final-score"
                  accessibilityRole="text"
                  accessibilityLabel={`Final ${finalLabel.toLowerCase()} ${finalScore}`}
                >
                  <Text style={styles.scoreBoxLabel}>FINAL {finalLabel}</Text>
                  <Text style={styles.scoreBoxValue}>{finalScore}</Text>
                </View>

                <View
                  style={styles.scoreBox}
                  testID="gameover-best-score"
                  accessibilityRole="text"
                  accessibilityLabel={
                    bestScore === null
                      ? `${bestLabel}: no score yet`
                      : `${bestLabel}: ${bestDisplay}`
                  }
                >
                  <Text style={styles.scoreBoxLabel}>{bestLabel}</Text>
                  <Text style={styles.scoreBoxValue}>{bestDisplay}</Text>
                </View>
              </View>

              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={styles.playAgainBtn}
                  onPress={restartGame}
                  activeOpacity={0.8}
                  testID="gameover-play-again"
                  accessibilityRole="button"
                  accessibilityLabel="Play again"
                  accessibilityHint={`Restarts ${game.title} for a new round`}
                >
                  <Ionicons name="play" size={20} color="#000" />
                  <Text style={styles.playAgainText}>Play Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exitBtn}
                  onPress={onExit}
                  activeOpacity={0.8}
                  testID="gameover-exit"
                  accessibilityRole="button"
                  accessibilityLabel="Exit to hub"
                  accessibilityHint="Leaves the game and returns to the games hub"
                >
                  <Text style={styles.exitText}>Exit to Hub</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 6,
  },
  headerBtn: {
    minWidth: 40,
    minHeight: 40,
    padding: 6,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  titleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  gameTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  highScoreText: {
    color: Colors.accentGold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  multiplayerTagText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 6,
  },
  gameContent: {
    flex: 1,
  },
  unimplementedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  unimplementedTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  unimplementedDesc: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 14,
  },
  howtoOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  howtoCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    elevation: 8,
  },
  howtoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  howtoTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  howtoCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  howtoScroll: {
    flexGrow: 0,
    maxHeight: 360,
    marginBottom: 12,
  },
  howtoSectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  howtoBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
  },
  ruleText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  howtoDoneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  howtoDoneText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
  },
  trophyBanner: {
    alignItems: 'center',
    marginBottom: 16,
  },
  newPbText: {
    color: Colors.accentGold,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  modalGameOverText: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreBoxLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scoreBoxValue: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
  },
  modalActionButtons: {
    width: '100%',
    gap: 10,
  },
  playAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 48,
    gap: 8,
  },
  playAgainText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
  exitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exitText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
});
