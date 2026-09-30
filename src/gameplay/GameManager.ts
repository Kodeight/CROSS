/**
 * Gameplay owner: run lifecycle, collision (PLAYER+VEHICLE), coins,
 * superpower collectibles, near-miss, world transitions, ambient weather.
 * Traffic-vs-traffic lives in TrafficManager; UI lives in UIManager —
 * this class coordinates systems via callbacks and the event bus.
 */
import type * as THREE from 'three';
import { GAME_CONFIG } from '../config/game.config';
import type { EventBus } from '../core/EventBus';
import type { SaveManager } from '../save/SaveManager';
import type { AudioManager } from '../audio/AudioManager';
import type { Player } from '../player/Player';
import type { LaneManager } from '../world/LaneManager';
import type { WorldManager } from '../world/WorldManager';
import type { TrafficManager } from '../traffic/TrafficManager';
import type { ScoreSystem } from './ScoreSystem';
import type { CoinSystem } from './CoinSystem';
import type { MissionSystem } from './MissionSystem';
import type { ProgressionSystem } from './ProgressionSystem';
import type { ParticleSystem } from './Particles';
import type { PowerUpSystem } from './PowerUpSystem';
import type { SuperpowerVFX } from './SuperpowerVFX';
import type { FollowCamera } from '../renderer/Camera';
import type { Lighting } from '../renderer/Lighting';
import { activeCollectibleForWorld } from '../config/collectibles.config';
import { getPowerUpDef } from '../config/powerups.config';
import { vibrate } from '../utils/DeviceUtils';

export interface RunCallbacks {
  onHud: () => void;
  onToast: (msg: string) => void;
  onNearMiss: () => void;
  onWorldIntro: (name: string, sub: string) => void;
  onCoin: () => void;
  onDeath: () => void;
  onGameOver: (score: number, newBest: boolean, coins: number, stats: string) => void;
}

export class GameManager {
  runNear = 0;
  runSteps = 0;
  dying = false;
  deathAt = 0;
  shake = 0;
  eventActive: string | null = null;
  eventUntilLane = 0;
  private invulnerableUntil = 0;
  private lastNearAt = 0;
  private ambientAcc = 0;
  private reducedMotion = false;
  private lowQuality = false;
  vfx: SuperpowerVFX | null = null;
  camera: FollowCamera | null = null;

  constructor(
    private readonly bus: EventBus,
    private readonly save: SaveManager,
    private readonly audio: AudioManager,
    private readonly player: Player,
    private readonly lanes: LaneManager,
    private readonly worlds: WorldManager,
    private readonly traffic: TrafficManager,
    private readonly score: ScoreSystem,
    private readonly coins: CoinSystem,
    private readonly powerups: PowerUpSystem,
    private readonly missions: MissionSystem,
    private readonly progression: ProgressionSystem,
    private readonly particles: ParticleSystem,
    private readonly lighting: Lighting,
    private readonly cb: RunCallbacks,
  ) {}

  setVfx(vfx: SuperpowerVFX, camera: FollowCamera): void {
    this.vfx = vfx;
    this.camera = camera;
  }

  setReducedMotion(v: boolean): void {
    this.reducedMotion = v;
  }

  setLowQuality(v: boolean): void {
    this.lowQuality = v;
  }

  get currentScore(): number {
    return this.score.score;
  }

  private activeDash: {
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    targetLane: number;
    targetCol: number;
    startTime: number;
    duration: number;
  } | null = null;

  isSafeCell(laneIndex: number, colIndex: number): boolean {
    const lane = this.lanes.laneAt(laneIndex);
    if (!lane) return false;
    if (colIndex < 0 || colIndex >= GAME_CONFIG.columns) return false;
    if (lane.occupied && lane.occupied[colIndex]) return false;
    if (lane.type === 'car' || lane.type === 'truck') {
      const colX = this.player.colToX(colIndex);
      for (const v of lane.vehicles) {
        const len = (v.userData.length as number | undefined) ?? 60;
        const half = ((len * GAME_CONFIG.zoom) / 2) + 24 * GAME_CONFIG.zoom;
        if (Math.abs(v.position.x - colX) < half) return false;
      }
    }
    return true;
  }

  findNearestSafePosition(targetLane: number, targetCol: number): { lane: number; col: number } {
    if (this.isSafeCell(targetLane, targetCol)) {
      const ln = this.lanes.laneAt(targetLane);
      if (ln && ln.type === 'field') return { lane: targetLane, col: targetCol };
    }

    // Prefer calm field lanes first
    for (let r = 0; r <= 8; r++) {
      for (let dl = 0; dl <= r; dl++) {
        for (const dc of [0, -1, 1, -2, 2, -3, 3]) {
          const l = targetLane + dl;
          const c = Math.max(1, Math.min(GAME_CONFIG.columns - 2, targetCol + dc));
          const ln = this.lanes.laneAt(l);
          if (ln && ln.type === 'field' && !ln.occupied[c]) {
            return { lane: l, col: c };
          }
        }
      }
    }

    // Fallback: search backwards for safety
    for (let l = targetLane; l >= Math.max(0, targetLane - 12); l--) {
      const ln = this.lanes.laneAt(l);
      if (ln && ln.type === 'field' && !ln.occupied[targetCol]) {
        return { lane: l, col: targetCol };
      }
    }

    return { lane: targetLane, col: Math.floor(GAME_CONFIG.columns / 2) };
  }

  /** Sonic Dash ability: smoothly leaps the player forward 3 safe lanes */
  triggerSonicDash(): void {
    try {
      const startLane = this.player.lane;
      const targetLaneCandidate = startLane + 3;
      const targetColCandidate = this.player.column;
      const safe = this.findNearestSafePosition(targetLaneCandidate, targetColCandidate);

      // Grant safety invulnerability while dashing and shortly upon arrival
      this.invulnerableUntil = performance.now() + 1400;
      this.player.setInvulnerable(1400);

      this.activeDash = {
        startX: this.player.position.x,
        startY: this.player.position.y,
        targetX: this.player.colToX(safe.col),
        targetY: this.player.laneToY(safe.lane),
        targetLane: safe.lane,
        targetCol: safe.col,
        startTime: performance.now(),
        duration: this.reducedMotion ? 120 : 280,
      };

      if (this.vfx) {
        this.vfx.spawnSonicRing(this.player.position, 0x38e1ff, 10 * GAME_CONFIG.zoom, 45 * GAME_CONFIG.zoom, 60 * GAME_CONFIG.zoom);
        this.vfx.spawnSonicRing(this.player.position, 0xfca71d, 15 * GAME_CONFIG.zoom, 55 * GAME_CONFIG.zoom, 75 * GAME_CONFIG.zoom);
      }
      this.particles.burst(
        this.player.position.x, this.player.position.y, 40,
        0xfca71d, 20, 480, 1.0, 550, this.lowQuality,
      );
      this.audio.superpower();
      this.cb.onHud();
    } catch { /* ignore */ }
  }

  updateDash(now: number): boolean {
    if (!this.activeDash) return false;
    const d = this.activeDash;
    const p = Math.min((now - d.startTime) / d.duration, 1.0);
    const ease = 1 - Math.pow(1 - p, 3);

    this.player.position.x = d.startX + (d.targetX - d.startX) * ease;
    this.player.position.y = d.startY + (d.targetY - d.startY) * ease;
    this.player.position.z = Math.sin(p * Math.PI) * (16 * GAME_CONFIG.zoom);

    if (!this.reducedMotion && p < 1.0) {
      this.particles.burst(
        this.player.position.x, this.player.position.y, 2,
        0x38e1ff, 4, 80, 0.4, 120, this.lowQuality
      );
    }

    if (p >= 1.0) {
      this.player.lane = d.targetLane;
      this.player.column = d.targetCol;
      this.player.position.set(d.targetX, d.targetY, 0);
      this.score.reachLane(d.targetLane);
      this.checkWorldTransition();
      this.cb.onHud();
      this.audio.land();
      this.activeDash = null;
      return false;
    }
    return true;
  }

  /**
   * Start a run: fresh start at the selected world, or continue the journey
   * near the saved checkpoint (same world, a few lanes back, re-validated
   * to a calm field lane — never the exact death spot, never traffic).
   */
  newRun(makeLane: (index: number) => void, rebuildPlayerMesh: () => void): void {
    const base = this.save.data.selectedWorld;
    const center = Math.floor(GAME_CONFIG.columns / 2);
    let startLane: number = GAME_CONFIG.startLane;
    const lastLane = this.save.data.lastLane ?? 0;
    const lastWorldId = this.save.data.lastWorldId;
    if (lastLane > GAME_CONFIG.startLane && lastWorldId) {
      const wNow = this.worlds.worldForLane(lastLane, base);
      if (wNow.id === lastWorldId) {
        // Clamp the back-off to the checkpoint world's own stretch.
        let stretchStart = lastLane;
        let guard = 0;
        while (stretchStart > 0 && guard++ < 60 &&
          this.worlds.worldForLane(stretchStart - 1, base).id === wNow.id) stretchStart--;
        startLane = Math.max(stretchStart, lastLane - 6);
      }
    }
    this.coins.reset();
    this.powerups.reset();
    this.runNear = 0;
    this.runSteps = 0;
    this.dying = false;
    this.shake = 0;
    this.eventActive = null;
    this.activeDash = null;
    this.invulnerableUntil = 0;
    this.audio.restoreAmbient(0.8);
    rebuildPlayerMesh();

    this.lanes.clear();

    const initialBuffer = startLane + 200;
    for (let i = startLane - 45; i <= initialBuffer; i++) makeLane(i);

    // Guarantee spawning on a safe, verified field tile
    const safeSpawn = this.findNearestSafePosition(startLane, center);
    const spawnLane = safeSpawn.lane;
    const spawnCol = safeSpawn.col;

    this.score.reset(spawnLane);
    this.player.reset(spawnLane, spawnCol);
    const w = this.worlds.worldForLane(spawnLane, base);
    this.progression.unlockWorldByProgression(w.id);
    this.worlds.setCurrent(this.worlds.byId(w.id));
    this.lighting.setWorld(w, true);
    this.lanes.setWorldTheme(w.safeDark);
    this.save.data.stats.gamesPlayed++;
    this.missions.unlock('first');
    this.save.save();
    this.bus.emit('gameStarted');
    this.cb.onHud();
  }

  stepPlayer(nowMs: number): void {
    if (this.updateDash(nowMs)) return;

    const done = this.player.step(nowMs, this.reducedMotion);
    if (done) {
      this.runSteps++;
      this.save.data.stats.totalSteps++;
      this.missions.onStep(this.worlds.current.config.id);
      this.audio.land();
      if (!this.reducedMotion) {
        this.particles.burst(
          this.player.position.x, this.player.position.y, 4,
          0xffffff, 4, 120, 0.4, 160, this.lowQuality,
        );
      }
      this.checkCollect();
      const wid = this.worlds.current.config.id;
      const msgs = this.missions.check(this.score.maxLane, this.runNear, wid, this.coins.runCoins);
      for (const m of msgs) {
        this.cb.onToast(m);
        this.audio.unlock();
      }
      if (done.dir === 'forward' || done.dir === 'jump') {
        this.audio.setAmbientTension(Math.min(1.0, this.player.lane / 120));
        if (this.score.reachLane(this.player.lane)) {
          this.checkWorldTransition();
          this.cb.onHud();
        } else {
          this.cb.onHud();
        }
      }
    }
  }

  /**
   * Superpower & coin pickup via real 3D world-space proximity.
   * Scans player's lane plus neighbours for seamless pickups.
   */
  checkCollect(): void {
    const px = this.player.position.x;
    const py = this.player.position.y;
    const pz = this.player.position.z;
    const laneH = GAME_CONFIG.positionWidth * GAME_CONFIG.zoom;
    const pickupR = 48;
    const wid = this.worlds.current.config.id;
    const isMult = this.powerups.isCoinMultActive();

    for (const lane of this.lanes.lanes) {
      const laneY = lane.mesh.position.y;
      if (Math.abs(laneY - py) > laneH * 1.5) continue;

      // 1. Regular gold coins
      if (lane.coins && lane.coins.length) {
        for (const c of lane.coins) {
          if (c.taken) continue;
          const wx = c.mesh.position.x;
          const wy = laneY + c.mesh.position.y;
          const wz = c.mesh.position.z;
          const dx = wx - px;
          const dy = wy - py;
          const dz = wz - pz;
          if (dx * dx + dy * dy > pickupR * pickupR) continue;
          if (Math.abs(dz) > 75) continue;

          c.taken = true;
          // Premium pickup: pop, then suction toward the player (never a cut).
          this.coins.beginCollect(c.mesh, this.player.position);
          const add = isMult ? 3 : 1;
          for (let k = 0; k < add; k++) this.coins.collect();
          this.missions.onCoin();
          this.score.addBonus(add);
          this.audio.coin();
          vibrate(10);
          this.particles.burst(px, py, 30, 0xffc93c, 8, 200, 0.6, 300, this.lowQuality);
          this.bus.emit('coinCollected');
          this.cb.onHud();
          this.cb.onCoin();
        }
      }

      // 2. Signature World Collectibles with active SUPERPOWERS!
      if (lane.collectibles && lane.collectibles.length) {
        for (const col of lane.collectibles) {
          if (col.taken) continue;
          const wx = col.mesh.position.x;
          const wy = laneY + col.mesh.position.y;
          const wz = col.mesh.position.z;
          const dx = wx - px;
          const dy = wy - py;
          const dz = wz - pz;
          if (dx * dx + dy * dy > pickupR * pickupR * 1.25) continue;
          if (Math.abs(dz) > 85) continue;

          col.taken = true;
          this.coins.beginCollect(col.mesh, this.player.position, 340);

          const colDef = activeCollectibleForWorld(lane.worldId || wid);
          const bonus = (isMult ? col.bonusCoins * 3 : col.bonusCoins) || 5;
          for (let k = 0; k < bonus; k++) this.coins.collect();
          this.score.addBonus(bonus * 2);

          // Activate usable superpower ability!
          this.powerups.collect(colDef.powerType, true);
          const pDef = getPowerUpDef(colDef.powerType);

          if (this.vfx && this.camera) {
            this.vfx.activate(pDef, this.player.position, this.camera, this.audio);
          } else {
            this.audio.superpower();
          }

          vibrate([30, 50, 30]);

          // Visual explosion in collectible's signature glow color
          this.particles.burst(px, py, 45, colDef.glowColor, 18, 420, 0.95, 550, this.lowQuality);

          // Instant dramatic in-game toast feedback
          this.cb.onToast(`${pDef.symbol} ${pDef.name} ACTIVATED! (+${bonus} COINS)`);
          this.cb.onHud();
          this.cb.onCoin();

          // If Dash power was collected, trigger immediate forward leap
          if (colDef.powerType === 'dash') {
            this.triggerSonicDash();
          }
        }
      }
    }
  }

  /** Magnet ability: draws all nearby coins and collectibles directly toward player */
  updateMagnet(now: number, dtMs: number): void {
    if (!this.powerups.isMagnetActive()) return;
    const px = this.player.position.x;
    const py = this.player.position.y;
    const pullRadius = 400;
    // Proper delta-time scaling in seconds so coins smoothly glide to player
    const dt = dtMs > 1 ? dtMs / 1000 : dtMs;
    const pullSpeed = 480 * dt;

    for (const lane of this.lanes.lanes) {
      const laneY = lane.mesh.position.y;
      if (Math.abs(laneY - py) > pullRadius) continue;

      if (lane.coins) {
        for (const c of lane.coins) {
          if (c.taken) continue;
          const wx = c.mesh.position.x;
          const wy = laneY + c.mesh.position.y;
          const dx = px - wx;
          const dy = py - wy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < pullRadius && dist > 1) {
            c.mesh.position.x += (dx / dist) * pullSpeed;
            c.mesh.position.y += (dy / dist) * pullSpeed;
            if (dist < 42) {
              c.taken = true;
              this.coins.beginCollect(c.mesh, this.player.position);
              this.coins.collect();
              this.audio.coin();
              this.score.addBonus(1);
              this.cb.onHud();
            }
          }
        }
      }

      if (lane.collectibles) {
        for (const col of lane.collectibles) {
          if (col.taken) continue;
          const wx = col.mesh.position.x;
          const wy = laneY + col.mesh.position.y;
          const dx = px - wx;
          const dy = py - wy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < pullRadius && dist > 1) {
            col.mesh.position.x += (dx / dist) * pullSpeed;
            col.mesh.position.y += (dy / dist) * pullSpeed;
            if (dist < 42) {
              this.checkCollect();
            }
          }
        }
      }
    }
  }

  nearMiss(): void {
    const now = performance.now();
    if (now - this.lastNearAt < 700) return;
    this.lastNearAt = now;
    this.runNear++;
    this.missions.onNearMiss();
    this.score.addBonus(2);
    this.save.data.stats.totalNearMiss++;
    this.missions.unlock('close');
    this.cb.onHud();
    const msgs = this.missions.check(this.score.maxLane, this.runNear, this.worlds.current.config.id, this.coins.runCoins);
    for (const m of msgs) {
      this.cb.onToast(m);
      this.audio.unlock();
    }
    this.cb.onNearMiss();
    this.audio.near();
    vibrate(20);
    this.bus.emit('nearMiss');
  }

  /** PLAYER+VEHICLE collision — checks for Ghost invulnerability and Shield absorption */
  collisionCheck(slowMo: (ms: number, scale: number) => void): void {
    const lane = this.lanes.laneAt(this.player.lane);
    if (!lane || (lane.type !== 'car' && lane.type !== 'truck')) return;
    if (this.player.position.z > 10 * GAME_CONFIG.zoom) return;

    // Check post-hit grace period (e.g. immediately after Shield break)
    const now = performance.now();
    if (now < this.invulnerableUntil) {
      return;
    }

    // 1. Ghost superpower: phase directly through traffic without harm
    if (this.powerups.isGhostActive()) {
      return;
    }

    const pxMin = this.player.position.x - this.player.halfWidth();
    const pxMax = this.player.position.x + this.player.halfWidth();

    for (const v of lane.vehicles) {
      const len = (v.userData.length as number | undefined) ?? 60;
      const half = ((len * GAME_CONFIG.zoom) / 2) * 0.82;
      const vMin = v.position.x - half;
      const vMax = v.position.x + half;

      if (pxMax > vMin && pxMin < vMax) {
        // 2. Shield superpower: absorbs fatal collision!
        // Player MUST survive this hit, shield is consumed, grace period protects against lingering vehicle!
        if (this.powerups.absorbCollision()) {
          this.invulnerableUntil = performance.now() + 1600;
          this.player.setInvulnerable(1600);

          // Displace the colliding vehicle forward so it does not linger inside player
          const pushDist = (lane.direction ? 1 : -1) * (half + 28 * GAME_CONFIG.zoom);
          v.position.x += pushDist;
          v.userData.prevDx = null;

          this.shake = 12;
          this.audio.shieldHit();
          vibrate([40, 60, 40]);

          if (this.vfx) {
            this.vfx.breakShield(this.player.position);
          }
          this.particles.burst(
            this.player.position.x, this.player.position.y, 45,
            0x38e1ff, 18, 380, 0.9, 450, this.lowQuality,
          );
          this.cb.onToast('🛡️ FORCE SHIELD ABSORBED IMPACT!');
          this.cb.onHud();
          return;
        }

        // Fatal collision
        this.onDeath();
        return;
      }

      const dx = v.position.x - this.player.position.x;
      const nearDist = half + 11 * GAME_CONFIG.zoom + 34 * GAME_CONFIG.zoom;
      const prev = v.userData.prevDx as number | null | undefined;
      if (prev !== null && prev !== undefined) {
        if (prev < 0 !== dx < 0 && Math.min(Math.abs(prev), Math.abs(dx)) < nearDist) {
          this.nearMiss();
          if (!this.reducedMotion) slowMo(320, 0.35);
        }
      }
      v.userData.prevDx = dx;
    }
  }

  onDeath(): void {
    if (this.dying) return;
    this.dying = true;
    this.player.dying = true;
    this.deathAt = performance.now();
    this.shake = 14;
    this.audio.death();
    this.audio.duckAmbient(0.8);
    vibrate([40, 40, 40]);
    this.particles.burst(
      this.player.position.x, this.player.position.y, 20,
      0xff5252, 14, 260, 0.8, 320, this.lowQuality,
    );
    this.bus.emit('playerHit');
    this.cb.onDeath();
  }

  onWaterDeath(): void {
    if (this.dying) return;
    this.dying = true;
    this.player.dying = true;
    this.deathAt = performance.now();
    this.shake = 10;
    this.audio.crash();
    this.audio.duckAmbient(0.8);
    vibrate([30, 40, 30]);
    this.particles.burst(
      this.player.position.x, this.player.position.y, 12,
      0x38e1ff, 18, 300, 0.9, 400, this.lowQuality,
    );
    this.player.group.position.z -= 14 * GAME_CONFIG.zoom;
    this.bus.emit('playerHit');
    this.cb.onDeath();
  }

  updateWaterGameplay(dtMs: number): void {
    const currentWorld = this.worlds.current?.config?.id;
    if ((currentWorld === 'river' || currentWorld === 'beach') && !this.dying) {
      const activeLane = this.lanes.laneAt(this.player.lane);
      if (activeLane && (activeLane.type === 'car' || activeLane.type === 'truck')) {
        const px = this.player.position.x;
        let onPlatform = false;
        let ridingPlatform: THREE.Group | null = null;

        for (const v of activeLane.vehicles) {
          const len = (v.userData.length as number | undefined) ?? 60;
          const half = ((len * GAME_CONFIG.zoom) / 2) * 0.95;
          const vMin = v.position.x - half;
          const vMax = v.position.x + half;

          if (px >= vMin && px <= vMax) {
            onPlatform = true;
            ridingPlatform = v;
            break;
          }
        }

        if (onPlatform && ridingPlatform && !this.player.moving) {
          const sgn = activeLane.direction ? -1 : 1;
          const shift = activeLane.speed * GAME_CONFIG.zoom * sgn * (dtMs / 1000) * 1.1;
          this.player.group.position.x += shift;
          const minX = -GAME_CONFIG.positionWidth * GAME_CONFIG.zoom * (GAME_CONFIG.columns / 2 - 0.5);
          const maxX = GAME_CONFIG.positionWidth * GAME_CONFIG.zoom * (GAME_CONFIG.columns / 2 - 0.5);
          this.player.group.position.x = Math.max(minX, Math.min(maxX, this.player.group.position.x));
          this.player.column = Math.round((this.player.group.position.x - minX) / (GAME_CONFIG.positionWidth * GAME_CONFIG.zoom));
        } else if (!onPlatform && !this.player.moving && performance.now() > this.invulnerableUntil) {
          this.onWaterDeath();
        }
      }
    }
  }

  finishDeath(): { score: number; newBest: boolean } {
    this.dying = false;
    this.player.dying = false;
    const worldId = this.worlds.current.config.id;
    this.save.data.lastWorldId = worldId;
    this.save.data.lastLane = this.player.lane;
    const newBest = this.progression.recordRun(this.score.score, worldId, this.player.lane);
    this.progression.unlockWorldByProgression(worldId);
    const frontierWorld = this.worlds.worldForLane(this.score.maxLane, this.save.data.selectedWorld);
    this.progression.unlockWorldByProgression(frontierWorld.id);
    this.save.data.coins += this.coins.runCoins;
    this.save.data.totalCoins += this.coins.runCoins;
    this.save.save();
    this.missions.onRunEnd(this.score.score, this.score.maxLane, this.runNear, this.coins.runCoins);
    const msgs = this.missions.check(this.score.maxLane, this.runNear, worldId, this.coins.runCoins);
    for (const m of msgs) {
      this.cb.onToast(m);
      this.audio.unlock();
    }
    this.audio.gameOver();
    this.bus.emit('gameOver', this.score.score);
    return { score: this.score.score, newBest };
  }

  checkWorldTransition(): void {
    const w = this.worlds.worldForLane(this.player.lane, this.save.data.selectedWorld);
    const wFrontier = this.worlds.worldForLane(this.score.maxLane, this.save.data.selectedWorld);
    this.save.data.lastWorldId = w.id;
    this.save.data.lastLane = this.player.lane;

    if (this.progression.unlockWorldByProgression(w.id)) {
      this.cb.onToast(`${w.name} map unlocked in store!`);
      this.audio.unlock();
    }
    if (wFrontier.id !== w.id && this.progression.unlockWorldByProgression(wFrontier.id)) {
      this.cb.onToast(`${wFrontier.name} map unlocked in store!`);
      this.audio.unlock();
    }

    if (w.id !== this.worlds.current.config.id) {
      const prevId = this.worlds.current.config.id;
      this.worlds.setCurrent(this.worlds.byId(w.id));
      this.lighting.setWorld(w, false);
      this.lanes.setWorldTheme(w.safeDark);
      this.cb.onWorldIntro(w.name, `CROSS! WORLD ${w.num}`);
      this.bus.emit('worldLoaded', { previousWorldId: prevId, currentWorldId: w.id });
      this.cb.onHud();
      const pos = this.player.lane < this.score.maxLane ? this.player.lane : this.score.maxLane;
      const best = this.save.data.worldBest[w.id] ?? 0;
      if (pos > best) {
        this.save.data.worldBest[w.id] = pos;
      }
      this.save.save();
    } else {
      const best = this.save.data.worldBest[w.id] ?? 0;
      if (this.score.maxLane > best) {
        this.save.data.worldBest[w.id] = this.score.maxLane;
        this.save.save();
      }
      this.cb.onHud();
    }
  }

  updateAmbient(dtMs: number): void {
    const w = this.worlds.current.config.weather;
    if (!w) return;
    this.ambientAcc += dtMs;
    const wait = w === 'snow' ? 90 : w === 'dust' ? 200 : 400;
    if (this.ambientAcc < wait) return;
    this.ambientAcc = 0;
    const cx = this.player.position.x;
    const cy = this.player.position.y;
    if (w === 'snow') {
      this.particles.burst(cx + (Math.random() - 0.5) * 900, cy + Math.random() * 700, 320, 0xffffff, 1, 25, 2.4, 40, this.lowQuality);
    } else if (w === 'dust') {
      this.particles.burst(cx + (Math.random() - 0.5) * 900, cy + (Math.random() - 0.5) * 700, 60, 0xd9b25e, 1, 130, 1.2, 120, this.lowQuality);
    } else if (w === 'fireflies') {
      this.particles.burst(cx + (Math.random() - 0.5) * 700, cy + (Math.random() - 0.5) * 500, 80, 0xd8ff7a, 1, 25, 2.0, 60, this.lowQuality);
    } else if (w === 'embers') {
      const c = Math.random() < 0.5 ? 0x38e1ff : 0xff3fb4;
      this.particles.burst(cx + (Math.random() - 0.5) * 700, cy + (Math.random() - 0.5) * 500, 60, c, 1, 30, 1.8, 90, this.lowQuality);
    }
  }

  decayShake(dtMs: number): number {
    let s = 0;
    if (this.shake > 0.3) {
      s = this.shake;
      this.shake *= Math.pow(0.02, dtMs / 1000);
    }
    return s;
  }
}
