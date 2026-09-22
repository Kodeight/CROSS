/**
 * The single authoritative update/render loop. No scattered
 * setInterval/setTimeout gameplay loops, no competing rAF loops.
 */

export interface LoopDelegate {
  update(dtMs: number, nowMs: number): void;
  render(): void;
}

export class GameLoop {
  private rafId = 0;
  private running = false;
  private prevTs = 0;

  constructor(private readonly delegate: LoopDelegate) {}

  start(nowMs?: number): void {
    if (this.running) return;
    this.running = true;
    this.prevTs = nowMs ?? performance.now();
    const step = (ts: number) => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(step);
      const dt = Math.min(Math.max(ts - this.prevTs, 0), 100);
      this.prevTs = ts;
      try {
        this.delegate.update(dt, ts);
      } catch (err) {
        console.error('CROSS! update failed:', err);
      }
      try {
        this.delegate.render();
      } catch (err) {
        console.error('CROSS! render failed:', err);
      }
    };
    this.rafId = requestAnimationFrame(step);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  get isRunning(): boolean {
    return this.running;
  }
}
