/** Character roster screen: select / unlock, TESTING_MODE-aware pricing with 3D character previews. */
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
      
      // 3D Canvas Preview
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

      const info = document.createElement('div');
      info.className = 'card-info';
      const h = document.createElement('h3');
      h.textContent = c.name;
      info.appendChild(h);
      const p = document.createElement('p');
      p.textContent = selected ? 'SELECTED' : unlocked ? 'UNLOCKED' : `${price} COINS`;
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
          this.save.data.selectedCharacter = c.id;
          this.save.save();
          this.audio.click();
          this.onMeshChanged();
          this.render();
          card.classList.add('pop');
          window.setTimeout(() => card.classList.remove('pop'), 350);
        };
      } else {
        b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>' + (price === 0 ? 'FREE' : 'UNLOCK');
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

    try {
      const sec = document.getElementById('chars-screen');
      if (sec && !sec.hidden) this.previews.open(this.canvases);
    } catch { /* DOM-only render still succeeds */ }
    try {
      const scroller = document.querySelector('#chars-screen .panel-scroll');
      if (scroller && !(scroller as unknown as { _holdBound?: boolean })._holdBound) {
        (scroller as unknown as { _holdBound?: boolean })._holdBound = true;
        scroller.addEventListener('scroll', () => this.previews.hold(), { passive: true });
      }
    } catch { /* scrolls natively */ }

    liquidUI.refresh();
  }
}
