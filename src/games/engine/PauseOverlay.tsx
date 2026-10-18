import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

interface PauseOverlayProps {
  visible: boolean;
  gameTitle: string;
  onResume: () => void;
  onExit: () => void;
}

/**
 * Shared, game-agnostic pause dialog. Rendered by the engine while a session is
 * paused (manual pause or app backgrounding) so every game gets a consistent
 * pause UI without implementing one itself.
 */
export const PauseOverlay: React.FC<PauseOverlayProps> = ({
  visible,
  gameTitle,
  onResume,
  onExit,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onResume}
    >
      <View style={styles.overlay} accessibilityViewIsModal>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="pause" size={28} color={Colors.primary} />
          </View>
          <Text
            style={styles.title}
            accessibilityRole="header"
            testID="pause-title"
          >
            Paused
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {gameTitle} is paused
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onResume}
            activeOpacity={0.85}
            testID="pause-resume"
            accessibilityRole="button"
            accessibilityLabel="Resume game"
            accessibilityHint={`Resumes ${gameTitle}`}
          >
            <Ionicons name="play" size={18} color={Colors.textInverse} />
            <Text style={styles.primaryBtnText}>Resume</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onExit}
            activeOpacity={0.85}
            testID="pause-exit"
            accessibilityRole="button"
            accessibilityLabel="Exit to games hub"
            accessibilityHint="Leaves the game and returns to the games hub"
          >
            <Ionicons name="exit-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.secondaryBtnText}>Exit to Hub</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 14,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    minHeight: 48,
  },
  primaryBtnText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 10,
  },
  secondaryBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
});
