/** Central clock: delta time + time scale (slow-mo near-miss effect). */

export class Time {
  deltaMs = 16.6;
  elapsedMs = 0;
  timeScale = 1;
  private slowUntil = 0;

  reset(now: number): void {
    this.elapsedMs = now;
    this.deltaMs = 16.6;
  }

  tick(now: number): number {
    const raw = Math.min(Math.max(now - this.elapsedMs, 0), 100);
    this.elapsedMs = now;
    if (this.slowUntil && now > this.slowUntil) {
      this.timeScale += (1 - this.timeScale) * 0.3;
      if (this.timeScale > 0.95) {
        this.timeScale = 1;
        this.slowUntil = 0;
      }
    }
    this.deltaMs = raw;
    return this.scaledDelta();
  }

  scaledDelta(): number {
    return this.deltaMs * this.timeScale;
  }

  slowMo(durationMs: number, scale: number): void {
    this.timeScale = scale;
    this.slowUntil = performance.now() + durationMs;
  }

  clearSlowMo(): void {
    this.timeScale = 1;
    this.slowUntil = 0;
  }
}
