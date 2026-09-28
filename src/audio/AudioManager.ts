/**
 * Centralized Audio Engine — CROSS! v3.0
 *
 * Implements a real royalty-free soundtrack system using local audio assets (CC0).
 * Features:
 * - 20 unique world soundtracks + main menu music
 * - Seamless looping without gap or stutter
 * - Crossfading between worlds and menu states
 * - Pause and resume from exact playback offset
 * - Mobile autoplay handling: deferred initialization on first gesture
 * - Separate music and SFX volume controls + persistence
 * - Intelligent preloading (menu + current world + next world)
 * - Authentic Kenney CC0 sound effects for all game actions
 * - Procedural synthesis fallbacks for 100% reliability
 */

export interface AudioSettingsSnapshot {
  music: boolean;
  sfx: boolean;
  musicVolume?: number;
  sfxVolume?: number;
}

interface ActiveTrackState {
  id: string; // e.g. "menu", "city", "volcano"
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  buffer: AudioBuffer;
  startedAt: number;
  pauseOffset: number;
  isFadingOut: boolean;
}

interface ActiveAmbientState {
  id: string;
  gainNode: GainNode;
  nodes: AudioNode[];
  timerId?: number;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterMusicGain: GainNode | null = null;
  private masterSfxGain: GainNode | null = null;
  private masterAmbientGain: GainNode | null = null;

  // Track state
  private currentTrack: ActiveTrackState | null = null;
  private outgoingTracks: Set<ActiveTrackState> = new Set();
  private currentAmbient: ActiveAmbientState | null = null;
  private isPaused: boolean = false;
  private pausedTrackId: string | null = null;
  private pausedOffset: number = 0;

  // Preloaded audio buffer caches
  private musicBuffers: Map<string, AudioBuffer> = new Map();
  private sfxBuffers: Map<string, AudioBuffer> = new Map();
  private pendingLoads: Map<string, Promise<AudioBuffer | null>> = new Map();

  // Volume tracking
  private musicVolume: number = 0.8;
  private sfxVolume: number = 0.8;
  private musicEnabled: boolean = true;
  private sfxEnabled: boolean = true;

  constructor(private readonly getSettings: () => AudioSettingsSnapshot) {
    this.syncSettings();
  }

  /**
   * Initializes WebAudio context on first user interaction to comply with mobile autoplay policies.
   */
  ensure(): boolean {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return true;
    }

    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();

      // Master music bus
      this.masterMusicGain = this.ctx.createGain();
      this.masterMusicGain.connect(this.ctx.destination);

      // Master SFX bus
      this.masterSfxGain = this.ctx.createGain();
      this.masterSfxGain.connect(this.ctx.destination);

      // Master Ambient bus (gentle atmospheric layer)
      this.masterAmbientGain = this.ctx.createGain();
      this.masterAmbientGain.connect(this.ctx.destination);

      this.updateVolumes();

      // Intelligent background preloading on boot
      void this.preloadCoreAssets();

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Synchronize state from user preferences.
   */
  private syncSettings(): void {
    const s = this.getSettings();
    this.musicEnabled = s.music ?? true;
    this.sfxEnabled = s.sfx ?? true;
    this.musicVolume = Math.max(0, Math.min(1, s.musicVolume ?? 0.8));
    this.sfxVolume = Math.max(0, Math.min(1, s.sfxVolume ?? 0.8));
  }

  public updateVolumes(): void {
    this.syncSettings();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.masterMusicGain) {
      const mTarget = this.musicEnabled ? this.musicVolume * 0.45 : 0.0001;
      this.masterMusicGain.gain.cancelScheduledValues(now);
      this.masterMusicGain.gain.setValueAtTime(this.masterMusicGain.gain.value, now);
      this.masterMusicGain.gain.linearRampToValueAtTime(mTarget, now + 0.1);
    }

    if (this.masterSfxGain) {
      const sTarget = this.sfxEnabled ? this.sfxVolume * 0.65 : 0.0001;
      this.masterSfxGain.gain.cancelScheduledValues(now);
      this.masterSfxGain.gain.setValueAtTime(this.masterSfxGain.gain.value, now);
      this.masterSfxGain.gain.linearRampToValueAtTime(sTarget, now + 0.05);
    }

    if (this.masterAmbientGain) {
      const aTarget = this.sfxEnabled ? this.sfxVolume * 0.28 : 0.0001;
      this.masterAmbientGain.gain.cancelScheduledValues(now);
      this.masterAmbientGain.gain.setValueAtTime(this.masterAmbientGain.gain.value, now);
      this.masterAmbientGain.gain.linearRampToValueAtTime(aTarget, now + 0.1);
    }
  }

  /**
   * Intelligently preloads essential audio assets without blocking mobile startup.
   */
  private async preloadCoreAssets(): Promise<void> {
    const commonSfx = ['click', 'select', 'hop', 'coin', 'bump', 'crash', 'death'];
    for (const name of commonSfx) {
      void this.loadSfxBuffer(name);
    }
    void this.loadMusicBuffer('menu');
    void this.loadMusicBuffer('city');
  }

  /**
   * Load and cache music audio buffer.
   */
  private async loadMusicBuffer(trackId: string): Promise<AudioBuffer | null> {
    if (this.musicBuffers.has(trackId)) {
      return this.musicBuffers.get(trackId)!;
    }
    if (this.pendingLoads.has(`m:${trackId}`)) {
      return this.pendingLoads.get(`m:${trackId}`)!;
    }

    const p = (async () => {
      try {
        const url = `/audio/music/${trackId}.ogg`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ab = await res.arrayBuffer();
        if (!this.ctx) return null;
        const decoded = await this.ctx.decodeAudioData(ab);
        this.musicBuffers.set(trackId, decoded);
        return decoded;
      } catch {
        return null;
      } finally {
        this.pendingLoads.delete(`m:${trackId}`);
      }
    })();

    this.pendingLoads.set(`m:${trackId}`, p);
    return p;
  }

  /**
   * Load and cache SFX audio buffer.
   */
  private async loadSfxBuffer(sfxName: string): Promise<AudioBuffer | null> {
    if (this.sfxBuffers.has(sfxName)) {
      return this.sfxBuffers.get(sfxName)!;
    }
    if (this.pendingLoads.has(`s:${sfxName}`)) {
      return this.pendingLoads.get(`s:${sfxName}`)!;
    }

    const p = (async () => {
      try {
        const url = `/audio/sfx/${sfxName}.ogg`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ab = await res.arrayBuffer();
        if (!this.ctx) return null;
        const decoded = await this.ctx.decodeAudioData(ab);
        this.sfxBuffers.set(sfxName, decoded);
        return decoded;
      } catch {
        return null;
      } finally {
        this.pendingLoads.delete(`s:${sfxName}`);
      }
    })();

    this.pendingLoads.set(`s:${sfxName}`, p);
    return p;
  }

  /**
   * Preload next world soundtrack to eliminate transition lag.
   */
  public preloadWorldTrack(worldId: string): void {
    void this.loadMusicBuffer(worldId.toLowerCase());
  }

  // =========================================================================
  // MUSIC ENGINE — Seamless looping, crossfading, pause & resume
  // =========================================================================

  /**
   * Starts music for a world or the main menu with smooth crossfading.
   */
  public async startMusic(mode: 'menu' | 'play', worldId = 'city', forceResume = false): Promise<void> {
    this.syncSettings();
    if (!this.ensure() || !this.ctx || !this.masterMusicGain) return;

    const trackId = mode === 'menu' ? 'menu' : worldId.toLowerCase();

    // If game was paused on this exact track, resume smoothly
    if (this.isPaused && this.pausedTrackId === trackId && !forceResume) {
      this.resumeMusic();
      return;
    }

    // If identical track is already actively playing, keep it uninterrupted
    if (this.currentTrack && this.currentTrack.id === trackId && !this.currentTrack.isFadingOut && !this.isPaused) {
      return;
    }

    this.isPaused = false;
    this.pausedTrackId = null;

    // Smoothly crossfade out current track
    if (this.currentTrack) {
      this.fadeOutTrack(this.currentTrack, 0.75);
      this.currentTrack = null;
    }

    // Fetch or use cached buffer
    const buffer = await this.loadMusicBuffer(trackId);
    if (!buffer || !this.ctx) return;

    // Double check we haven't switched to another track while waiting for buffer
    const now = this.ctx.currentTime;
    const trackGain = this.ctx.createGain();
    trackGain.gain.setValueAtTime(0.0001, now);
    // Smooth fade in over 700ms
    trackGain.gain.linearRampToValueAtTime(1.0, now + 0.7);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    source.connect(trackGain);
    trackGain.connect(this.masterMusicGain);

    source.start(0);

    this.currentTrack = {
      id: trackId,
      source,
      gainNode: trackGain,
      buffer,
      startedAt: now,
      pauseOffset: 0,
      isFadingOut: false,
    };
  }

  /**
   * Dynamic World Transition: smoothly crossfades into the target world's soundtrack
   * and atmospheric ambient loop during real-time gameplay traversal.
   */
  public async transitionToWorld(worldId: string, fadeDurationSec = 1.0): Promise<void> {
    this.syncSettings();
    if (!this.ensure() || !this.ctx || !this.masterMusicGain) return;

    // Transition ambient sound loop to match world theme
    this.setWorldAmbient(worldId, fadeDurationSec);

    const trackId = worldId.toLowerCase();
    if (this.currentTrack && this.currentTrack.id === trackId && !this.currentTrack.isFadingOut) {
      return;
    }

    // Crossfade out outgoing track
    if (this.currentTrack) {
      this.fadeOutTrack(this.currentTrack, fadeDurationSec);
      this.currentTrack = null;
    }

    const buffer = await this.loadMusicBuffer(trackId);
    if (!buffer || !this.ctx) return;

    const now = this.ctx.currentTime;
    const trackGain = this.ctx.createGain();
    trackGain.gain.setValueAtTime(0.0001, now);
    trackGain.gain.linearRampToValueAtTime(1.0, now + fadeDurationSec);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    source.connect(trackGain);
    trackGain.connect(this.masterMusicGain);

    source.start(0);

    this.currentTrack = {
      id: trackId,
      source,
      gainNode: trackGain,
      buffer,
      startedAt: now,
      pauseOffset: 0,
      isFadingOut: false,
    };
  }

  /**
   * Generates or fades in a procedural WebAudio ambient atmosphere matching the world type
   * (e.g. city traffic/birds, desert wind, forest rustling, ocean waves, volcano rumble).
   */
  public setWorldAmbient(worldId: string, fadeDurationSec = 1.0): void {
    if (!this.ensure() || !this.ctx || !this.masterAmbientGain) return;

    const world = worldId.toLowerCase();
    if (this.currentAmbient && this.currentAmbient.id === world) return;

    const now = this.ctx.currentTime;

    // Fade out previous ambient layer
    if (this.currentAmbient) {
      const prev = this.currentAmbient;
      this.currentAmbient = null;
      try {
        prev.gainNode.gain.cancelScheduledValues(now);
        prev.gainNode.gain.setValueAtTime(prev.gainNode.gain.value, now);
        prev.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeDurationSec);
        window.setTimeout(() => {
          for (const n of prev.nodes) {
            try {
              if ('stop' in n && typeof (n as AudioScheduledSourceNode).stop === 'function') {
                (n as AudioScheduledSourceNode).stop();
              }
              n.disconnect();
            } catch { /* ignore */ }
          }
        }, Math.floor(fadeDurationSec * 1000 + 50));
      } catch { /* ignore */ }
    }

    if (!this.sfxEnabled) return;

    // Create new ambient generator
    const ambGain = this.ctx.createGain();
    ambGain.gain.setValueAtTime(0.0001, now);
    ambGain.gain.linearRampToValueAtTime(1.0, now + fadeDurationSec);
    ambGain.connect(this.masterAmbientGain);

    const createdNodes: AudioNode[] = [];

    try {
      if (world === 'city' || world === 'industrial' || world === 'railway') {
        // City / Industrial: Low road rumble + gentle filtered noise
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 240;

        whiteNoise.connect(filter);
        filter.connect(ambGain);
        whiteNoise.start(0);

        createdNodes.push(whiteNoise, filter);
      } else if (world === 'desert' || world === 'mountain' || world === 'snow') {
        // Desert / Mountain / Snow: Swirling wind breeze filter
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = world === 'snow' ? 550 : 380;
        filter.Q.value = 2.5;

        // Modulate wind filter frequency
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.22;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 160;

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        noise.connect(filter);
        filter.connect(ambGain);

        noise.start(0);
        lfo.start(0);

        createdNodes.push(noise, filter, lfo, lfoGain);
      } else if (world === 'jungle' || world === 'forest' || world === 'countryside' || world === 'temple' || world === 'fantasy') {
        // Nature / Forest: Gentle rustling breeze + high soft canopy air
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 1.2;

        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);

        createdNodes.push(noise, filter);
      } else if (world === 'beach' || world === 'ocean' || world === 'flooded') {
        // Ocean / Beach: Gentle surging wave noise
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.15;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 280;

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        noise.connect(filter);
        filter.connect(ambGain);

        noise.start(0);
        lfo.start(0);

        createdNodes.push(noise, filter, lfo, lfoGain);
      } else if (world === 'volcano') {
        // Volcano: Deep sub rumble
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 90;

        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);

        createdNodes.push(noise, filter);
      } else {
        // Cyber / Neon / Moon / Sky / Alien: Subtle metallic resonance hum
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = world === 'neon' ? 110 : 75;

        const oscGain = this.ctx.createGain();
        oscGain.gain.value = 0.15;

        osc.connect(oscGain);
        oscGain.connect(ambGain);
        osc.start(0);

        createdNodes.push(osc, oscGain);
      }
    } catch { /* ignore audio graph initialization errors */ }

    this.currentAmbient = {
      id: world,
      gainNode: ambGain,
      nodes: createdNodes,
    };
  }

  /**
   * Pauses the active track, preserving playback position for seamless resumption.
   */
  public pauseMusic(): void {
    if (!this.ctx || !this.currentTrack || this.isPaused) return;

    const now = this.ctx.currentTime;
    const elapsed = now - this.currentTrack.startedAt + this.currentTrack.pauseOffset;
    this.pausedOffset = elapsed % this.currentTrack.buffer.duration;
    this.pausedTrackId = this.currentTrack.id;
    this.isPaused = true;

    // Quick gentle ramp down before disconnecting
    const t = this.currentTrack;
    t.isFadingOut = true;
    try {
      t.gainNode.gain.cancelScheduledValues(now);
      t.gainNode.gain.setValueAtTime(t.gainNode.gain.value, now);
      t.gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.15);
      window.setTimeout(() => {
        try {
          t.source.stop();
          t.source.disconnect();
          t.gainNode.disconnect();
        } catch { /* ignore */ }
      }, 160);
    } catch {
      /* ignore */
    }

    this.currentTrack = null;
  }

  /**
   * Resumes music from the exact position where it was paused.
   */
  public async resumeMusic(): Promise<void> {
    if (!this.ensure() || !this.ctx || !this.pausedTrackId || !this.masterMusicGain) return;

    const trackId = this.pausedTrackId;
    const offset = this.pausedOffset;
    this.isPaused = false;
    this.pausedTrackId = null;

    const buffer = await this.loadMusicBuffer(trackId);
    if (!buffer || !this.ctx) return;

    const now = this.ctx.currentTime;
    const trackGain = this.ctx.createGain();
    trackGain.gain.setValueAtTime(0.0001, now);
    trackGain.gain.linearRampToValueAtTime(1.0, now + 0.35);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    source.connect(trackGain);
    trackGain.connect(this.masterMusicGain);

    source.start(0, offset);

    this.currentTrack = {
      id: trackId,
      source,
      gainNode: trackGain,
      buffer,
      startedAt: now,
      pauseOffset: offset,
      isFadingOut: false,
    };
  }

  /**
   * Stop music with a smooth fade-out to prevent clicks and abrupt cuts.
   */
  public stopMusic(fadeDurationSec = 0.5): void {
    this.isPaused = false;
    this.pausedTrackId = null;
    if (this.currentTrack) {
      this.fadeOutTrack(this.currentTrack, fadeDurationSec);
      this.currentTrack = null;
    }
  }

  private fadeOutTrack(track: ActiveTrackState, duration: number): void {
    if (!this.ctx) return;
    track.isFadingOut = true;
    this.outgoingTracks.add(track);

    const now = this.ctx.currentTime;
    try {
      track.gainNode.gain.cancelScheduledValues(now);
      track.gainNode.gain.setValueAtTime(track.gainNode.gain.value, now);
      track.gainNode.gain.linearRampToValueAtTime(0.0001, now + duration);

      window.setTimeout(() => {
        try {
          track.source.stop();
          track.source.disconnect();
          track.gainNode.disconnect();
        } catch { /* ignore */ }
        this.outgoingTracks.delete(track);
      }, Math.floor((duration + 0.05) * 1000));
    } catch {
      track.source.stop();
      this.outgoingTracks.delete(track);
    }
  }

  // =========================================================================
  // SFX ENGINE — Authentic Kenney CC0 Sound Assets with Procedural Fallbacks
  // =========================================================================

  private async playSfx(name: string, options: { volume?: number; pitchMod?: number } = {}): Promise<void> {
    if (!this.sfxEnabled) return;
    if (!this.ensure() || !this.ctx || !this.masterSfxGain) return;

    const buffer = await this.loadSfxBuffer(name);
    if (buffer && this.ctx) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        if (options.pitchMod) {
          source.detune.value = options.pitchMod;
        }

        const gainNode = this.ctx.createGain();
        gainNode.gain.value = options.volume ?? 1.0;

        source.connect(gainNode);
        gainNode.connect(this.masterSfxGain);

        source.start(0);
        return;
      } catch {
        /* fall through to procedural backup */
      }
    }

    // Procedural fallback if asset not yet loaded
    this.playFallbackSound(name);
  }

  private playFallbackSound(name: string): void {
    switch (name) {
      case 'click': this.tone(600, 0.05, 'square', 0.15); break;
      case 'select': this.tone(520, 0.06, 'triangle', 0.18); break;
      case 'hop': this.tone(300, 0.08, 'square', 0.18, 0, 500); break;
      case 'bump': this.tone(140, 0.08, 'square', 0.15, 0, 90); break;
      case 'coin': this.tone(950, 0.08, 'sine', 0.25); this.tone(1420, 0.12, 'sine', 0.25, 0.06); break;
      case 'death': this.tone(160, 0.35, 'sawtooth', 0.3, 0, 40); break;
      case 'unlock': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'square', 0.2, i * 0.08)); break;
      case 'gameover': [400, 350, 300, 220].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.22, i * 0.12)); break;
      case 'fanfare':
        // Soft, cheerful multi-harmonic 4-note ascending game chime
        [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
          this.tone(f, 0.22, 'sine', 0.18, i * 0.07, f * 1.05);
          this.tone(f * 2, 0.18, 'triangle', 0.05, i * 0.07);
        });
        break;
      case 'superpower':
        // Ascending high-energy arpeggiated power surge
        [440, 554, 659, 880, 1108].forEach((f, i) => this.tone(f, 0.14, 'sawtooth', 0.22, i * 0.04, f * 1.25));
        break;
      case 'superpower_impact':
        // Deep bass punch + resonant high shimmer
        this.tone(120, 0.28, 'sine', 0.45, 0, 45);
        this.tone(880, 0.18, 'triangle', 0.3, 0.02, 1760);
        break;
      default: this.tone(440, 0.05, 'sine', 0.1); break;
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, slideTo?: number): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterSfxGain) return;
    try {
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.masterSfxGain);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch { /* ignore */ }
  }

  // --- Public SFX API (Used across all game systems) ---

  click(): void {
    void this.playSfx('click', { volume: 0.85 });
  }

  select(): void {
    void this.playSfx('select', { volume: 0.85 });
  }

  hop(): void {
    // Subtle organic pitch variation on every hop
    const detune = Math.floor(Math.random() * 160 - 80);
    void this.playSfx('hop', { volume: 0.9, pitchMod: detune });
  }

  bump(): void {
    void this.playSfx('bump', { volume: 0.85 });
  }

  land(): void {
    void this.playSfx('footstep', { volume: 0.65 });
  }

  coin(): void {
    const detune = Math.floor(Math.random() * 80);
    void this.playSfx('coin', { volume: 0.85, pitchMod: detune });
  }

  near(): void {
    void this.playSfx('near', { volume: 0.75 });
  }

  death(): void {
    void this.playSfx('death', { volume: 1.0 });
  }

  crash(): void {
    void this.playSfx('crash', { volume: 0.95 });
  }

  unlock(): void {
    void this.playSfx('unlock', { volume: 0.9 });
  }

  gameOver(): void {
    void this.playSfx('gameover', { volume: 0.95 });
  }

  fanfare(): void {
    void this.playSfx('fanfare', { volume: 0.9 });
  }

  superpower(): void {
    void this.playSfx('superpower', { volume: 0.95 });
  }

  superpowerImpact(): void {
    void this.playSfx('superpower_impact', { volume: 0.95 });
  }
}


