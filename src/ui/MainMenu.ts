/** Main menu stats + world progress header. */
import { WORLD_LENGTH } from '../config/worlds.config';
import type { SaveManager } from '../save/SaveManager';
import type { WorldManager } from '../world/WorldManager';

export class MainMenu {
  constructor(private readonly save: SaveManager, private readonly worlds: WorldManager) {}

  render(): void {
    const set = (id: string, v: string) => {
      const e = document.getElementById(id);
      if (e) e.textContent = v;
    };
    set('menu-best', String(this.save.data.bestScore));
    set('menu-coins', String(this.save.data.coins));
    try {
      const w = this.worlds.byId(this.save.data.selectedWorld).config;
      set('wh-num', `WORLD ${w.num}`);
      set('wh-name', w.name);
      const best = this.save.data.worldBest[w.id] ?? 0;
      const pct = Math.min(100, Math.round((best / WORLD_LENGTH) * 100));
      const fill = document.getElementById('wh-fill');
      if (fill) fill.style.width = `${pct}%`;
      set('wh-pct', `${pct}%`);
    } catch { /* ignore */ }
  }
}
