import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getGameById } from '../../src/games/catalog';
import { GameContainer } from '../../src/games/engine/GameContainer';
import { Colors } from '../../src/theme/colors';

export default function GameScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();

  const game = getGameById(gameId);

  if (!game) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Game Not Found</Text>
        <Text style={styles.errorSubtitle}>
          The requested game identifier "{gameId}" could not be located in the catalog.
        </Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          testID="game-not-found-back"
          accessibilityRole="button"
          accessibilityLabel="Return to arcade"
          accessibilityHint="Navigates back to the previous screen"
        >
          <Text style={styles.backBtnText}>Return to Arcade</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <GameContainer game={game} onExit={() => router.back()} />;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    color: Colors.accentCoral,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorSubtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  backBtnText: {
    color: Colors.textInverse,
    fontWeight: '800',
    fontSize: 14,
  },
});
