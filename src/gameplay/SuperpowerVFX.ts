/**
 * CROSS! v3.0 Superpower Animation & VFX Engine.
 * 
 * High-performance mobile-optimized visual effects:
 * - Concentric sonic shockwave rings & speed lines (Sonic Dash)
 * - Translucent geodesic energy bubbles & shatter bursts (Force & Heat Shields)
 * - Golden toroidal magnetic flux fields & coin trails (Coin Magnet)
 * - Sub-zero blizzard rings & permafrost mist (Frost Freeze)
 * - Quantum chromatic time distortion bubbles (Time Warp)
 * - Spectral holographic afterimages & phase trails (Phase Ghost)
 * - Updraft vortex ribbons & feather gusts (Double Hop)
 * - Smooth pickup suction, anticipation, and burst dissipation
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/game.config';
import type { PowerUpType, PowerUpDef } from '../config/powerups.config';
import type { FollowCamera } from '../renderer/Camera';
import type { Player } from '../player/Player';
import type { AudioManager } from '../audio/AudioManager';
import { TrailRenderer } from '../renderer/TrailRenderer';

const ZOOM = GAME_CONFIG.zoom;

interface SonicRing {
  mesh: THREE.Mesh;
  active: boolean;
  scale: number;
  maxScale: number;
  speed: number;
  opacity: number;
  axis: THREE.Vector3;
  color: number;
}

interface SpeedStreak {
  mesh: THREE.Mesh;
  active: boolean;
  offset: THREE.Vector3;
  length: number;
  speed: number;
  life: number;
  maxLife: number;
}

interface GhostAfterimage {
  mesh: THREE.Group;
  active: boolean;
  life: number;
  maxLife: number;
}

export class SuperpowerVFX {
  private readonly scene: THREE.Scene;
  private readonly container: THREE.Group;
  readonly trailRenderer: TrailRenderer;
  
  // Sonic Dash VFX
  private readonly sonicRings: SonicRing[] = [];
  private readonly speedStreaks: SpeedStreak[] = [];
  private readonly afterimages: GhostAfterimage[] = [];
  private lastAfterimageTime = 0;
  
  // Active Shield / Aura meshes
  private shieldMesh: THREE.Mesh | null = null;
  private shieldInnerMesh: THREE.Mesh | null = null;
  private magnetTorus1: THREE.Mesh | null = null;
  private magnetTorus2: THREE.Mesh | null = null;
  private timeWarpBubble: THREE.Mesh | null = null;
  private freezeRing: THREE.Mesh | null = null;
  private vortexRibbon: THREE.Mesh | null = null;

  // Materials cache
  private readonly ringMatCache = new Map<number, THREE.MeshBasicMaterial>();
  private speedLineMat: THREE.MeshBasicMaterial | null = null;
  private ghostMat: THREE.MeshBasicMaterial | null = null;

  // State
  private currentPower: PowerUpType | null = null;
  private powerActive = false;
  private powerStartTime = 0;
  private powerDuration = 0;
  private fovBoost = 0;
  private playerSpeedLean = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.container = new THREE.Group();
    this.container.name = 'SuperpowerVFX-Container';
    this.scene.add(this.container);

    this.trailRenderer = new TrailRenderer(scene);
    this.initPools();
    this.initPersistentMeshes();
  }

  private initPools(): void {
    // Sonic rings pool (concentric expanding shockwaves)
    const ringGeo = new THREE.RingGeometry(2 * ZOOM, 3.8 * ZOOM, 32);
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38e1ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      this.container.add(mesh);
      this.sonicRings.push({
        mesh,
        active: false,
        scale: 1,
        maxScale: 28 * ZOOM,
        speed: 45 * ZOOM,
        opacity: 1,
        axis: new THREE.Vector3(0, 1, 0),
        color: 0x38e1ff,
      });
    }

    // Speed streaks pool
    const streakGeo = new THREE.BoxGeometry(1.2 * ZOOM, 24 * ZOOM, 1.2 * ZOOM);
    this.speedLineMat = new THREE.MeshBasicMaterial({
      color: 0xfca71d,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 18; i++) {
      const mesh = new THREE.Mesh(streakGeo, this.speedLineMat.clone());
      mesh.visible = false;
      this.container.add(mesh);
      this.speedStreaks.push({
        mesh,
        active: false,
        offset: new THREE.Vector3(),
        length: 24 * ZOOM,
        speed: 600 * ZOOM,
        life: 0,
        maxLife: 0.4,
      });
    }

    // Ghost afterimages pool
    this.ghostMat = new THREE.MeshBasicMaterial({
      color: 0x38e1ff,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  private initPersistentMeshes(): void {
    // 1. Force Shield / Heat Shield Geodesic Bubble
    const shieldGeo = new THREE.IcosahedronGeometry(18 * ZOOM, 2);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x38e1ff,
      wireframe: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.visible = false;
    this.container.add(this.shieldMesh);

    const shieldInnerGeo = new THREE.SphereGeometry(15 * ZOOM, 16, 12);
    const shieldInnerMat = new THREE.MeshBasicMaterial({
      color: 0x0954a3,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.shieldInnerMesh = new THREE.Mesh(shieldInnerGeo, shieldInnerMat);
    this.shieldInnerMesh.visible = false;
    this.container.add(this.shieldInnerMesh);

    // 2. Coin Magnet Torus Rings
    const torusGeo = new THREE.TorusGeometry(16 * ZOOM, 1.4 * ZOOM, 10, 24);
    const magnetMat1 = new THREE.MeshBasicMaterial({
      color: 0xffc93c,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.magnetTorus1 = new THREE.Mesh(torusGeo, magnetMat1);
    this.magnetTorus1.visible = false;
    this.container.add(this.magnetTorus1);

    const magnetMat2 = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.magnetTorus2 = new THREE.Mesh(torusGeo, magnetMat2);
    this.magnetTorus2.visible = false;
    this.container.add(this.magnetTorus2);

    // 3. Time Warp Quantum Bubble
    const timeGeo = new THREE.SphereGeometry(22 * ZOOM, 20, 16);
    const timeMat = new THREE.MeshBasicMaterial({
      color: 0xff3fb4,
      wireframe: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.timeWarpBubble = new THREE.Mesh(timeGeo, timeMat);
    this.timeWarpBubble.visible = false;
    this.container.add(this.timeWarpBubble);

    // 4. Frost Freeze Permafrost Ground Decal Ring
    const freezeGeo = new THREE.RingGeometry(10 * ZOOM, 42 * ZOOM, 32);
    const freezeMat = new THREE.MeshBasicMaterial({
      color: 0xa8d8ea,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.freezeRing = new THREE.Mesh(freezeGeo, freezeMat);
    this.freezeRing.rotation.x = -Math.PI / 2;
    this.freezeRing.visible = false;
    this.container.add(this.freezeRing);

    // 5. Double Hop Updraft Vortex
    const vortexGeo = new THREE.CylinderGeometry(20 * ZOOM, 6 * ZOOM, 35 * ZOOM, 16, 1, true);
    const vortexMat = new THREE.MeshBasicMaterial({
      color: 0x2ecc71,
      wireframe: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.vortexRibbon = new THREE.Mesh(vortexGeo, vortexMat);
    this.vortexRibbon.visible = false;
    this.container.add(this.vortexRibbon);
  }

  /**
   * Triggers the full 8-phase activation sequence for the specified superpower.
   */
  activate(
    def: PowerUpDef,
    playerPos: THREE.Vector3,
    camera: FollowCamera,
    audio: AudioManager,
  ): void {
    this.currentPower = def.id;
    this.powerActive = true;
    this.powerStartTime = performance.now();
    this.powerDuration = def.durationMs;

    // Trigger superpower audio
    audio.superpower();

    switch (def.id) {
      case 'dash':
        this.triggerSonicActivation(playerPos, camera, audio);
        break;
      case 'shield':
      case 'fire_shield':
        this.triggerShieldActivation(def.id === 'fire_shield', playerPos, audio);
        break;
      case 'magnet':
        this.triggerMagnetActivation(playerPos, audio);
        break;
      case 'freeze':
        this.triggerFreezeActivation(playerPos, camera, audio);
        break;
      case 'time_warp':
        this.triggerTimeWarpActivation(playerPos, audio);
        break;
      case 'double_jump':
      case 'low_gravity':
        this.triggerDoubleJumpActivation(playerPos, audio);
        break;
      case 'ghost':
        this.triggerGhostActivation(playerPos, audio);
        break;
      default:
        this.spawnSonicRing(playerPos, 0xfca71d, 35 * ZOOM, 55 * ZOOM);
        break;
    }
  }

  /**
   * SONIC DASH: High-priority custom energy blast, expanding sonic rings,
   * speed streaks, forward camera push, and player tilt.
   */
  private triggerSonicActivation(playerPos: THREE.Vector3, camera: FollowCamera, audio: AudioManager): void {
    this.fovBoost = 7.0; // Dynamic FOV expansion for rush feel
    this.playerSpeedLean = 0.45; // Forward lean
    camera.shake(9.0);
    audio.superpowerImpact();
    this.trailRenderer.setActive(true);

    // Spawn 3 rapid concentric sonic rings expanding along the dash axis
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (!this.powerActive) return;
        this.spawnSonicRing(playerPos, i % 2 === 0 ? 0x38e1ff : 0xfca71d, 12 * ZOOM, 45 * ZOOM, 60 * ZOOM);
      }, i * 70);
    }

    // Spawn dense burst of forward speed streaks
    for (let i = 0; i < 14; i++) {
      this.spawnSpeedStreak(playerPos, 0x38e1ff);
      this.spawnSpeedStreak(playerPos, 0xfca71d);
    }
  }

  private triggerShieldActivation(isFire: boolean, playerPos: THREE.Vector3, audio: AudioManager): void {
    const color = isFire ? 0xff5252 : 0x38e1ff;
    const innerColor = isFire ? 0xff793f : 0x0954a3;
    
    if (this.shieldMesh && this.shieldInnerMesh) {
      (this.shieldMesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      (this.shieldInnerMesh.material as THREE.MeshBasicMaterial).color.setHex(innerColor);
      this.shieldMesh.visible = true;
      this.shieldInnerMesh.visible = true;
      this.shieldMesh.scale.set(0.2, 0.2, 0.2);
      this.shieldInnerMesh.scale.set(0.2, 0.2, 0.2);
      (this.shieldMesh.material as THREE.MeshBasicMaterial).opacity = 0.85;
      (this.shieldInnerMesh.material as THREE.MeshBasicMaterial).opacity = 0.4;
    }

    this.spawnSonicRing(playerPos, color, 8 * ZOOM, 30 * ZOOM, 40 * ZOOM);
    audio.superpower();
  }

  private triggerMagnetActivation(playerPos: THREE.Vector3, audio: AudioManager): void {
    if (this.magnetTorus1 && this.magnetTorus2) {
      this.magnetTorus1.visible = true;
      this.magnetTorus2.visible = true;
      (this.magnetTorus1.material as THREE.MeshBasicMaterial).opacity = 0.8;
      (this.magnetTorus2.material as THREE.MeshBasicMaterial).opacity = 0.8;
    }
    this.spawnSonicRing(playerPos, 0xffc93c, 10 * ZOOM, 38 * ZOOM, 35 * ZOOM);
    audio.coin();
  }

  private triggerFreezeActivation(playerPos: THREE.Vector3, camera: FollowCamera, audio: AudioManager): void {
    if (this.freezeRing) {
      this.freezeRing.visible = true;
      this.freezeRing.position.set(playerPos.x, playerPos.y, 1.5 * ZOOM);
      this.freezeRing.scale.set(0.1, 0.1, 0.1);
      (this.freezeRing.material as THREE.MeshBasicMaterial).opacity = 0.9;
    }
    camera.shake(6.0);
    this.spawnSonicRing(playerPos, 0xa8d8ea, 10 * ZOOM, 60 * ZOOM, 70 * ZOOM);
    audio.superpowerImpact();
  }

  private triggerTimeWarpActivation(playerPos: THREE.Vector3, audio: AudioManager): void {
    if (this.timeWarpBubble) {
      this.timeWarpBubble.visible = true;
      this.timeWarpBubble.position.set(playerPos.x, playerPos.y, 12 * ZOOM);
      this.timeWarpBubble.scale.set(0.2, 0.2, 0.2);
      (this.timeWarpBubble.material as THREE.MeshBasicMaterial).opacity = 0.75;
    }
    this.spawnSonicRing(playerPos, 0xff3fb4, 12 * ZOOM, 40 * ZOOM, 35 * ZOOM);
    audio.superpower();
  }

  private triggerDoubleJumpActivation(playerPos: THREE.Vector3, audio: AudioManager): void {
    if (this.vortexRibbon) {
      this.vortexRibbon.visible = true;
      this.vortexRibbon.position.set(playerPos.x, playerPos.y, 15 * ZOOM);
      this.vortexRibbon.scale.set(0.3, 0.3, 0.3);
      (this.vortexRibbon.material as THREE.MeshBasicMaterial).opacity = 0.8;
    }
    this.spawnSonicRing(playerPos, 0x2ecc71, 8 * ZOOM, 35 * ZOOM, 50 * ZOOM);
    audio.fanfare();
  }

  private triggerGhostActivation(playerPos: THREE.Vector3, audio: AudioManager): void {
    this.spawnSonicRing(playerPos, 0xe0e6ed, 10 * ZOOM, 32 * ZOOM, 30 * ZOOM);
    audio.superpower();
  }

  /**
   * Spawns a concentric expanding sonic shockwave ring.
   */
  spawnSonicRing(
    pos: THREE.Vector3,
    color: number,
    startRadius = 4 * ZOOM,
    maxRadius = 35 * ZOOM,
    speed = 50 * ZOOM,
  ): void {
    let ring: SonicRing | null = null;
    for (const r of this.sonicRings) {
      if (!r.active) { ring = r; break; }
    }
    if (!ring) return;

    ring.active = true;
    ring.color = color;
    ring.scale = startRadius;
    ring.maxScale = maxRadius;
    ring.speed = speed;
    ring.opacity = 0.95;

    const mat = ring.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(color);
    mat.opacity = 0.95;

    ring.mesh.position.set(pos.x, pos.y, pos.z + 8 * ZOOM);
    ring.mesh.rotation.x = -Math.PI / 2.3; // Angle aligned with follow camera
    ring.mesh.scale.set(startRadius, startRadius, startRadius);
    ring.mesh.visible = true;
  }

  /**
   * Spawns directional high-speed streaks.
   */
  spawnSpeedStreak(playerPos: THREE.Vector3, color: number): void {
    let streak: SpeedStreak | null = null;
    for (const s of this.speedStreaks) {
      if (!s.active) { streak = s; break; }
    }
    if (!streak) return;

    streak.active = true;
    streak.life = 0;
    streak.maxLife = 0.25 + Math.random() * 0.2;
    streak.speed = (500 + Math.random() * 300) * ZOOM;
    
    // Spread streaks around the player diorama
    const spreadX = (Math.random() - 0.5) * 60 * ZOOM;
    const spreadY = (Math.random() - 0.5) * 40 * ZOOM;
    const spreadZ = 4 * ZOOM + Math.random() * 30 * ZOOM;
    streak.offset.set(spreadX, spreadY, spreadZ);

    const mat = streak.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(color);
    mat.opacity = 0.8;

    streak.mesh.position.set(
      playerPos.x + spreadX,
      playerPos.y + spreadY,
      spreadZ,
    );
    streak.mesh.rotation.x = Math.PI / 2; // Aligned with +Y direction of travel
    streak.mesh.visible = true;
  }

  /**
   * Creates a holographic afterimage ghost of the player character.
   */
  spawnGhostAfterimage(playerGroup: THREE.Group): void {
    const mat = this.ghostMat;
    if (!mat) return;
    const ghost = playerGroup.clone(true);
    ghost.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = mat;
      }
    });
    ghost.position.copy(playerGroup.position);
    ghost.rotation.copy(playerGroup.rotation);
    this.container.add(ghost);

    const item: GhostAfterimage = {
      mesh: ghost,
      active: true,
      life: 0,
      maxLife: 0.35,
    };
    this.afterimages.push(item);
  }

  /**
   * Ends the active superpower with a natural completion burst.
   */
  endPower(playerPos: THREE.Vector3): void {
    if (!this.powerActive) return;
    this.powerActive = false;
    this.currentPower = null;
    this.trailRenderer.setActive(false);

    // Dissipation ring
    this.spawnSonicRing(playerPos, 0xffffff, 8 * ZOOM, 25 * ZOOM, 30 * ZOOM);

    // Hide persistent aura meshes
    if (this.shieldMesh) this.shieldMesh.visible = false;
    if (this.shieldInnerMesh) this.shieldInnerMesh.visible = false;
    if (this.magnetTorus1) this.magnetTorus1.visible = false;
    if (this.magnetTorus2) this.magnetTorus2.visible = false;
    if (this.timeWarpBubble) this.timeWarpBubble.visible = false;
    if (this.freezeRing) this.freezeRing.visible = false;
    if (this.vortexRibbon) this.vortexRibbon.visible = false;
  }

  /**
   * Main per-frame update loop.
   */
  update(
    dtMs: number,
    nowMs: number,
    player: Player,
    camera: FollowCamera,
    audio: AudioManager,
  ): void {
    const dt = Math.min(Math.max(dtMs, 0), 100) / 1000;
    const pPos = player.position;

    // Update the high-performance instanced trail renderer
    const isSonicActive = this.powerActive && this.currentPower === 'dash';
    this.trailRenderer.update(
      dtMs,
      nowMs,
      pPos,
      player.group.rotation,
      player.group.scale,
      isSonicActive,
    );

    // 1. Smooth Camera FOV return & Player Lean
    if (this.fovBoost > 0.05) {
      this.fovBoost = Math.max(0, this.fovBoost - dt * 14.0);
    } else {
      this.fovBoost = 0;
    }

    if (this.playerSpeedLean > 0.02) {
      this.playerSpeedLean = Math.max(0, this.playerSpeedLean - dt * 2.2);
    } else {
      this.playerSpeedLean = 0;
    }

    // Apply forward lean to player group while dashing
    if (this.playerSpeedLean > 0) {
      player.group.rotation.x = -this.playerSpeedLean;
    } else if (!player.dying) {
      player.group.rotation.x = 0;
    }

    // 2. Active Power Sustained Updates
    if (this.powerActive && this.currentPower) {
      const elapsed = (nowMs - this.powerStartTime) / 1000;

      // Sonic Dash: continuous speed streaks
      if (this.currentPower === 'dash') {
        if (Math.random() < 0.45) {
          this.spawnSpeedStreak(pPos, 0x38e1ff);
        }
      }

      // Shield mesh tracking
      if (this.shieldMesh && this.shieldMesh.visible) {
        this.shieldMesh.position.set(pPos.x, pPos.y, pPos.z + 10 * ZOOM);
        this.shieldMesh.rotation.y += dt * 2.5;
        this.shieldMesh.rotation.x += dt * 1.8;
        const pulse = 1.0 + Math.sin(elapsed * 8) * 0.06;
        this.shieldMesh.scale.set(pulse, pulse, pulse);

        if (this.shieldInnerMesh) {
          this.shieldInnerMesh.position.copy(this.shieldMesh.position);
          this.shieldInnerMesh.rotation.y -= dt * 3.0;
          this.shieldInnerMesh.scale.set(pulse * 0.85, pulse * 0.85, pulse * 0.85);
        }
      }

      // Magnet torus tracking
      if (this.magnetTorus1 && this.magnetTorus1.visible) {
        this.magnetTorus1.position.set(pPos.x, pPos.y, pPos.z + 8 * ZOOM);
        this.magnetTorus1.rotation.z += dt * 3.5;
        this.magnetTorus1.rotation.x = Math.PI / 3 + Math.sin(elapsed * 5) * 0.2;

        if (this.magnetTorus2) {
          this.magnetTorus2.position.copy(this.magnetTorus1.position);
          this.magnetTorus2.rotation.z -= dt * 3.0;
          this.magnetTorus2.rotation.y = Math.PI / 3 + Math.cos(elapsed * 5) * 0.2;
        }
      }

      // Time Warp bubble tracking
      if (this.timeWarpBubble && this.timeWarpBubble.visible) {
        this.timeWarpBubble.position.set(pPos.x, pPos.y, pPos.z + 10 * ZOOM);
        this.timeWarpBubble.rotation.y += dt * 1.2;
        const s = 1.0 + Math.sin(elapsed * 4) * 0.08;
        this.timeWarpBubble.scale.set(s, s, s);
      }

      // Freeze ring tracking
      if (this.freezeRing && this.freezeRing.visible) {
        const expand = Math.min(1.0, elapsed * 3.0);
        this.freezeRing.scale.set(expand, expand, expand);
      }

      // Double Hop vortex tracking
      if (this.vortexRibbon && this.vortexRibbon.visible) {
        this.vortexRibbon.position.set(pPos.x, pPos.y, pPos.z + 12 * ZOOM);
        this.vortexRibbon.rotation.z += dt * 8.0;
      }
    }

    // 3. Update Sonic Rings
    for (const r of this.sonicRings) {
      if (!r.active) continue;
      r.scale += r.speed * dt;
      const k = r.scale / r.maxScale;
      r.opacity = Math.max(0, 1.0 - k);
      const mat = r.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = r.opacity;
      r.mesh.scale.set(r.scale, r.scale, r.scale);

      if (k >= 1.0 || r.opacity <= 0.01) {
        r.active = false;
        r.mesh.visible = false;
      }
    }

    // 4. Update Speed Streaks
    for (const s of this.speedStreaks) {
      if (!s.active) continue;
      s.life += dt;
      const k = s.life / s.maxLife;
      s.mesh.position.y += s.speed * dt;
      const mat = s.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (1 - k) * 0.85);

      if (k >= 1.0) {
        s.active = false;
        s.mesh.visible = false;
      }
    }

    // 5. Update Ghost Afterimages
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const g = this.afterimages[i];
      g.life += dt;
      const k = g.life / g.maxLife;
      if (this.ghostMat) {
        this.ghostMat.opacity = Math.max(0, (1 - k) * 0.45);
      }
      if (k >= 1.0) {
        this.container.remove(g.mesh);
        this.afterimages.splice(i, 1);
      }
    }
  }

  getDynamicFovOffset(): number {
    return this.fovBoost;
  }

  reset(): void {
    this.powerActive = false;
    this.currentPower = null;
    this.fovBoost = 0;
    this.playerSpeedLean = 0;
    this.trailRenderer.setActive(false);
    this.trailRenderer.reset();

    for (const r of this.sonicRings) {
      r.active = false;
      r.mesh.visible = false;
    }
    for (const s of this.speedStreaks) {
      s.active = false;
      s.mesh.visible = false;
    }
    for (const g of this.afterimages) {
      this.container.remove(g.mesh);
    }
    this.afterimages.length = 0;

    if (this.shieldMesh) this.shieldMesh.visible = false;
    if (this.shieldInnerMesh) this.shieldInnerMesh.visible = false;
    if (this.magnetTorus1) this.magnetTorus1.visible = false;
    if (this.magnetTorus2) this.magnetTorus2.visible = false;
    if (this.timeWarpBubble) this.timeWarpBubble.visible = false;
    if (this.freezeRing) this.freezeRing.visible = false;
    if (this.vortexRibbon) this.vortexRibbon.visible = false;
  }
}
