/**
 * WorldEventSystem — schedules and coordinates signature events with telegraphed warnings.
 */
import { eventForWorld, type WorldEventDef } from '../config/events.config';
import type { EventBus } from '../core/EventBus';
import type { AudioManager } from '../audio/AudioManager';

export type WorldEventPhase = 'idle' | 'warning' | 'active';

export class WorldEventSystem {
  phase: WorldEventPhase = 'idle';
  currentEvent: WorldEventDef | null = null;
  phaseEndsAt = 0;
  lastEventLane = 0;

  constructor(
    private readonly bus: EventBus,
    private readonly audio: AudioManager,
    private readonly onEventChange?: (phase: WorldEventPhase, def: WorldEventDef | null) => void,
  ) {}

  reset(): void {
    this.phase = 'idle';
    this.currentEvent = null;
    this.phaseEndsAt = 0;
    this.lastEventLane = 0;
    this.notify();
  }

  check(lane: number, worldId: string, now: number, difficultyFreqMul: number): void {
    const minGap = Math.max(20, Math.round(35 / Math.max(0.5, difficultyFreqMul)));
    if (this.phase === 'idle') {
      if (lane > 8 && lane - this.lastEventLane >= minGap) {
        this.startEvent(worldId, now);
        this.lastEventLane = lane;
      }
    } else {
      if (now >= this.phaseEndsAt) {
        if (this.phase === 'warning') {
          this.phase = 'active';
          if (this.currentEvent) {
            this.phaseEndsAt = now + this.currentEvent.activeDurationMs;
            this.bus.emit('worldEventStarted', this.currentEvent);
          }
          this.notify();
        } else if (this.phase === 'active') {
          this.phase = 'idle';
          this.bus.emit('worldEventEnded', this.currentEvent);
          this.currentEvent = null;
          this.notify();
        }
      }
    }
  }

  private startEvent(worldId: string, now: number): void {
    const def = eventForWorld(worldId);
    if (!def) return;
    this.currentEvent = def;
    this.phase = 'warning';
    this.phaseEndsAt = now + def.warningDurationMs;
    this.audio.bump();
    this.bus.emit('worldEventWarning', def);
    this.notify();
  }

  private notify(): void {
    try {
      this.onEventChange?.(this.phase, this.currentEvent);
    } catch { /* ignore */ }
  }
}
