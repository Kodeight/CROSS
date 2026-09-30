/** img2threejs world chunk: BEACH (land + water traffic). */
import type * as THREE from 'three';
import { createBeachDuneBuggyModel } from '../../../assets/img2threejs/factories/createBeachDuneBuggyModel';
import { createBeachATVModel } from '../../../assets/img2threejs/factories/createBeachAtvModel';
import { createJetSkiModel } from '../../../assets/img2threejs/factories/createBeachJetSkiModel';

export const BEACH_FACTORIES: Record<string, () => THREE.Group> = {
  beach_dune_buggy: () => createBeachDuneBuggyModel(),
  beach_atv: () => createBeachATVModel(),
  beach_jet_ski: () => createJetSkiModel(),
};
