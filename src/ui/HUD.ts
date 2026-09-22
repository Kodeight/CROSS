/** Run coin counter: wallet + this run's unbanked pickups. */
import type { SaveManager } from '../save/SaveManager';
import { fmtCount } from '../utils/Format';

export class HUD {
  constructor(
    private readonly save: SaveManager,
    private readonly getRunCoins: () => number = () => 0,
  ) {}

  update(): void {
    const set = (id: string, v: string) => {
      const e = document.getElementById(id);
      if (e) e.textContent = v;
    };
    // Wallet + this run's unbanked coins: the counter moves on every pickup.
    set('hud-coins-val', fmtCount(this.save.data.coins + this.getRunCoins()));
  }
}
