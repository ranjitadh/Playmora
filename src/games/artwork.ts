import { ImageSourcePropType } from 'react-native';

/**
 * Centralized game artwork registry.
 * Every catalog game maps its id to a local, offline-safe illustration.
 * Screens/cards must read artwork from here (never inline require()).
 */
export const GAME_ARTWORK: Record<string, ImageSourcePropType> = {
  // Retro & Nostalgic
  'snake-classic': require('../../assets/games/snake-classic.png'),
  pong: require('../../assets/games/pong.png'),
  'brick-breaker': require('../../assets/games/brick-breaker.png'),
  'pixel-space-shooter': require('../../assets/games/pixel-space-shooter.png'),
  'maze-chaser': require('../../assets/games/maze-chaser.png'),
  'frog-road-crossing': require('../../assets/games/frog-road-crossing.png'),
  'classic-pinball': require('../../assets/games/classic-pinball.png'),
  'helicopter-escape': require('../../assets/games/helicopter-escape.png'),
  minesweeper: require('../../assets/games/minesweeper.png'),
  solitaire: require('../../assets/games/solitaire.png'),

  // Traditional & Antique
  ludo: require('../../assets/games/ludo.png'),
  'snakes-and-ladders': require('../../assets/games/snakes-and-ladders.png'),
  chess: require('../../assets/games/chess.png'),
  checkers: require('../../assets/games/checkers.png'),
  'nine-mens-morris': require('../../assets/games/nine-mens-morris.png'),
  mancala: require('../../assets/games/mancala.png'),
  backgammon: require('../../assets/games/backgammon.png'),
  reversi: require('../../assets/games/reversi.png'),
  'tic-tac-toe': require('../../assets/games/tic-tac-toe.png'),
  'connect-four': require('../../assets/games/connect-four.png'),

  // Car & Racing
  'traffic-racer': require('../../assets/games/traffic-racer.png'),
  'parking-master': require('../../assets/games/parking-master.png'),
  'drift-challenge': require('../../assets/games/drift-challenge.png'),
  'endless-highway': require('../../assets/games/endless-highway.png'),
  'taxi-driver-challenge': require('../../assets/games/taxi-driver-challenge.png'),
  'monster-truck-jump': require('../../assets/games/monster-truck-jump.png'),
  'mini-kart-racing': require('../../assets/games/mini-kart-racing.png'),
  'car-dodge': require('../../assets/games/car-dodge.png'),
  'road-crossing-challenge': require('../../assets/games/road-crossing-challenge.png'),
  'hill-climb-challenge': require('../../assets/games/hill-climb-challenge.png'),

  // Puzzle & Brain
  '2048': require('../../assets/games/2048.png'),
  sudoku: require('../../assets/games/sudoku.png'),
  'memory-card-match': require('../../assets/games/memory-card-match.png'),
  'sliding-number-puzzle': require('../../assets/games/sliding-number-puzzle.png'),
  'mahjong-solitaire': require('../../assets/games/mahjong-solitaire.png'),
  'block-puzzle': require('../../assets/games/block-puzzle.png'),
  'word-guess': require('../../assets/games/word-guess.png'),
  'jigsaw-puzzle': require('../../assets/games/jigsaw-puzzle.png'),
  'lights-out': require('../../assets/games/lights-out.png'),
  'math-rush': require('../../assets/games/math-rush.png'),

  // Modern & Addictive
  'flappy-flight': require('../../assets/games/flappy-flight.png'),
  'stack-tower': require('../../assets/games/stack-tower.png'),
  'fruit-slice': require('../../assets/games/fruit-slice.png'),
  'color-switch': require('../../assets/games/color-switch.png'),
  'reaction-time-challenge': require('../../assets/games/reaction-time-challenge.png'),
  'basketball-shots': require('../../assets/games/basketball-shots.png'),
  'penalty-shootout': require('../../assets/games/penalty-shootout.png'),
  'bubble-shooter': require('../../assets/games/bubble-shooter.png'),
  'whack-a-mole': require('../../assets/games/whack-a-mole.png'),
  'jump-and-dodge': require('../../assets/games/jump-and-dodge.png'),
};

export function getGameArtwork(gameId: string): ImageSourcePropType | null {
  return GAME_ARTWORK[gameId] ?? null;
}
