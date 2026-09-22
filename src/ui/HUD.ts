/** Score / best / coins HUD. */
import type { SaveManager } from '../save/SaveManager';

export class HUD {
  constructor(private readonly save: SaveManager, private readonly getScore: () => number) {}

  update(): void {
    const s = this.getScore();
    const best = Math.max(this.save.data.bestScore, s);
    const set = (id: string, v: string) => {
      const e = document.getElementById(id);
      if (e) e.textContent = v;
    };
    set('hud-score', String(s));
    set('hud-best', `BEST ${best}`);
    set('hud-coins', String(this.save.data.coins));
  }
}
