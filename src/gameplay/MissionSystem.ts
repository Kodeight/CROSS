/** Missions + achievements evaluation against run + lifetime stats. */
import { MISSIONS, ACHIEVEMENTS } from '../config/missions.config';
import type { SaveManager } from '../save/SaveManager';
import type { EventBus } from '../core/EventBus';

export class MissionSystem {
  constructor(private readonly save: SaveManager, private readonly bus: EventBus) {}

  check(maxLane: number, nearMiss: number): string[] {
    const completed: string[] = [];
    const s = this.save.data;
    const run = { maxLane, nearMiss };
    for (const m of MISSIONS) {
      if (s.missions[m.id]) continue;
      let ok = false;
      try {
        ok = m.check(run, s.totalCoins);
      } catch {
        ok = false;
      }
      if (ok) {
        s.missions[m.id] = true;
        s.coins += m.reward;
        completed.push(`${m.name} (+${m.reward})`);
        this.bus.emit('missionCompleted', m.id);
      }
    }
    if (s.stats.totalSteps >= 100) this.unlock('s100');
    if (s.stats.totalSteps >= 500) this.unlock('s500');
    if (s.totalCoins >= 100) this.unlock('rich');
    if (maxLane >= 50) this.unlock('untouch');
    if (completed.length) this.save.save();
    return completed;
  }

  unlock(id: string): boolean {
    const s = this.save.data;
    if (s.achievements[id]) return false;
    s.achievements[id] = true;
    this.save.save();
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    this.bus.emit('achievementUnlocked', id);
    void def;
    return true;
  }
}
