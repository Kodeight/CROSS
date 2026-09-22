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
      } as SaveData;
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
    return TESTING_MODE === true;
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
}
