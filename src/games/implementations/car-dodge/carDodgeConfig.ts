import { FallingDodgeConfig } from '../shared/fallingDodge';

/** Free-steering dodger: drag anywhere to weave through random obstacles. */
export const CAR_DODGE_CONFIG: FallingDodgeConfig = {
  playerY: 0.82,
  playerW: 0.11,
  playerH: 0.15,
  speedStart: 0.5,
  speedMax: 1.15,
  speedRamp: 0.02,
  spawnInterval: 0.75,
  obstacleW: 0.12,
  obstacleH: 0.13,
};
