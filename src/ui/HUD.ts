/** Score / best / coins HUD. */
import type { SaveManager } from '../save/SaveManager';

export class HUD {
  constructor(private readonly save: SaveManager, private readonly getScore: () => number) {}

  update(): void {
    const set = (id: string, v: string) => {
      const e = document.getElementById(id);
      if (e) e.textContent = v;
    };
    set('hud-coins-val', String(this.save.data.coins));
  }
}
