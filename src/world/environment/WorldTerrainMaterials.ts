/**
 * Central PBR Material & Surface Factory for CROSS! five worlds.
 * Supplies optimized, cached MeshStandardMaterial instances with procedural
 * surface maps, correct tile repeating, and PBR roughness/metalness values.
 */
import * as THREE from 'three';
import { WorldTextureGenerator } from '../../renderer/WorldTextureGenerator';

export class WorldTerrainMaterials {
  private static instance: WorldTerrainMaterials | null = null;
  private materials = new Map<string, THREE.MeshStandardMaterial>();

  static get(): WorldTerrainMaterials {
    if (!WorldTerrainMaterials.instance) {
      WorldTerrainMaterials.instance = new WorldTerrainMaterials();
    }
    return WorldTerrainMaterials.instance;
  }

  getMaterial(key: string, create: () => THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
    let mat = this.materials.get(key);
    if (!mat) {
      mat = create();
      this.materials.set(key, mat);
    }
    return mat;
  }

  // -----------------------------------------------------------------
  // 1. CITY MATERIALS
  // -----------------------------------------------------------------
  getCityGrassMaterial(colorVariant = 0): THREE.MeshStandardMaterial {
    const key = `city_grass_${colorVariant}`;
    return this.getMaterial(key, () => {
      const texGen = WorldTextureGenerator.get();
      const diff = texGen.getTexture('city_grass_diffuse').clone();
      diff.repeat.set(16, 2);
      diff.wrapS = THREE.RepeatWrapping;
      diff.wrapT = THREE.RepeatWrapping;
      diff.needsUpdate = true;

      const baseHex = colorVariant === 1 ? 0x62b234 : colorVariant === 2 ? 0x70c43e : 0x68b838;

      return new THREE.MeshStandardMaterial({
        color: baseHex,
        map: diff,
        roughness: 0.82,
        metalness: 0.08,
      });
    });
  }

  getCityRoadMaterial(): THREE.MeshStandardMaterial {
    return this.getMaterial('city_road', () => {
      const texGen = WorldTextureGenerator.get();
      const diff = texGen.getTexture('city_asphalt_diffuse').clone();
      diff.repeat.set(14, 1);
      diff.wrapS = THREE.RepeatWrapping;
      diff.wrapT = THREE.RepeatWrapping;
      diff.needsUpdate = true;

      const rough = texGen.getTexture('city_asphalt_roughness').clone();
      rough.repeat.set(14, 1);
      rough.wrapS = THREE.RepeatWrapping;
      rough.wrapT = THREE.RepeatWrapping;
      rough.needsUpdate = true;

      return new THREE.MeshStandardMaterial({
        color: 0x242831,
        map: diff,
        roughnessMap: rough,
        roughness: 0.65,
        metalness: 0.15,
      });
    });
  }

  getGraniteCurbMaterial(walkColor = 0xd8d4c2): THREE.MeshStandardMaterial {
    return this.getMaterial(`granite_curb_${walkColor}`, () => {
      const texGen = WorldTextureGenerator.get();
      const diff = texGen.getTexture('granite_curb_diffuse').clone();
      diff.repeat.set(12, 1);
      diff.wrapS = THREE.RepeatWrapping;
      diff.wrapT = THREE.RepeatWrapping;
      diff.needsUpdate = true;

      return new THREE.MeshStandardMaterial({
        color: walkColor,
        map: diff,
        roughness: 0.72,
        metalness: 0.1,
      });
    });
  }

  getCitySidewalkMaterial(): THREE.MeshStandardMaterial {
    return this.getMaterial('city_sidewalk', () => {
      const texGen = WorldTextureGenerator.get();
      const diff = texGen.getTexture('city_sidewalk_diffuse').clone();
      diff.repeat.set(18, 1);
      diff.wrapS = THREE.RepeatWrapping;
      diff.wrapT = THREE.RepeatWrapping;
      diff.needsUpdate = true;

      return new THREE.MeshStandardMaterial({
        color: 0xd4d0c4,
        map: diff,
        roughness: 0.78,
        metalness: 0.08,
      });
    });
  }

  getMarkingMaterial(color = 0xffffff, isYellow = false): THREE.MeshStandardMaterial {
    const key = `road_marking_${color}_${isYellow}`;
    return this.getMaterial(key, () => {
      return new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.45,
        metalness: 0.1,
        emissive: isYellow ? 0x332600 : 0x222222,
        emissiveIntensity: 0.25,
      });
    });
  }

  // -----------------------------------------------------------------
  // 2. RIVER MATERIALS
  // -----------------------------------------------------------------
  getRiverWaterMaterial(): THREE.MeshStandardMaterial {
    return this.getMaterial('river_water', () => {
      const texGen = WorldTextureGenerator.get();
      const diff = texGen.getTexture('river_water_diffuse').clone();
      diff.repeat.set(10, 1);
      diff.wrapS = THREE.RepeatWrapping;
      diff.wrapT = THREE.RepeatWrapping;
      diff.needsUpdate = true;

      return new THREE.MeshStandardMaterial({
        color: 0x1f80b0,
        map: diff,
        roughness: 0.12, // High specular gloss for liquid surface
        metalness: 0.45,
        transparent: true,
        opacity: 0.94,
        emissive: 0x083852,
        emissiveIntensity: 0.35,
      });
    });
  }

  getRiverBankMaterial(): THREE.MeshStandardMaterial {
    return this.getMaterial('river_bank', () => {
      const texGen = WorldTextureGenerator.get();
      const diff = texGen.getTexture('river_bank_diffuse').clone();
      diff.repeat.set(14, 2);
      diff.wrapS = THREE.RepeatWrapping;
      diff.wrapT = THREE.RepeatWrapping;
      diff.needsUpdate = true;

      return new THREE.MeshStandardMaterial({
        color: 0x5a9442,
        map: diff,
        roughness: 0.75,
        metalness: 0.1,
      });
    });
  }

  getWoodPlankMaterial(): THREE.MeshStandardMaterial {
    return this.getMaterial('wood_plank', () => {
      return new THREE.MeshStandardMaterial({
        color: 0x7c5836,
        roughness: 0.75,
        metalness: 0.05,
      });
    });
  }

  // -----------------------------------------------------------------
  // 3. BEACH MATERIALS
  // -----------------------------------------------------------------
  getBeachSandMaterial(isWet = false): THREE.MeshStandardMaterial {
    const key = `beach_sand_${isWet}`;
    return this.getMaterial(key, () => {
      const texGen = WorldTextureGenerator.get();
      const texName = isWet ? 'beach_wet_sand_diffuse' : 'beach_sand_diffuse';
      const diff = texGen.getTexture(texName).clone();
      diff.repeat.set(12, 2);
      diff.wrapS = THREE.RepeatWrapping;
      diff.wrapT = THREE.RepeatWrapping;
      diff.needsUpdate = true;

      return new THREE.MeshStandardMaterial({
        color: isWet ? 0xd0af6e : 0xf2dea2,
        map: diff,
        roughness: isWet ? 0.35 : 0.88,
        metalness: isWet ? 0.25 : 0.05,
      });
    });
  }

  getBeachOceanMaterial(): THREE.MeshStandardMaterial {
    return this.getMaterial('beach_ocean', () => {
      const texGen = WorldTextureGenerator.get();
      const diff = texGen.getTexture('river_water_diffuse').clone();
      diff.repeat.set(10, 1);
      diff.wrapS = THREE.RepeatWrapping;
      diff.wrapT = THREE.RepeatWrapping;
      diff.needsUpdate = true;

      return new THREE.MeshStandardMaterial({
        color: 0x22a8cf,
        map: diff,
        roughness: 0.1,
        metalness: 0.5,
        transparent: true,
        opacity: 0.92,
        emissive: 0x0a4860,
        emissiveIntensity: 0.4,
      });
    });
  }

  // -----------------------------------------------------------------
  // 4. VOLCANO MATERIALS
  // -----------------------------------------------------------------
  getVolcanoRockMaterial(): THREE.MeshStandardMaterial {
    return this.getMaterial('volcano_rock', () => {
      const texGen = WorldTextureGenerator.get();
      const diff = texGen.getTexture('volcano_rock_diffuse').clone();
      diff.repeat.set(12, 2);
      diff.wrapS = THREE.RepeatWrapping;
      diff.wrapT = THREE.RepeatWrapping;
      diff.needsUpdate = true;

      return new THREE.MeshStandardMaterial({
        color: 0x262228,
        map: diff,
        roughness: 0.85,
        metalness: 0.25,
        emissive: 0x180806,
        emissiveIntensity: 0.3,
      });
    });
  }

  getVolcanoLavaMaterial(): THREE.MeshStandardMaterial {
    return this.getMaterial('volcano_lava', () => {
      const texGen = WorldTextureGenerator.get();
      const diff = texGen.getTexture('volcano_lava_diffuse').clone();
      diff.repeat.set(8, 1);
      diff.wrapS = THREE.RepeatWrapping;
      diff.wrapT = THREE.RepeatWrapping;
      diff.needsUpdate = true;

      const emis = texGen.getTexture('volcano_lava_emissive').clone();
      emis.repeat.set(8, 1);
      emis.wrapS = THREE.RepeatWrapping;
      emis.wrapT = THREE.RepeatWrapping;
      emis.needsUpdate = true;

      return new THREE.MeshStandardMaterial({
        color: 0xff4800,
        map: diff,
        emissive: 0xff4000,
        emissiveMap: emis,
        emissiveIntensity: 1.25,
        roughness: 0.35,
        metalness: 0.1,
      });
    });
  }

  // -----------------------------------------------------------------
  // 5. TOKYO MATERIALS
  // -----------------------------------------------------------------
  getTokyoRoadMaterial(): THREE.MeshStandardMaterial {
    return this.getMaterial('tokyo_road', () => {
      const texGen = WorldTextureGenerator.get();
      const diff = texGen.getTexture('tokyo_asphalt_diffuse').clone();
      diff.repeat.set(12, 1);
      diff.wrapS = THREE.RepeatWrapping;
      diff.wrapT = THREE.RepeatWrapping;
      diff.needsUpdate = true;

      const rough = texGen.getTexture('tokyo_asphalt_roughness').clone();
      rough.repeat.set(12, 1);
      rough.wrapS = THREE.RepeatWrapping;
      rough.wrapT = THREE.RepeatWrapping;
      rough.needsUpdate = true;

      return new THREE.MeshStandardMaterial({
        color: 0x1b1828,
        map: diff,
        roughnessMap: rough,
        roughness: 0.35, // Wet slick road
        metalness: 0.35,
        emissive: 0x120a22,
        emissiveIntensity: 0.45,
      });
    });
  }

  getTokyoSidewalkMaterial(): THREE.MeshStandardMaterial {
    return this.getMaterial('tokyo_sidewalk', () => {
      return new THREE.MeshStandardMaterial({
        color: 0x2d283c,
        roughness: 0.65,
        metalness: 0.2,
        emissive: 0x1c142b,
        emissiveIntensity: 0.4,
      });
    });
  }

  getTokyoNeonStripMaterial(color = 0x00e5ff): THREE.MeshStandardMaterial {
    const key = `tokyo_neon_${color}`;
    return this.getMaterial(key, () => {
      return new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 1.4,
        roughness: 0.2,
        metalness: 0.8,
      });
    });
  }
}
