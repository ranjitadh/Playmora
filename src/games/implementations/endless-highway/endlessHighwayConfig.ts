import { FallingDodgeConfig } from '../shared/fallingDodge';

/** Fast 4-lane highway: higher speed and denser traffic than Traffic Racer. */
export const ENDLESS_HIGHWAY_CONFIG: FallingDodgeConfig = {
  playerY: 0.84,
  playerW: 0.12,
  playerH: 0.15,
  speedStart: 0.6,
  speedMax: 1.4,
  speedRamp: 0.03,
  spawnInterval: 0.7,
  obstacleW: 0.12,
  obstacleH: 0.14,
  lanes: 4,
};
