import { worldById } from '../../config/worlds.config';
import type { World } from '../World';
import type { PropFactory } from '../environment/PropFactory';
import type { BuildingFactory } from '../environment/BuildingFactory';
import type { TreeFactory } from '../environment/TreeFactory';

export function createNeonWorld(props: PropFactory, buildings: BuildingFactory, _trees: TreeFactory): World {
  void _trees;
  return {
    config: worldById('neon'),
    obstacles: props.obstacleSets().neon,
    decor: [(g) => buildings.tower(g), (g) => props.neonSign(g)],
  };
}
