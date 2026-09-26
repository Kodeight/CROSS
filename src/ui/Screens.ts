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
import type { SaveManager } from '../save/SaveManager';
import type { AudioManager } from '../audio/AudioManager';
import type { QualityLevel } from '../config/game.config';
import { liquidUI } from './liquidUI';

export class MissionsScreen {
  constructor(private readonly save: SaveManager) {}

  render(maxLane: number, nearMiss: number, activeWorldId?: string, runCoins = 0): void {
    const ml = document.getElementById('missions-list');
    if (ml) {
      ml.innerHTML = '';
      const run = { maxLane, nearMiss };
      // §53 — show global missions + missions for the active (or selected) world.
      const worldId = activeWorldId ?? this.save.data.selectedWorld;
      for (const m of MISSIONS) {
        if (m.worldId && m.worldId !== worldId) continue;
        const done = !!this.save.data.missions[m.id];
        const locked = !done && (m.requires?.some((id) => !this.save.data.missions[id]) ?? false);
        const div = document.createElement('div');
        div.className = 'mission' + (done ? ' done' : '') + (locked ? ' locked' : '');
        if (m.tier) div.classList.add(`tier-${m.tier}`);
        const l = document.createElement('span');
        l.textContent = (m.worldId ? `[${m.worldId.toUpperCase()}] ` : '') + m.name;
        div.appendChild(l);
        const r = document.createElement('strong');
        r.textContent = done ? `DONE +${m.reward}` : locked ? 'LOCKED' : m.progress(run, this.save.data.totalCoins);
        div.appendChild(r);
        ml.appendChild(div);
      }
    }
    const al = document.getElementById('ach-list');
    if (al) {
      al.innerHTML = '';
      for (const a of ACHIEVEMENTS) {
        const done = !!this.save.data.achievements[a.id];
        const div = document.createElement('div');
        div.className = 'ach' + (done ? ' done' : '');
        const l = document.createElement('span');
        l.textContent = a.name;
        div.appendChild(l);
        const r = document.createElement('strong');
        r.textContent = done ? 'DONE' : '—';
        div.appendChild(r);
        al.appendChild(div);
      }
    }
    // Daily missions: deterministic rotation for today, evaluated against
    // the stored daily bucket plus the current run state.
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
            try {
              label = dm.getProgress(daily.progress, runState, completedCount).formatted;
            } catch {
              label = done ? 'DONE' : '—';
            }
            const div = document.createElement('div');
            div.className = 'mission' + (done ? ' done' : '');
            const l = document.createElement('span');
            l.textContent = dm.title;
            div.appendChild(l);
            const r = document.createElement('strong');
            r.textContent = done ? `DONE +${dm.reward}` : `${label} · +${dm.reward}`;
            div.appendChild(r);
            dl.appendChild(div);
          }
        }
      }
    } catch { /* daily list is additive — never break the screen */ }
    liquidUI.refresh();
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
