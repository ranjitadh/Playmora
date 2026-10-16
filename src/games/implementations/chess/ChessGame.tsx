import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  ChessMove,
  ChessState,
  createChess,
  legalMovesFrom,
  makeMove,
} from './chessLogic';
import { BoardResultOverlay, TwoPlayerBar, boardStyles } from '../shared/boardUi';

const GLYPH: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

export const ChessGame: React.FC<GameSessionProps> = ({ onExit, isMuted, isHapticsEnabled }) => {
  const [game, setGame] = useState<ChessState>(() => createChess());
  const [selected, setSelected] = useState<number | null>(null);
  const [pendingPromo, setPendingPromo] = useState<number | null>(null);
  const [wins, setWins] = useState<[number, number]>([0, 0]);
  const [draws, setDraws] = useState(0);
  const [size, setSize] = useState(340);

  const isOver = game.outcome !== 'in_progress';

  const targets = useMemo(() => {
    if (selected === null) return new Set<number>();
    return new Set<number>(legalMovesFrom(game, selected).map((m) => m.to));
  }, [game, selected]);

  const checkSquare = useMemo(() => {
    if (!game.check) return -1;
    const t = game.turn;
    for (let i = 0; i < 64; i++) if (game.board[i] === t + 'K') return i;
    return -1;
  }, [game]);

  const finish = useCallback(
    (next: ChessState) => {
      if (next.outcome === 'checkmate') {
        setWins((w) => (next.winner === 'w' ? [w[0] + 1, w[1]] : [w[0], w[1] + 1]));
        if (!isMuted) audioService.playSound('victory');
        if (isHapticsEnabled) hapticsService.success();
      } else if (next.outcome !== 'in_progress') {
        if (next.outcome === 'draw') setDraws((d) => d + 1);
        if (!isMuted) audioService.playSound('game_over');
        if (isHapticsEnabled) hapticsService.mediumImpact();
      } else {
        if (!isMuted) audioService.playSound(next.check ? 'error' : 'pop');
        if (isHapticsEnabled) hapticsService.lightImpact();
      }
    },
    [isMuted, isHapticsEnabled]
  );

  const tryMove = useCallback(
    (to: number) => {
      if (selected === null) return;
      const opts = legalMovesFrom(game, selected).filter((m) => m.to === to);
      if (opts.length === 0) return;
      if (opts.length > 1 && opts.some((m) => m.promotion)) {
        setPendingPromo(to);
        return;
      }
      const next = makeMove(game, selected, to, opts[0].promotion);
      if (next !== game) {
        setGame(next);
        setSelected(null);
        finish(next);
      }
    },
    [game, selected, finish]
  );

  const onCell = useCallback(
    (i: number) => {
      if (isOver || pendingPromo !== null) return;
      const piece = game.board[i];
      if (selected !== null && targets.has(i)) {
        tryMove(i);
        return;
      }
      if (piece && piece[0] === game.turn) {
        setSelected((s) => (s === i ? null : i));
        if (!isMuted) audioService.playSound('tap');
        return;
      }
      setSelected(null);
    },
    [game, isOver, selected, targets, tryMove, isMuted, pendingPromo]
  );

  const promote = useCallback(
    (piece: 'Q' | 'R' | 'B' | 'N') => {
      if (pendingPromo === null || selected === null) return;
      const next = makeMove(game, selected, pendingPromo, piece);
      setPendingPromo(null);
      setSelected(null);
      if (next !== game) {
        setGame(next);
        finish(next);
      }
    },
    [game, pendingPromo, selected, finish]
  );

  const playAgain = useCallback(() => {
    setGame(createChess());
    setSelected(null);
    setPendingPromo(null);
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize(Math.min(width, height));
  };

  const cellSize = size / 8;

  const title = isOver
    ? game.outcome === 'checkmate'
      ? `${game.winner === 'w' ? 'White' : 'Black'} wins by checkmate!`
      : game.outcome === 'stalemate'
      ? 'Stalemate — draw'
      : 'Draw by 50-move rule'
    : game.check
    ? `${game.turn === 'w' ? 'White' : 'Black'} is in check`
    : `${game.turn === 'w' ? 'White' : 'Black'} to move`;

  return (
    <View style={boardStyles.container}>
      <TwoPlayerBar
        players={[{ label: 'WHITE', color: '#C9CBD3' }, { label: 'BLACK', color: '#202124' }]}
        activeIndex={game.turn === 'w' ? 0 : 1}
        wins={wins}
        draws={draws}
        over={isOver}
      />

      <View style={boardStyles.turnRow}>
        <Text style={[boardStyles.turnText, boardStyles.turnStrong, game.check && !isOver && styles.checkText]}>
          {title}
        </Text>
      </View>

      <View style={[styles.board, { width: size, height: size }]} onLayout={onLayout}>
        {game.board.map((piece, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const light = (row + col) % 2 === 0;
          const isTarget = targets.has(i);
          const isSel = selected === i;
          const occupied = isTarget && !!game.board[i];
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.cell,
                { left: col * cellSize, top: row * cellSize, width: cellSize, height: cellSize },
                { backgroundColor: light ? '#EADBC8' : '#A9815B' },
                i === checkSquare && styles.checkCell,
                isSel && styles.selectedCell,
              ]}
              activeOpacity={0.7}
              onPress={() => onCell(i)}
              accessibilityRole="button"
              accessibilityLabel={`Square ${'abcdefgh'[col]}${8 - row}`}
            >
              {piece ? (
                <Text style={[styles.piece, piece[0] === 'w' ? styles.pieceWhite : styles.pieceBlack]}>
                  {GLYPH[piece]}
                </Text>
              ) : null}
              {isTarget && <View style={[styles.target, occupied && styles.captureTarget]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={boardStyles.hint}>Tap a piece, then a highlighted square. Back row promotes.</Text>

      {pendingPromo !== null && !isOver && (
        <View style={styles.promoOverlay}>
          <View style={styles.promoCard}>
            <Text style={styles.promoTitle}>Promote pawn</Text>
            <View style={styles.promoRow}>
              {(['Q', 'R', 'B', 'N'] as const).map((p) => (
                <TouchableOpacity key={p} style={styles.promoBtn} onPress={() => promote(p)} activeOpacity={0.8}>
                  <Text style={[styles.piece, styles.pieceWhite]}>
                    {GLYPH[`${game.turn}${p}` as string]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {isOver && (
        <BoardResultOverlay
          icon={game.outcome === 'checkmate' ? 'trophy' : 'remove'}
          tone={game.winner === 'b' ? '#202124' : '#7557E8'}
          title={title}
          subtitle={`Session — White ${wins[0]} · Black ${wins[1]} · Draws ${draws}`}
          onPlayAgain={playAgain}
          onExit={onExit}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  board: { alignSelf: 'center', borderWidth: 3, borderColor: Colors.border, borderRadius: 6, overflow: 'hidden' },
  cell: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  piece: { fontSize: 30, lineHeight: 34 },
  pieceWhite: { color: '#FFFFFF', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 },
  pieceBlack: { color: '#101010' },
  target: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(16,185,129,0.85)' },
  captureTarget: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(244,63,94,0.28)', borderWidth: 3, borderColor: 'rgba(244,63,94,0.8)' },
  selectedCell: { backgroundColor: '#F5D76E' },
  checkCell: { backgroundColor: '#F43F5E' },
  checkText: { color: Colors.accentCoral },
  promoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32,33,36,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  promoCard: { backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, padding: 20, alignItems: 'center' },
  promoTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 14 },
  promoRow: { flexDirection: 'row', gap: 10 },
  promoBtn: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#EADBC8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
});
