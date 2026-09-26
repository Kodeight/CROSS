/**
 * Run coin counter, superpower ability slot & active-world notch.
 */
import type { SaveManager } from '../save/SaveManager';
import type { WorldConfig } from '../config/worlds.config';
import type { PowerUpSystem } from '../gameplay/PowerUpSystem';
import { fmtCount } from '../utils/Format';
import { applyWorldNotch, worldCompletionPct } from './worldNotch';

export class HUD {
  private powerBtn: HTMLElement | null = null;
  private powerSym: HTMLElement | null = null;
  private powerTxt: HTMLElement | null = null;

  constructor(
    private readonly save: SaveManager,
    private readonly powerups?: PowerUpSystem,
    private readonly getRunCoins: () => number = () => 0,
    private readonly getActiveWorld: () => WorldConfig | null = () => null,
    private readonly getRunMaxLane: () => number = () => 0,
    private readonly getRunStartLane: () => number = () => 0,
    private readonly getPlayerLane: () => number = () => 0,
    private readonly onActivatePower?: () => void,
  ) {
    this.powerBtn = document.getElementById('hud-power');
    this.powerSym = document.getElementById('hud-power-sym');
    this.powerTxt = document.getElementById('hud-power-txt');
    if (this.powerBtn && onActivatePower) {
      this.powerBtn.onclick = (e) => {
        e.stopPropagation();
        onActivatePower();
      };
    }
  }

  update(): void {
    const set = (id: string, v: string) => {
      const e = document.getElementById(id);
      if (e) e.textContent = v;
    };
    // Wallet + this run's unbanked coins: the counter moves on every pickup.
    set('hud-coins-val', fmtCount(this.save.data.coins + this.getRunCoins()));
    this.updateWorldNotch();
    this.updatePowerUp();
  }

  /** Live superpower indicator and countdown */
  updatePowerUp(): void {
    if (!this.powerBtn || !this.powerups) return;
    const now = performance.now();
    const active = this.powerups.activePower;
    const ready = this.powerups.readyPower;

    if (active) {
      this.powerBtn.hidden = false;
      this.powerBtn.classList.add('power-active');
      const prog = Math.ceil(this.powerups.getActiveProgress(now) * 100);
      if (this.powerSym) this.powerSym.textContent = active.symbol;
      if (this.powerTxt) this.powerTxt.textContent = `${active.name} · ${prog}%`;
    } else if (ready) {
      this.powerBtn.hidden = false;
      this.powerBtn.classList.remove('power-active');
      if (this.powerSym) this.powerSym.textContent = ready.symbol;
      if (this.powerTxt) this.powerTxt.textContent = `${ready.name} (TAP/SPACE)`;
    } else {
      this.powerBtn.hidden = true;
      this.powerBtn.classList.remove('power-active');
    }
  }

  /** Notch always mirrors WorldManager.current, never a stale copy. */
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
