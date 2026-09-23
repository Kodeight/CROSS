/** Main menu stats. World notch is owned by HUD/worldNotch — never duplicated here. */
import { fmtCount, formatMenuCoins } from '../utils/Format';
import type { SaveManager } from '../save/SaveManager';

export class MainMenu {
  constructor(private readonly save: SaveManager) {}

  render(): void {
    const set = (id: string, v: string) => {
      const e = document.getElementById(id);
      if (e) e.textContent = v;
    };
    set('menu-best', fmtCount(this.save.data.bestScore));
    set('menu-coins', formatMenuCoins(this.save.data.coins));
  }
}
