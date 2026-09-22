import { worldById } from '../../config/worlds.config';
import type { World } from '../World';
import type { PropFactory } from '../environment/PropFactory';
import type { BuildingFactory } from '../environment/BuildingFactory';
import type { TreeFactory } from '../environment/TreeFactory';

export function createCityWorld(props: PropFactory, buildings: BuildingFactory, trees: TreeFactory): World {
  return {
    config: worldById('city'),
    obstacles: props.obstacleSets().city,
    decor: [
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
    ],
  };
}
