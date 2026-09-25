/** Centralized save system: versioned, corruption-tolerant, single key. */

import { TESTING_MODE } from '../config/game.config';
import { SaveData, defaultSave } from './SaveData';
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
        tutorialShown: parsed.tutorialShown ?? base.tutorialShown,
      } as SaveData;
      // Auto-unlock any world reached in progression, worldBest, or last checkpoint
      merged.unlockedWorlds ??= ['city'];
      if (!merged.unlockedWorlds.includes('city')) merged.unlockedWorlds.push('city');
      if (merged.lastWorldId && !merged.unlockedWorlds.includes(merged.lastWorldId)) {
        merged.unlockedWorlds.push(merged.lastWorldId);
      }
      if (merged.selectedWorld && !merged.unlockedWorlds.includes(merged.selectedWorld)) {
        merged.unlockedWorlds.push(merged.selectedWorld);
      }
      for (const [wid, best] of Object.entries(merged.worldBest ?? {})) {
        if (best > 0 && !merged.unlockedWorlds.includes(wid)) {
          merged.unlockedWorlds.push(wid);
        }
      }
      const worldRotation = ['city', 'jungle', 'desert', 'snow', 'neon', 'beach'];
      const reachedCount = Math.floor(Math.max(0, merged.bestScore ?? 0) / 40) + 1;
      for (let i = 0; i < Math.min(reachedCount, worldRotation.length); i++) {
        const wid = worldRotation[i];
        if (!merged.unlockedWorlds.includes(wid)) {
          merged.unlockedWorlds.push(wid);
        }
      }
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

  unlockWorld(id: string): boolean {
    this.data.unlockedWorlds ??= ['city'];
    if (!this.data.unlockedWorlds.includes(id)) {
      this.data.unlockedWorlds.push(id);
      this.save();
      return true;
    }
    return false;
  }
}
