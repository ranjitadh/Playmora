import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  BackgammonState,
  BPlayer,
  Source,
  applyMove,
  countOn,
  createBackgammon,
  endTurn,
  legalMoves,
  noMoves,
  roll,
} from './backgammonLogic';
import { BoardResultOverlay, TwoPlayerBar, boardStyles } from '../shared/boardUi';

const WHITE = '#F4F4F6';
const BLACK = '#202124';
const NAME: [string, string] = ['White', 'Black'];

export const BackgammonGame: React.FC<GameSessionProps> = ({ onExit, isMuted, isHapticsEnabled }) => {
  const [game, setGame] = useState<BackgammonState>(() => createBackgammon());
  const [selected, setSelected] = useState<Source | null>(null);
  const [wins, setWins] = useState<[number, number]>([0, 0]);

  const isOver = game.outcome !== 'in_progress';
  const moves = useMemo(() => legalMoves(game), [game]);

  const movesFrom = useMemo(() => {
    const map = new Map<Source, { to: number | 'off'; die: number }[]>();
    for (const m of moves) {
      const arr = map.get(m.from) ?? [];
      arr.push({ to: m.to, die: m.die });
      map.set(m.from, arr);
    }
    return map;
  }, [moves]);

  const destinations = useMemo(() => {
    if (selected === null) return new Map<number | 'off', number>();
    const map = new Map<number | 'off', number>();
    for (const opt of movesFrom.get(selected) ?? []) if (!map.has(opt.to)) map.set(opt.to, opt.die);
    return map;
  }, [selected, movesFrom]);

  const doRoll = useCallback(() => {
    if (isOver || game.dice.length > 0) return;
    setGame(roll(game));
    setSelected(null);
    if (!isMuted) audioService.playSound('tap');
    if (isHapticsEnabled) hapticsService.lightImpact();
  }, [game, isOver, isMuted, isHapticsEnabled]);

  const pass = useCallback(
    (from: BackgammonState) => {
      setGame(endTurn(from));
      setSelected(null);
      if (!isMuted) audioService.playSound('pop');
    },
    [isMuted]
  );

  const commit = useCallback(
    (to: number | 'off') => {
      if (selected === null) return;
      const die = destinations.get(to);
      if (die === undefined) return;
      const next = applyMove(game, { from: selected, to, die });
      setGame(next);
      setSelected(null);
      if (next.outcome === 'win') {
        setWins((w) => (next.winner === 0 ? [w[0] + 1, w[1]] : [w[0], w[1] + 1]));
        if (!isMuted) audioService.playSound('victory');
        if (isHapticsEnabled) hapticsService.success();
      } else if (isHapticsEnabled) {
        hapticsService.lightImpact();
      }
    },
    [game, selected, destinations, isMuted, isHapticsEnabled]
  );

  useEffect(() => {
    if (isOver || game.dice.length === 0) return;
    if (noMoves(game)) {
      const t = setTimeout(() => pass(game), 700);
      return () => clearTimeout(t);
    }
  }, [game, isOver, pass]);

  const onPoint = useCallback(
    (idx: number, player: BPlayer, hasChecker: boolean) => {
      if (isOver || game.dice.length === 0) return;
      if (destinations.has(idx)) {
        commit(idx);
        return;
      }
      if (player === game.turn && hasChecker && movesFrom.has(idx)) {
        setSelected((s) => (s === idx ? null : idx));
        if (!isMuted) audioService.playSound('tap');
      }
    },
    [isOver, game, destinations, movesFrom, commit, isMuted]
  );

  const playAgain = useCallback(() => {
    setGame(createBackgammon());
    setSelected(null);
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted]);

  const renderPoint = (idx: number) => {
    const white = countOn(game, 0, idx);
    const black = countOn(game, 1, idx);
    const owner: BPlayer = white > 0 ? 0 : 1;
    const total = white + black;
    const has = total > 0;
    const isSel = selected === idx;
    const isDest = destinations.has(idx);
    const selectable = game.dice.length > 0 && has && owner === game.turn && movesFrom.has(idx);
    const color = white > 0 ? WHITE : BLACK;
    return (
      <TouchableOpacity
        key={idx}
        style={[styles.point, isSel && styles.pointSel, isDest && styles.pointDest]}
        activeOpacity={0.8}
        onPress={() => onPoint(idx, owner, has)}
        accessibilityRole="button"
        accessibilityLabel={`Point ${idx + 1}`}
      >
        {selectable && !isSel && <View style={styles.selectableDot} />}
        <View style={styles.stack}>
          {Array.from({ length: Math.min(total, 5) }).map((_, i) => (
            <View key={i} style={[styles.checker, { backgroundColor: color }, color === WHITE && styles.checkerWhite]} />
          ))}
        </View>
        {total > 5 && <Text style={styles.countBadge}>{total}</Text>}
        {isDest && <View style={styles.destRing} />}
      </TouchableOpacity>
    );
  };

  const canOff = destinations.has('off');
  const currentName = NAME[game.turn];

  return (
    <View style={boardStyles.container}>
      <TwoPlayerBar
        players={[{ label: 'WHITE', color: WHITE }, { label: 'BLACK', color: BLACK }]}
        activeIndex={game.turn}
        wins={wins}
        over={isOver}
      />

      <View style={boardStyles.turnRow}>
        <Text style={[boardStyles.turnText, boardStyles.turnStrong]}>
          {isOver
            ? `${NAME[game.winner as BPlayer]} wins!`
            : game.dice.length === 0
            ? `${currentName} — roll the dice`
            : noMoves(game)
            ? `${currentName} has no moves`
            : `${currentName} — play your dice`}
        </Text>
      </View>

      <View style={styles.hud}>
        <View style={styles.diceRow}>
          {(game.rolled.length ? game.rolled : [0, 0]).map((d, i) => {
            const usedUp = game.dice.length > 0 && !game.dice.includes(d);
            const remaining = game.dice.filter((x) => x === d).length;
            return (
              <View key={i} style={[styles.die, usedUp && styles.dieUsed]}>
                <Text style={styles.dieText}>{d || '–'}</Text>
                {game.dice.length > 0 && remaining > 0 && <Text style={styles.dieSub}>×{remaining}</Text>}
              </View>
            );
          })}
        </View>
        <TouchableOpacity
          style={[styles.rollBtn, (isOver || game.dice.length > 0) && styles.disabled]}
          onPress={doRoll}
          disabled={isOver || game.dice.length > 0}
          activeOpacity={0.85}
        >
          <Ionicons name="dice" size={18} color={Colors.textInverse} />
          <Text style={styles.rollText}>Roll</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.board}>
        <View style={styles.halves}>
          <View style={styles.half}>{[18, 19, 20, 21, 22, 23].map(renderPoint)}</View>
          <View style={styles.half}>{[17, 16, 15, 14, 13, 12].map(renderPoint)}</View>
          <View style={styles.half}>{[6, 7, 8, 9, 10, 11].map(renderPoint)}</View>
          <View style={styles.half}>{[5, 4, 3, 2, 1, 0].map(renderPoint)}</View>
        </View>

        <View style={styles.bar}>
          <TouchableOpacity
            style={[styles.barSlot, game.turn === 0 && game.bar[0] > 0 && movesFrom.has('bar') && styles.barSlotActive]}
            onPress={() => game.turn === 0 && movesFrom.has('bar') && setSelected('bar')}
            activeOpacity={0.8}
          >
            {game.bar[0] > 0 && <View style={[styles.checker, { backgroundColor: WHITE }]} />}
            <Text style={styles.barCount}>{game.bar[0] || ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.barSlot, game.turn === 1 && game.bar[1] > 0 && movesFrom.has('bar') && styles.barSlotActive]}
            onPress={() => game.turn === 1 && movesFrom.has('bar') && setSelected('bar')}
            activeOpacity={0.8}
          >
            {game.bar[1] > 0 && <View style={[styles.checker, { backgroundColor: BLACK }]} />}
            <Text style={styles.barCount}>{game.bar[1] || ''}</Text>
          </TouchableOpacity>
          <Text style={styles.barLabel}>BAR</Text>
        </View>

        <View style={styles.trays}>
          <TouchableOpacity
            style={[styles.tray, game.turn === 1 && styles.trayTurned]}
            onPress={() => game.turn === 0 && canOff && commit('off')}
            activeOpacity={0.8}
          >
            <Text style={styles.trayLabel}>W OFF</Text>
            <Text style={styles.trayCount}>{game.off[0]}</Text>
            {game.turn === 0 && canOff && <View style={styles.destRing} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tray, game.turn === 1 && styles.trayTurned]}
            onPress={() => game.turn === 1 && canOff && commit('off')}
            activeOpacity={0.8}
          >
            <Text style={styles.trayLabel}>B OFF</Text>
            <Text style={styles.trayCount}>{game.off[1]}</Text>
            {game.turn === 1 && canOff && <View style={styles.destRing} />}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={boardStyles.hint}>
        Tap a checker, then a highlighted point or tray to move. White bears off bottom-right.
      </Text>

      {isOver && (
        <BoardResultOverlay
          icon="dice"
          tone={game.winner === 0 ? WHITE : BLACK}
          title={`${NAME[game.winner as BPlayer]} wins!`}
          subtitle={`Session — White ${wins[0]} · Black ${wins[1]}`}
          onPlayAgain={playAgain}
          onExit={onExit}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  diceRow: { flexDirection: 'row', gap: 8 },
  die: { width: 42, height: 42, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  dieUsed: { opacity: 0.35 },
  dieText: { color: Colors.textPrimary, fontSize: 18, fontWeight: '900' },
  dieSub: { color: Colors.textMuted, fontSize: 9, fontWeight: '800' },
  rollBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  disabled: { opacity: 0.45 },
  rollText: { color: Colors.textInverse, fontSize: 14, fontWeight: '800' },
  board: { flex: 1, marginTop: 10, backgroundColor: '#7C5A3A', borderRadius: 14, padding: 8, borderWidth: 3, borderColor: '#5B3F28' },
  halves: { flex: 1, flexDirection: 'row', gap: 6 },
  half: { flex: 1, justifyContent: 'space-between' },
  point: { height: '15%', borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.14)', alignItems: 'center', justifyContent: 'flex-start', paddingVertical: 2 },
  pointSel: { borderWidth: 2, borderColor: Colors.accentGold },
  pointDest: { borderWidth: 2, borderColor: Colors.accent },
  stack: { flexDirection: 'row', flexWrap: 'wrap', width: 22, justifyContent: 'center', gap: 1 },
  checker: { width: 8, height: 8, borderRadius: 4 },
  checkerWhite: { borderWidth: 1, borderColor: '#A9A9B0' },
  countBadge: { position: 'absolute', bottom: -2, right: 2, color: '#FFF', fontSize: 8, fontWeight: '900' },
  selectableDot: { position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accentGold },
  destRing: { position: 'absolute', bottom: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },
  bar: { position: 'absolute', left: '49%', top: 8, bottom: 8, width: '3.5%', backgroundColor: '#5B3F28', borderRadius: 4, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  barSlot: { width: 20, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  barSlotActive: { borderWidth: 2, borderColor: Colors.accentGold },
  barCount: { color: '#FFF', fontSize: 8, fontWeight: '800' },
  barLabel: { color: '#D9C6AE', fontSize: 7, fontWeight: '900', marginTop: 2 },
  trays: { position: 'absolute', right: -4, top: '8%', bottom: '8%', width: 42, justifyContent: 'space-between', zIndex: 2 },
  tray: { height: 40, borderRadius: 6, backgroundColor: '#5B3F28', alignItems: 'center', justifyContent: 'center' },
  trayTurned: { backgroundColor: '#4A3220' },
  trayLabel: { color: '#D9C6AE', fontSize: 8, fontWeight: '900' },
  trayCount: { color: '#FFF', fontSize: 12, fontWeight: '900' },
});
