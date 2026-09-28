/**
 * Daily Streak Configuration & Reward Milestones.
 *
 * Rewards players for logging in consecutively every day.
 * 7-day cyclical calendar with scaling bonuses, culminating in a
 * Day 7 Legendary Crown milestone.
 */

export interface StreakRewardTier {
  day: number;
  coins: number;
  title: string;
  desc: string;
  isMilestone?: boolean;
}

export const STREAK_CYCLE_DAYS = 7;

export const STREAK_REWARDS: StreakRewardTier[] = [
  { day: 1, coins: 50, title: 'Day 1 Spark', desc: 'Welcome back! Daily journey begins.' },
  { day: 2, coins: 75, title: 'Day 2 Momentum', desc: 'Two in a row! Keep hopping.' },
  { day: 3, coins: 100, title: 'Day 3 Hot Streak', desc: 'On fire! Gold bonus earned.' },
  { day: 4, coins: 150, title: 'Day 4 Blazing', desc: 'Four days strong! Unstoppable.' },
  { day: 5, coins: 200, title: 'Day 5 Champion', desc: 'Five-day master hopper!' },
  { day: 6, coins: 300, title: 'Day 6 Elite', desc: 'Almost at the peak! Huge coin boost.' },
  { day: 7, coins: 500, title: 'Day 7 Legendary', desc: '7-Day Grand Champion jackpot!', isMilestone: true },
];

/**
 * Get reward tier for a given streak day count (cycles or scales cleanly past day 7).
 */
export function getStreakReward(streakDay: number): StreakRewardTier {
  const safeDay = Math.max(1, streakDay);
  const cycleIndex = ((safeDay - 1) % STREAK_CYCLE_DAYS);
  const base = STREAK_REWARDS[cycleIndex];
  
  if (safeDay > STREAK_CYCLE_DAYS) {
    const cycleCount = Math.floor((safeDay - 1) / STREAK_CYCLE_DAYS);
    const bonus = Math.min(250, cycleCount * 50);
    return {
      day: safeDay,
      coins: base.coins + bonus,
      title: `Day ${safeDay} Master`,
      desc: `Incredible ${safeDay}-day consecutive streak!`,
      isMilestone: (safeDay % STREAK_CYCLE_DAYS === 0),
    };
  }
  return base;
}

/**
 * Returns formatted calendar items for the active 7-day display cycle.
 */
export function getActiveStreakCycle(currentStreak: number, claimedToday: boolean): Array<{
  dayNum: number;
  tier: StreakRewardTier;
  status: 'claimed' | 'today-unclaimed' | 'today-claimed' | 'upcoming';
}> {
  const safeStreak = Math.max(1, currentStreak);
  const currentCycle = Math.floor((safeStreak - 1) / STREAK_CYCLE_DAYS);
  const startDay = currentCycle * STREAK_CYCLE_DAYS + 1;

  const result = [];
  for (let i = 0; i < STREAK_CYCLE_DAYS; i++) {
    const dayNum = startDay + i;
    const tier = getStreakReward(dayNum);
    let status: 'claimed' | 'today-unclaimed' | 'today-claimed' | 'upcoming' = 'upcoming';

    if (dayNum < safeStreak) {
      status = 'claimed';
    } else if (dayNum === safeStreak) {
      status = claimedToday ? 'today-claimed' : 'today-unclaimed';
    } else {
      status = 'upcoming';
    }

    result.push({ dayNum, tier, status });
  }
  return result;
}
