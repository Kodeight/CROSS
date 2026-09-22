/** Missions + settings screens. Pure DOM, driven by save data. */
import { MISSIONS, ACHIEVEMENTS } from '../config/missions.config';
import type { SaveManager } from '../save/SaveManager';
import type { AudioManager } from '../audio/AudioManager';
import type { QualityLevel } from '../config/game.config';

export class MissionsScreen {
  constructor(private readonly save: SaveManager) {}

  render(maxLane: number, nearMiss: number): void {
    const ml = document.getElementById('missions-list');
    if (ml) {
      ml.innerHTML = '';
      const run = { maxLane, nearMiss };
      for (const m of MISSIONS) {
        const done = !!this.save.data.missions[m.id];
        const div = document.createElement('div');
        div.className = 'mission' + (done ? ' done' : '');
        const l = document.createElement('span');
        l.textContent = m.name;
        div.appendChild(l);
        const r = document.createElement('strong');
        r.textContent = done ? `DONE +${m.reward}` : m.progress(run, this.save.data.totalCoins);
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
  }
}

export class SettingsScreen {
  constructor(
    private readonly save: SaveManager,
    private readonly audio: AudioManager,
    private readonly onChanged: (what: 'music' | 'sfx' | 'motion' | 'quality' | 'reset') => void,
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
    on('btn-reset-save', () => {
      if (window.confirm('Reset all CROSS! progress?')) {
        this.onChanged('reset');
      }
    });
  }
}
