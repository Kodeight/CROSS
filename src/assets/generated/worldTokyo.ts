/** img2threejs world chunk: TOKYO (tuner cars + neon tram). */
import type * as THREE from 'three';
import { createWhiteSportsTunerModel } from '../../../assets/img2threejs/factories/createTokyoWhiteTunerModel';
import { createRedJapaneseTunerModel } from '../../../assets/img2threejs/factories/createTokyoRedTunerModel';
import { createModernNeonTramModel } from '../../../assets/img2threejs/factories/createTokyoNeonTramModel';

export const TOKYO_FACTORIES: Record<string, () => THREE.Group> = {
  tokyo_white_tuner: () => createWhiteSportsTunerModel(),
  tokyo_red_tuner: () => createRedJapaneseTunerModel(),
  tokyo_neon_tram: () => createModernNeonTramModel(),
};
