import { worldById } from '../../config/worlds.config';
import type { World } from '../World';
import type { PropFactory } from '../environment/PropFactory';
import type { BuildingFactory } from '../environment/BuildingFactory';
import type { TreeFactory } from '../environment/TreeFactory';

export function createDesertWorld(props: PropFactory, buildings: BuildingFactory, _trees: TreeFactory): World {
  void _trees;
  return {
    config: worldById('desert'),
    obstacles: props.obstacleSets().desert,
    decor: [
      (g) => buildings.mountain(g, 0xb08b52, 110),
      (g) => props.desertRock(g),
      (g) => props.tuft(g),
    ],
  };
}
