import { worldById } from '../../config/worlds.config';
import type { World } from '../World';
import type { PropFactory } from '../environment/PropFactory';
import type { BuildingFactory } from '../environment/BuildingFactory';
import type { TreeFactory } from '../environment/TreeFactory';

export function createSnowWorld(props: PropFactory, buildings: BuildingFactory, trees: TreeFactory): World {
  return {
    config: worldById('snow'),
    obstacles: props.obstacleSets().snow,
    decor: [
      (g) => buildings.mountain(g, 0xdcebf5, 130),
      (g) => trees.pine(g, true),
      (g) => props.snowBank(g),
    ],
  };
}
