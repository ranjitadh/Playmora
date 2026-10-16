import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import {
  LAST_SQUARE,
  LADDERS,
  MAX_PLAYERS,
  PlayerType,
  SNAKES,
  applyRoll,
  createSnakesLadders,
  hasHuman,
  isLastHuman,
  resolveSquare,
  rollDie,
  setPlayerTypeAt,
  resizePlayerTypes,
} from './snakesAndLaddersLogic';
import { cellCenter, ladderGeometry, pipsFor, snakePath } from './boardGeometry';
import { BoardResultOverlay, boardStyles } from '../shared/boardUi';

export type { PlayerType } from './snakesAndLaddersLogic';

const PLAYER_THEME: { color: string; dark: string; name: string }[] = [
  { color: Colors.primary, dark: '#5F47D6', name: 'Blue' },
  { color: Colors.accentCoral, dark: '#DC3A56', name: 'Red' },
  { color: Colors.accentGold, dark: '#C97C08', name: 'Amber' },
  { color: Colors.accent, dark: '#0E9468', name: 'Green' },
];

const BOT_THINK_MS = 850;

const CELL_LIGHT = '#FBF2DE';
const CELL_TAN = '#F2E3C1';
const CELL_GRID = '#D8C59D';
const CELL_NUMBER = '#8B7B5C';
const LADDER_TINT = 'rgba(16, 185, 129, 0.16)';
const SNAKE_TINT = 'rgba(224, 69, 61, 0.14)';
const HOME_BG = '#FFE6A6';

const SNAKE_SKINS = [
  { body: '#2FA05A', belly: '#8FE0AE', head: '#268A4E' },
  { body: '#D8453C', belly: '#F5A8A0', head: '#BF3831' },
  { body: '#7A5BD6', belly: '#C6B8F2', head: '#6A4CC4' },
  { body: '#3B8FD4', belly: '#A8D5F5', head: '#2F7CBE' },
  { body: '#E08A2E', belly: '#F7CE96', head: '#C97622' },
  { body: '#2BA39A', belly: '#9DE5DE', head: '#238E86' },
  { body: '#C6529B', belly: '#F0B8DA', head: '#B04689' },
  { body: '#6D7FA0', belly: '#BFC9DC', head: '#5D6D8C' },
  { body: '#9A6B3F', belly: '#D7B692', head: '#87592F' },
  { body: '#4C8F3E', belly: '#A9D89B', head: '#417C35' },
];

const DIE = 54;
const ROLL_DURATION_MS = 760;

export const SnakesAndLaddersGame: React.FC<GameSessionProps> = ({
  onExit,
  isMuted,
  isHapticsEnabled,
}) => {
  const [playerTypes, setPlayerTypes] = useState<PlayerType[]>(['human', 'human']);
  const [setupDone, setSetupDone] = useState(false);
  const [game, setGame] = useState(() => createSnakesLadders(2));
  const [wins, setWins] = useState<number[]>(() => [0, 0]);
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState(1);
  const [size, setSize] = useState(0);

  const spin = useRef(new Animated.Value(0)).current;
  const tokenX = useRef(
    Array.from({ length: MAX_PLAYERS }, () => new Animated.Value(0))
  ).current;
  const tokenY = useRef(
    Array.from({ length: MAX_PLAYERS }, () => new Animated.Value(0))
  ).current;
  const placed = useRef<boolean[]>([]);
  const rollingRef = useRef(false);
  const shuffleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOver = game.outcome !== 'in_progress';
  const cell = size > 0 ? size / 10 : 0;
  const tokenSize = cell * 0.52;
  const playerCount = playerTypes.length;
  const currentType = playerTypes[game.current] ?? 'human';
  const isBotTurn = setupDone && !isOver && currentType === 'bot';
  const canRoll = setupDone && !isOver && !rolling && !isBotTurn;

  useEffect(
    () => () => {
      if (shuffleRef.current) clearInterval(shuffleRef.current);
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
    },
    []
  );

  const tokenXY = useCallback(
    (index: number): { x: number; y: number } | null => {
      if (size <= 0) return null;
      const pos = game.positions[index];
      if (pos === undefined || pos < 1) return null;
      const c = cellCenter(pos);
      const sharing = game.positions.filter((p) => p === pos).length > 1;
      let slot = 0;
      for (let k = 0; k < index; k++) if (game.positions[k] === pos) slot++;
      const offsetX = sharing ? (slot - 0.5) * 0.2 : 0;
      const offsetY = sharing ? (slot - 0.5) * 0.16 : 0;
      return {
        x: (c.x + offsetX) * size - tokenSize / 2,
        y: (c.y + offsetY) * size - tokenSize / 2,
      };
    },
    [game.positions, size, tokenSize]
  );

  // Snap tokens to their squares whenever the board is (re)measured.
  useEffect(() => {
    if (size <= 0) return;
    playerTypes.forEach((_, i) => {
      const p = tokenXY(i);
      if (p) {
        tokenX[i].setValue(p.x);
        tokenY[i].setValue(p.y);
        placed.current[i] = true;
      } else {
        placed.current[i] = false;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  // Hop tokens to their new squares when a roll resolves.
  useEffect(() => {
    if (size <= 0) return;
    playerTypes.forEach((_, i) => {
      const p = tokenXY(i);
      if (!p) {
        placed.current[i] = false;
        return;
      }
      if (!placed.current[i]) {
        tokenX[i].setValue(p.x);
        tokenY[i].setValue(p.y);
        placed.current[i] = true;
        return;
      }
      Animated.spring(tokenX[i], {
        toValue: p.x,
        useNativeDriver: false,
        friction: 8,
        tension: 95,
      }).start();
      Animated.spring(tokenY[i], {
        toValue: p.y,
        useNativeDriver: false,
        friction: 8,
        tension: 95,
      }).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.positions, size]);

  const roll = useCallback(() => {
    if (isOver || rollingRef.current) return;
    rollingRef.current = true;
    const mover = game.current;
    const from = game.positions[mover] ?? 0;
    setRolling(true);
    if (!isMuted) audioService.playSound('dice_roll');
    if (isHapticsEnabled) hapticsService.selection();

    Animated.loop(
      Animated.sequence([
        Animated.timing(spin, {
          toValue: 1,
          duration: 150,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(spin, {
          toValue: 0,
          duration: 150,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    ).start();
    shuffleRef.current = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 70);

    rollTimeoutRef.current = setTimeout(() => {
      if (shuffleRef.current) {
        clearInterval(shuffleRef.current);
        shuffleRef.current = null;
      }
      spin.stopAnimation();
      Animated.timing(spin, { toValue: 0, duration: 160, useNativeDriver: false }).start();

      const value = rollDie();
      const next = applyRoll(game, value);
      setGame(next);
      setFace(value);
      setRolling(false);
      rollingRef.current = false;

      if (next.outcome === 'win') {
        const winner = next.winner as number;
        setWins((w) => w.map((v, i) => (i === winner ? v + 1 : v)));
        if (!isMuted) audioService.playSound('victory');
        if (isHapticsEnabled) hapticsService.success();
        return;
      }

      const target = from + value;
      if (target <= LAST_SQUARE) {
        const landed = resolveSquare(target);
        if (landed > target) {
          if (!isMuted) audioService.playSound('ladder');
          if (isHapticsEnabled) hapticsService.mediumImpact();
        } else if (landed < target) {
          if (!isMuted) audioService.playSound('snake');
          if (isHapticsEnabled) hapticsService.error();
        } else {
          if (!isMuted) audioService.playSound('hop');
          if (isHapticsEnabled) hapticsService.lightImpact();
        }
      } else if (isHapticsEnabled) {
        // Overshoot — no move, just a nudge.
        hapticsService.lightImpact();
      }
    }, ROLL_DURATION_MS);
  }, [game, isOver, isMuted, isHapticsEnabled, spin]);

  // Bots take their own turn automatically.
  useEffect(() => {
    if (!isBotTurn || rolling) return;
    const t = setTimeout(() => roll(), BOT_THINK_MS);
    return () => clearTimeout(t);
  }, [isBotTurn, rolling, roll]);

  const startGame = useCallback((types: PlayerType[]) => {
    if (shuffleRef.current) clearInterval(shuffleRef.current);
    if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
    shuffleRef.current = null;
    rollTimeoutRef.current = null;
    rollingRef.current = false;
    const seats = hasHuman(types) ? types : resizePlayerTypes(types, types.length);
    const count = seats.length;
    setPlayerTypes(seats);
    setGame(createSnakesLadders(count));
    setWins(new Array(count).fill(0));
    setRolling(false);
    setFace(1);
    placed.current = new Array(count).fill(false);
    tokenX.forEach((v) => v.setValue(0));
    tokenY.forEach((v) => v.setValue(0));
    setSetupDone(true);
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted, tokenX, tokenY]);

  const playAgain = useCallback(() => {
    setGame(createSnakesLadders(playerCount));
    setFace(1);
    placed.current = new Array(playerCount).fill(false);
    tokenX.forEach((v) => v.setValue(0));
    tokenY.forEach((v) => v.setValue(0));
    if (!isMuted) audioService.playSound('tap');
  }, [isMuted, playerCount, tokenX, tokenY]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setSize(e.nativeEvent.layout.width);
  }, []);

  const ladderNodes = useMemo(() => {
    if (size <= 0) return null;
    return Object.entries(LADDERS).map(([from, to]) => {
      const g = ladderGeometry(Number(from), Number(to));
      const w = g.length * size;
      const h = g.width * size;
      const railW = Math.max(2.5, h * 0.16);
      const rungCount = Math.max(3, Math.round(w / (h * 0.95)));
      return (
        <View
          key={`ladder-${from}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: g.mid.x * size - w / 2,
            top: g.mid.y * size - h / 2,
            width: w,
            height: h,
            transform: [{ rotate: `${g.angle}deg` }],
            shadowColor: '#3A2A16',
            shadowOpacity: 0.35,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
        >
          <View style={[styles.ladderRail, { left: 0, width: railW, borderRadius: railW / 2 }]} />
          <View style={[styles.ladderRail, { right: 0, width: railW, borderRadius: railW / 2 }]} />
          <View style={styles.ladderRungs}>
            {Array.from({ length: rungCount }).map((_, r) => (
              <View
                key={r}
                style={{
                  width: Math.max(2, railW * 0.85),
                  height: '100%',
                  backgroundColor: '#CE9858',
                  borderRadius: 1.5,
                }}
              />
            ))}
          </View>
        </View>
      );
    });
  }, [size]);

  const snakeNodes = useMemo(() => {
    if (size <= 0) return null;
    return Object.entries(SNAKES).map(([head, tail], i) => {
      const skin = SNAKE_SKINS[i % SNAKE_SKINS.length];
      const path = snakePath(Number(head), Number(tail), 14, i);
      const faceSize = path.headWidth * size * 1.35;
      const eye = faceSize * 0.3;
      const pupil = eye * 0.4;
      return (
        <React.Fragment key={`snake-${head}`}>
          {path.segments.map((seg, s) => {
            const sl = seg.length * size;
            const sw = seg.width * size;
            return (
              <View
                key={`seg-${head}-${s}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: seg.x * size - sl / 2,
                  top: seg.y * size - sw / 2,
                  width: sl,
                  height: sw,
                  borderRadius: sw / 2,
                  backgroundColor: skin.body,
                  transform: [{ rotate: `${seg.angle}deg` }],
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    left: '8%',
                    right: '8%',
                    top: '28%',
                    height: '44%',
                    borderRadius: sw / 2,
                    backgroundColor: skin.belly,
                    opacity: 0.9,
                  }}
                />
              </View>
            );
          })}
          <View
            key={`head-${head}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: path.head.x * size - faceSize / 2,
              top: path.head.y * size - faceSize / 2,
              width: faceSize,
              height: faceSize,
              borderRadius: faceSize / 2,
              backgroundColor: skin.head,
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.25)',
              transform: [{ rotate: `${path.headAngle}deg` }],
            }}
          >
            <View
              style={{
                position: 'absolute',
                left: faceSize * 0.48,
                top: faceSize * 0.14,
                width: eye,
                height: eye,
                borderRadius: eye / 2,
                backgroundColor: '#FFFFFF',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  left: (eye - pupil) / 2,
                  top: (eye - pupil) / 2,
                  width: pupil,
                  height: pupil,
                  borderRadius: pupil / 2,
                  backgroundColor: '#141210',
                }}
              />
            </View>
            <View
              style={{
                position: 'absolute',
                left: faceSize * 0.48,
                top: faceSize * 0.54,
                width: eye,
                height: eye,
                borderRadius: eye / 2,
                backgroundColor: '#FFFFFF',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  left: (eye - pupil) / 2,
                  top: (eye - pupil) / 2,
                  width: pupil,
                  height: pupil,
                  borderRadius: pupil / 2,
                  backgroundColor: '#141210',
                }}
              />
            </View>
            {/* Forked tongue */}
            <View
              style={{
                position: 'absolute',
                left: faceSize * 0.86,
                top: faceSize * 0.47,
                width: faceSize * 0.3,
                height: 2,
                borderRadius: 1,
                backgroundColor: '#E11D48',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: faceSize * 1.1,
                top: faceSize * 0.4,
                width: faceSize * 0.16,
                height: 2,
                borderRadius: 1,
                backgroundColor: '#E11D48',
                transform: [{ rotate: '24deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: faceSize * 1.1,
                top: faceSize * 0.54,
                width: faceSize * 0.16,
                height: 2,
                borderRadius: 1,
                backgroundColor: '#E11D48',
                transform: [{ rotate: '-24deg' }],
              }}
            />
          </View>
        </React.Fragment>
      );
    });
  }, [size]);

  const tokenNodes = playerTypes.map((_, i) => {
    const p = tokenXY(i);
    if (!p || tokenSize <= 0) return null;
    const theme = PLAYER_THEME[i];
    return (
      <Animated.View
        key={`token-${i}`}
        pointerEvents="none"
        style={[
          styles.token,
          {
            width: tokenSize,
            height: tokenSize,
            borderRadius: tokenSize / 2,
            backgroundColor: theme.dark,
            zIndex: !isOver && game.current === i ? 3 : 2,
            transform: [{ translateX: tokenX[i] }, { translateY: tokenY[i] }],
          },
        ]}
      >
        <View
          style={{
            position: 'absolute',
            left: 2,
            right: 2,
            top: 2,
            bottom: 2,
            borderRadius: tokenSize / 2,
            backgroundColor: theme.color,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: tokenSize * 0.18,
            top: tokenSize * 0.14,
            width: tokenSize * 0.26,
            height: tokenSize * 0.18,
            borderRadius: tokenSize * 0.1,
            backgroundColor: 'rgba(255,255,255,0.55)',
          }}
        />
      </Animated.View>
    );
  });

  const dieSpin = spin.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '12deg'] });
  const dieLift = spin.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const dieScale = spin.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  const renderSquare = (square: number, rowFromBottom: number) => {
    const idx = square - 1;
    const within = idx % 10;
    const col = rowFromBottom % 2 === 0 ? within : 9 - within;
    const darkCell = (rowFromBottom + col) % 2 === 1;
    const isLadderBase = LADDERS[square] !== undefined;
    const isSnakeHead = SNAKES[square] !== undefined;
    const isHome = square === LAST_SQUARE;
    const baseColor = isHome ? HOME_BG : darkCell ? CELL_TAN : CELL_LIGHT;

    return (
      <View
        key={square}
        style={[
          styles.cell,
          { backgroundColor: baseColor },
          isLadderBase && { backgroundColor: LADDER_TINT },
          isSnakeHead && { backgroundColor: SNAKE_TINT },
        ]}
      >
        <Text style={styles.cellNum}>{square}</Text>
        {isHome && cell > 0 && (
          <View style={styles.homeWrap} pointerEvents="none">
            <View
              style={[
                styles.chimney,
                { width: cell * 0.1, height: cell * 0.18, right: cell * 0.1, top: -cell * 0.02 },
              ]}
            />
            <View
              style={[
                styles.roof,
                {
                  borderLeftWidth: cell * 0.36,
                  borderRightWidth: cell * 0.36,
                  borderBottomWidth: cell * 0.26,
                },
              ]}
            />
            <View style={[styles.houseBody, { width: cell * 0.58, height: cell * 0.32 }]}>
              <View
                style={[
                  styles.houseWindow,
                  { width: cell * 0.13, height: cell * 0.1, left: cell * 0.06, top: cell * 0.05 },
                ]}
              />
              <View
                style={[
                  styles.houseDoor,
                  { width: cell * 0.15, height: cell * 0.19, right: cell * 0.05 },
                ]}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  if (!setupDone) {
    return (
      <View style={styles.setupContainer}>
        <View style={styles.setupCard}>
          <View style={styles.setupHeader}>
            <Ionicons name="people" size={22} color={Colors.primary} />
            <Text style={styles.setupTitle}>Choose Players</Text>
          </View>
          <Text style={styles.setupHint}>
            Race 1 to 4 tokens to the house on square 100. Bots roll by themselves.
          </Text>

          <Text style={styles.setupLabel}>NUMBER OF PLAYERS</Text>
          <View style={styles.countRow}>
            {[1, 2, 3, 4].map((n) => (
              <TouchableOpacity
                key={n}
                testID={`sl-count-${n}`}
                accessibilityRole="button"
                accessibilityLabel={`${n} player${n > 1 ? 's' : ''}`}
                style={[styles.countBtn, playerTypes.length === n && styles.countBtnActive]}
                onPress={() => setPlayerTypes((prev) => resizePlayerTypes(prev, n))}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.countText, playerTypes.length === n && styles.countTextActive]}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.setupLabel}>PLAYER TYPE</Text>
          <View style={styles.setupPlayers}>
            {playerTypes.map((type, i) => {
              const theme = PLAYER_THEME[i];
              const lockedToHuman = isLastHuman(playerTypes, i);
              return (
                <View key={i} style={styles.setupRow}>
                  <View style={[styles.setupDot, { backgroundColor: theme.color }]} />
                  <Text style={styles.setupName}>{theme.name}</Text>
                  <View style={styles.segment}>
                    {(['human', 'bot'] as PlayerType[]).map((t) => {
                      const disabled = t === 'bot' && lockedToHuman;
                      return (
                        <TouchableOpacity
                          key={t}
                          testID={`sl-${t}-${i}`}
                          accessibilityRole="button"
                          accessibilityState={{ disabled }}
                          accessibilityLabel={`${theme.name} ${t}`}
                          style={[
                            styles.segmentBtn,
                            type === t && { backgroundColor: theme.color, borderColor: theme.color },
                            disabled && styles.segmentBtnDisabled,
                          ]}
                          onPress={() =>
                            setPlayerTypes((prev) => setPlayerTypeAt(prev, i, t))
                          }
                          disabled={disabled}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.segmentText, type === t && styles.segmentTextActive]}>
                            {t === 'human' ? 'Human' : 'Bot'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={styles.setupNote}>
            At least one player must be human — bots can’t play each other.
          </Text>

          <TouchableOpacity
            testID="sl-start"
            accessibilityRole="button"
            accessibilityLabel="Start game"
            style={styles.startBtn}
            onPress={() => startGame(playerTypes)}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={18} color={Colors.textInverse} />
            <Text style={styles.startText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const winnerName = isOver && game.winner !== null ? PLAYER_THEME[game.winner].name : '';
  const turnLabel = isOver
    ? `${winnerName} wins!`
    : `${PLAYER_THEME[game.current].name}${currentType === 'bot' ? ' (bot)' : ''}${
        rolling ? ' is rolling…' : "'s turn"
      } · on ${game.positions[game.current] ?? 0}`;
  const sessionLine = playerTypes
    .map((_, i) => `${PLAYER_THEME[i].name} ${wins[i] ?? 0}`)
    .join(' · ');

  return (
    <View style={boardStyles.container}>
      <View style={styles.chips}>
        {playerTypes.map((type, i) => {
          const theme = PLAYER_THEME[i];
          const active = !isOver && game.current === i;
          return (
            <View
              key={i}
              style={[
                styles.chip,
                active && { borderColor: theme.color, backgroundColor: Colors.surfaceHighlight },
              ]}
            >
              <View style={[styles.chipDot, { backgroundColor: theme.color }]} />
              <View style={styles.chipBody}>
                <Text style={styles.chipName} numberOfLines={1}>
                  {theme.name}
                </Text>
                <Text style={styles.chipSub}>
                  {type === 'bot' ? 'BOT' : 'PLAYER'} · {game.positions[i] ?? 0}
                </Text>
              </View>
              <Text style={styles.chipWins}>{wins[i] ?? 0}</Text>
            </View>
          );
        })}
      </View>

      <View style={boardStyles.turnRow}>
        <Text style={[boardStyles.turnText, boardStyles.turnStrong]}>{turnLabel}</Text>
      </View>

      <View style={styles.frame}>
        <View style={styles.frameInner}>
          <View style={styles.board} onLayout={onLayout}>
            {Array.from({ length: 10 }).map((_, rowFromTop) => {
              const rowFromBottom = 9 - rowFromTop;
              const base = rowFromBottom * 10;
              const squares = Array.from({ length: 10 }).map((__, c) =>
                rowFromBottom % 2 === 0 ? base + c + 1 : base + (9 - c) + 1
              );
              return (
                <View key={rowFromTop} style={styles.row}>
                  {squares.map((square) => renderSquare(square, rowFromBottom))}
                </View>
              );
            })}
            {size > 0 && (
              <View style={styles.overlay} pointerEvents="none">
                {ladderNodes}
                {snakeNodes}
                {tokenNodes}
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          testID="sl-die"
          accessibilityRole="button"
          accessibilityLabel={`Die showing ${face}. Roll dice`}
          style={styles.dieWrap}
          onPress={roll}
          disabled={!canRoll}
          activeOpacity={0.8}
        >
          <Animated.View style={[styles.dieSide, { transform: [{ translateY: dieLift }] }]} />
          <Animated.View
            style={[
              styles.dieFace,
              { transform: [{ translateY: dieLift }, { rotate: dieSpin }, { scale: dieScale }] },
            ]}
          >
            {pipsFor(face).map((p, i) => (
              <View key={i} style={[styles.pip, { left: `${p.x}%`, top: `${p.y}%` }]} />
            ))}
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          testID="sl-roll"
          accessibilityRole="button"
          accessibilityLabel="Roll the dice"
          style={[styles.rollBtn, !canRoll && styles.rollBtnDisabled]}
          onPress={roll}
          activeOpacity={0.85}
          disabled={!canRoll}
        >
          <Ionicons name="dice" size={18} color={Colors.textInverse} />
          <Text style={styles.rollText}>
            {isBotTurn ? 'Bot rolling…' : rolling ? 'Rolling…' : 'Roll Dice'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="sl-setup"
          accessibilityRole="button"
          accessibilityLabel="Change players"
          style={styles.setupBtn}
          onPress={() => setSetupDone(false)}
          activeOpacity={0.85}
        >
          <Ionicons name="people" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={boardStyles.hint}>
        Land exactly on 100 to reach home. Ladders climb, snakes slide.
      </Text>

      {isOver && (
        <BoardResultOverlay
          icon="home"
          tone={PLAYER_THEME[game.winner ?? 0].color}
          title={`${winnerName} wins!`}
          subtitle={`Session — ${sessionLine}`}
          onPlayAgain={playAgain}
          onExit={onExit}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  setupContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  setupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setupTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  setupHint: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 16,
  },
  setupLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  countRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  countBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  countBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondary,
  },
  countText: {
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: '900',
  },
  countTextActive: {
    color: Colors.primaryDark,
  },
  setupPlayers: {
    gap: 10,
    marginBottom: 8,
  },
  setupNote: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 16,
  },
  setupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  setupDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  setupName: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  segment: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  segmentBtnDisabled: {
    opacity: 0.4,
  },
  segmentText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: Colors.textInverse,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
  },
  startText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '800',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  chipDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  chipBody: {
    flex: 1,
  },
  chipName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  chipSub: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  chipWins: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
  },
  frame: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: '#7A4E24',
    borderRadius: 18,
    padding: 7,
    borderWidth: 1,
    borderColor: '#5A3818',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  frameInner: {
    backgroundColor: '#A9743F',
    borderRadius: 12,
    padding: 3,
    borderTopWidth: 1,
    borderTopColor: '#C89A62',
    borderLeftWidth: 1,
    borderLeftColor: '#C89A62',
    borderBottomWidth: 1,
    borderBottomColor: '#5F3A1A',
    borderRightWidth: 1,
    borderRightColor: '#5F3A1A',
  },
  board: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: CELL_LIGHT,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  row: { flex: 1, flexDirection: 'row' },
  cell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: CELL_GRID,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellNum: {
    position: 'absolute',
    top: 2,
    left: 3,
    color: CELL_NUMBER,
    fontSize: 8,
    fontWeight: '700',
  },
  homeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 2,
    alignItems: 'center',
  },
  chimney: {
    position: 'absolute',
    backgroundColor: '#B84A36',
    borderRadius: 1,
  },
  roof: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#C4553B',
    marginBottom: -1,
  },
  houseBody: {
    backgroundColor: '#FDF8EC',
    borderWidth: 1,
    borderColor: '#E0D2B0',
    borderRadius: 1.5,
  },
  houseWindow: {
    position: 'absolute',
    backgroundColor: '#9FD4F0',
    borderWidth: 0.5,
    borderColor: '#C9BFA6',
    borderRadius: 1,
  },
  houseDoor: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#8B5A2B',
    borderRadius: 1.5,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  ladderRail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#A9743F',
    borderWidth: 0.5,
    borderColor: '#6E4420',
  },
  ladderRungs: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    top: '8%',
    bottom: '8%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  token: {
    position: 'absolute',
    left: 0,
    top: 0,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  dieWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dieSide: {
    position: 'absolute',
    width: DIE,
    height: DIE,
    borderRadius: 12,
    backgroundColor: '#CDC6B4',
    left: 4,
    top: 6,
  },
  dieFace: {
    position: 'absolute',
    width: DIE,
    height: DIE,
    borderRadius: 12,
    backgroundColor: '#FDFCF7',
    borderWidth: 1,
    borderColor: '#E6E1D4',
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pip: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 5.5,
    marginLeft: -5.5,
    marginTop: -5.5,
    backgroundColor: '#211C15',
  },
  rollBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
  },
  rollBtnDisabled: { opacity: 0.5 },
  rollText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
  setupBtn: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
