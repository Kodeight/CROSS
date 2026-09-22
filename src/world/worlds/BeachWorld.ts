import { worldById } from '../../config/worlds.config';
import type { World } from '../World';
import type { PropFactory } from '../environment/PropFactory';
import type { BuildingFactory } from '../environment/BuildingFactory';
import type { TreeFactory } from '../environment/TreeFactory';

export function createBeachWorld(props: PropFactory, buildings: BuildingFactory, trees: TreeFactory): World {
  return {
    config: worldById('beach'),
    obstacles: props.obstacleSets().beach,
    decor: [
      (g) => buildings.cafe(g),
      (g) => buildings.shop(g),
      (g) => trees.palm(g),
      (g) => props.beachSign(g),
      (g) => props.crossSign(g),
    ],
    beachObstacles: props.beachDistrictObstacles(),
  };
}
