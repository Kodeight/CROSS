/** Run coin counter + active-world notch: wallet, run pickups, live world state. */
import type { SaveManager } from '../save/SaveManager';
import type { WorldConfig } from '../config/worlds.config';
import { fmtCount } from '../utils/Format';
import { applyWorldNotch, worldCompletionPct } from './worldNotch';

export class HUD {
  constructor(
    private readonly save: SaveManager,
    private readonly getRunCoins: () => number = () => 0,
    private readonly getActiveWorld: () => WorldConfig | null = () => null,
    private readonly getRunMaxLane: () => number = () => 0,
    private readonly getRunStartLane: () => number = () => 0,
    private readonly getPlayerLane: () => number = () => 0,
  ) {}

  update(): void {
    const set = (id: string, v: string) => {
      const e = document.getElementById(id);
      if (e) e.textContent = v;
    };
    // Wallet + this run's unbanked coins: the counter moves on every pickup.
    set('hud-coins-val', fmtCount(this.save.data.coins + this.getRunCoins()));
    this.updateWorldNotch();
  }

  /** §13–§17 — notch always mirrors WorldManager.current, never a stale copy. */
  updateWorldNotch(): void {
    try {
      const w = this.getActiveWorld();
      if (!w) return;
      const pct = worldCompletionPct(
        this.save.data,
        w,
        this.getRunMaxLane(),
        this.getRunStartLane(),
        this.getPlayerLane(),
        w.id,
      );
      applyWorldNotch(w, pct);
    } catch { /* ignore */ }
  }
}
