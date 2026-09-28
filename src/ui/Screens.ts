/** Missions + settings screens. Pure DOM, driven by save data. World-aware. */
import { MISSIONS, ACHIEVEMENTS } from '../config/missions.config';
import {
  getActiveDailyMissions,
  getDailyResetCountdown,
} from '../config/dailyMissions.config';
import {
  DIFFICULTY_LEVELS,
  getDifficultySpec,
} from '../config/difficulty.config';
import { getStreakReward } from '../config/streak.config';
import type { SaveManager } from '../save/SaveManager';
import type { AudioManager } from '../audio/AudioManager';
import type { StreakSystem } from '../gameplay/StreakSystem';
import type { QualityLevel } from '../config/game.config';
import { liquidUI } from './liquidUI';

const COIN_HTML = '<span class="coin-ico sm" aria-hidden="true"><span class="coin-ico-face"><span class="coin-ico-core"></span></span></span>';

function createMissionCard(
  title: string,
  desc: string,
  progressRatioStr: string,
  currentVal: number,
  targetVal: number,
  rewardVal: number,
  isDone: boolean,
  isLocked: boolean,
  categoryTag?: string,
  tierTag?: string
): HTMLElement {
  const card = document.createElement('div');
  card.className = `m-card${isDone ? ' done' : ''}${isLocked ? ' locked' : ''}`;

  const pct = isDone ? 100 : targetVal > 0 ? Math.min(100, Math.max(0, Math.round((currentVal / targetVal) * 100))) : 0;

  let badgeHtml = '';
  if (isDone) {
    badgeHtml = `<div class="m-done-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> DONE</div>`;
  } else if (isLocked) {
    badgeHtml = `<div class="m-locked-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> LOCKED</div>`;
  } else {
    badgeHtml = `<div class="m-reward-pill">${COIN_HTML}<span class="m-reward-val">+${rewardVal}</span></div>`;
  }

  card.innerHTML = `
    <div class="m-card-top">
      <div class="m-details">
        <div class="m-title">${title}</div>
        <div class="m-sub">${desc}</div>
        ${categoryTag ? `<div class="m-tags"><span class="m-world-tag">${categoryTag.toUpperCase()}</span>${tierTag ? `<span class="m-tier-tag tier-${tierTag}">${tierTag.toUpperCase()}</span>` : ''}</div>` : ''}
      </div>
      ${badgeHtml}
    </div>
    <div class="m-card-bottom">
      <div class="m-prog-track">
        <div class="m-prog-bar${isDone ? ' bar-done' : ''}" style="width: ${pct}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;font-weight:900;color:#8a8f99;margin-top:2px;">
        <span>${isDone ? 'COMPLETED' : progressRatioStr}</span>
        <span>${pct}%</span>
      </div>
    </div>
  `;
  return card;
}

export class MissionsScreen {
  constructor(
    private readonly save: SaveManager,
    private readonly streak?: StreakSystem,
    private readonly audio?: AudioManager,
    private readonly onToast?: (msg: string) => void,
    private readonly onStateChanged?: () => void,
  ) {}

  render(maxLane: number, nearMiss: number, activeWorldId?: string, runCoins = 0): void {
    // 0. Render Daily Streak Tracking System
    this.renderStreakSection(maxLane, nearMiss, activeWorldId, runCoins);

    const ml = document.getElementById('missions-list');
    if (ml) {
      ml.innerHTML = '';
      const run = { maxLane, nearMiss };
      const worldId = activeWorldId ?? this.save.data.selectedWorld;
      for (const m of MISSIONS) {
        if (m.worldId && m.worldId !== worldId) continue;
        const done = !!this.save.data.missions[m.id];
        const locked = !done && (m.requires?.some((id) => !this.save.data.missions[id]) ?? false);
        const progressStr = done ? `DONE +${m.reward}` : locked ? 'LOCKED' : m.progress(run, this.save.data.totalCoins);

        const card = createMissionCard(
          (m.worldId ? `[${m.worldId.toUpperCase()}] ` : '') + m.name,
          m.worldId ? `World Mission (${m.worldId})` : 'Global Milestone',
          progressStr,
          done ? 100 : 0,
          100,
          m.reward,
          done,
          locked,
          m.worldId || 'global',
          m.tier ? `tier-${m.tier}` : undefined
        );
        ml.appendChild(card);
      }
    }

    const al = document.getElementById('ach-list');
    if (al) {
      al.innerHTML = '';
      for (const a of ACHIEVEMENTS) {
        const done = !!this.save.data.achievements[a.id];
        const card = createMissionCard(
          a.name,
          a.desc ?? 'Achievement Milestone',
          done ? 'COMPLETED' : 'IN PROGRESS',
          done ? 1 : 0,
          1,
          250,
          done,
          false,
          'achievement'
        );
        al.appendChild(card);
      }
    }

    try {
      const timer = document.getElementById('daily-timer');
      if (timer) timer.textContent = getDailyResetCountdown();
      const dl = document.getElementById('daily-missions-list');
      if (dl) {
        dl.innerHTML = '';
        const daily = this.save.data.dailyMissions;
        const runState = { maxLane, nearMiss, runCoins };
        if (daily) {
          const active = getActiveDailyMissions(daily.date);
          let completedCount = 0;
          for (const dm of active) {
            if (daily.completed[dm.id]) completedCount++;
          }
          for (const dm of active) {
            const done = !!daily.completed[dm.id];
            let label = '';
            let cur = 0;
            let target = 1;
            try {
              const res = dm.getProgress(daily.progress, runState, completedCount);
              label = res.formatted;
              cur = res.current;
              target = res.target;
            } catch {
              label = done ? 'DONE' : '—';
              cur = done ? 1 : 0;
              target = 1;
            }

            const card = createMissionCard(
              dm.title,
              dm.title,
              label,
              cur,
              target,
              dm.reward,
              done,
              false,
              'daily'
            );
            dl.appendChild(card);
          }
        }
      }
    } catch { /* daily list is additive — never break the screen */ }
    liquidUI.refresh();
  }

  private renderStreakSection(maxLane: number, nearMiss: number, activeWorldId?: string, runCoins = 0): void {
    try {
      const streakData = this.save.data.streak;
      const currentStreak = Math.max(1, streakData?.currentStreak ?? 1);
      const bestStreak = Math.max(1, streakData?.bestStreak ?? 1);
      const canClaim = this.streak ? this.streak.canClaimToday() : !streakData?.claimedToday;
      const tier = getStreakReward(currentStreak);

      const daysNumEl = document.getElementById('streak-days-num');
      if (daysNumEl) daysNumEl.textContent = String(currentStreak);

      const bestNumEl = document.getElementById('streak-best-num');
      if (bestNumEl) bestNumEl.textContent = String(bestStreak);

      const resetTimerEl = document.getElementById('streak-reset-timer');
      if (resetTimerEl) resetTimerEl.textContent = getDailyResetCountdown();

      const statusTextEl = document.getElementById('streak-status-text');
      if (statusTextEl) {
        if (canClaim) {
          statusTextEl.textContent = `Day ${currentStreak} reward is ready! Claim +${tier.coins} coins now.`;
        } else {
          statusTextEl.textContent = `Today's reward claimed! Come back tomorrow for Day ${currentStreak + 1}.`;
        }
      }

      // Claim button
      const claimBtn = document.getElementById('btn-claim-streak') as HTMLButtonElement | null;
      if (claimBtn) {
        if (canClaim) {
          claimBtn.className = 'btn primary streak-claim-btn can-claim';
          claimBtn.innerHTML = `CLAIM +${tier.coins} ${COIN_HTML}`;
          claimBtn.disabled = false;
        } else {
          claimBtn.className = 'btn streak-claim-btn is-claimed';
          claimBtn.innerHTML = `CLAIMED <span class="claim-check">✓</span>`;
          claimBtn.disabled = true;
        }

        if (!(claimBtn as unknown as { _bound?: boolean })._bound) {
          (claimBtn as unknown as { _bound?: boolean })._bound = true;
          claimBtn.addEventListener('click', () => {
            if (!this.streak || !this.streak.canClaimToday()) return;
            const res = this.streak.claimReward();
            if (res.success) {
              this.audio?.coin();
              this.audio?.fanfare();
              this.onToast?.(`🔥 DAY ${res.day} STREAK CLAIMED! (+${res.reward} COINS)`);
              this.onStateChanged?.();
              this.render(maxLane, nearMiss, activeWorldId, runCoins);
            }
          });
        }
      }

      // 7-day cyclical calendar row
      const calRow = document.getElementById('streak-calendar-row');
      if (calRow && this.streak) {
        calRow.innerHTML = '';
        const cards = this.streak.getCycleCards();
        for (const c of cards) {
          const tile = document.createElement('div');
          tile.className = `streak-tile tile-${c.status}${c.tier.isMilestone ? ' milestone' : ''}`;
          
          let statusBadge = '';
          if (c.status === 'claimed' || c.status === 'today-claimed') {
            statusBadge = '<span class="tile-check" aria-label="Claimed">✓</span>';
          } else if (c.status === 'today-unclaimed') {
            statusBadge = '<span class="tile-flame" aria-label="Ready to claim">🔥</span>';
          } else if (c.tier.isMilestone) {
            statusBadge = '<span class="tile-crown" aria-label="Jackpot">👑</span>';
          } else {
            statusBadge = '<span class="tile-lock" aria-label="Upcoming">🔒</span>';
          }

          tile.innerHTML = `
            <div class="tile-day-lbl">D${c.dayNum}</div>
            <div class="tile-icon-wrap">${statusBadge}</div>
            <div class="tile-reward-val">+${c.tier.coins}</div>
          `;
          calRow.appendChild(tile);
        }
      }
    } catch (err) {
      console.warn('Daily streak calendar rendering fallback:', err);
    }
  }
}

export class SettingsScreen {
  constructor(
    private readonly save: SaveManager,
    private readonly audio: AudioManager,
    private readonly onChanged: (what: 'music' | 'sfx' | 'motion' | 'quality' | 'difficulty' | 'reset' | 'tutorial') => void,
  ) {}

  render(): void {
    const s = this.save.data.settings;
    const set = (id: string, text: string, pressed: string) => {
      const e = document.getElementById(id);
      if (e) {
        e.textContent = text;
        e.setAttribute('aria-pressed', pressed);
      }
    };
    set('set-music', s.music ? 'ON' : 'OFF', String(s.music));
    set('set-sfx', s.sfx ? 'ON' : 'OFF', String(s.sfx));
    set('set-motion', s.reducedMotion ? 'ON' : 'OFF', String(s.reducedMotion));
    set('set-quality', s.quality.toUpperCase(), 'false');
    set('set-difficulty', getDifficultySpec(s.difficulty).name, 'false');
    const explain = document.getElementById('difficulty-explain');
    if (explain) explain.textContent = getDifficultySpec(s.difficulty).description;

    const mVol = Math.round((s.musicVolume ?? 0.8) * 100);
    const sVol = Math.round((s.sfxVolume ?? 0.8) * 100);
    const mInput = document.getElementById('set-music-vol') as HTMLInputElement | null;
    const sInput = document.getElementById('set-sfx-vol') as HTMLInputElement | null;
    const mVal = document.getElementById('set-music-vol-val');
    const sVal = document.getElementById('set-sfx-vol-val');
    if (mInput) mInput.value = String(mVol);
    if (sInput) sInput.value = String(sVol);
    if (mVal) mVal.textContent = `${mVol}%`;
    if (sVal) sVal.textContent = `${sVol}%`;
  }

  bind(): void {
    const on = (id: string, fn: () => void) => {
      const e = document.getElementById(id);
      if (e && !(e as unknown as { _bound?: boolean })._bound) {
        (e as unknown as { _bound?: boolean })._bound = true;
        e.addEventListener('click', fn);
      }
    };
    on('set-music', () => {
      const s = this.save.data.settings;
      s.music = !s.music;
      this.save.save();
      this.render();
      this.audio.click();
      this.onChanged('music');
    });
    on('set-sfx', () => {
      const s = this.save.data.settings;
      s.sfx = !s.sfx;
      this.save.save();
      this.render();
      this.audio.click();
      this.onChanged('sfx');
    });

    const mInput = document.getElementById('set-music-vol') as HTMLInputElement | null;
    if (mInput && !(mInput as unknown as { _bound?: boolean })._bound) {
      (mInput as unknown as { _bound?: boolean })._bound = true;
      mInput.addEventListener('input', () => {
        const val = Number(mInput.value) / 100;
        this.save.data.settings.musicVolume = val;
        this.save.save();
        const mVal = document.getElementById('set-music-vol-val');
        if (mVal) mVal.textContent = `${Math.round(val * 100)}%`;
        this.audio.updateVolumes();
      });
    }

    const sInput = document.getElementById('set-sfx-vol') as HTMLInputElement | null;
    if (sInput && !(sInput as unknown as { _bound?: boolean })._bound) {
      (sInput as unknown as { _bound?: boolean })._bound = true;
      sInput.addEventListener('input', () => {
        const val = Number(sInput.value) / 100;
        this.save.data.settings.sfxVolume = val;
        this.save.save();
        const sVal = document.getElementById('set-sfx-vol-val');
        if (sVal) sVal.textContent = `${Math.round(val * 100)}%`;
        this.audio.updateVolumes();
      });
      sInput.addEventListener('change', () => {
        this.audio.click();
      });
    }
    on('set-motion', () => {
      const s = this.save.data.settings;
      s.reducedMotion = !s.reducedMotion;
      this.save.save();
      this.render();
      this.audio.click();
      this.onChanged('motion');
    });
    const quals: QualityLevel[] = ['AUTO', 'LOW', 'MEDIUM', 'HIGH'];
    on('set-quality', () => {
      const s = this.save.data.settings;
      s.quality = quals[(quals.indexOf(s.quality) + 1) % quals.length];
      this.save.save();
      this.render();
      this.audio.click();
      this.onChanged('quality');
    });
    on('set-difficulty', () => {
      const s = this.save.data.settings;
      s.difficulty = DIFFICULTY_LEVELS[(DIFFICULTY_LEVELS.indexOf(s.difficulty) + 1) % DIFFICULTY_LEVELS.length];
      this.save.save();
      this.render();
      this.audio.click();
      this.onChanged('difficulty');
    });
    on('btn-reset-save', () => {
      if (window.confirm('Reset all CROSS! progress?')) {
        this.onChanged('reset');
      }
    });
    on('btn-replay-tutorial', () => {
      this.audio.click();
      this.onChanged('tutorial');
    });
  }
}
