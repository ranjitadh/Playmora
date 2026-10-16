import React from 'react';
import { GameSessionProps } from './types';
import { NumberMergeGame } from './implementations/number-merge/NumberMergeGame';
import { MemoryFlipGame } from './implementations/memory-flip/MemoryFlipGame';
import { SnakeGame } from './implementations/snake/SnakeGame';
import { ReflexRushGame } from './implementations/reflex-tap/ReflexRushGame';
import { TicTacToeGame } from './implementations/tic-tac-toe/TicTacToeGame';
import { PongGame } from './implementations/pong/PongGame';
import { MinesweeperGame } from './implementations/minesweeper/MinesweeperGame';
import { HelicopterEscapeGame } from './implementations/helicopter-escape/HelicopterEscapeGame';
import { BrickBreakerGame } from './implementations/brick-breaker/BrickBreakerGame';
import { LightsOutGame } from './implementations/lights-out/LightsOutGame';
import { SlidingPuzzleGame } from './implementations/sliding-number-puzzle/SlidingPuzzleGame';
import { MathRushGame } from './implementations/math-rush/MathRushGame';
import { BlockPuzzleGame } from './implementations/block-puzzle/BlockPuzzleGame';
import { FlappyFlightGame } from './implementations/flappy-flight/FlappyFlightGame';
import { StackTowerGame } from './implementations/stack-tower/StackTowerGame';
import { ColorSwitchGame } from './implementations/color-switch/ColorSwitchGame';
import { WhackAMoleGame } from './implementations/whack-a-mole/WhackAMoleGame';
import { JumpAndDodgeGame } from './implementations/jump-and-dodge/JumpAndDodgeGame';
import { TrafficRacerGame } from './implementations/traffic-racer/TrafficRacerGame';
import { ParkingMasterGame } from './implementations/parking-master/ParkingMasterGame';
import { DriftChallengeGame } from './implementations/drift-challenge/DriftChallengeGame';
import { EndlessHighwayGame } from './implementations/endless-highway/EndlessHighwayGame';
import { TaxiDriverChallengeGame } from './implementations/taxi-driver-challenge/TaxiDriverChallengeGame';
import { MonsterTruckJumpGame } from './implementations/monster-truck-jump/MonsterTruckJumpGame';
import { MiniKartRacingGame } from './implementations/mini-kart-racing/MiniKartRacingGame';
import { CarDodgeGame } from './implementations/car-dodge/CarDodgeGame';
import { RoadCrossingGame } from './implementations/road-crossing-challenge/RoadCrossingGame';
import { HillClimbChallengeGame } from './implementations/hill-climb-challenge/HillClimbChallengeGame';
import { ConnectFourGame } from './implementations/connect-four/ConnectFourGame';
import { ReversiGame } from './implementations/reversi/ReversiGame';
import { CheckersGame } from './implementations/checkers/CheckersGame';
import { NineMensMorrisGame } from './implementations/nine-mens-morris/NineMensMorrisGame';
import { MancalaGame } from './implementations/mancala/MancalaGame';
import { SnakesAndLaddersGame } from './implementations/snakes-and-ladders/SnakesAndLaddersGame';
import { ChessGame } from './implementations/chess/ChessGame';
import { BackgammonGame } from './implementations/backgammon/BackgammonGame';
import { LudoGame } from './implementations/ludo/LudoGame';
import { SudokuGame } from './implementations/sudoku/SudokuGame';
import { MahjongGame } from './implementations/mahjong-solitaire/MahjongGame';
import { WordGuessGame } from './implementations/word-guess/WordGuessGame';
import { JigsawGame } from './implementations/jigsaw-puzzle/JigsawGame';
import { FruitSliceGame } from './implementations/fruit-slice/FruitSliceGame';
import { BasketballShotsGame } from './implementations/basketball-shots/BasketballShotsGame';
import { PenaltyShootoutGame } from './implementations/penalty-shootout/PenaltyShootoutGame';
import { BubbleShooterGame } from './implementations/bubble-shooter/BubbleShooterGame';
import { SolitaireGame } from './implementations/solitaire/SolitaireGame';
import { MazeChaserGame } from './implementations/maze-chaser/MazeChaserGame';
import { PixelSpaceShooterGame } from './implementations/pixel-space-shooter/PixelSpaceShooterGame';
import { FrogRoadCrossingGame } from './implementations/frog-road-crossing/FrogRoadCrossingGame';
import { ClassicPinballGame } from './implementations/classic-pinball/ClassicPinballGame';

export type GameComponent = React.ComponentType<GameSessionProps>;

const GAME_REGISTRY: Record<string, GameComponent> = {
  // Reused implementations mapped onto the refreshed catalog ids.
  '2048': NumberMergeGame,
  'memory-card-match': MemoryFlipGame,
  'snake-classic': SnakeGame,
  'reaction-time-challenge': ReflexRushGame,
  'tic-tac-toe': TicTacToeGame,
  pong: PongGame,
  minesweeper: MinesweeperGame,
  'helicopter-escape': HelicopterEscapeGame,
  'brick-breaker': BrickBreakerGame,
  'lights-out': LightsOutGame,
  'sliding-number-puzzle': SlidingPuzzleGame,
  'math-rush': MathRushGame,
  'block-puzzle': BlockPuzzleGame,
  'flappy-flight': FlappyFlightGame,
  'stack-tower': StackTowerGame,
  'color-switch': ColorSwitchGame,
  'whack-a-mole': WhackAMoleGame,
  'jump-and-dodge': JumpAndDodgeGame,
  'traffic-racer': TrafficRacerGame,
  'parking-master': ParkingMasterGame,
  'drift-challenge': DriftChallengeGame,
  'endless-highway': EndlessHighwayGame,
  'taxi-driver-challenge': TaxiDriverChallengeGame,
  'monster-truck-jump': MonsterTruckJumpGame,
  'mini-kart-racing': MiniKartRacingGame,
  'car-dodge': CarDodgeGame,
  'road-crossing-challenge': RoadCrossingGame,
  'hill-climb-challenge': HillClimbChallengeGame,
  'connect-four': ConnectFourGame,
  reversi: ReversiGame,
  checkers: CheckersGame,
  'nine-mens-morris': NineMensMorrisGame,
  mancala: MancalaGame,
  'snakes-and-ladders': SnakesAndLaddersGame,
  chess: ChessGame,
  backgammon: BackgammonGame,
  ludo: LudoGame,
  sudoku: SudokuGame,
  'mahjong-solitaire': MahjongGame,
  'word-guess': WordGuessGame,
  'jigsaw-puzzle': JigsawGame,
  'fruit-slice': FruitSliceGame,
  'basketball-shots': BasketballShotsGame,
  'penalty-shootout': PenaltyShootoutGame,
  'bubble-shooter': BubbleShooterGame,
  solitaire: SolitaireGame,
  'maze-chaser': MazeChaserGame,
  'pixel-space-shooter': PixelSpaceShooterGame,
  'frog-road-crossing': FrogRoadCrossingGame,
  'classic-pinball': ClassicPinballGame,
};

export function getGameComponent(gameId: string): GameComponent | null {
  return GAME_REGISTRY[gameId] || null;
}

export function isGamePlayable(gameId: string): boolean {
  return !!GAME_REGISTRY[gameId];
}
