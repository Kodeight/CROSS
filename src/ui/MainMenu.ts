/** Main menu stats. World notch is owned by HUD/worldNotch — never duplicated here. */
import { fmtCount } from '../utils/Format';
import type { SaveManager } from '../save/SaveManager';
import type { StreakSystem } from '../gameplay/StreakSystem';

export class MainMenu {
  constructor(
    private readonly save: SaveManager,
    private readonly streak?: StreakSystem,
  ) {}

  render(): void {
    const set = (id: string, v: string) => {
      const e = document.getElementById(id);
      if (e) e.textContent = v;
    };
    // Menus show the full exact integer (HUD alone uses compact fmtCount).
    const exactCoins = String(Math.floor(this.save.data.coins));
    set('menu-best', fmtCount(this.save.data.bestScore));
    set('menu-coins', exactCoins);
    set('menu-top-coins', exactCoins);

    const currentStreak = Math.max(1, this.save.data.streak?.currentStreak ?? 1);
    const dayWord = currentStreak === 1 ? 'DAY' : 'DAYS';
    set('menu-streak', `${currentStreak} ${dayWord}`);
    set('menu-top-streak-count', `${currentStreak}`);

    const canClaim = this.streak ? this.streak.canClaimToday() : !this.save.data.streak?.claimedToday;
    
    const topBadge = document.getElementById('menu-top-streak-badge');
    if (topBadge) topBadge.hidden = !canClaim;

    const streakDot = document.getElementById('menu-streak-claim-tag');
    if (streakDot) streakDot.hidden = !canClaim;

    const topPill = document.getElementById('menu-top-streak');
    if (topPill) {
      if (canClaim) topPill.classList.add('can-claim');
      else topPill.classList.remove('can-claim');
    }

    const streakStat = document.getElementById('menu-stat-streak');
    if (streakStat) {
      if (canClaim) streakStat.classList.add('can-claim');
      else streakStat.classList.remove('can-claim');
    }
  }
}

