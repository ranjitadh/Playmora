import React from 'react';
import { GameSessionProps } from '../../types';
import { FallingDodgeGame } from '../shared/FallingDodgeGame';
import { ENDLESS_HIGHWAY_CONFIG } from './endlessHighwayConfig';

export const EndlessHighwayGame: React.FC<GameSessionProps> = (props) => (
  <FallingDodgeGame
    {...props}
    config={ENDLESS_HIGHWAY_CONFIG}
    title="ENDLESS HIGHWAY"
    roadColor="#22262F"
    obstacleColor="#38BDF8"
    playerIcon="bus"
  />
);
