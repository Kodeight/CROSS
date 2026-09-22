/** Game-over results card. */
import { fmtCount } from '../utils/Format';

export class GameOverScreen {
  show(score: number, best: number, newBest: boolean, runCoins: number, stats: string): void {
    const set = (id: string, v: string) => {
      const e = document.getElementById(id);
      if (e) e.textContent = v;
    };
    set('final-score', fmtCount(score));
    set('final-best', `BEST ${fmtCount(best)}`);
    set('final-coins', `+${fmtCount(runCoins)} COINS`);
    set('final-stats', stats);
    const nb = document.getElementById('new-best');
    if (nb) nb.hidden = !newBest;
  }
}
