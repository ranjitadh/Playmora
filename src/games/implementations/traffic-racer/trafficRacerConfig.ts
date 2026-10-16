import { FallingDodgeConfig } from '../shared/fallingDodge';

/** 3-lane top-down racer: snap between lanes to dodge oncoming traffic. */
export const TRAFFIC_RACER_CONFIG: FallingDodgeConfig = {
  playerY: 0.82,
  playerW: 0.14,
  playerH: 0.16,
  speedStart: 0.42,
  speedMax: 1.05,
  speedRamp: 0.02,
  spawnInterval: 0.95,
  obstacleW: 0.15,
  obstacleH: 0.16,
  lanes: 3,
};
