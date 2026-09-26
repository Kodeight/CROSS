/** §11 — owns the current world: selection, lookup, lane→world progression. */
import { WORLDS, WORLD_LENGTH, worldById, worldIndex, beachDistrict, type WorldConfig } from '../config/worlds.config';
import { createCityWorld } from './worlds/CityWorld';
import { createBeachWorld } from './worlds/BeachWorld';
import { createJungleWorld } from './worlds/JungleWorld';
import { createDesertWorld } from './worlds/DesertWorld';
import { createSnowWorld } from './worlds/SnowWorld';
import { createNeonWorld } from './worlds/NeonWorld';
import type { World } from './World';
import type { PropFactory, PropBuilder } from './environment/PropFactory';
import type { BuildingFactory } from './environment/BuildingFactory';
import type { TreeFactory } from './environment/TreeFactory';

export class WorldManager {
  private readonly worlds: World[];
  current: World;

  constructor(props: PropFactory, buildings: BuildingFactory, trees: TreeFactory, selectedId: string) {
    const obstacleSets = props.obstacleSets();

    // World-specific decor dictionaries for all 20+ worlds
    const decorSets: Record<string, PropBuilder[]> = {
      volcano: [
        (g) => buildings.volcanoCaldera(g, 26),
        (g) => props.obsidianSpire(g),
        (g) => props.magmaRock(g),
        (g) => trees.magmaSpire(g),
        (g) => props.magmaRock(g),
      ],
      forest: [
        (g) => trees.glowMushroomTree(g),
        (g) => props.glowMushroom(g),
        (g) => props.magicRoot(g),
        (g) => trees.pine(g, false),
        (g) => props.glowMushroom(g),
      ],
      industrial: [
        (g) => buildings.factoryWarehouse(g),
        (g) => props.barrelStack(g),
        (g) => props.pipeSection(g),
        (g) => props.barrier(g),
        (g) => props.barrelStack(g),
      ],
      temple: [
        (g) => buildings.templeRuins(g),
        (g) => props.ancientPillar(g),
        (g) => props.stoneRelic(g),
        (g) => props.ancientPillar(g),
      ],
      countryside: [
        (g) => buildings.smallHouse(g),
        (g) => buildings.fence(g),
        (g) => props.hayBale(g),
        (g) => trees.streetTree(g),
        (g) => trees.bush(g),
      ],
      mountain: [
        (g) => buildings.mountain(g, 0x4a7f93, 30),
        (g) => trees.pine(g, true),
        (g) => props.peakRock(g),
        (g) => trees.pine(g, true),
      ],
      railway: [
        (g) => props.signalLight(g),
        (g) => props.barrier(g),
        (g) => buildings.fence(g),
        (g) => props.trashCan(g),
      ],
      pirate: [
        (g) => props.rumBarrel(g),
        (g) => props.pierPost(g),
        (g) => props.boat(g),
        (g) => buildings.fence(g),
      ],
      ocean: [
        (g) => props.giantCoral(g),
        (g) => props.buoy(g),
        (g) => props.giantCoral(g),
        (g) => props.boat(g),
      ],
      moon: [
        (g) => buildings.mountain(g, 0x576574, 28),
        (g) => props.craterRock(g),
        (g) => props.holoPillar(0xced6e0)(g),
        (g) => props.craterRock(g),
      ],
      sky: [
        (g) => props.aetherObelisk(g),
        (g) => buildings.tower(g),
        (g) => trees.streetTree(g),
        (g) => props.aetherObelisk(g),
      ],
      alien: [
        (g) => props.alienTentacle(g),
        (g) => props.plasmaGeode(g),
        (g) => props.holoPillar(0xa55eea)(g),
        (g) => props.alienTentacle(g),
      ],
      fantasy: [
        (g) => props.bannerPillar(g),
        (g) => trees.pine(g, false),
        (g) => props.stoneRelic(g),
        (g) => props.bannerPillar(g),
      ],
      flooded: [
        (g) => props.buoy(g),
        (g) => props.pierPost(g),
        (g) => props.boat(g),
        (g) => props.pierPost(g),
      ],
    };

    this.worlds = WORLDS.map((cfg) => {
      if (cfg.id === 'city') return createCityWorld(props, buildings, trees);
      if (cfg.id === 'jungle') return createJungleWorld(props, buildings, trees);
      if (cfg.id === 'desert') return createDesertWorld(props, buildings, trees);
      if (cfg.id === 'snow') return createSnowWorld(props, buildings, trees);
      if (cfg.id === 'neon') return createNeonWorld(props, buildings, trees);
      if (cfg.id === 'beach') return createBeachWorld(props, buildings, trees);

      const obst = obstacleSets[cfg.id] ?? obstacleSets.city;
      const dec = decorSets[cfg.id] ?? [
        (g) => buildings.shop(g),
        (g) => buildings.fence(g),
        (g) => trees.streetTree(g),
        (g) => props.crossSign(g),
        (g) => props.lamp(g),
      ];

      return {
        config: cfg,
        obstacles: obst,
        decor: dec,
      };
    });
    this.current = this.byId(selectedId);
  }

  byId(id: string): World {
    for (const w of this.worlds) if (w.config.id === id) return w;
    return this.worlds[0];
  }

  configById(id: string): WorldConfig {
    return worldById(id);
  }

  /** World for a lane: stretches of WORLD_LENGTH rotate onward from the selected base. */
  worldForLane(lane: number, selectedId: string): WorldConfig {
    const base = worldIndex(selectedId);
    const w = (base + Math.floor(Math.max(0, lane) / WORLD_LENGTH)) % WORLDS.length;
    return WORLDS[w];
  }

  worldDefForLane(lane: number, selectedId: string): World {
    const cfg = this.worldForLane(lane, selectedId);
    return this.byId(cfg.id);
  }

  districtForLane(lane: number, worldId: string): number {
    return worldId === 'beach' ? beachDistrict(lane) : -1;
  }

  setCurrent(world: World): void {
    this.current = world;
  }
}
