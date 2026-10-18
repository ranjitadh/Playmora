import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { usePausedRef } from '../shared/usePausedRef';

interface CardItem {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const SYMBOLS = ['🚀', '🎮', '💎', '⚡', '🍕', '🎯', '🏆', '🌈'];

function generateDeck(): CardItem[] {
  const cards: CardItem[] = [];
  let id = 0;
  for (const s of SYMBOLS) {
    cards.push({ id: id++, symbol: s, isFlipped: false, isMatched: false });
    cards.push({ id: id++, symbol: s, isFlipped: false, isMatched: false });
  }
  return cards.sort(() => Math.random() - 0.5);
}

export const MemoryFlipGame: React.FC<GameSessionProps> = ({
  onScoreUpdate,
  onGameOver,
  isMuted,
  isHapticsEnabled,
  isPaused,
}) => {
  const [deck, setDeck] = useState<CardItem[]>(() => generateDeck());
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const isFinishedRef = useRef(false);
  const pausedRef = usePausedRef(isPaused);

  // Timer loop
  useEffect(() => {
    if (isFinishedRef.current) return;
    const interval = setInterval(() => {
      if (!pausedRef.current) setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCardPress = (index: number) => {
    if (isProcessing || isFinishedRef.current) return;
    const card = deck[index];
    if (card.isFlipped || card.isMatched) return;

    if (!isMuted) audioService.playSound('pop');
    if (isHapticsEnabled) hapticsService.lightImpact();

    const newDeck = [...deck];
    newDeck[index] = { ...card, isFlipped: true };
    const newFlipped = [...flippedIndices, index];

    setDeck(newDeck);
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setIsProcessing(true);
      const nextMoves = moves + 1;
      setMoves(nextMoves);

      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = newDeck[firstIdx];
      const secondCard = newDeck[secondIdx];

      if (firstCard.symbol === secondCard.symbol) {
        // Matched!
        setTimeout(() => {
          newDeck[firstIdx].isMatched = true;
          newDeck[secondIdx].isMatched = true;
          setDeck([...newDeck]);
          setFlippedIndices([]);
          setIsProcessing(false);

          const nextPairs = matchedPairs + 1;
          setMatchedPairs(nextPairs);

          const scoreGain = Math.max(10, 400 - nextMoves * 10 - seconds * 3) + nextPairs * 25;
          onScoreUpdate(scoreGain);

          if (!isMuted) audioService.playSound('match');
          if (isHapticsEnabled) hapticsService.success();

          if (nextPairs === SYMBOLS.length) {
            isFinishedRef.current = true;
            const finalScore = Math.max(50, 600 - nextMoves * 12 - seconds * 4);
            onScoreUpdate(finalScore);
            if (!isMuted) audioService.playSound('victory');
            onGameOver(finalScore, { moves: nextMoves, timeSeconds: seconds });
          }
        }, 300);
      } else {
        // Mismatch
        setTimeout(() => {
          newDeck[firstIdx].isFlipped = false;
          newDeck[secondIdx].isFlipped = false;
          setDeck([...newDeck]);
          setFlippedIndices([]);
          setIsProcessing(false);
          if (!isMuted) audioService.playSound('tap');
        }, 750);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Top HUD */}
      <View style={styles.hudRow}>
        <View style={styles.hudBox}>
          <Text style={styles.hudLabel}>MOVES</Text>
          <Text style={styles.hudValue}>{moves}</Text>
        </View>

        <View style={styles.pairsBadge}>
          <Text style={styles.pairsLabel}>PAIRS</Text>
          <Text style={styles.pairsValue}>
            {matchedPairs} / {SYMBOLS.length}
          </Text>
        </View>

        <View style={styles.hudBox}>
          <Text style={styles.hudLabel}>TIME</Text>
          <Text style={styles.hudValue}>{seconds}s</Text>
        </View>
      </View>

      {/* 4x4 Card Grid */}
      <View style={styles.cardGrid}>
        {deck.map((card, idx) => {
          const isRevealed = card.isFlipped || card.isMatched;
          return (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.card,
                isRevealed && styles.cardFlipped,
                card.isMatched && styles.cardMatched,
              ]}
              activeOpacity={0.7}
              onPress={() => handleCardPress(idx)}
              disabled={isRevealed || isProcessing}
            >
              {isRevealed ? (
                <Text style={styles.cardEmoji}>{card.symbol}</Text>
              ) : (
                <View style={styles.cardBack}>
                  <Text style={styles.cardBackIcon}>✦</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.hintText}>Find matching pairs in minimal moves and time!</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hudBox: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hudLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hudValue: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  pairsBadge: {
    backgroundColor: Colors.secondaryDark,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
  },
  pairsLabel: {
    color: '#DDD',
    fontSize: 9,
    fontWeight: '700',
  },
  pairsValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginVertical: 12,
  },
  card: {
    width: '22.5%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  cardFlipped: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.primary,
  },
  cardMatched: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: Colors.accent,
  },
  cardBack: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBackIcon: {
    color: Colors.borderSubtle,
    fontSize: 24,
    fontWeight: '800',
  },
  cardEmoji: {
    fontSize: 32,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  hintText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
});
