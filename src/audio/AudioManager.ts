/**
 * Procedural WebAudio system — no audio assets needed.
 * Split into music + SFX paths with independent enable flags.
 */

export class AudioManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private step = 0;

  constructor(private getSettings: () => { music: boolean; sfx: boolean }) {}

  ensure(): boolean {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, slideTo?: number): void {
    if (!this.getSettings().sfx) return;
    if (!this.ensure() || !this.ctx || !this.sfxGain) return;
    try {
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(this.sfxGain);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch {
      /* audio is optional */
    }
  }

  private noise(dur: number, vol: number, when = 0, low = 1200): void {
    if (!this.getSettings().sfx) return;
    if (!this.ensure() || !this.ctx || !this.sfxGain) return;
    try {
      const t = this.ctx.currentTime + when;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = low;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.connect(f);
      f.connect(g);
      g.connect(this.sfxGain);
      src.start(t);
    } catch {
      /* audio is optional */
    }
  }

  click(): void { this.tone(600, 0.06, 'square', 0.15); }
  hop(): void { this.tone(300, 0.09, 'square', 0.18, 0, 520); }
  land(): void { this.noise(0.06, 0.12, 0, 900); }
  coin(): void { this.tone(950, 0.08, 'sine', 0.3); this.tone(1420, 0.12, 'sine', 0.3, 0.07); }
  near(): void { this.tone(500, 0.25, 'sawtooth', 0.16, 0, 1400); }
  death(): void { this.noise(0.4, 0.5, 0, 2500); this.tone(160, 0.4, 'sawtooth', 0.3, 0, 40); }
  unlock(): void { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.14, 'square', 0.2, i * 0.09)); }
  gameOver(): void { [400, 350, 300, 220].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.25, i * 0.14)); }
  fanfare(): void { this.tone(660, 0.12, 'triangle', 0.2); this.tone(880, 0.16, 'triangle', 0.2, 0.11); }

  startMusic(mode: 'menu' | 'play'): void {
    if (!this.getSettings().music) return;
    if (!this.ensure() || !this.ctx || !this.musicGain) return;
    this.stopMusic();
    this.step = 0;
    const bass = mode === 'play' ? [110, 110, 130.8, 98] : [130.8, 98, 110, 130.8];
    const tempo = mode === 'play' ? 240 : 420;
    this.musicTimer = window.setInterval(() => {
      if (!this.getSettings().music || !this.ctx || !this.musicGain) return;
      try {
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = bass[this.step % bass.length];
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.connect(g);
        g.connect(this.musicGain);
        o.start(t);
        o.stop(t + 0.32);
        if (this.step % 2 === 0) {
          const o2 = this.ctx.createOscillator();
          const g2 = this.ctx.createGain();
          o2.type = 'sine';
          o2.frequency.value = bass[this.step % bass.length] * 4;
          g2.gain.setValueAtTime(0.12, t);
          g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          o2.connect(g2);
          g2.connect(this.musicGain);
          o2.start(t);
          o2.stop(t + 0.22);
        }
        this.step++;
      } catch {
        /* ignore */
      }
    }, tempo);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
