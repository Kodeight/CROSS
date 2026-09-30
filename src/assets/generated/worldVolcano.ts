/** img2threejs world chunk: VOLCANO (mining/industrial traffic). */
import type * as THREE from 'three';
import { createArmoredMonsterTruckModel } from '../../../assets/img2threejs/factories/createVolcanoArmoredTruckModel';
import { createMiningDumpTruckModel } from '../../../assets/img2threejs/factories/createVolcanoDumpTruckModel';
import { createDrillVehicleModel } from '../../../assets/img2threejs/factories/createVolcanoDrillVehicleModel';

export const VOLCANO_FACTORIES: Record<string, () => THREE.Group> = {
  volcano_armored_truck: () => createArmoredMonsterTruckModel(),
  volcano_dump_truck: () => createMiningDumpTruckModel(),
  volcano_drill_vehicle: () => createDrillVehicleModel(),
};
