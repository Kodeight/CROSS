/** Score = forward progress since run start + bonus (coins +1, near-miss +2). */
export class ScoreSystem {
  maxLane = 0;
  bonus = 0;
  private base = 0;

  reset(base = 0): void {
    this.base = base;
    this.maxLane = base;
    this.bonus = 0;
  }

  get score(): number {
    return this.maxLane - this.base + this.bonus;
  }

  /** Run start lane (spawn): world progress is measured from here. */
  get startLane(): number {
    return this.base;
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
