/** §11 — owns the current world: selection, lookup, lane→world progression. All 20 worlds supported. */
import { WORLDS, WORLD_LENGTH, worldById, worldIndex, beachDistrict, type WorldConfig } from '../config/worlds.config';
import type { World } from './World';
import type { PropFactory, PropBuilder } from './environment/PropFactory';
import type { BuildingFactory } from './environment/BuildingFactory';
import type { TreeFactory } from './environment/TreeFactory';

export class WorldManager {
  private readonly worlds: World[];
  current: World;

  constructor(props: PropFactory, buildings: BuildingFactory, trees: TreeFactory, selectedId: string) {
    const obstacleSets = props.obstacleSets();
    this.worlds = WORLDS.map((cfg) => {
      let decor: PropBuilder[];
      let beachObstacles: PropBuilder[][] | undefined = undefined;

      switch (cfg.id) {
        case 'city':
          decor = [
            (g) => props.lamp(g),
            (g) => props.bench(g),
            (g) => buildings.busStop(g),
            (g) => trees.streetTree(g),
            (g) => props.trashCan(g),
            (g) => buildings.fence(g),
            (g) => props.crossSign(g),
            (g) => props.kiosk(g),
            (g) => props.planter(g),
            (g) => buildings.cafe(g),
          ];
          break;
        case 'jungle':
          decor = [
            (g) => trees.bigLeaf(g),
            (g) => trees.vineTree(g),
            (g) => props.jungleRock(g),
            (g) => trees.bush(g),
          ];
          break;
        case 'desert':
          decor = [
            (g) => buildings.mountain(g, 0xb08b52, 110),
            (g) => props.desertRock(g),
            (g) => props.tuft(g),
            (g) => trees.cactus(g),
          ];
          break;
        case 'snow':
          decor = [
            (g) => trees.pine(g, true),
            (g) => props.snowBank(g),
            (g) => props.iceRock(g),
            (g) => buildings.mountain(g, 0x5a6472, 120),
          ];
          break;
        case 'neon':
          decor = [
            (g) => props.holoPillar(0x38e1ff)(g),
            (g) => props.holoPillar(0xff3fb4)(g),
            (g) => props.neonSign(g),
            (g) => props.glowBarrier(g),
            (g) => buildings.shop(g),
          ];
          break;
        case 'volcano':
          decor = [
            (g) => props.magmaRock(g),
            (g) => props.basaltPillar(g),
            (g) => props.smokeVent(g),
            (g) => buildings.mountain(g, 0x241410, 130),
          ];
          break;
        case 'beach':
          decor = [
            (g) => buildings.cafe(g),
            (g) => buildings.shop(g),
            (g) => trees.palm(g),
            (g) => props.beachSign(g),
            (g) => props.crossSign(g),
          ];
          beachObstacles = props.beachDistrictObstacles();
          break;
        case 'forest':
          decor = [
            (g) => props.magicMushroom(g),
            (g) => props.ancientRune(g),
            (g) => trees.vineTree(g),
            (g) => trees.bush(g),
          ];
          break;
        case 'industrial':
          decor = [
            (g) => props.hazardBarrier(g),
            (g) => props.shippingCrate(g),
            (g) => props.trashCan(g),
            (g) => buildings.shop(g),
          ];
          break;
        case 'temple':
          decor = [
            (g) => props.stoneObelisk(g),
            (g) => props.goldenUrn(g),
            (g) => props.jungleRock(g),
            (g) => trees.vineTree(g),
          ];
          break;
        case 'flooded':
          decor = [
            (g) => props.submergedRooftop(g),
            (g) => props.pierPost(g),
            (g) => props.buoy(g),
            (g) => buildings.cafe(g),
          ];
          break;
        case 'railway':
          decor = [
            (g) => props.railSignal(g),
            (g) => props.shippingCrate(g),
            (g) => props.barrier(g),
            (g) => buildings.fence(g),
          ];
          break;
        case 'countryside':
          decor = [
            (g) => props.hayBale(g),
            (g) => props.fence(g),
            (g) => trees.streetTree(g),
            (g) => buildings.smallHouse(g),
          ];
          break;
        case 'mountain':
          decor = [
            (g) => trees.pine(g, true),
            (g) => props.snowBank(g),
            (g) => props.desertRock(g),
            (g) => buildings.mountain(g, 0x385f6e, 140),
          ];
          break;
        case 'fantasy':
          decor = [
            (g) => props.crystalSpire(g),
            (g) => props.magicMushroom(g),
            (g) => trees.vineTree(g),
            (g) => buildings.shop(g),
          ];
          break;
        case 'pirate':
          decor = [
            (g) => props.treasureChest(g),
            (g) => props.pirateCannon(g),
            (g) => trees.palm(g),
            (g) => props.surfboard(g),
          ];
          break;
        case 'ocean':
          decor = [
            (g) => props.coralSpire(g),
            (g) => props.buoy(g),
            (g) => props.boat(g),
            (g) => props.pierPost(g),
          ];
          break;
        case 'moon':
          decor = [
            (g) => props.lunarLander(g),
            (g) => props.commAntenna(g),
            (g) => props.snowBank(g),
            (g) => buildings.mountain(g, 0x2f3640, 100),
          ];
          break;
        case 'sky':
          decor = [
            (g) => props.cloudPillar(g),
            (g) => props.stoneObelisk(g),
            (g) => props.crystalSpire(g),
            (g) => buildings.cafe(g),
          ];
          break;
        case 'alien':
        default:
          decor = [
            (g) => props.xenolithMonolith(g),
            (g) => props.bioSpore(g),
            (g) => props.holoPillar(0xa55eea)(g),
            (g) => buildings.mountain(g, 0x1d0b2e, 120),
          ];
          break;
      }

      return {
        config: cfg,
        obstacles: obstacleSets[cfg.id] ?? obstacleSets.city,
        decor,
        beachObstacles,
      };
    });
    this.current = this.byId(selectedId);
  }

  getAllWorlds(): World[] {
    return this.worlds;
  }

  byId(id: string): World {
    const norm = id.toLowerCase();
    for (const w of this.worlds) if (w.config.id.toLowerCase() === norm) return w;
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

