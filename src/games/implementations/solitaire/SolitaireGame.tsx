import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Retro } from '../shared/gameTheme';
import {
  Card,
  SolState,
  canPlaceOnFoundation,
  canPlaceOnTableau,
  dealSolitaire,
  draw,
  isValidRun,
  moveFoundationToTableau,
  moveTableauToFoundation,
  moveTableauToTableau,
  moveWasteToFoundation,
  moveWasteToTableau,
} from './solitaireLogic';

const SUIT_CHARS = ['♥', '♦', '♣', '♠'];
const FOUNDATION_SUITS = [0, 1, 2, 3];

function rankLabel(rank: number): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

function cardColor(suit: number): string {
  return suit < 2 ? '#D64545' : '#202124';
}

interface Selection {
  col: number;
  index: number;
}

export const SolitaireGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, onExit, isMuted, isHapticsEnabled }) => {
  const [area, setArea] = useState({ w: 340, h: 520 });
  const [sol, setSol] = useState<SolState>(() => dealSolitaire());
  const [sel, setSel] = useState<Selection | null>(null);
  const finishedRef = useRef(false);

  const gap = 4;
  const colW = Math.max(34, (area.w - gap * 6) / 7);
  const cardH = colW * 1.45;
  const overlap = Math.max(14, cardH * 0.32);

  useEffect(() => {
    onScoreUpdate(sol.score);
  }, [sol, onScoreUpdate]);

  useEffect(() => {
    if (sol.outcome === 'won' && !finishedRef.current) {
      finishedRef.current = true;
      if (!isMuted) audioService.playSound('victory');
      if (isHapticsEnabled) hapticsService.success();
      onGameOver(sol.score, { moves: sol.moves });
    }
  }, [sol, onGameOver, isMuted, isHapticsEnabled]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  }, []);

  const newDeal = useCallback(() => {
    finishedRef.current = false;
    setSol(dealSolitaire());
    setSel(null);
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted]);

  const tapStock = useCallback(() => {
    setSel(null);
    setSol((s) => draw(s));
    if (!isMuted) audioService.playSound('tap');
    if (isHapticsEnabled) hapticsService.selection();
  }, [isMuted, isHapticsEnabled]);

  const autoFoundation = useCallback((card: Card, s: SolState): number | null => {
    if (canPlaceOnFoundation(card, s.foundations[card.suit].slice(-1)[0])) return card.suit;
    return null;
  }, []);

  const tapWaste = useCallback(() => {
    setSel(null);
    setSol((s) => {
      if (s.waste.length === 0) return s;
      const card = s.waste[s.waste.length - 1];
      if (autoFoundation(card, s) !== null) return moveWasteToFoundation(s);
      for (let to = 0; to < s.tableau.length; to++) {
        const top = s.tableau[to][s.tableau[to].length - 1];
        if (canPlaceOnTableau(card, top)) return moveWasteToTableau(s, to);
      }
      return s;
    });
    if (!isMuted) audioService.playSound('pop');
  }, [autoFoundation, isMuted]);

  const tapTableauCard = useCallback(
    (col: number, index: number) => {
      setSol((s) => {
        if (sel) {
          if (sel.col === col) {
            setSel(null);
            return s;
          }
          const count = s.tableau[sel.col].length - sel.index;
          const next = moveTableauToTableau(s, sel.col, col, count);
          setSel(null);
          if (!isMuted && next.moves !== s.moves) audioService.playSound('pop');
          return next;
        }
        const cards = s.tableau[col];
        const card = cards[index];
        if (!card || !card.up) return s;
        const run = cards.slice(index);
        if (isValidRun(run) && index === cards.length - 1) {
          const foundation = autoFoundation(card, s);
          if (foundation !== null) {
            if (!isMuted) audioService.playSound('match');
            return moveTableauToFoundation(s, col);
          }
        }
        if (isValidRun(run)) {
          setSel({ col, index });
          if (isHapticsEnabled) hapticsService.selection();
        }
        return s;
      });
    },
    [sel, autoFoundation, isMuted, isHapticsEnabled]
  );

  const tapEmptyColumn = useCallback(
    (col: number) => {
      if (!sel) return;
      setSel(null);
      setSol((s) => {
        const count = s.tableau[sel.col].length - sel.index;
        const next = moveTableauToTableau(s, sel.col, col, count);
        if (!isMuted && next.moves !== s.moves) audioService.playSound('pop');
        return next;
      });
    },
    [sel, isMuted]
  );

  const tapFoundation = useCallback(
    (suit: number) => {
      setSel(null);
      setSol((s) => {
        const foundation = s.foundations[suit];
        if (foundation.length === 0) return s;
        const card = foundation[foundation.length - 1];
        for (let to = 0; to < s.tableau.length; to++) {
          const top = s.tableau[to][s.tableau[to].length - 1];
          if (canPlaceOnTableau(card, top)) return moveFoundationToTableau(s, suit, to);
        }
        return s;
      });
    },
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.deviceFrame}>
        <View style={styles.plastic} onLayout={onLayout}>
          <View style={styles.topRow}>
        {FOUNDATION_SUITS.map((suit) => {
          const pile = sol.foundations[suit];
          const top = pile[pile.length - 1];
          return (
            <TouchableOpacity key={suit} style={[styles.slot, { width: colW, height: cardH }]} onPress={() => tapFoundation(suit)} activeOpacity={0.8}>
              {top ? (
                <View style={[styles.card, styles.cardUp]}>
                  <Text style={[styles.rank, { color: cardColor(top.suit) }]}>{rankLabel(top.rank)}</Text>
                  <Text style={[styles.suit, { color: cardColor(top.suit) }]}>{SUIT_CHARS[top.suit]}</Text>
                </View>
              ) : (
                <Text style={styles.slotGlyph}>{SUIT_CHARS[suit]}</Text>
              )}
            </TouchableOpacity>
          );
        })}
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={[styles.slot, { width: colW, height: cardH }]} onPress={tapStock} activeOpacity={0.8}>
          {sol.stock.length > 0 ? (
            <View style={[styles.card, styles.cardBack]}>
              <Ionicons name="layers" size={Math.max(14, colW * 0.5)} color={Retro.plastic} />
            </View>
          ) : (
            <Ionicons name="refresh" size={Math.max(14, colW * 0.5)} color={Retro.inkSoft} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.slot, { width: colW, height: cardH }]} onPress={tapWaste} activeOpacity={0.8}>
          {sol.waste.length > 0 ? (
            <View style={[styles.card, styles.cardUp]}>
              <Text style={[styles.rank, { color: cardColor(sol.waste[sol.waste.length - 1].suit) }]}>
                {rankLabel(sol.waste[sol.waste.length - 1].rank)}
              </Text>
              <Text style={[styles.suit, { color: cardColor(sol.waste[sol.waste.length - 1].suit) }]}>
                {SUIT_CHARS[sol.waste[sol.waste.length - 1].suit]}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View style={[styles.tableauRow, { marginTop: 12 }]}>
        {sol.tableau.map((cards, col) => (
          <View key={col} style={{ width: colW, minHeight: cardH }}>
            {cards.length === 0 && (
              <TouchableOpacity style={[styles.emptySlot, { width: colW, height: cardH }]} onPress={() => tapEmptyColumn(col)} activeOpacity={0.7}>
                <Ionicons name="add" size={16} color="rgba(47,44,28,0.3)" />
              </TouchableOpacity>
            )}
            {cards.map((card, i) => {
              const selected = sel && sel.col === col && i >= sel.index;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.9}
                  onPress={() => tapTableauCard(col, i)}
                  style={[
                    styles.card,
                    { position: 'absolute', top: i * overlap, width: colW, height: cardH },
                    card.up ? styles.cardUp : styles.cardBack,
                    selected && styles.cardSelected,
                  ]}
                >
                  {card.up && (
                    <>
                      <Text style={[styles.rank, { color: cardColor(card.suit) }]}>{rankLabel(card.rank)}</Text>
                      <Text style={[styles.suit, { color: cardColor(card.suit) }]}>{SUIT_CHARS[card.suit]}</Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={newDeal} activeOpacity={0.85}>
          <Ionicons name="shuffle" size={18} color={Retro.plastic} />
          <Text style={styles.primaryBtnText}>New Deal</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onExit} style={styles.exitRow}>
          <Ionicons name="chevron-back" size={16} color={Retro.inkSoft} />
          <Text style={styles.exitText}>Back</Text>
        </TouchableOpacity>
      </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: Colors.background, justifyContent: 'center' },
  deviceFrame: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: Retro.frame, borderRadius: 40, padding: 8, borderWidth: 2, borderColor: Retro.frameDark },
  plastic: { flex: 1, backgroundColor: Retro.plastic, borderRadius: 32, padding: 12, justifyContent: 'center' },
  topRow: { flexDirection: 'row', gap: 4 },
  tableauRow: { flexDirection: 'row', gap: 4 },
  slot: { borderRadius: 8, borderWidth: 2, borderColor: 'rgba(47,44,28,0.4)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(47,44,28,0.08)' },
  slotGlyph: { fontSize: 18, color: 'rgba(47,44,28,0.5)', fontWeight: '900' },
  emptySlot: { borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(47,44,28,0.45)', alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
  cardUp: { backgroundColor: '#FFFFFF' },
  cardBack: { backgroundColor: Retro.ink, alignItems: 'center', justifyContent: 'center' },
  cardSelected: { borderColor: Retro.frameDark, borderWidth: 3 },
  rank: { fontSize: 16, fontWeight: '900', position: 'absolute', top: 4, left: 6 },
  suit: { fontSize: 20, fontWeight: '900' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Retro.ink, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20 },
  primaryBtnText: { color: Retro.plastic, fontSize: 15, fontWeight: '800' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14 },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  exitText: { color: Retro.inkSoft, fontSize: 13, fontWeight: '700' },
});
