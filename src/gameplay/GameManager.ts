/**
 * Gameplay owner: run lifecycle, collision (PLAYER+VEHICLE), coins,
 * near-miss, world transitions, ambient weather. Traffic-vs-traffic lives
 * in TrafficManager; UI lives in UIManager — this class talks via callbacks
 * and the event bus.
 */
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
import type { Lighting } from '../renderer/Lighting';
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
  private lastNearAt = 0;
  private ambientAcc = 0;
  private reducedMotion = false;
  private lowQuality = false;

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
    private readonly missions: MissionSystem,
    private readonly progression: ProgressionSystem,
    private readonly particles: ParticleSystem,
    private readonly lighting: Lighting,
    private readonly cb: RunCallbacks,
  ) {}

  setReducedMotion(v: boolean): void {
    this.reducedMotion = v;
  }

  setLowQuality(v: boolean): void {
    this.lowQuality = v;
  }

  get currentScore(): number {
    return this.score.score;
  }

  /** Start a fresh run: reset state, rebuild lanes around the player. */
  newRun(makeLane: (index: number) => void, rebuildPlayerMesh: () => void): void {
    this.score.reset();
    this.coins.reset();
    this.runNear = 0;
    this.runSteps = 0;
    this.dying = false;
    this.shake = 0;
    this.eventActive = null;
    rebuildPlayerMesh();
    this.player.reset(0, Math.floor(GAME_CONFIG.columns / 2));
    this.lanes.clear();
    for (let i = 0; i <= 14; i++) makeLane(i);
    const w = this.worlds.worldForLane(0, this.save.data.selectedWorld);
    this.worlds.setCurrent(this.worlds.byId(w.id));
    this.lighting.setWorld(w, true);
    this.save.data.stats.gamesPlayed++;
    this.missions.unlock('first');
    this.save.save();
    this.bus.emit('gameStarted');
    this.cb.onHud();
  }

  stepPlayer(nowMs: number): void {
    const done = this.player.step(nowMs, this.reducedMotion);
    if (done) {
      this.runSteps++;
      this.save.data.stats.totalSteps++;
      this.audio.land();
      if (!this.reducedMotion) {
        this.particles.burst(
          this.player.position.x, this.player.position.y, 4,
          0xffffff, 4, 120, 0.4, 160, this.lowQuality,
        );
      }
      this.checkCollect();
      const msgs = this.missions.check(this.score.maxLane, this.runNear);
      for (const m of msgs) {
        this.cb.onToast(`Mission complete: ${m}`);
        this.audio.unlock();
      }
      if (done.dir === 'forward') {
        if (this.score.reachLane(this.player.lane)) {
          this.cb.onHud();
          this.checkWorldTransition();
        }
        this.cb.onHud();
      }
    }
  }

  /**
   * Coin pickup via real 3D world-space distance — never column matching
   * alone. Scans the player's lane plus neighbours so a coin is collected
   * the moment the player physically touches it (works mid-hop, on
   * desktop and mobile, with no tapping required). Safe to call every
   * frame: only nearby lanes are scanned and taken coins are skipped.
   */
  checkCollect(): void {
    const px = this.player.position.x;
    const py = this.player.position.y;
    const pz = this.player.position.z;
    const laneH = GAME_CONFIG.positionWidth * GAME_CONFIG.zoom;
    const pickupR = 48;
    for (const lane of this.lanes.lanes) {
      if (!lane.coins.length) continue;
      const laneY = lane.mesh.position.y;
      if (Math.abs(laneY - py) > laneH) continue;
      for (const c of lane.coins) {
        if (c.taken) continue;
        const wx = c.mesh.position.x;
        const wy = laneY + c.mesh.position.y;
        const wz = c.mesh.position.z;
        const dx = wx - px;
        const dy = wy - py;
        const dz = wz - pz;
        if (dx * dx + dy * dy > pickupR * pickupR) continue;
        if (Math.abs(dz) > 70) continue;
        c.taken = true;
        this.coins.beginCollect(c.mesh);
        this.coins.collect();
        this.score.addBonus(1);
        this.audio.coin();
        vibrate(10);
        this.particles.burst(px, py, 30, 0xffc93c, 8, 200, 0.6, 300, this.lowQuality);
        this.bus.emit('coinCollected');
        this.cb.onHud();
        this.cb.onCoin();
        const msgs = this.missions.check(this.score.maxLane, this.runNear);
        for (const m of msgs) this.cb.onToast(`Mission complete: ${m}`);
      }
    }
  }

  nearMiss(): void {
    const now = performance.now();
    if (now - this.lastNearAt < 700) return;
    this.lastNearAt = now;
    this.runNear++;
    this.score.addBonus(2);
    this.save.data.stats.totalNearMiss++;
    this.missions.unlock('close');
    this.cb.onHud();
    const msgs = this.missions.check(this.score.maxLane, this.runNear);
    for (const m of msgs) this.cb.onToast(`Mission complete: ${m}`);
    this.cb.onNearMiss();
    this.audio.near();
    vibrate(20);
    this.bus.emit('nearMiss');
  }

  /** PLAYER+VEHICLE collision — forgiving hitbox, plus near-miss tracking. */
  collisionCheck(slowMo: (ms: number, scale: number) => void): void {
    const lane = this.lanes.laneAt(this.player.lane);
    if (!lane || (lane.type !== 'car' && lane.type !== 'truck')) return;
    if (this.player.position.z > 10 * GAME_CONFIG.zoom) return;
    const pxMin = this.player.position.x - this.player.halfWidth();
    const pxMax = this.player.position.x + this.player.halfWidth();
    for (const v of lane.vehicles) {
      const len = (v.userData.length as number | undefined) ?? 60;
      const half = ((len * GAME_CONFIG.zoom) / 2) * 0.82;
      const vMin = v.position.x - half;
      const vMax = v.position.x + half;
      if (pxMax > vMin && pxMin < vMax) {
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
    vibrate([40, 40, 40]);
    this.particles.burst(
      this.player.position.x, this.player.position.y, 20,
      0xff5252, 14, 260, 0.8, 320, this.lowQuality,
    );
    this.bus.emit('playerHit');
    this.cb.onDeath();
  }

  finishDeath(): { score: number; newBest: boolean } {
    this.dying = false;
    this.player.dying = false;
    const worldId = this.worlds.current.config.id;
    const newBest = this.progression.recordRun(this.score.score, worldId, this.score.maxLane);
    this.save.data.coins += this.coins.runCoins;
    this.save.data.totalCoins += this.coins.runCoins;
    this.save.save();
    this.audio.gameOver();
    this.bus.emit('gameOver', this.score.score);
    return { score: this.score.score, newBest };
  }

  checkWorldTransition(): void {
    const w = this.worlds.worldForLane(this.score.maxLane, this.save.data.selectedWorld);
    if (w.id !== this.worlds.current.config.id) {
      this.worlds.setCurrent(this.worlds.byId(w.id));
      this.lighting.setWorld(w, false);
      this.cb.onWorldIntro(w.name, `CROSS! WORLD ${w.num}`);
      this.bus.emit('worldLoaded', w.id);
      const best = this.save.data.worldBest[w.id] ?? 0;
      if (this.score.maxLane > best) {
        this.save.data.worldBest[w.id] = this.score.maxLane;
        this.save.save();
      }
    } else {
      const best = this.save.data.worldBest[w.id] ?? 0;
      if (this.score.maxLane > best) this.save.data.worldBest[w.id] = this.score.maxLane;
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
