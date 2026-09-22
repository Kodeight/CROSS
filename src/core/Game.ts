/**
 * §6 — Game: owns every system, implements the single update/render loop
 * delegate. State machine: BOOT → LOADING → MAIN_MENU → WORLD_INTRO →
 * PLAYING ⇄ PAUSED → GAME_OVER → RESULTS → MAIN_MENU.
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/game.config';
import { EventBus } from './EventBus';
import { GameLoop, type LoopDelegate } from './GameLoop';
import { GameState } from './GameState';
import { Time } from './Time';
import { InputManager } from './Input';
import { SaveManager } from '../save/SaveManager';
import { AudioManager } from '../audio/AudioManager';
import { AssetManager } from '../assets/AssetManager';
import { GameRenderer, RendererError } from '../renderer/Renderer';
import { FollowCamera } from '../renderer/Camera';
import { Lighting } from '../renderer/Lighting';
import { CharacterFactory } from '../player/CharacterFactory';
import { Player } from '../player/Player';
import { PlayerController } from '../player/PlayerController';
import { WorldManager } from '../world/WorldManager';
import { WorldGenerator } from '../world/WorldGenerator';
import { LaneManager } from '../world/LaneManager';
import { VehicleFactory } from '../world/environment/VehicleFactory';
import { TreeFactory } from '../world/environment/TreeFactory';
import { PropFactory } from '../world/environment/PropFactory';
import { BuildingFactory } from '../world/environment/BuildingFactory';
import { TrafficManager } from '../traffic/TrafficManager';
import { ScoreSystem } from '../gameplay/ScoreSystem';
import { CoinSystem } from '../gameplay/CoinSystem';
import { MissionSystem } from '../gameplay/MissionSystem';
import { ProgressionSystem } from '../gameplay/ProgressionSystem';
import { ParticleSystem } from '../gameplay/Particles';
import { GameManager } from '../gameplay/GameManager';
import { UIManager } from '../ui/UIManager';
import { HUD } from '../ui/HUD';
import { MainMenu } from '../ui/MainMenu';
import { GameOverScreen } from '../ui/GameOver';
import { CharacterSelect } from '../ui/CharacterSelect';
import { WorldSelect } from '../ui/WorldSelect';
import { MissionsScreen, SettingsScreen } from '../ui/Screens';
import { CharacterPreviewManager, WorldPreviewManager } from '../ui/Previews';
import { isTouchDevice, prefersReducedMotion } from '../utils/DeviceUtils';
import { registerPWA } from '../pwa';

const DEBUG = /[?&]debug/i.test(location.search);

export class Game implements LoopDelegate {
  private readonly bus = new EventBus();
  private readonly save = new SaveManager();
  private readonly time = new Time();
  private readonly input = new InputManager();
  private readonly assets = new AssetManager();
  private readonly audio: AudioManager;
  private readonly ui = new UIManager();
  private readonly loop = new GameLoop(this);

  private renderer!: GameRenderer;
  private camera!: FollowCamera;
  private lighting!: Lighting;
  private factory!: CharacterFactory;
  private player!: Player;
  private controller!: PlayerController;
  private worlds!: WorldManager;
  private generator!: WorldGenerator;
  private lanes!: LaneManager;
  private traffic!: TrafficManager;
  private score = new ScoreSystem();
  private coins = new CoinSystem();
  private missions!: MissionSystem;
  private progression!: ProgressionSystem;
  private particles!: ParticleSystem;
  private manager!: GameManager;
  private hud!: HUD;
  private menu!: MainMenu;
  private gameOverScreen = new GameOverScreen();
  private charSelect!: CharacterSelect;
  private worldSelect!: WorldSelect;
  private missionsScreen!: MissionsScreen;
  private settingsScreen!: SettingsScreen;
  private charPreviews!: CharacterPreviewManager;
  private worldPreviews!: WorldPreviewManager;

  private reducedMotion = false;
  private readonly isTouch = isTouchDevice();
  private debugLast = 0;
  private booted = false;

  constructor() {
    this.audio = new AudioManager(() => this.save.data.settings);
  }

  // ---------------- boot ----------------

  boot(): void {
    if (this.booted) return;
    this.booted = true;
    this.ui.setLoad(15, 'LOADING...');
    this.save.load();
    this.reducedMotion = this.save.data.settings.reducedMotion || prefersReducedMotion();

    // Stage 1 — renderer only. The WebGL screen belongs exclusively to
    // genuine renderer-construction failure.
    try {
      this.ui.setLoad(35, 'BUILDING WORLD...');
      const container = document.getElementById('game');
      if (!container) throw new Error('missing #game container');
      this.renderer = GameRenderer.create(container);
    } catch (err) {
      if (err instanceof RendererError) this.ui.showWebGLError();
      else {
        console.error('CROSS! startup failed:', err);
        this.ui.showAppError(`CROSS! hit a startup problem: ${messageOf(err)}`);
      }
      return;
    }

    // Stage 2 — everything else. Failures here are app bugs, never WebGL.
    try {
      this.ui.setLoad(60, 'WAKING CHICKEN...');
      this.buildSystems();
      this.ui.setLoad(80, 'COUNTING COINS...');
      this.bindUI();
      this.bindSystemEvents();
      registerPWA(this.ui, () => this.audio.click());
      this.charSelect.render();
      this.worldSelect.render();
      this.missionsScreen.render(0, 0);
      this.settingsScreen.render();
      this.menu.render();
      this.hud.update();
      this.applyQuality();
      if (DEBUG) {
        this.ui.el.debug.hidden = false;
        this.traffic.enableAudit();
      }
      this.ui.setLoad(100, 'READY!');
      this.setState(GameState.MAIN_MENU);
      this.ui.setTouchControlsVisible(false, this.isTouch);
      window.setTimeout(() => this.ui.hideLoading(), 350);
      this.time.reset(performance.now());
      this.loop.start();
      console.log('CROSS! Game initialized');
    } catch (err) {
      console.error('CROSS! startup failed:', err);
      this.ui.showAppError(`CROSS! hit a startup problem: ${messageOf(err)}`);
    }
  }

  private buildSystems(): void {
    const scene = this.renderer.scene;
    this.camera = new FollowCamera();
    this.camera.setReducedMotion(this.reducedMotion);
    this.camera.onResize();
    this.lighting = new Lighting(scene, this.renderer.hemi, this.renderer.dirLight);

    this.factory = new CharacterFactory(this.assets);
    this.player = new Player(this.factory, {
      onHopStart: () => this.audio.hop(),
      onLand: () => undefined,
    });
    scene.add(this.player.group);

    const vehicles = new VehicleFactory(this.assets);
    const trees = new TreeFactory(this.assets);
    const props = new PropFactory(this.assets, trees);
    const buildings = new BuildingFactory(this.assets);
    this.worlds = new WorldManager(props, buildings, trees, this.save.data.selectedWorld);
    this.generator = new WorldGenerator(this.assets, vehicles, props, buildings, trees);
    this.lanes = new LaneManager(scene);
    this.traffic = new TrafficManager();
    this.missions = new MissionSystem(this.save, this.bus);
    this.progression = new ProgressionSystem(this.save, this.bus);
    this.particles = new ParticleSystem(scene, this.assets);

    this.manager = new GameManager(
      this.bus, this.save, this.audio, this.player, this.lanes, this.worlds,
      this.traffic, this.score, this.coins, this.missions, this.progression,
      this.particles, this.lighting,
      {
        onHud: () => this.hud.update(),
        onToast: (m) => this.ui.toast(m),
        onNearMiss: () => this.ui.flashNearMiss(),
        onWorldIntro: (name, sub) => {
          this.audio.fanfare();
          this.ui.showWorldIntro(name, sub, this.reducedMotion, () => this.bus.emit('worldIntroFinished'));
        },
        onCoin: () => this.ui.coinPulse(),
        onDeath: () => undefined,
        onGameOver: () => undefined,
      },
    );
    this.manager.setReducedMotion(this.reducedMotion);

    this.controller = new PlayerController(this.player, this.input, () => this.togglePause());
    this.input.bind();

    this.hud = new HUD(this.save, () => this.score.score);
    this.menu = new MainMenu(this.save, this.worlds);
    this.charPreviews = new CharacterPreviewManager(this.factory, () => this.reducedMotion);
    this.worldPreviews = new WorldPreviewManager(vehicles, () => this.reducedMotion);
    this.charSelect = new CharacterSelect(
      this.save, this.audio, this.progression, this.charPreviews, this.ui,
      () => this.rebuildPlayerMesh(), () => this.menu.render(),
    );
    this.worldSelect = new WorldSelect(
      this.save, this.audio, this.progression, this.worldPreviews, this.ui,
      this.allWorlds(), () => this.menu.render(),
    );
    this.missionsScreen = new MissionsScreen(this.save);
    this.settingsScreen = new SettingsScreen(this.save, this.audio, (what) => this.onSettingsChanged(what));

    // Initial showcase buffer behind the menu: full city section with the
    // player placed inside it — the menu diorama is already a complete world.
    for (let i = 0; i <= GAME_CONFIG.startLane + 30; i++) this.makeLane(i);
    this.player.reset(GAME_CONFIG.startLane, Math.floor(GAME_CONFIG.columns / 2));
    const w = this.worlds.worldForLane(GAME_CONFIG.startLane, this.save.data.selectedWorld);
    this.worlds.setCurrent(this.worlds.byId(w.id));
    this.lighting.setWorld(w, true);
    this.camera.snapToPlayer(this.player.position);

    window.addEventListener('resize', () => {
      this.renderer.onResize();
      this.camera.onResize();
    });
    window.addEventListener('orientationchange', () => window.setTimeout(() => {
      this.renderer.onResize();
      this.camera.onResize();
    }, 120));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.ui.state === GameState.PLAYING && !this.manager.dying) this.pause();
    });
  }

  private allWorlds(): import('../world/World').World[] {
    return (this.worlds as unknown as { worlds: import('../world/World').World[] }).worlds ?? [];
  }

  private makeLane(index: number): void {
    const def = this.worlds.worldDefForLane(index, this.save.data.selectedWorld);
    const lane = this.generator.makeLane(index, def, {
      playerX: this.player.position.x,
      playerLane: this.player.lane,
    });
    for (const c of lane.coins) this.coins.track(c.mesh);
    this.lanes.add(lane);
  }

  private rebuildPlayerMesh(): void {
    const parent = this.player.group.parent;
    if (parent) parent.remove(this.player.group);
    const pos = this.player.position.clone();
    this.player.rebuild(this.save.data.selectedCharacter);
    this.player.group.scale.setScalar(Player.SCALE);
    this.player.position.copy(pos);
    if (parent) parent.add(this.player.group);
  }

  // ---------------- state ----------------

  private setState(s: GameState): void {
    this.ui.state = s;
    const map: Record<GameState, string[]> = {
      [GameState.BOOT]: [],
      [GameState.LOADING]: [],
      [GameState.MAIN_MENU]: ['menu'],
      [GameState.CHARACTER_SELECT]: ['chars-screen'],
      [GameState.WORLD_SELECT]: ['worlds-screen'],
      [GameState.MISSIONS]: ['missions-screen'],
      [GameState.SETTINGS]: ['settings-screen'],
      [GameState.PAUSED]: ['pause-screen'],
      [GameState.GAME_OVER]: ['gameover'],
      [GameState.WORLD_INTRO]: [],
      [GameState.PLAYING]: [],
      [GameState.RESULTS]: ['gameover'],
    };
    this.ui.showOnly(map[s] ?? []);
    this.ui.syncTopButton(s);
    this.controller.setEnabled(s === GameState.PLAYING);
    this.ui.setTouchControlsVisible(s === GameState.PLAYING || s === GameState.WORLD_INTRO, this.isTouch);
    if (s === GameState.MAIN_MENU) {
      this.menu.render();
      this.audio.startMusic('menu');
    }
    if (s === GameState.PLAYING) this.audio.startMusic('play');
    if (s === GameState.GAME_OVER || s === GameState.PAUSED) this.audio.stopMusic();
    if (s === GameState.CHARACTER_SELECT) this.charSelect.render();
    else this.charPreviews.close();
    if (s === GameState.WORLD_SELECT) this.worldSelect.render();
    else this.worldPreviews.close();
  }

  private newRun(): void {
    this.audio.click();
    this.manager.newRun(
      (i) => this.makeLane(i),
      () => this.rebuildPlayerMesh(),
    );
    this.hud.update();
    this.setState(GameState.WORLD_INTRO);
    this.camera.beginIntro(this.player.position);
    const w = this.worlds.current.config;
    this.audio.fanfare();
    this.ui.showWorldIntro(w.name, `CROSS! WORLD ${w.num}`, this.reducedMotion, () => {
      if (this.ui.state === GameState.WORLD_INTRO) this.setState(GameState.PLAYING);
    });
    // Show swipe tutorial on first run.
    if (!this.save.data.tutorialShown) {
      this.save.data.tutorialShown = true;
      this.save.save();
      window.setTimeout(() => {
        this.ui.showTutorial('Swipe to dodge', '◀→↑↓', 3500);
      }, 600);
    }
  }

  private toMenu(): void {
    this.manager.dying = false;
    this.menu.render();
    this.setState(GameState.MAIN_MENU);
  }

  private pause(): void {
    if (this.ui.state !== GameState.PLAYING) return;
    this.setState(GameState.PAUSED);
    this.bus.emit('gamePaused');
  }

  private resume(): void {
    if (this.ui.state !== GameState.PAUSED) return;
    this.audio.click();
    this.setState(GameState.PLAYING);
    this.time.reset(performance.now());
    this.bus.emit('gameResumed');
  }

  private togglePause(): void {
    if (this.ui.state === GameState.PLAYING) this.pause();
    else if (this.ui.state === GameState.PAUSED) this.resume();
  }

  private doGameOver(): void {
    const { score, newBest } = this.manager.finishDeath();
    this.gameOverScreen.show(
      score,
      this.save.data.bestScore,
      newBest,
      this.coins.runCoins,
      `LANES ${this.score.maxLane} · COINS +${this.coins.runCoins} · NEAR MISS ×${this.manager.runNear}`,
    );
    this.menu.render();
    this.setState(GameState.GAME_OVER);
  }

  // ---------------- per-frame ----------------

  update(dtMs: number, nowMs: number): void {
    const dt = this.time.tick(nowMs);
    const s = this.ui.state;
    if (s === GameState.PLAYING) {
      if (this.manager.dying) {
        this.particles.update(dt);
        this.player.updateIdle(nowMs, this.reducedMotion);
        if (nowMs - this.manager.deathAt > 1000) this.doGameOver();
      } else {
        this.manager.stepPlayer(nowMs);
        this.manager.checkCollect();
        this.lanes.maintain(this.player.lane, (i) => {
          const def = this.worlds.worldDefForLane(i, this.save.data.selectedWorld);
          const lane = this.generator.makeLane(i, def, { playerX: this.player.position.x, playerLane: this.player.lane });
          for (const c of lane.coins) this.coins.track(c.mesh);
          return lane;
        });
        this.traffic.update(this.lanes.lanes, dt, DEBUG);
        this.particles.update(dt);
        this.coins.update(nowMs, GAME_CONFIG.zoom, dt);
        this.generator.updateWater(nowMs);
        this.manager.collisionCheck((ms, scale) => this.time.slowMo(ms, scale));
        this.player.updateIdle(nowMs, this.reducedMotion);
        this.lighting.update(dt, this.reducedMotion);
        this.manager.updateAmbient(dt);
        this.manager.checkWorldTransition();
      }
    } else if (
      s === GameState.MAIN_MENU || s === GameState.CHARACTER_SELECT ||
      s === GameState.WORLD_SELECT || s === GameState.GAME_OVER ||
      s === GameState.SETTINGS || s === GameState.MISSIONS ||
      s === GameState.WORLD_INTRO
    ) {
      if (s === GameState.WORLD_INTRO && !this.manager.dying) {
        // Cinematic settle: lanes exist, traffic visible but harmless.
        this.traffic.update(this.lanes.lanes, this.reducedMotion ? 0 : dt * 0.35, false);
        this.manager.checkWorldTransition();
      }
      this.coins.update(nowMs, GAME_CONFIG.zoom, dt);
      this.generator.updateWater(nowMs);
      this.particles.update(dt);
      this.player.updateIdle(nowMs, this.reducedMotion);
      this.lighting.update(dt, this.reducedMotion);
    }
    // Camera always follows (menu diorama rests on the player start).
    this.camera.update(dtMs, this.player.position);
    const shake = this.manager.decayShake(dtMs);
    if (shake > 0) this.camera.shake(shake);
    // Sun follows the player so shadows stay crisp.
    this.renderer.dirLight.position.set(-100 + this.player.position.x, -100 + this.player.position.y, 400);
    if (DEBUG) this.updateDebug(nowMs, dtMs);
  }

  render(): void {
    this.renderer.render(this.camera.camera);
  }

  // ---------------- UI wiring ----------------

  private bindUI(): void {
    const on = (id: string, fn: () => void) => {
      const e = document.getElementById(id);
      if (e) e.addEventListener('click', fn);
    };
    on('btn-play', () => this.newRun());
    on('btn-again', () => this.newRun());
    on('btn-resume', () => this.resume());
    on('btn-restart-pause', () => this.newRun());
    on('btn-home-pause', () => { this.audio.click(); this.toMenu(); });
    on('btn-home', () => { this.audio.click(); this.toMenu(); });
    const openScreen = (target: GameState) => {
      this.ui.returnTo = this.ui.state === GameState.GAME_OVER ? GameState.GAME_OVER
        : this.ui.state === GameState.PAUSED ? GameState.PAUSED : GameState.MAIN_MENU;
      this.missionsScreen.render(this.score.maxLane, this.manager.runNear);
      this.settingsScreen.render();
      this.audio.click();
      this.setState(target);
    };
    // Top-right HUD button routes by state: settings on the menu,
    // pause during gameplay. One zone, one anchor — never moves.
    on('btn-pause', () => {
      if (this.ui.state === GameState.PLAYING) this.pause();
      else if (this.ui.state === GameState.MAIN_MENU) openScreen(GameState.SETTINGS);
      else if (this.ui.state === GameState.PAUSED) this.resume();
    });
    on('btn-chars', () => openScreen(GameState.CHARACTER_SELECT));
    on('btn-worlds', () => openScreen(GameState.WORLD_SELECT));
    on('btn-chars2', () => openScreen(GameState.CHARACTER_SELECT));
    on('btn-missions', () => openScreen(GameState.MISSIONS));
    on('btn-settings', () => openScreen(GameState.SETTINGS));
    for (const b of document.querySelectorAll('[data-back]')) {
      b.addEventListener('click', () => {
        this.audio.click();
        const r = this.ui.returnTo;
        if (r === GameState.GAME_OVER) this.setState(GameState.GAME_OVER);
        else if (r === GameState.PAUSED) this.setState(GameState.PAUSED);
        else this.toMenu();
      });
    }
    this.settingsScreen.bind();
    const retry = document.getElementById('btn-retry-boot');
    if (retry) retry.addEventListener('click', () => window.location.reload());
  }

  private bindSystemEvents(): void {
    this.input.onFirstGesture(() => this.audio.ensure());
    this.bus.on('worldIntroFinished', () => {
      if (this.ui.state === GameState.WORLD_INTRO) this.setState(GameState.PLAYING);
    });
  }

  private onSettingsChanged(what: 'music' | 'sfx' | 'motion' | 'quality' | 'reset'): void {
    if (what === 'music') {
      if (this.save.data.settings.music) {
        this.audio.startMusic(this.ui.state === GameState.PLAYING ? 'play' : 'menu');
      } else this.audio.stopMusic();
    } else if (what === 'motion') {
      this.reducedMotion = this.save.data.settings.reducedMotion || prefersReducedMotion();
      this.camera.setReducedMotion(this.reducedMotion);
      this.manager.setReducedMotion(this.reducedMotion);
    } else if (what === 'quality') {
      this.applyQuality();
    } else if (what === 'reset') {
      this.save.reset();
      this.reducedMotion = false;
      this.camera.setReducedMotion(false);
      this.manager.setReducedMotion(false);
      this.settingsScreen.render();
      this.charSelect.render();
      this.worldSelect.render();
      this.missionsScreen.render(0, 0);
      this.menu.render();
      this.rebuildPlayerMesh();
      this.ui.toast('Progress reset');
    }
    this.bus.emit('settingsChanged', what);
  }

  private applyQuality(): void {
    const q = this.save.data.settings.quality;
    this.renderer.applyQuality(q);
    this.manager.setLowQuality(q === 'LOW');
    this.particles.particlesEnabled = q !== 'LOW';
  }

  private updateDebug(nowMs: number, dtMs: number): void {
    if (nowMs - this.debugLast < 250) return;
    this.debugLast = nowMs;
    const fps = dtMs > 0 ? Math.round(1000 / dtMs) : 0;
    const audit = this.traffic.audit ?? { worst: 0, lane: -1, braking: 0 };
    this.ui.el.debug.textContent =
      `FPS ${fps} STATE ${this.ui.state}\n lane ${this.player.lane} score ${this.score.score} ` +
      `dif x${this.generator.difficultyFor(this.score.maxLane).speedMul.toFixed(2)}\n` +
      ` world ${this.worlds.current.config.id} veh ${this.lanes.vehicleCount()}\n` +
      ` player ${Math.round(this.player.position.x)},${Math.round(this.player.position.y)} moves ${this.player.moves.length}\n` +
      ` traffic overlap worst ${Math.round(audit.worst)} (lane ${audit.lane}) braking ${audit.braking}`;
  }
}

function messageOf(err: unknown): string {
  return String((err as { message?: unknown } | null)?.message ?? err ?? 'unknown error');
}

// Re-export for the debug overlay contract used by TrafficManager.
export type { THREE };
