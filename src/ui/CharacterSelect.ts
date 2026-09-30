/** Character roster screen: select / unlock, TESTING_MODE-aware pricing with static image previews. */
import { CHARACTERS } from '../config/characters.config';
import type { SaveManager } from '../save/SaveManager';
import type { AudioManager } from '../audio/AudioManager';
import type { ProgressionSystem } from '../gameplay/ProgressionSystem';
import { LOCK_SVG } from './Previews';
import { liquidUI } from './liquidUI';
import type { UIManager } from './UIManager';

export class CharacterSelect {
  constructor(
    private readonly save: SaveManager,
    private readonly audio: AudioManager,
    private readonly progression: ProgressionSystem,
    private readonly ui: UIManager,
    private readonly onMeshChanged: () => void,
    private readonly onStatsChanged: () => void,
  ) {}

  render(): void {
    const grid = document.getElementById('chars-grid');
    if (!grid) return;
    grid.innerHTML = '';
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
      
      // Static optimized Character Image Preview
      const img = document.createElement('img');
      img.className = 'prev-img';
      img.src = `/assets/character-previews/${c.id}.svg`;
      img.alt = `${c.name} Preview`;
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
        b.textContent = price === 0 ? 'FREE' : 'UNLOCK';
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

    liquidUI.refresh();
  }
}
