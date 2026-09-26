/**
 * Missions, Achievements & Settings screens.
 * Rich, gamified UI with animated progress bars, category icons,
 * reward badges, and world-aware objectives.
 */
import { MISSIONS, ACHIEVEMENTS, type MissionDef, type RunSummary } from '../config/missions.config';
import {
  getActiveDailyMissions,
  getDailyResetCountdown,
  getTodayDateString,
  type DailyMissionDef,
} from '../config/dailyMissions.config';
import { defaultDailyProgress } from '../save/SaveData';
import type { SaveManager } from '../save/SaveManager';
import type { AudioManager } from '../audio/AudioManager';
import type { QualityLevel } from '../config/game.config';
import { liquidUI } from './liquidUI';

// SVG Icons for mission categories & rewards
const ICONS = {
  coin: `<svg class="m-icon-coin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#FFC93C" stroke="#D48B00" stroke-width="2"/><circle cx="12" cy="12" r="6.5" fill="#FFE082" stroke="#D48B00" stroke-width="1.5"/><text x="12" y="15.5" font-family="'Bungee', sans-serif" font-size="10" font-weight="900" fill="#B26A00" text-anchor="middle">C</text></svg>`,
  check: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  lock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  trophy: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1c1.8-.4 3.23-1.82 3.61-3.06C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>`,
  steps: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  target: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  star: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  globe: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  clock: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
};

export class MissionsScreen {
  constructor(private readonly save: SaveManager) {}

  private getCategoryIcon(category: string): string {
    switch (category) {
      case 'steps':
      case 'runLane':
        return ICONS.steps;
      case 'coins':
      case 'runCoins':
        return ICONS.coin;
      case 'nearMiss':
      case 'finesse':
        return ICONS.target;
      case 'world':
        return ICONS.globe;
      default:
        return ICONS.star;
    }
  }

  render(maxLane: number, nearMiss: number, activeWorldId?: string, runCoins = 0): void {
    const dt = document.getElementById('daily-timer');
    if (dt) {
      dt.innerHTML = `${ICONS.clock} <span>${getDailyResetCountdown()}</span>`;
    }

    // 1. Daily Missions
    const dml = document.getElementById('daily-missions-list');
    if (dml) {
      dml.innerHTML = '';
      const s = this.save.data;
      const today = getTodayDateString();
      if (!s.dailyMissions || s.dailyMissions.date !== today) {
        s.dailyMissions = {
          date: today,
          completed: {},
          progress: defaultDailyProgress(),
        };
        this.save.save();
      }

      const activeDaily = getActiveDailyMissions(s.dailyMissions.date);
      const runState = { maxLane, nearMiss, runCoins };
      let completedCount = 0;
      for (const dm of activeDaily) {
        if (s.dailyMissions.completed[dm.id]) completedCount++;
      }

      // Summary Progress Card at top of Daily Missions
      const summaryCard = document.createElement('div');
      summaryCard.className = 'daily-summary-card';
      const pct = Math.round((completedCount / activeDaily.length) * 100);
      summaryCard.innerHTML = `
        <div class="summary-info">
          <span class="summary-label">DAILY OBJECTIVES</span>
          <span class="summary-count"><strong>${completedCount}</strong> / ${activeDaily.length} COMPLETED</span>
        </div>
        <div class="m-prog-track">
          <div class="m-prog-bar" style="width: ${pct}%"></div>
        </div>
      `;
      dml.appendChild(summaryCard);

      // Render Individual Daily Cards
      for (const dm of activeDaily) {
        const done = !!s.dailyMissions.completed[dm.id];
        const prog = dm.getProgress(s.dailyMissions.progress, runState, completedCount);
        const cardPct = Math.min(100, Math.max(0, Math.round((prog.current / prog.target) * 100)));
        const iconSvg = this.getCategoryIcon(dm.category);

        const card = document.createElement('div');
        card.className = `m-card daily ${done ? 'done' : ''}`;

        card.innerHTML = `
          <div class="m-card-top">
            <div class="m-badge-icon cat-${dm.category}">${iconSvg}</div>
            <div class="m-details">
              <div class="m-title">${dm.title}</div>
              <div class="m-sub">DAILY CHALLENGE</div>
            </div>
            <div class="m-reward-pill ${done ? 'reward-done' : ''}">
              ${done ? `<span class="m-done-badge">${ICONS.check} DONE</span>` : `${ICONS.coin} <span class="m-reward-val">+${dm.reward}</span>`}
            </div>
          </div>
          <div class="m-card-bottom">
            <div class="m-prog-track">
              <div class="m-prog-bar ${done ? 'bar-done' : ''}" style="width: ${done ? 100 : cardPct}%"></div>
            </div>
            <div class="m-prog-meta">
              <span class="m-prog-txt">${done ? 'COMPLETED' : `${prog.formatted}`}</span>
              <span class="m-prog-pct">${done ? '100%' : `${cardPct}%`}</span>
            </div>
          </div>
        `;
        dml.appendChild(card);
      }
    }

    // 2. World & Global Missions
    const ml = document.getElementById('missions-list');
    if (ml) {
      ml.innerHTML = '';
      const run: RunSummary = { maxLane, nearMiss };
      const worldId = activeWorldId ?? this.save.data.selectedWorld;

      for (const m of MISSIONS) {
        if (m.worldId && m.worldId !== worldId) continue;
        const done = !!this.save.data.missions[m.id];
        const locked = !done && (m.requires?.some((id) => !this.save.data.missions[id]) ?? false);
        const tier = m.tier || 'standard';

        // Parse numerical progress if available
        const rawProg = m.progress(run, this.save.data.totalCoins);
        let current = 0;
        let target = 1;
        if (rawProg.includes('/')) {
          const parts = rawProg.split('/');
          current = parseInt(parts[0], 10) || 0;
          target = parseInt(parts[1], 10) || 1;
        }
        const cardPct = done ? 100 : Math.min(100, Math.max(0, Math.round((current / target) * 100)));

        const card = document.createElement('div');
        card.className = `m-card tier-${tier} ${done ? 'done' : ''} ${locked ? 'locked' : ''}`;

        const tierLabel = tier.toUpperCase();
        const worldBadge = m.worldId ? `<span class="m-world-tag">${m.worldId.toUpperCase()}</span>` : `<span class="m-world-tag global">GLOBAL</span>`;

        card.innerHTML = `
          <div class="m-card-top">
            <div class="m-badge-icon tier-${tier}">
              ${locked ? ICONS.lock : done ? ICONS.trophy : ICONS.target}
            </div>
            <div class="m-details">
              <div class="m-title">${m.name}</div>
              <div class="m-tags">
                ${worldBadge}
                <span class="m-tier-tag tier-${tier}">${tierLabel}</span>
              </div>
            </div>
            <div class="m-reward-pill ${done ? 'reward-done' : ''}">
              ${locked ? `<span class="m-locked-badge">${ICONS.lock} LOCKED</span>` : done ? `<span class="m-done-badge">${ICONS.check} DONE</span>` : `${ICONS.coin} <span class="m-reward-val">+${m.reward}</span>`}
            </div>
          </div>
          ${!locked ? `
          <div class="m-card-bottom">
            <div class="m-prog-track">
              <div class="m-prog-bar tier-${tier} ${done ? 'bar-done' : ''}" style="width: ${cardPct}%"></div>
            </div>
            <div class="m-prog-meta">
              <span class="m-prog-txt">${done ? 'OBJECTIVE COMPLETED' : rawProg}</span>
              <span class="m-prog-pct">${cardPct}%</span>
            </div>
          </div>
          ` : `
          <div class="m-card-bottom m-locked-req">
            <span>Complete previous missions to unlock</span>
          </div>
          `}
        `;
        ml.appendChild(card);
      }
    }

    // 3. Achievements
    const al = document.getElementById('ach-list');
    if (al) {
      al.innerHTML = '';
      for (const a of ACHIEVEMENTS) {
        const done = !!this.save.data.achievements[a.id];
        const card = document.createElement('div');
        card.className = `ach-card ${done ? 'done' : 'locked'}`;

        card.innerHTML = `
          <div class="ach-icon-wrap ${done ? 'ach-glow' : ''}">
            ${ICONS.trophy}
          </div>
          <div class="ach-info">
            <div class="ach-name">${a.name}</div>
            <div class="ach-desc">${a.desc || 'Special Accomplishment'}</div>
          </div>
          <div class="ach-status">
            ${done ? `<span class="ach-pill done">${ICONS.check} UNLOCKED</span>` : `<span class="ach-pill locked">${ICONS.lock} LOCKED</span>`}
          </div>
        `;
        al.appendChild(card);
      }
    }

    liquidUI.refresh();
  }
}

import { DIFFICULTY_LEVELS, getDifficultySpec, type DifficultyLevel } from '../config/difficulty.config';

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

    const diffLevel = s.difficulty || 'NORMAL';
    const diffSpec = getDifficultySpec(diffLevel);
    set('set-difficulty', diffSpec.name, 'false');
    const exp = document.getElementById('difficulty-explain');
    if (exp) {
      exp.textContent = diffSpec.description;
    }
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
      const cur = s.difficulty || 'NORMAL';
      const next = DIFFICULTY_LEVELS[(DIFFICULTY_LEVELS.indexOf(cur) + 1) % DIFFICULTY_LEVELS.length];
      s.difficulty = next;
      this.save.save();
      this.render();
      this.audio.click();
      this.onChanged('difficulty');
    });
  }
}
