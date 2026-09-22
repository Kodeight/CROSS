/** Score = max lane reached + bonus (coins +1, near-miss +2). */

export class ScoreSystem {
  maxLane = 0;
  bonus = 0;

  reset(): void {
    this.maxLane = 0;
    this.bonus = 0;
  }

  get score(): number {
    return this.maxLane + this.bonus;
  }

  reachLane(lane: number): boolean {
    if (lane > this.maxLane) {
      this.maxLane = lane;
      return true;
    }
    return false;
  }

  addBonus(n: number): void {
    this.bonus += n;
  }
}
