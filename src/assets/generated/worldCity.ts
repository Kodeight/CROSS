/**
 * img2threejs world chunk: CITY.
 * Statically binds the three reference-built CITY factories so the whole
 * world can be lazy-loaded as one Vite chunk (preload current world,
 * background-preload the next, cache after first load).
 */
import type * as THREE from 'three';
import { createCityTaxiModel } from '../../../assets/img2threejs/factories/createCityTaxiModel';
import { createCitySUVModel } from '../../../assets/img2threejs/factories/createCitySuvModel';
import { createCityBusModel } from '../../../assets/img2threejs/factories/createCityBusModel';

export const CITY_FACTORIES: Record<string, () => THREE.Group> = {
  city_taxi: () => createCityTaxiModel(),
  city_suv: () => createCitySUVModel(),
  city_bus: () => createCityBusModel(),
};
