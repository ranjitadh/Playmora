import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Platform,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';

type Point = [number, number];
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Difficulty = 'easy' | 'medium' | 'hard';

const GRID_SIZE = 16;

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; base: number; min: number }
> = {
  easy: { label: 'EASY', base: 230, min: 130 },
  medium: { label: 'MEDIUM', base: 150, min: 80 },
  hard: { label: 'HARD', base: 95, min: 55 },
};

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

const INITIAL_SNAKE: Point[] = [
  [8, 7],
  [8, 6],
  [8, 5],
];
const INITIAL_FOOD: Point = [8, 11];

let rememberedDifficulty: Difficulty = 'medium';

function getRandomFoodCoord(snake: Point[]): Point {
  const occupied = new Set(snake.map(([r, c]) => `${r},${c}`));
  const available: Point[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!occupied.has(`${r},${c}`)) {
        available.push([r, c]);
      }
    }
  }

  if (available.length === 0) return [0, 0];
  return available[Math.floor(Math.random() * available.length)];
}

export const SnakeGame: React.FC<GameSessionProps> = ({
  onScoreUpdate,
  onGameOver,
  isMuted,
  isHapticsEnabled,
}) => {
  const [snake, setSnake] = useState<Point[]>(
    INITIAL_SNAKE.map((p) => [...p] as Point)
  );
  const [food, setFood] = useState<Point>([...INITIAL_FOOD] as Point);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(rememberedDifficulty);

  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedRef = useRef(DIFFICULTY_CONFIG[rememberedDifficulty].base);

  const changeDirection = useCallback((newDir: Direction) => {
    const current = directionRef.current;
    if (
      (newDir === 'UP' && current === 'DOWN') ||
      (newDir === 'DOWN' && current === 'UP') ||
      (newDir === 'LEFT' && current === 'RIGHT') ||
      (newDir === 'RIGHT' && current === 'LEFT')
    ) {
      return; // Disallow 180 reversal
    }
    nextDirectionRef.current = newDir;
  }, []);

  // Swipe pan responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { dx, dy } = gestureState;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (Math.max(absX, absY) < 20) return;

        if (absX > absY) {
          if (dx > 0) changeDirection('RIGHT');
          else changeDirection('LEFT');
        } else {
          if (dy > 0) changeDirection('DOWN');
          else changeDirection('UP');
        }
      },
    })
  ).current;

  // Game loop tick
  const tick = useCallback(() => {
    if (isGameOver) return;

    setSnake((prevSnake) => {
      directionRef.current = nextDirectionRef.current;
      const head = prevSnake[0];
      let newHead: Point = [head[0], head[1]];

      switch (directionRef.current) {
        case 'UP':
          newHead[0] -= 1;
          break;
        case 'DOWN':
          newHead[0] += 1;
          break;
        case 'LEFT':
          newHead[1] -= 1;
          break;
        case 'RIGHT':
          newHead[1] += 1;
          break;
      }

      // Wrap around walls — the snake never dies on an edge
      if (newHead[0] < 0) newHead[0] = GRID_SIZE - 1;
      else if (newHead[0] >= GRID_SIZE) newHead[0] = 0;
      if (newHead[1] < 0) newHead[1] = GRID_SIZE - 1;
      else if (newHead[1] >= GRID_SIZE) newHead[1] = 0;

      const willEat = newHead[0] === food[0] && newHead[1] === food[1];

      // Self collision (the tail cell frees up unless the snake is growing)
      const bodyToCheck = willEat ? prevSnake : prevSnake.slice(0, -1);
      for (let i = 0; i < bodyToCheck.length; i++) {
        if (bodyToCheck[i][0] === newHead[0] && bodyToCheck[i][1] === newHead[1]) {
          handleEnd(score);
          return prevSnake;
        }
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food consumption
      if (willEat) {
        const newScore = score + 10;
        setScore(newScore);
        onScoreUpdate(newScore);

        if (!isMuted) audioService.playSound('pop');
        if (isHapticsEnabled) hapticsService.lightImpact();

        // Speed ramp up, scaled to the chosen difficulty
        const cfg = DIFFICULTY_CONFIG[difficulty];
        speedRef.current = Math.max(
          cfg.min,
          cfg.base - Math.floor(newScore / 50) * 15
        );
        setFood(getRandomFoodCoord(newSnake));
      } else {
        newSnake.pop(); // Remove tail
      }

      return newSnake;
    });
  }, [food, isGameOver, isHapticsEnabled, isMuted, onScoreUpdate, score, difficulty]);

  const handleEnd = (finalScore: number) => {
    setIsGameOver(true);
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    if (!isMuted) audioService.playSound('game_over');
    if (isHapticsEnabled) hapticsService.heavyImpact();
    onGameOver(finalScore, { snakeLength: snake.length });
  };

  const selectDifficulty = useCallback(
    (next: Difficulty) => {
      rememberedDifficulty = next;
      setDifficulty(next);
      setSnake(INITIAL_SNAKE.map((p) => [...p] as Point));
      setFood([...INITIAL_FOOD] as Point);
      setScore(0);
      setIsGameOver(false);
      directionRef.current = 'RIGHT';
      nextDirectionRef.current = 'RIGHT';
      speedRef.current = DIFFICULTY_CONFIG[next].base;
      onScoreUpdate(0);
    },
    [onScoreUpdate]
  );

  useEffect(() => {
    if (isGameOver) return;

    gameLoopRef.current = setInterval(tick, speedRef.current);
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [tick, isGameOver, difficulty]);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.deviceFrame}>
        <View style={styles.plastic}>
          <View style={styles.screen}>
            <View style={styles.playArea}>
              {Array.from({ length: GRID_SIZE }).map((_, r) => (
                <View key={`r-${r}`} style={styles.gridRow}>
                  {Array.from({ length: GRID_SIZE }).map((_, c) => {
                    const isHead = snake[0][0] === r && snake[0][1] === c;
                    const isBody =
                      !isHead && snake.some(([sr, sc]) => sr === r && sc === c);
                    const isFoodCell = food[0] === r && food[1] === c;

                    return (
                      <View key={`c-${r}-${c}`} style={styles.gridCell}>
                        {(isHead || isBody) && (
                          <View
                            style={[
                              styles.snakePixel,
                              isHead && styles.snakeHeadPixel,
                            ]}
                          />
                        )}
                        {isFoodCell && !isHead && !isBody && (
                          <View style={styles.foodPixel} />
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}

              <View style={styles.plusMark} pointerEvents="none">
                <View style={styles.plusVertical} />
                <View style={styles.plusHorizontal} />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.scoreRow}>
              <Text style={styles.scoreDigits}>
                {String(score).padStart(4, '0')}
              </Text>
              <View style={styles.segRow}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <View
                    key={`seg-${i}`}
                    style={[
                      styles.seg,
                      i < Math.min(10, snake.length - 3) && styles.segOn,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.difficultyRow}>
            {DIFFICULTY_ORDER.map((level) => {
              const isActive = difficulty === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.difficultyBtn,
                    isActive && styles.difficultyBtnActive,
                  ]}
                  onPress={() => selectDifficulty(level)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.difficultyLabel,
                      isActive && styles.difficultyLabelActive,
                    ]}
                  >
                    {DIFFICULTY_CONFIG[level].label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.dpadContainer}>
            <TouchableOpacity
              style={styles.dpadBtn}
              onPress={() => changeDirection('UP')}
              activeOpacity={0.7}
            >
              <Text style={styles.dpadArrow}>▲</Text>
            </TouchableOpacity>
            <View style={styles.dpadHorizontalRow}>
              <TouchableOpacity
                style={styles.dpadBtn}
                onPress={() => changeDirection('LEFT')}
                activeOpacity={0.7}
              >
                <Text style={styles.dpadArrow}>◀</Text>
              </TouchableOpacity>
              <View style={styles.dpadCenter} />
              <TouchableOpacity
                style={styles.dpadBtn}
                onPress={() => changeDirection('RIGHT')}
                activeOpacity={0.7}
              >
                <Text style={styles.dpadArrow}>▶</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.dpadBtn}
              onPress={() => changeDirection('DOWN')}
              activeOpacity={0.7}
            >
              <Text style={styles.dpadArrow}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  deviceFrame: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#8E8F88',
    borderRadius: 44,
    padding: 8,
    borderWidth: 2,
    borderColor: '#6C6D66',
  },
  plastic: {
    width: '100%',
    backgroundColor: '#C6CD5C',
    borderRadius: 36,
    padding: 16,
    alignItems: 'center',
  },
  screen: {
    width: '100%',
    backgroundColor: '#C2C46E',
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
    borderWidth: 2,
    borderColor: '#A9AB55',
  },
  playArea: {
    width: '100%',
    aspectRatio: 1,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snakePixel: {
    width: '80%',
    height: '80%',
    borderRadius: 4,
    backgroundColor: '#332F1D',
  },
  snakeHeadPixel: {
    width: '100%',
    height: '100%',
    borderRadius: 7,
  },
  foodPixel: {
    width: '44%',
    height: '44%',
    borderRadius: 3,
    backgroundColor: '#332F1D',
  },
  plusMark: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 11,
    height: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusVertical: {
    position: 'absolute',
    width: 3,
    height: 11,
    backgroundColor: '#332F1D',
  },
  plusHorizontal: {
    position: 'absolute',
    width: 11,
    height: 3,
    backgroundColor: '#332F1D',
  },
  divider: {
    height: 2,
    backgroundColor: '#332F1D',
    marginTop: 10,
    opacity: 0.75,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  scoreDigits: {
    color: '#332F1D',
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 3,
  },
  segRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seg: {
    width: 7,
    height: 13,
    marginLeft: 3,
    borderRadius: 3,
    backgroundColor: 'rgba(51,47,29,0.14)',
  },
  segOn: {
    backgroundColor: '#332F1D',
  },
  difficultyRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  difficultyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#8F9738',
    backgroundColor: '#B9C24E',
  },
  difficultyBtnActive: {
    backgroundColor: '#332F1D',
    borderColor: '#332F1D',
  },
  difficultyLabel: {
    color: '#332F1D',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  difficultyLabelActive: {
    color: '#C6CD5C',
  },
  dpadContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  dpadHorizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
  },
  dpadBtn: {
    width: 62,
    height: 50,
    backgroundColor: '#B9C24E',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#8F9738',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dpadArrow: {
    color: '#332F1D',
    fontSize: 20,
    fontWeight: '800',
  },
  dpadCenter: {
    width: 78,
  },
});
