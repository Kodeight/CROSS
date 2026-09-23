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
    this.runNear = 0;
    this.runSteps = 0;
    this.dying = false;
    this.shake = 0;
    this.eventActive = null;
    rebuildPlayerMesh();
    // Order matters: generate the full initial buffer FIRST, then place
    // the player inside it (never at the world edge), so the first frame
    // is already a complete composed world.
    this.lanes.clear();
    // Pre-place the player so generation-time fairness uses a live position.
    this.player.reset(startLane, center);
    // Generate a generous initial buffer so the camera (elevated,
    // top-down) never sees ungenerated world/blue areas on launch.
    const initialBuffer = startLane + 200;
    for (let i = 0; i <= initialBuffer; i++) makeLane(i);
    // Prefer a calm field lane at/just behind the start point with a free
    // center cell — safe spawn for fresh runs and resumed journeys alike.
    let spawn = startLane;
    for (let l = startLane; l >= Math.max(0, startLane - 12); l--) {
      const ln = this.lanes.laneAt(l);
      if (ln && ln.type === 'field' && !ln.occupied[center]) { spawn = l; break; }
    }
    this.score.reset(spawn);
    this.player.reset(spawn, center);
    const w = this.worlds.worldForLane(spawn, base);
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
      const wid = this.worlds.current.config.id;
      const msgs = this.missions.check(this.score.maxLane, this.runNear, wid);
      for (const m of msgs) {
        this.cb.onToast(`Mission complete: ${m}`);
        this.audio.unlock();
      }
      if (done.dir === 'forward' || done.dir === 'jump') {
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
    const pickupR = 44;
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
        const msgs = this.missions.check(this.score.maxLane, this.runNear, this.worlds.current.config.id);
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
    const msgs = this.missions.check(this.score.maxLane, this.runNear, this.worlds.current.config.id);
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
    // Death checkpoint: PLAY AGAIN returns to THIS world, not CITY.
    this.save.data.lastWorldId = worldId;
    this.save.data.lastLane = this.score.maxLane;
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
    // Journey checkpoint: quitting mid-run and pressing PLAY resumes near
    // here (newRun backs off + re-validates safety — never the exact spot).
    this.save.data.lastWorldId = w.id;
    this.save.data.lastLane = this.score.maxLane;
    if (w.id !== this.worlds.current.config.id) {
      const prevId = this.worlds.current.config.id;
      this.worlds.setCurrent(this.worlds.byId(w.id));
      this.lighting.setWorld(w, false);
      this.cb.onWorldIntro(w.name, `CROSS! WORLD ${w.num}`);
      // §15 — reactive world change: HUD notch updates from the same state.
      this.bus.emit('worldLoaded', { previousWorldId: prevId, currentWorldId: w.id });
      this.cb.onHud();
      const best = this.save.data.worldBest[w.id] ?? 0;
      if (this.score.maxLane > best) {
        this.save.data.worldBest[w.id] = this.score.maxLane;
      }
      this.save.save();
    } else {
      const best = this.save.data.worldBest[w.id] ?? 0;
      if (this.score.maxLane > best) {
        this.save.data.worldBest[w.id] = this.score.maxLane;
        // Persist stretch progress immediately: quitting mid-stretch must
        // not lose the notch progress earned so far.
        this.save.save();
      }
      // Keep notch progress live as the player pushes through the stretch.
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
