import { worldById } from '../../config/worlds.config';
import type { World } from '../World';
import type { PropFactory } from '../environment/PropFactory';
import type { BuildingFactory } from '../environment/BuildingFactory';
import type { TreeFactory } from '../environment/TreeFactory';

export function createJungleWorld(props: PropFactory, _buildings: BuildingFactory, trees: TreeFactory): World {
  void _buildings;
  return {
    config: worldById('jungle'),
    obstacles: props.obstacleSets().jungle,
    decor: [(g) => trees.vineTree(g), (g) => trees.bigLeaf(g), (g) => props.jungleRock(g)],
  };
}
