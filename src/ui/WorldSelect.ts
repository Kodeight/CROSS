/** World roster screen: select / unlock with live 3D previews. */
import { WORLDS } from '../config/worlds.config';
import type { World } from '../world/World';
import type { SaveManager } from '../save/SaveManager';
import type { AudioManager } from '../audio/AudioManager';
import type { ProgressionSystem } from '../gameplay/ProgressionSystem';
import { LOCK_SVG, type WorldPreviewManager } from './Previews';
import { liquidUI } from './liquidUI';
import type { UIManager } from './UIManager';

export class WorldSelect {
  canvases: Array<{ canvas: HTMLCanvasElement; world: World }> = [];

  constructor(
    private readonly save: SaveManager,
    private readonly audio: AudioManager,
    private readonly progression: ProgressionSystem,
    private readonly previews: WorldPreviewManager,
    private readonly ui: UIManager,
    private readonly worlds: World[],
    private readonly onSelectionChanged: () => void,
  ) {}

  render(): void {
    const grid = document.getElementById('worlds-grid');
    if (!grid) return;
    grid.innerHTML = '';
    this.canvases = [];
    const coinsEl = document.getElementById('worlds-coins');
    if (coinsEl) coinsEl.textContent = String(this.save.data.coins);
    const sel = this.save.data.selectedWorld;
    for (const def of this.worlds) {
      const w = def.config;
      const unlocked = this.save.isWorldUnlocked(w.id);
      const selected = sel === w.id;
      const price = this.save.price(w.price);
      const card = document.createElement('div');
      card.className = 'char-card' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
      const wrap = document.createElement('div');
      wrap.className = 'prev-wrap';
      const canvas = document.createElement('canvas');
      canvas.className = 'prev-canvas';
      canvas.setAttribute('aria-label', `${w.name} 3D preview`);
      wrap.appendChild(canvas);
      if (!unlocked) {
        const veil = document.createElement('div');
        veil.className = 'lock-veil';
        veil.innerHTML = LOCK_SVG;
        wrap.appendChild(veil);
      }
      card.appendChild(wrap);
      this.canvases.push({ canvas, world: def });
      const h = document.createElement('h3');
      h.textContent = `${w.num} · ${w.name}`;
      card.appendChild(h);
      const best = this.save.data.worldBest[w.id] ?? 0;
      const p = document.createElement('p');
      p.textContent = selected ? `PLAYING · BEST ${best}` : unlocked ? `BEST ${best}` : `${price} COINS`;
      card.appendChild(p);
      const b = document.createElement('button');
      b.className = 'btn' + (selected ? '' : ' primary');
      if (selected) {
        b.textContent = 'PLAYING';
        b.disabled = true;
      } else if (unlocked) {
        b.textContent = 'SELECT';
        b.onclick = () => {
          this.save.data.selectedWorld = w.id;
          // New journey in this world: restart progression here, not at an
          // old checkpoint from another world.
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
        b.textContent = this.save.data.coins >= price ? (price === 0 ? 'FREE' : 'UNLOCK') : 'LOCKED';
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
    this.previews.open(this.canvases);
    try {
      const scroller = document.querySelector('#worlds-screen .panel-scroll');
      if (scroller && !(scroller as unknown as { _holdBound?: boolean })._holdBound) {
        (scroller as unknown as { _holdBound?: boolean })._holdBound = true;
        scroller.addEventListener('scroll', () => this.previews.hold(), { passive: true });
      }
    } catch { /* scrolls natively regardless */ }
    liquidUI.refresh();
    void WORLDS;
  }
}
