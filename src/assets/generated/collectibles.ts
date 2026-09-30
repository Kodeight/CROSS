/**
 * img2threejs chunk: coin + powerups.
 * Reference-built collectibles, lazy-loaded once at boot (small, shared by
 * all five worlds) and cached for the session + PWA bundle afterwards.
 */
import type * as THREE from 'three';
import { createGoldStarCoinModel } from '../../../assets/img2threejs/factories/createCoinStarModel';
import { createShieldPowerupModel } from '../../../assets/img2threejs/factories/createPowerupShieldModel';
import { createMagnetPowerupModel } from '../../../assets/img2threejs/factories/createPowerupMagnetModel';
import { createFreezePowerupModel } from '../../../assets/img2threejs/factories/createPowerupFreezeModel';
import { createSpeedBoostPowerupModel } from '../../../assets/img2threejs/factories/createPowerupSpeedModel';
import { createDoubleCoinsPowerupModel } from '../../../assets/img2threejs/factories/createPowerupDoubleCoinsModel';
import { createExtraLifePowerupModel } from '../../../assets/img2threejs/factories/createPowerupExtraLifeModel';
import { createSlowTimePowerupModel } from '../../../assets/img2threejs/factories/createPowerupSlowTimeModel';
import { createInvisibilityPowerupModel } from '../../../assets/img2threejs/factories/createPowerupGhostModel';
import { createJumpBoostPowerupModel } from '../../../assets/img2threejs/factories/createPowerupJumpBoostModel';

export const COLLECTIBLE_FACTORIES: Record<string, () => THREE.Group> = {
  coin_star: () => createGoldStarCoinModel(),
  powerup_shield: () => createShieldPowerupModel(),
  powerup_magnet: () => createMagnetPowerupModel(),
  powerup_freeze: () => createFreezePowerupModel(),
  powerup_speed: () => createSpeedBoostPowerupModel(),
  powerup_double_coins: () => createDoubleCoinsPowerupModel(),
  powerup_extra_life: () => createExtraLifePowerupModel(),
  powerup_slow_time: () => createSlowTimePowerupModel(),
  powerup_ghost: () => createInvisibilityPowerupModel(),
  powerup_jump_boost: () => createJumpBoostPowerupModel(),
};
