/** Missions + achievements evaluation against run + lifetime stats. World-aware + Daily Missions. */
import { MISSIONS, WORLD_MISSIONS } from '../config/missions.config';
import {
  getActiveDailyMissions,
  getTodayDateString,
  type DailyMissionDef,
  type RunState,
} from '../config/dailyMissions.config';
import { defaultDailyProgress, type DailyMissionsSave } from '../save/SaveData';
import type { SaveManager } from '../save/SaveManager';
import type { EventBus } from '../core/EventBus';

export class MissionSystem {
  constructor(private readonly save: SaveManager, private readonly bus: EventBus) {}

  ensureDaily(): DailyMissionsSave {
    const s = this.save.data;
    const today = getTodayDateString();
    if (!s.dailyMissions || s.dailyMissions.date !== today) {
      s.dailyMissions = {
        date: today,
        completed: {},
        progress: defaultDailyProgress(),
      };
      this.save.save();
    }
    return s.dailyMissions;
  }

  getActiveDaily(): DailyMissionDef[] {
    const daily = this.ensureDaily();
    return getActiveDailyMissions(daily.date);
  }

  onStep(worldId: string): void {
    const d = this.ensureDaily();
    d.progress.steps++;
    d.progress.worldLanes[worldId] = (d.progress.worldLanes[worldId] ?? 0) + 1;
  }

  onCoin(): void {
    const d = this.ensureDaily();
    d.progress.coins++;
  }

  onNearMiss(): void {
    const d = this.ensureDaily();
    d.progress.nearMiss++;
  }

  onRunEnd(score: number, maxLane: number, nearMiss: number, _runCoins: number): void {
    const d = this.ensureDaily();
    d.progress.runs++;
    d.progress.maxLane = Math.max(d.progress.maxLane, maxLane);
    if (score >= 35) {
      d.progress.runsOver30 = (d.progress.runsOver30 ?? 0) + 1;
    }
    if (maxLane >= 25 && nearMiss === 0) {
      d.progress.cleanRuns = (d.progress.cleanRuns ?? 0) + 1;
    }
    this.save.save();
  }

  check(maxLane: number, nearMiss: number, activeWorldId?: string, runCoins = 0): string[] {
    const completed: string[] = [];
    const s = this.save.data;
    const run = { maxLane, nearMiss };

    // 1. Regular lifetime and world missions
    const scoped = activeWorldId ? new Set(WORLD_MISSIONS[activeWorldId] ?? []) : null;
    for (const m of MISSIONS) {
      if (scoped && m.worldId && !scoped.has(m.id)) continue;
      if (!scoped && m.worldId) continue;
      if (s.missions[m.id]) continue;
      // Progressive pools: locked until prerequisites complete.
      if (m.requires?.some((id) => !s.missions[id])) continue;
      let ok = false;
      try {
        ok = m.check(run, s.totalCoins);
      } catch {
        ok = false;
      }
      if (ok) {
        s.missions[m.id] = true;
        s.coins += m.reward;
        s.totalCoins += m.reward;
        completed.push(`${m.name} (+${m.reward})`);
        this.bus.emit('missionCompleted', m.id);
      }
    }

    // 2. Active Daily Missions evaluation
    const daily = this.ensureDaily();
    const activeDaily = getActiveDailyMissions(daily.date);
    const runState: RunState = { maxLane, nearMiss, runCoins };

    let completedCount = 0;
    for (const dm of activeDaily) {
      if (daily.completed[dm.id]) completedCount++;
    }

    for (const dm of activeDaily) {
      if (daily.completed[dm.id]) continue;
      let ok = false;
      try {
        ok = dm.isComplete(daily.progress, runState, completedCount);
      } catch {
        ok = false;
      }
      if (ok) {
        daily.completed[dm.id] = true;
        s.coins += dm.reward;
        s.totalCoins += dm.reward;
        completedCount++;
        completed.push(`Daily: ${dm.title} (+${dm.reward})`);
        this.bus.emit('missionCompleted', dm.id);
      }
    }

    // 3. Achievements
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
    this.bus.emit('achievementUnlocked', id);
    return true;
  }
}

