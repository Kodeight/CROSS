/**
 * CROSS! v3.0 TrailRenderer
 * 
 * High-performance instanced trail & afterimage generator for high-speed superpowers.
 * Dynamically records player motion snapshots and renders glowing energy silhouettes
 * using single-draw-call THREE.InstancedMesh geometry with additive blending.
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/game.config';

const ZOOM = GAME_CONFIG.zoom;
const MAX_TRAIL_INSTANCES = 60;
const MAX_STREAK_INSTANCES = 80;

interface TrailNode {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  birthTime: number;
  life: number;
  maxLife: number;
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
}

export class TrailRenderer {
  readonly group: THREE.Group;

  // Instanced Meshes for zero-allocation single draw calls
  private bodyInstancedMesh: THREE.InstancedMesh;
  private energyInstancedMesh: THREE.InstancedMesh;

  // Active nodes
  private readonly trailNodes: TrailNode[] = [];
  private readonly streakNodes: TrailNode[] = [];

  // Temporary math objects to prevent garbage collection
  private readonly tempMatrix = new THREE.Matrix4();
  private readonly tempPosition = new THREE.Vector3();
  private readonly tempQuaternion = new THREE.Quaternion();
  private readonly tempScale = new THREE.Vector3();
  private readonly tempColor = new THREE.Color();
  private readonly lastSpawnPos = new THREE.Vector3(Infinity, Infinity, Infinity);
  private lastSpawnTime = 0;

  // Sonic Color Palette
  private readonly cyanColor = new THREE.Color(0x38e1ff);
  private readonly whiteColor = new THREE.Color(0xffffff);
  private readonly goldColor = new THREE.Color(0xfca71d);
  private readonly blueColor = new THREE.Color(0x0954a3);

  private active = false;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.name = 'TrailRenderer-Group';

    // 1. Hero Afterimage Silhouette Mesh (Instanced Box Geometry)
    const bodyGeo = new THREE.BoxGeometry(12 * ZOOM, 12 * ZOOM, 14 * ZOOM);
    const bodyMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.bodyInstancedMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, MAX_TRAIL_INSTANCES);
    this.bodyInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bodyInstancedMesh.count = 0;
    this.group.add(this.bodyInstancedMesh);

    // 2. High-speed Energy Diamond / Streak Mesh (Instanced Octahedron)
    const energyGeo = new THREE.OctahedronGeometry(4 * ZOOM, 0);
    const energyMat = new THREE.MeshBasicMaterial({
      color: 0x38e1ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.energyInstancedMesh = new THREE.InstancedMesh(energyGeo, energyMat, MAX_STREAK_INSTANCES);
    this.energyInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.energyInstancedMesh.count = 0;
    this.group.add(this.energyInstancedMesh);

    scene.add(this.group);
  }

  setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      this.lastSpawnPos.set(Infinity, Infinity, Infinity);
    }
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Spawns a new afterimage node at player position/rotation.
   */
  spawnNode(
    pos: THREE.Vector3,
    rot: THREE.Euler | THREE.Quaternion,
    scale: THREE.Vector3,
    nowMs: number,
    customColorStart?: THREE.Color,
    customColorEnd?: THREE.Color,
    maxLifeSec = 0.38,
  ): void {
    const quat = rot instanceof THREE.Quaternion
      ? rot.clone()
      : new THREE.Quaternion().setFromEuler(rot);

    // Add main character silhouette node
    if (this.trailNodes.length < MAX_TRAIL_INSTANCES) {
      this.trailNodes.push({
        position: pos.clone().add(new THREE.Vector3(0, 0, 8 * ZOOM)),
        quaternion: quat,
        scale: scale.clone().multiplyScalar(1.05),
        birthTime: nowMs,
        life: 0,
        maxLife: maxLifeSec,
        colorStart: (customColorStart ?? this.cyanColor).clone(),
        colorEnd: (customColorEnd ?? this.goldColor).clone(),
      });
    }

    // Add surrounding energy spark/diamond nodes
    for (let i = 0; i < 2; i++) {
      if (this.streakNodes.length >= MAX_STREAK_INSTANCES) break;
      const spreadX = (Math.random() - 0.5) * 16 * ZOOM;
      const spreadY = (Math.random() - 0.5) * 12 * ZOOM;
      const spreadZ = (Math.random() - 0.5) * 14 * ZOOM;
      this.streakNodes.push({
        position: pos.clone().add(new THREE.Vector3(spreadX, spreadY, 8 * ZOOM + spreadZ)),
        quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0)),
        scale: new THREE.Vector3(1, 1, 1).multiplyScalar(0.7 + Math.random() * 0.6),
        birthTime: nowMs,
        life: 0,
        maxLife: maxLifeSec * (0.6 + Math.random() * 0.4),
        colorStart: i % 2 === 0 ? this.whiteColor.clone() : this.cyanColor.clone(),
        colorEnd: this.blueColor.clone(),
      });
    }

    this.lastSpawnPos.copy(pos);
    this.lastSpawnTime = nowMs;
  }

  /**
   * Main per-frame update loop. Interpolates and writes directly into InstancedMesh buffers.
   */
  update(
    dtMs: number,
    nowMs: number,
    playerPos: THREE.Vector3,
    playerRot: THREE.Euler | THREE.Quaternion,
    playerScale: THREE.Vector3,
    isSonicActive: boolean,
  ): void {
    const dt = Math.min(Math.max(dtMs, 0), 100) / 1000;

    // 1. Check if we should spawn new trail snapshots
    if (isSonicActive) {
      const distMoved = this.lastSpawnPos.distanceTo(playerPos);
      const timeElapsed = nowMs - this.lastSpawnTime;

      if (distMoved > 2.0 * ZOOM || timeElapsed > 35) {
        this.spawnNode(playerPos, playerRot, playerScale, nowMs);
      }
    }

    // 2. Update Trail Silhouette Nodes
    for (let i = this.trailNodes.length - 1; i >= 0; i--) {
      const node = this.trailNodes[i];
      node.life += dt;
      if (node.life >= node.maxLife) {
        this.trailNodes.splice(i, 1);
      }
    }

    // 3. Update Streak Nodes
    for (let i = this.streakNodes.length - 1; i >= 0; i--) {
      const node = this.streakNodes[i];
      node.life += dt;
      if (node.life >= node.maxLife) {
        this.streakNodes.splice(i, 1);
      }
    }

    // 4. Update Instanced Mesh Matrices & Colors for Body Silhouettes
    const bodyCount = Math.min(this.trailNodes.length, MAX_TRAIL_INSTANCES);
    this.bodyInstancedMesh.count = bodyCount;

    for (let i = 0; i < bodyCount; i++) {
      const node = this.trailNodes[i];
      const progress = node.life / node.maxLife; // 0 (birth) -> 1 (death)
      
      // Scale down gently as afterimage dissolves
      const scaleFactor = Math.max(0.01, (1.0 - progress * 0.45));
      this.tempScale.copy(node.scale).multiplyScalar(scaleFactor);
      
      // Slight elevation rise & drift
      this.tempPosition.copy(node.position);
      this.tempPosition.z += progress * 3.0 * ZOOM;
      this.tempQuaternion.copy(node.quaternion);

      this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
      this.bodyInstancedMesh.setMatrixAt(i, this.tempMatrix);

      // Interpolate color from cyan/white to amber/blue and fade intensity
      this.tempColor.copy(node.colorStart).lerp(node.colorEnd, progress);
      const intensity = Math.max(0, (1.0 - progress) * 1.2);
      this.tempColor.multiplyScalar(intensity);
      this.bodyInstancedMesh.setColorAt(i, this.tempColor);
    }

    if (bodyCount > 0) {
      this.bodyInstancedMesh.instanceMatrix.needsUpdate = true;
      if (this.bodyInstancedMesh.instanceColor) {
        this.bodyInstancedMesh.instanceColor.needsUpdate = true;
      }
    }

    // 5. Update Instanced Mesh Matrices & Colors for Energy Diamonds
    const streakCount = Math.min(this.streakNodes.length, MAX_STREAK_INSTANCES);
    this.energyInstancedMesh.count = streakCount;

    for (let i = 0; i < streakCount; i++) {
      const node = this.streakNodes[i];
      const progress = node.life / node.maxLife;

      const scaleFactor = Math.max(0.01, (1.0 - progress) * 1.1);
      this.tempScale.copy(node.scale).multiplyScalar(scaleFactor);
      this.tempPosition.copy(node.position);
      this.tempQuaternion.copy(node.quaternion);

      this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
      this.energyInstancedMesh.setMatrixAt(i, this.tempMatrix);

      this.tempColor.copy(node.colorStart).lerp(node.colorEnd, progress);
      const intensity = Math.max(0, (1.0 - progress) * 1.5);
      this.tempColor.multiplyScalar(intensity);
      this.energyInstancedMesh.setColorAt(i, this.tempColor);
    }

    if (streakCount > 0) {
      this.energyInstancedMesh.instanceMatrix.needsUpdate = true;
      if (this.energyInstancedMesh.instanceColor) {
        this.energyInstancedMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  reset(): void {
    this.trailNodes.length = 0;
    this.streakNodes.length = 0;
    this.bodyInstancedMesh.count = 0;
    this.energyInstancedMesh.count = 0;
    this.bodyInstancedMesh.instanceMatrix.needsUpdate = true;
    this.energyInstancedMesh.instanceMatrix.needsUpdate = true;
    this.lastSpawnPos.set(Infinity, Infinity, Infinity);
  }

  dispose(): void {
    this.reset();
    this.bodyInstancedMesh.geometry.dispose();
    (this.bodyInstancedMesh.material as THREE.Material).dispose();
    this.energyInstancedMesh.geometry.dispose();
    (this.energyInstancedMesh.material as THREE.Material).dispose();
    this.group.clear();
  }
}
