/** Best scores, world-best tracking, unlock purchases. */
import type { SaveManager } from '../save/SaveManager';
import type { EventBus } from '../core/EventBus';

export class ProgressionSystem {
  constructor(private readonly save: SaveManager, private readonly bus: EventBus) {}

  /**
   * Record a finished run. `laneInWorld` must be a lane inside `worldId`
   * (feet, not frontier) so per-world bests never store another stretch.
   */
  recordRun(score: number, worldId: string, laneInWorld: number): boolean {
    const s = this.save.data;
    let newBest = false;
    if (score > s.bestScore) {
      s.bestScore = score;
      newBest = true;
    }
    const wb = s.worldBest[worldId] ?? 0;
    if (laneInWorld > wb) s.worldBest[worldId] = laneInWorld;
    this.save.save();
    return newBest;
  }

  unlockCharacter(id: string, price: number): boolean {
    const s = this.save.data;
    const effectivePrice = this.save.price(price);
    if (effectivePrice > 0 && s.coins < effectivePrice) return false;
    if (effectivePrice > 0) s.coins -= effectivePrice;
    if (!s.unlocked.includes(id)) s.unlocked.push(id);
    s.selectedCharacter = id;
    this.save.save();
    this.bus.emit('characterSelected', id);
    return true;
  }

  unlockWorld(id: string, price: number): boolean {
    const s = this.save.data;
    const effectivePrice = this.save.price(price);
    if (effectivePrice > 0 && s.coins < effectivePrice) return false;
    if (effectivePrice > 0) s.coins -= effectivePrice;
    s.unlockedWorlds ??= ['city'];
    if (!s.unlockedWorlds.includes(id)) s.unlockedWorlds.push(id);
    s.selectedWorld = id;
    // New journey in the unlocked world.
    s.lastWorldId = id;
    s.lastLane = 0;
    this.save.save();
    this.bus.emit('worldUnlocked', id);
    this.bus.emit('worldSelected', id);
    return true;
  }

  unlockWorldByProgression(id: string): boolean {
    if (this.save.unlockWorld(id)) {
      this.bus.emit('worldUnlocked', id);
      return true;
    }
    return false;
  }
}
