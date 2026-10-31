import React from 'react';
import CosmicWaterPlanet, { CosmicWaterPlanetProps } from './CosmicWaterPlanet';

export type WaveTankProps = CosmicWaterPlanetProps;

export const WaveTank: React.FC<WaveTankProps> = (props) => {
  return <CosmicWaterPlanet {...props} />;
};

export default WaveTank;
