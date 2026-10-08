/** World roster screen: select / unlock with optimized static image previews. */
import { WORLDS } from '../config/worlds.config';
import type { World } from '../world/World';
import type { SaveManager } from '../save/SaveManager';
import type { AudioManager } from '../audio/AudioManager';
import type { ProgressionSystem } from '../gameplay/ProgressionSystem';
import { LOCK_SVG } from './Previews';
import { liquidUI } from './liquidUI';
import type { UIManager } from './UIManager';

export class WorldSelect {
  constructor(
    private readonly save: SaveManager,
    private readonly audio: AudioManager,
    private readonly progression: ProgressionSystem,
    private readonly ui: UIManager,
    private readonly worlds: World[],
    private readonly onSelectionChanged: () => void,
  ) {}

  render(): void {
    const grid = document.getElementById('worlds-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const coinsEl = document.getElementById('worlds-coins');
    if (coinsEl) coinsEl.textContent = String(this.save.data.coins);
    const sel = this.save.data.selectedWorld;

    // Filter to exactly the 5 active worlds
    const activeDefs = this.worlds.filter((def) => ['city', 'river', 'beach', 'volcano', 'tokyo'].includes(def.config.id));

    for (const def of activeDefs) {
      const w = def.config;
      const unlocked = this.save.isWorldUnlocked(w.id);
      const selected = sel === w.id;
      const price = this.save.price(w.price);
      const card = document.createElement('div');
      card.className = 'char-card' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
      
      const wrap = document.createElement('div');
      wrap.className = 'prev-wrap';
      
      // Static optimized World Image Preview
      const img = document.createElement('img');
      img.className = 'prev-img';
      img.src = `/assets/world-previews/${w.id}.jpg`;
      img.alt = `${w.name} Preview`;
      img.loading = 'lazy';
      wrap.appendChild(img);

      if (!unlocked) {
        const veil = document.createElement('div');
        veil.className = 'lock-veil';
        veil.innerHTML = LOCK_SVG;
        wrap.appendChild(veil);
      }
      card.appendChild(wrap);

      const info = document.createElement('div');
      info.className = 'card-info';
      const h = document.createElement('h3');
      h.textContent = `${w.num} · ${w.name}`;
      info.appendChild(h);
      const best = this.save.data.worldBest[w.id] ?? 0;
      const p = document.createElement('p');
      p.textContent = selected ? `PLAYING · BEST ${best}` : unlocked ? `BEST ${best}` : `${price} COINS`;
      info.appendChild(p);
      card.appendChild(info);

      const b = document.createElement('button');
      b.className = 'btn' + (selected ? '' : ' primary');
      b.dataset.press = 'off';
      if (selected) {
        b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>PLAYING';
        b.disabled = true;
      } else if (unlocked) {
        b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l11-6.86a1 1 0 0 0 0-1.7l-11-6.86A1 1 0 0 0 8 5.14z"/></svg>SELECT';
        b.onclick = () => {
          this.save.data.selectedWorld = w.id;
          this.save.data.lastWorldId = w.id;
          this.save.data.lastLane = 0;
          this.save.save();
          this.audio.click();
          this.onSelectionChanged();
          this.render();
          card.classList.add('pop');
          window.setTimeout(() => card.classList.remove('pop'), 350);
        };
      } else {
        b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>' + (price === 0 ? 'FREE' : 'UNLOCK');
        b.disabled = this.save.data.coins < price;
        b.onclick = () => {
          if (this.progression.unlockWorld(w.id, price)) {
            this.audio.unlock();
            this.ui.toast(`${w.name} unlocked!`);
            this.onSelectionChanged();
            this.render();
          }
        };
      }
      card.appendChild(b);
      grid.appendChild(card);
    }

    liquidUI.refresh();
    void WORLDS;
  }
}
