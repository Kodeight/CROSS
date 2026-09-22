/** Character roster screen: select / unlock, TESTING_MODE-aware pricing. */
import { CHARACTERS } from '../config/characters.config';
import type { SaveManager } from '../save/SaveManager';
import type { AudioManager } from '../audio/AudioManager';
import type { ProgressionSystem } from '../gameplay/ProgressionSystem';
import { LOCK_SVG, type CharacterPreviewManager } from './Previews';
import { liquidUI } from './liquidUI';
import type { UIManager } from './UIManager';

export class CharacterSelect {
  canvases: Array<{ canvas: HTMLCanvasElement; id: string }> = [];

  constructor(
    private readonly save: SaveManager,
    private readonly audio: AudioManager,
    private readonly progression: ProgressionSystem,
    private readonly previews: CharacterPreviewManager,
    private readonly ui: UIManager,
    private readonly onMeshChanged: () => void,
    private readonly onStatsChanged: () => void,
  ) {}

  render(): void {
    const grid = document.getElementById('chars-grid');
    if (!grid) return;
    grid.innerHTML = '';
    this.canvases = [];
    const coinsEl = document.getElementById('chars-coins');
    if (coinsEl) coinsEl.textContent = String(this.save.data.coins);
    for (const c of CHARACTERS) {
      const unlocked = this.save.isCharacterUnlocked(c.id);
      const selected = this.save.data.selectedCharacter === c.id;
      const price = this.save.price(c.cost);
      const card = document.createElement('div');
      card.className = 'char-card' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
      const wrap = document.createElement('div');
      wrap.className = 'prev-wrap';
      const canvas = document.createElement('canvas');
      canvas.className = 'prev-canvas';
      canvas.setAttribute('aria-label', `${c.name} 3D preview`);
      wrap.appendChild(canvas);
      if (!unlocked) {
        const veil = document.createElement('div');
        veil.className = 'lock-veil';
        veil.innerHTML = LOCK_SVG;
        wrap.appendChild(veil);
      }
      card.appendChild(wrap);
      this.canvases.push({ canvas, id: c.id });
      const h = document.createElement('h3');
      h.textContent = c.name;
      card.appendChild(h);
      const p = document.createElement('p');
      p.textContent = selected ? 'SELECTED' : unlocked ? 'UNLOCKED' : `${price} COINS`;
      card.appendChild(p);
      const b = document.createElement('button');
      b.className = 'btn' + (selected ? '' : ' primary');
      if (selected) {
        b.textContent = 'PLAYING';
        b.disabled = true;
      } else if (unlocked) {
        b.textContent = 'SELECT';
        b.onclick = () => {
          this.save.data.selectedCharacter = c.id;
          this.save.save();
          this.audio.click();
          this.onMeshChanged();
          this.render();
          card.classList.add('pop');
          window.setTimeout(() => card.classList.remove('pop'), 350);
        };
      } else {
        b.textContent = this.save.data.coins >= price ? (price === 0 ? 'FREE' : 'UNLOCK') : 'LOCKED';
        b.disabled = this.save.data.coins < price;
        b.onclick = () => {
          if (this.progression.unlockCharacter(c.id, price)) {
            this.audio.unlock();
            this.ui.toast(`${c.name} unlocked!`);
            this.onMeshChanged();
            this.render();
            this.onStatsChanged();
          }
        };
      }
      card.appendChild(b);
      grid.appendChild(card);
    }
    this.previews.open(this.canvases);
    liquidUI.refresh();
  }
}
