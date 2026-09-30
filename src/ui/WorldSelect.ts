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
        b.textContent = 'PLAYING';
        b.disabled = true;
      } else if (unlocked) {
        b.textContent = 'SELECT';
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
        b.textContent = price === 0 ? 'FREE' : 'UNLOCK';
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
