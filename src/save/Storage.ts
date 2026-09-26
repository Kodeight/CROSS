/** localStorage wrapper — the game keeps working when storage is unavailable. */

export class Storage {
  private memory = new Map<string, string>();
  readonly available: boolean;

  constructor() {
    let ok = false;
    try {
      const probe = '__cross_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      ok = true;
    } catch {
      ok = false;
    }
    this.available = ok;
  }

  get(key: string): string | null {
    try {
      if (this.available) return localStorage.getItem(key);
      return this.memory.get(key) ?? null;
    } catch {
      return this.memory.get(key) ?? null;
    }
  }

  set(key: string, value: string): void {
    try {
      if (this.available) localStorage.setItem(key, value);
      else this.memory.set(key, value);
    } catch {
      try {
        this.memory.set(key, value);
      } catch {
        /* ignore */
      }
    }
  }

  remove(key: string): void {
    try {
      if (this.available) localStorage.removeItem(key);
      else this.memory.delete(key);
    } catch {
      /* ignore */
    }
  }
}
