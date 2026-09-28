/**
 * Daily Streak Tracking & Rewards Engine.
 *
 * Tracks consecutive daily logins, updates streak counts, handles missed-day
 * resets gracefully, manages the 7-day cyclical reward calendar, and awards
 * generous coin bonuses when claimed.
 */
import { getTodayDateString } from '../config/dailyMissions.config';
import { getStreakReward, getActiveStreakCycle, type StreakRewardTier } from '../config/streak.config';
import type { DailyStreakSave } from '../save/SaveData';
import type { SaveManager } from '../save/SaveManager';
import type { EventBus } from '../core/EventBus';

export interface StreakLoginResult {
  currentStreak: number;
  bestStreak: number;
  isNewDay: boolean;
  canClaim: boolean;
  daysDifference: number;
  resetOccurred: boolean;
  rewardTier: StreakRewardTier;
}

export interface StreakClaimResult {
  success: boolean;
  reward: number;
  day: number;
  coinsTotal: number;
  title: string;
}

/**
 * Calculates calendar day difference between two YYYY-MM-DD strings.
 */
function getDaysDifference(lastDateStr: string, todayStr: string): number {
  if (!lastDateStr) return -1;
  try {
    const [y1, m1, d1] = lastDateStr.split('-').map(Number);
    const [y2, m2, d2] = todayStr.split('-').map(Number);
    if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return -1;
    const d1Utc = Date.UTC(y1, m1 - 1, d1);
    const d2Utc = Date.UTC(y2, m2 - 1, d2);
    return Math.round((d2Utc - d1Utc) / (1000 * 60 * 60 * 24));
  } catch {
    return -1;
  }
}

export class StreakSystem {
  constructor(
    private readonly save: SaveManager,
    private readonly bus: EventBus,
  ) {}

  /**
   * Initializes and evaluates the login streak for today.
   * Called once during game startup / boot.
   */
  checkLoginStreak(): StreakLoginResult {
    const s = this.save.data;
    const today = getTodayDateString();
    const streak = s.streak;

    let isNewDay = false;
    let resetOccurred = false;
    const daysDiff = getDaysDifference(streak.lastLoginDate, today);

    if (!streak.lastLoginDate) {
      // First time playing
      streak.currentStreak = 1;
      streak.bestStreak = 1;
      streak.lastLoginDate = today;
      streak.lastClaimDate = '';
      streak.claimedToday = false;
      streak.totalDaysLogged = 1;
      isNewDay = true;
      this.save.save();
    } else if (daysDiff === 0) {
      // Already logged in today
      streak.claimedToday = (streak.lastClaimDate === today);
      isNewDay = false;
    } else if (daysDiff === 1) {
      // Consecutive login yesterday -> today!
      streak.currentStreak += 1;
      streak.bestStreak = Math.max(streak.bestStreak, streak.currentStreak);
      streak.lastLoginDate = today;
      streak.claimedToday = (streak.lastClaimDate === today);
      streak.totalDaysLogged += 1;
      isNewDay = true;
      this.save.save();
    } else if (daysDiff > 1) {
      // Missed at least one day -> streak resets to 1
      streak.currentStreak = 1;
      streak.lastLoginDate = today;
      streak.claimedToday = (streak.lastClaimDate === today);
      streak.totalDaysLogged += 1;
      isNewDay = true;
      resetOccurred = true;
      this.save.save();
    } else {
      // Clock skew or same day fallback
      streak.claimedToday = (streak.lastClaimDate === today);
    }

    // Check streak achievements
    if (streak.currentStreak >= 3 && !s.achievements['streak3']) {
      s.achievements['streak3'] = true;
      this.save.save();
      this.bus.emit('achievementUnlocked', 'streak3');
    }
    if (streak.currentStreak >= 7 && !s.achievements['streak7']) {
      s.achievements['streak7'] = true;
      this.save.save();
      this.bus.emit('achievementUnlocked', 'streak7');
    }

    const canClaim = this.canClaimToday();
    const rewardTier = getStreakReward(streak.currentStreak);

    this.bus.emit('streakUpdated', streak);

    return {
      currentStreak: streak.currentStreak,
      bestStreak: streak.bestStreak,
      isNewDay,
      canClaim,
      daysDifference: daysDiff,
      resetOccurred,
      rewardTier,
    };
  }

  /**
   * Can the player claim today's streak reward?
   */
  canClaimToday(): boolean {
    const s = this.save.data.streak;
    const today = getTodayDateString();
    return s.lastClaimDate !== today;
  }

  /**
   * Claim today's streak reward. Adds coins to save data, updates claim date,
   * emits notification and audio events.
   */
  claimReward(): StreakClaimResult {
    const s = this.save.data;
    const today = getTodayDateString();

    if (!this.canClaimToday()) {
      const tier = getStreakReward(s.streak.currentStreak);
      return {
        success: false,
        reward: 0,
        day: s.streak.currentStreak,
        coinsTotal: s.coins,
        title: tier.title,
      };
    }

    const tier = getStreakReward(s.streak.currentStreak);
    s.coins += tier.coins;
    s.totalCoins += tier.coins;
    s.streak.lastClaimDate = today;
    s.streak.claimedToday = true;
    this.save.save();

    this.bus.emit('streakClaimed', {
      day: s.streak.currentStreak,
      reward: tier.coins,
    });
    this.bus.emit('streakUpdated', s.streak);
    this.bus.emit('coinCollected');

    return {
      success: true,
      reward: tier.coins,
      day: s.streak.currentStreak,
      coinsTotal: s.coins,
      title: tier.title,
    };
  }

  /**
   * Get active streak data snapshot.
   */
  getStreak(): DailyStreakSave {
    return this.save.data.streak;
  }

  /**
   * Get current 7-day cycle cards.
   */
  getCycleCards() {
    const streak = this.save.data.streak;
    return getActiveStreakCycle(streak.currentStreak, !this.canClaimToday());
  }

  /**
   * Current streak count.
   */
  get currentStreak(): number {
    return Math.max(1, this.save.data.streak.currentStreak);
  }

  /**
   * All-time best streak count.
   */
  get bestStreak(): number {
    return Math.max(1, this.save.data.streak.bestStreak);
  }
}
