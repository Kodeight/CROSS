/** Centralized save system: versioned, corruption-tolerant, single key. */

import { TESTING_MODE } from '../config/game.config';
import { worldById, isActiveWorldId } from '../config/worlds.config';
import { SaveData, defaultSave, defaultDailyStreak } from './SaveData';
import { Storage } from './Storage';

const SAVE_KEY = 'cross_save_v1';

export class SaveManager {
  data: SaveData = defaultSave();

  constructor(private readonly storage: Storage = new Storage()) {}

  load(): SaveData {
    try {
      const raw = this.storage.get(SAVE_KEY);
      if (!raw) {
        this.data = defaultSave();
        this.save();
        return this.data;
      }
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      const base = defaultSave();
      if (parsed.version !== 1) {
        this.data = base;
        this.save();
        return this.data;
      }
      const merged: SaveData = {
        ...base,
        ...parsed,
        settings: { ...base.settings, ...(parsed.settings ?? {}) },
        stats: { ...base.stats, ...(parsed.stats ?? {}) },
        dailyMissions: parsed.dailyMissions ?? base.dailyMissions,
        streak: parsed.streak ? { ...defaultDailyStreak(), ...parsed.streak } : base.streak,
        tutorialShown: parsed.tutorialShown ?? base.tutorialShown,
      } as SaveData;
      // Five-world migration: remap any legacy world id to its active
      // equivalent and drop worlds that no longer exist.
      const remap = (id: string): string => worldById(id).id;
      merged.selectedWorld = remap(merged.selectedWorld || 'city');
      merged.lastWorldId = remap(merged.lastWorldId || merged.selectedWorld);
      const seen = new Set<string>();
      merged.unlockedWorlds = (merged.unlockedWorlds ?? ['city'])
        .map(remap)
        .filter((id) => isActiveWorldId(id) && !seen.has(id) && (seen.add(id), true));
      if (!merged.unlockedWorlds.includes('city')) merged.unlockedWorlds.unshift('city');
      if (!merged.unlockedWorlds.includes(merged.selectedWorld)) {
        merged.selectedWorld = 'city';
        merged.lastWorldId = 'city';
      }
      const prunedBest: Record<string, number> = {};
      for (const [k, v] of Object.entries(merged.worldBest ?? {})) {
        const id = remap(k);
        if (isActiveWorldId(id)) prunedBest[id] = Math.max(prunedBest[id] ?? 0, v);
      }
      merged.worldBest = prunedBest;
      this.data = merged;
    } catch {
      this.data = defaultSave();
    }
    return this.data;
  }

  save(): void {
    try {
      this.storage.set(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      /* storage failures must never break gameplay */
    }
  }

  reset(): void {
    this.data = defaultSave();
    this.save();
  }

  isTestingMode(): boolean {
    return TESTING_MODE;
  }

  price(cost: number): number {
    return this.isTestingMode() ? 0 : cost;
  }

  isCharacterUnlocked(id: string): boolean {
    if (this.isTestingMode()) return true;
    return this.data.unlocked.includes(id);
  }

  isWorldUnlocked(id: string): boolean {
    if (this.isTestingMode()) return true;
    return (this.data.unlockedWorlds ?? ['city']).includes(id);
  }

  /**
   * Progression unlock: records a newly reached world. Returns true only
   * when the world was actually added (callers toast on true).
   */
  unlockWorld(id: string): boolean {
    if (this.isTestingMode()) return false;
    this.data.unlockedWorlds ??= ['city'];
    if (this.data.unlockedWorlds.includes(id)) return false;
    this.data.unlockedWorlds.push(id);
    this.save();
    return true;
  }
}
