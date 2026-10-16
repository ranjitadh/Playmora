import React from 'react';
import { GameSessionProps } from '../../types';
import { FallingDodgeGame } from '../shared/FallingDodgeGame';
import { TRAFFIC_RACER_CONFIG } from './trafficRacerConfig';

export const TrafficRacerGame: React.FC<GameSessionProps> = (props) => (
  <FallingDodgeGame
    {...props}
    config={TRAFFIC_RACER_CONFIG}
    title="TRAFFIC RACER"
    roadColor="#3A3F4C"
    obstacleColor="#F43F5E"
    playerIcon="car-sport"
  />
);
