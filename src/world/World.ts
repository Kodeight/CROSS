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

export interface Lane {
  index: number;
  type: LaneType;
  worldId: string;
  variant: string | null;
  district: number;
  mesh: THREE.Group;
  vehicles: THREE.Group[];
  coins: CoinItem[];
  occupied: Record<number, boolean>;
  direction: boolean;
  speed: number;
}

export interface World {
  config: WorldConfig;
  obstacles: PropBuilder[];
  decor: PropBuilder[];
  beachObstacles?: PropBuilder[][];
}
