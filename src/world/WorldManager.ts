/** §11 — owns the current world: selection, lookup, lane→world progression. */
import { WORLDS, WORLD_LENGTH, worldById, worldIndex, beachDistrict, type WorldConfig } from '../config/worlds.config';
import { createCityWorld } from './worlds/CityWorld';
import { createBeachWorld } from './worlds/BeachWorld';
import { createJungleWorld } from './worlds/JungleWorld';
import { createDesertWorld } from './worlds/DesertWorld';
import { createSnowWorld } from './worlds/SnowWorld';
import { createNeonWorld } from './worlds/NeonWorld';
import type { World } from './World';
import type { PropFactory } from './environment/PropFactory';
import type { BuildingFactory } from './environment/BuildingFactory';
import type { TreeFactory } from './environment/TreeFactory';

export class WorldManager {
  private readonly worlds: World[];
  current: World;

  constructor(props: PropFactory, buildings: BuildingFactory, trees: TreeFactory, selectedId: string) {
    const obstacleSets = props.obstacleSets();
    this.worlds = WORLDS.map((cfg) => {
      if (cfg.id === 'city') return createCityWorld(props, buildings, trees);
      if (cfg.id === 'jungle') return createJungleWorld(props, buildings, trees);
      if (cfg.id === 'desert') return createDesertWorld(props, buildings, trees);
      if (cfg.id === 'snow') return createSnowWorld(props, buildings, trees);
      if (cfg.id === 'neon') return createNeonWorld(props, buildings, trees);
      if (cfg.id === 'beach') return createBeachWorld(props, buildings, trees);

      // Generic data-driven instantiation for all new worlds (Volcano, Forest, Industrial, etc.)
      const obst = obstacleSets[cfg.id] ?? obstacleSets.city;
      return {
        config: cfg,
        obstacles: obst,
        decor: [
          (g) => buildings.shop(g),
          (g) => buildings.fence(g),
          (g) => trees.streetTree(g),
          (g) => props.crossSign(g),
          (g) => props.lamp(g),
        ],
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
