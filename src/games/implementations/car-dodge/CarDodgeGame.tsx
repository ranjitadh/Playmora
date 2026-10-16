import React from 'react';
import { GameSessionProps } from '../../types';
import { FallingDodgeGame } from '../shared/FallingDodgeGame';
import { CAR_DODGE_CONFIG } from './carDodgeConfig';

export const CarDodgeGame: React.FC<GameSessionProps> = (props) => (
  <FallingDodgeGame
    {...props}
    config={CAR_DODGE_CONFIG}
    title="CAR DODGE"
    roadColor="#2B2F3A"
    obstacleColor="#F59E0B"
    playerIcon="car"
  />
);
