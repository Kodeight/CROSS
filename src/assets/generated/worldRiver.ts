/** img2threejs world chunk: RIVER (water vehicles). */
import type * as THREE from 'three';
import { createFishingBoatModel } from '../../../assets/img2threejs/factories/createRiverFishingBoatModel';
import { createSpeedBoatModel } from '../../../assets/img2threejs/factories/createRiverSpeedBoatModel';
import { createCargoTugBoatModel } from '../../../assets/img2threejs/factories/createRiverCargoBoatModel';

export const RIVER_FACTORIES: Record<string, () => THREE.Group> = {
  river_fishing_boat: () => createFishingBoatModel(),
  river_speed_boat: () => createSpeedBoatModel(),
  river_cargo_boat: () => createCargoTugBoatModel(),
};
