/** §9/§17 — explicit character types. Convention: x = left/right, y = forward (+y travel), z = up. */
import type * as THREE from 'three';

export type IdleKind = 'bob' | 'breathe' | 'tail' | 'mech';

export interface CharacterUserData {
  charId: string;
  body?: THREE.Object3D;
  head?: THREE.Object3D & { userData: { base?: { p: THREE.Vector3; r: THREE.Euler } } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface CharacterInstance {
  group: THREE.Group;
  idle: IdleKind;
}
