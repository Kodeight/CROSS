/**
 * PowerUpSystem — manages collection, activation, duration, and effects of abilities.
 */
import { POWER_UPS, type PowerUpType, type PowerUpDef } from '../config/powerups.config';
import type { EventBus } from '../core/EventBus';
import type { AudioManager } from '../audio/AudioManager';

export interface PowerUpItem {
  type: PowerUpType;
  mesh: import('three').Group;
  col: number;
  lane: number;
  taken: boolean;
}

export class PowerUpSystem {
  readyPower: PowerUpDef | null = null;
  activePower: PowerUpDef | null = null;
  activeEndsAt = 0;
  cooldownEndsAt = 0;
  activeItems: PowerUpItem[] = [];

  constructor(
    private readonly bus: EventBus,
    private readonly audio: AudioManager,
    private readonly onHudChange?: () => void,
  ) {}

  reset(): void {
    this.readyPower = null;
    this.activePower = null;
    this.activeEndsAt = 0;
    this.cooldownEndsAt = 0;
    this.activeItems = [];
    this.notifyHud();
  }

  collect(type: PowerUpType): void {
    const def = POWER_UPS[type];
    if (!def) return;
    this.readyPower = def;
    this.audio.coin();
    this.bus.emit('powerCollected', def);
    this.notifyHud();
  }

  activate(): boolean {
    const now = performance.now();
    if (!this.readyPower) return false;
    if (now < this.cooldownEndsAt) return false;

    this.activePower = this.readyPower;
    this.readyPower = null;
    this.activeEndsAt = now + this.activePower.durationMs;
    this.audio.fanfare();
    this.bus.emit('powerActivated', this.activePower);
    this.notifyHud();
    return true;
  }

  absorbCollision(): boolean {
    if (this.activePower && (this.activePower.id === 'shield' || this.activePower.id === 'fire_shield')) {
      this.activePower = null;
      this.activeEndsAt = 0;
      this.cooldownEndsAt = performance.now() + 1000;
      this.audio.bump();
      this.bus.emit('powerEnded');
      this.notifyHud();
      return true; // Successfully shielded!
    }
    return false;
  }

  isGhostActive(): boolean {
    return this.activePower?.id === 'ghost';
  }

  isFreezeActive(): boolean {
    return this.activePower?.id === 'freeze';
  }

  timeScale(): number {
    return this.activePower?.id === 'time_warp' ? 0.4 : 1.0;
  }

  update(now: number): void {
    if (this.activePower) {
      if (now >= this.activeEndsAt) {
        const ended = this.activePower;
        this.activePower = null;
        this.cooldownEndsAt = now + (ended.cooldownMs || 1500);
        this.bus.emit('powerEnded');
        this.notifyHud();
      }
    }
  }

  private notifyHud(): void {
    try {
      this.onHudChange?.();
    } catch { /* ignore */ }
  }
}
