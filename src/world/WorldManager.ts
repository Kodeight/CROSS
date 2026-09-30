/** §11 — owns the current world: selection, lookup, lane→world progression. Exactly five active worlds (CITY → RIVER → BEACH → VOLCANO → TOKYO). */
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
            (g) => props.planter(g),
          ];
          break;
        case 'river':
          decor = [
            (g) => props.duckie(g),
            (g) => props.lilypad(g),
            (g) => trees.streetTree(g),
            (g) => props.buoy(g),
            (g) => buildings.fence(g),
          ];
          break;
        case 'beach':
          decor = [
            (g) => trees.palm(g),
            (g) => props.umbrella(g),
            (g) => props.surfboard(g),
            (g) => props.beachSign(g),
            (g) => buildings.cafe(g),
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
        case 'desert':
          decor = [
            (g) => trees.cactus(g),
            (g) => props.desertRock(g),
            (g) => buildings.mountain(g, 0xb08b52, 110),
            (g) => props.tuft(g),
          ];
          break;
        case 'snow':
          decor = [
            (g) => props.snowman(g),
            (g) => trees.pine(g, true),
            (g) => props.snowBank(g),
            (g) => props.iceRock(g),
            (g) => buildings.mountain(g, 0x5a6472, 120),
          ];
          break;
        case 'farm':
          decor = [
            (g) => props.hayBale(g),
            (g) => props.fence(g),
            (g) => trees.streetTree(g),
            (g) => buildings.smallHouse(g),
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
        case 'night_city':
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
        case 'airport':
          decor = [
            (g) => props.trafficCone(g),
            (g) => props.shippingCrate(g),
            (g) => props.barrier(g),
            (g) => props.trashCan(g),
          ];
          break;
        case 'harbor':
          decor = [
            (g) => props.shippingCrate(g),
            (g) => props.hazardBarrier(g),
            (g) => props.buoy(g),
            (g) => props.pierPost(g),
          ];
          break;
        case 'highway':
          decor = [
            (g) => props.barrier(g),
            (g) => props.hazardBarrier(g),
            (g) => props.railSignal(g),
            (g) => props.lamp(g),
          ];
          break;
        case 'candy':
          decor = [
            (g) => props.candyCane(g),
            (g) => trees.candyTree(g),
            (g) => props.crystalSpire(g),
            (g) => buildings.shop(g),
          ];
          break;
        case 'ruins':
          decor = [
            (g) => props.ruinsPillar(g),
            (g) => props.stoneObelisk(g),
            (g) => props.goldenUrn(g),
            (g) => props.jungleRock(g),
          ];
          break;
        case 'space':
          decor = [
            (g) => props.commAntenna(g),
            (g) => props.lunarLander(g),
            (g) => props.holoPillar(0x38e1ff)(g),
          ];
          break;
        case 'tokyo':
          decor = [
            (g) => props.toriiGate(g),
            (g) => trees.cherryTree(g),
            (g) => props.lamp(g),
            (g) => buildings.shop(g),
          ];
          break;
        case 'wildlife':
          decor = [
            (g) => trees.acaciaTree(g),
            (g) => trees.baobabTree(g),
            (g) => props.desertRock(g),
            (g) => props.tuft(g),
          ];
          break;
        case 'underwater':
          decor = [
            (g) => props.coralSpire(g),
            (g) => props.buoy(g),
            (g) => props.pierPost(g),
          ];
          break;
        case 'sky_island':
        case 'sky':
        default:
          decor = [
            (g) => props.cloudPillar(g),
            (g) => props.crystalSpire(g),
            (g) => props.stoneObelisk(g),
            (g) => buildings.cafe(g),
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

