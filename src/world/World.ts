/** §11/§17 — shared World + Lane interfaces. Every world implements World. */
import type * as THREE from 'three';
import type { WorldConfig } from '../config/worlds.config';
import type { PropBuilder } from './environment/PropFactory';

export type LaneType = 'field' | 'forest' | 'car' | 'truck';

export interface CoinItem {
  mesh: THREE.Object3D;
  col: number;
  taken: boolean;
}

/** Signature world superpower collectible placed on safe lanes. */
export interface CollectibleItem {
  mesh: THREE.Object3D;
  col: number;
  id: string;
  name: string;
  bonusCoins: number;
  taken: boolean;
}

export interface Lane {
  index: number;
  type: LaneType;
  worldId: string;
  variant: string | null;
  district: number;
  mesh: THREE.Group;
  vehicles: THREE.Group[];
  coins: CoinItem[];
  collectibles: CollectibleItem[];
  /**
   * Authoritative gameplay occupancy, registered at chunk generation and
   * visualized by the same pass — the single source movement queries.
   * `jumpable` marks low obstacles (bushes, rocks, small props) a jump
   * may clear mid-leap; anything blocked and not jumpable stops jumps too.
   */
  occupied: Record<number, boolean>;
  jumpable: Record<number, boolean>;
  direction: boolean;
  speed: number;
}

export interface World {
  config: WorldConfig;
  obstacles: PropBuilder[];
  decor: PropBuilder[];
  beachObstacles?: PropBuilder[][];
}
