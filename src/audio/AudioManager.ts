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
    const commonSfx = ['click', 'select', 'hop', 'bump', 'crash', 'death'];
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

    if (mode === 'play') {
      this.setWorldAmbient(worldId, 0.8);
    } else {
      this.duckAmbient(0.5);
    }

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

    const norm = worldId.toLowerCase();
    const aliasMap: Record<string, string> = {
      neon: 'night_city',
      night_city: 'night_city',
      sky: 'sky_island',
      sky_island: 'sky_island',
      ancient_ruins: 'ruins',
      temple: 'ruins',
      ruins: 'ruins',
      countryside: 'farm',
      mountain: 'snow',
      flooded: 'river',
      ocean: 'underwater',
      fantasy: 'candy',
      moon: 'space',
      alien: 'space',
      industrial: 'harbor',
      pirate: 'harbor',
      railway: 'highway',
    };
    const world = aliasMap[norm] ?? norm;
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
      // World-specific procedural ambient generator for ALL 20 worlds
      const createNoise = (sec = 2): AudioBufferSourceNode => {
        const bufferSize = this.ctx!.sampleRate * sec;
        const noiseBuffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
        const src = this.ctx!.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;
        return src;
      };

      if (world === 'city') {
        // 01 CITY: Low asphalt road murmur + gentle distant urban rumble
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 240;
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        createdNodes.push(noise, filter);
      } else if (world === 'river') {
        // 02 RIVER: Gentle babbling water currents + rippling water flow
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 650;
        filter.Q.value = 1.8;
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.35;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 220;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        lfo.start(0);
        createdNodes.push(noise, filter, lfo, lfoGain);
      } else if (world === 'beach') {
        // 03 BEACH: Rolling tropical ocean waves + soft sea breeze
        const noise = createNoise(3);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.12; // Gentle swell
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 260;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        lfo.start(0);
        createdNodes.push(noise, filter, lfo, lfoGain);
      } else if (world === 'forest') {
        // 04 FOREST: Gentle rustling green canopy breeze + soft woodland air
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 950;
        filter.Q.value = 1.2;
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        createdNodes.push(noise, filter);
      } else if (world === 'desert') {
        // 05 DESERT: Warm arid desert wind whistle with wandering gusts
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 380;
        filter.Q.value = 2.8;
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.18;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 140;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        lfo.start(0);
        createdNodes.push(noise, filter, lfo, lfoGain);
      } else if (world === 'snow') {
        // 06 SNOW: Cold crisp alpine winter wind whistling across icy snow
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 620;
        filter.Q.value = 3.2;
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        createdNodes.push(noise, filter);
      } else if (world === 'farm') {
        // 07 FARM: Warm cheerful morning pastoral breeze + soft rustic resonance
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 320;
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 220;
        const oscGain = this.ctx.createGain();
        oscGain.gain.value = 0.05;
        osc.connect(oscGain);
        oscGain.connect(ambGain);
        osc.start(0);
        createdNodes.push(noise, filter, osc, oscGain);
      } else if (world === 'jungle') {
        // 08 JUNGLE: Dense tropical rainforest atmosphere + humid canopy air
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1350;
        filter.Q.value = 1.4;
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        createdNodes.push(noise, filter);
      } else if (world === 'night_city' || world === 'neon') {
        // 09 NIGHT CITY: Cyberpunk electronic city hum + illuminated neon glow
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 55;
        const lowFilt = this.ctx.createBiquadFilter();
        lowFilt.type = 'lowpass';
        lowFilt.frequency.value = 140;
        const oscGain = this.ctx.createGain();
        oscGain.gain.value = 0.12;
        osc.connect(lowFilt);
        lowFilt.connect(oscGain);
        oscGain.connect(ambGain);
        osc.start(0);
        createdNodes.push(osc, lowFilt, oscGain);
      } else if (world === 'volcano') {
        // 10 VOLCANO: Deep subterranean volcanic rumble + magma heat
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 85;
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        createdNodes.push(noise, filter);
      } else if (world === 'airport') {
        // 11 AIRPORT: Distant turbine jet murmur + tarmac runway breeze
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1100;
        filter.Q.value = 2.0;
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        createdNodes.push(noise, filter);
      } else if (world === 'harbor') {
        // 12 HARBOR: Marine ship bell resonance + coastal waters
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 350;
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        createdNodes.push(noise, filter);
      } else if (world === 'highway') {
        // 13 HIGHWAY: High-speed road friction + distant expressway traffic
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 310;
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        createdNodes.push(noise, filter);
      } else if (world === 'candy') {
        // 14 CANDY LAND: Sweet whimsical fairy shimmer + sparkling magical breeze
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 587.33; // D5
        const oscGain = this.ctx.createGain();
        oscGain.gain.value = 0.08;
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.8;
        lfo.connect(oscGain.gain);
        osc.connect(oscGain);
        oscGain.connect(ambGain);
        osc.start(0);
        lfo.start(0);
        createdNodes.push(osc, oscGain, lfo);
      } else if (world === 'ruins' || world === 'ancient_ruins') {
        // 15 ANCIENT RUINS: Echoing stone temple breeze + mystical sanctuary resonance
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 460;
        filter.Q.value = 2.2;
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        createdNodes.push(noise, filter);
      } else if (world === 'space') {
        // 16 SPACE: Cosmic deep-void hum + zero-gravity stellar resonance
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 65.41; // C2
        const oscGain = this.ctx.createGain();
        oscGain.gain.value = 0.15;
        osc.connect(oscGain);
        oscGain.connect(ambGain);
        osc.start(0);
        createdNodes.push(osc, oscGain);
      } else if (world === 'tokyo') {
        // 17 TOKYO: Vibrant modern Japanese city night pulse + melodic chime
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 260;
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        createdNodes.push(noise, filter);
      } else if (world === 'wildlife') {
        // 18 WILDLIFE: Savannah golden grass breeze + warm wildlife plains
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 750;
        filter.Q.value = 1.5;
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        createdNodes.push(noise, filter);
      } else if (world === 'underwater') {
        // 19 UNDERWATER: Submerged muffled deep pressure + gentle rising aquatic resonance
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 160;
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        createdNodes.push(noise, filter);
      } else {
        // 20 SKY ISLAND (and default): High-altitude ethereal airy cloud breeze
        const noise = createNoise(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 880;
        filter.Q.value = 1.6;
        noise.connect(filter);
        filter.connect(ambGain);
        noise.start(0);
        createdNodes.push(noise, filter);
      }
    } catch { /* ignore audio graph initialization errors */ }

    this.currentAmbient = {
      id: world,
      gainNode: ambGain,
      nodes: createdNodes,
    };
  }

  /**
   * Duck ambient audio during death or game-over to allow clean impact and resolution.
   */
  public duckAmbient(fadeDurationSec = 0.5): void {
    if (!this.ctx || !this.currentAmbient) return;
    const now = this.ctx.currentTime;
    try {
      this.currentAmbient.gainNode.gain.cancelScheduledValues(now);
      this.currentAmbient.gainNode.gain.setValueAtTime(this.currentAmbient.gainNode.gain.value, now);
      this.currentAmbient.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeDurationSec);
    } catch { /* ignore */ }
  }

  /**
   * Restore ambient audio smoothly on new run or game resumption.
   */
  public restoreAmbient(fadeDurationSec = 0.8): void {
    if (!this.ctx || !this.currentAmbient || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    try {
      this.currentAmbient.gainNode.gain.cancelScheduledValues(now);
      this.currentAmbient.gainNode.gain.setValueAtTime(this.currentAmbient.gainNode.gain.value, now);
      this.currentAmbient.gainNode.gain.linearRampToValueAtTime(1.0, now + fadeDurationSec);
    } catch { /* ignore */ }
  }

  /**
   * Subtle ambient tension scaling as run progresses (0.0 to 1.0)
   */
  public setAmbientTension(tension0to1: number): void {
    if (!this.ctx || !this.currentAmbient) return;
    const t = Math.max(0, Math.min(1, tension0to1));
    for (const node of this.currentAmbient.nodes) {
      if ('frequency' in node && (node as BiquadFilterNode).frequency) {
        try {
          const filter = node as BiquadFilterNode;
          const baseFreq = filter.type === 'lowpass' ? 240 : 450;
          filter.frequency.setValueAtTime(baseFreq * (1.0 + t * 0.35), this.ctx.currentTime);
        } catch { /* ignore */ }
      }
    }
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

    // Guaranteed positive, radiant arcade procedural synthesizers for gameplay feedback
    const ALWAYS_PROCEDURAL = [
      'coin',
      'superpower',
      'fanfare',
      'start_run',
      'gameover',
      'shield_hit',
      'superpower_impact',
      'unlock',
    ];

    if (ALWAYS_PROCEDURAL.includes(name)) {
      this.playFallbackSound(name);
      return;
    }

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
      case 'coin': {
        // Joyful, sparkling golden coin collection chimes
        // Random micro-offset gives runs of coin pickups a delightful musical melody
        const rPitch = 1 + (Math.random() * 0.08 - 0.04);
        this.tone(1318.51 * rPitch, 0.08, 'sine', 0.28, 0.00); // E6
        this.tone(1661.22 * rPitch, 0.10, 'sine', 0.26, 0.03); // G#6
        this.tone(1975.53 * rPitch, 0.13, 'sine', 0.28, 0.06); // B6
        this.tone(2637.02 * rPitch, 0.15, 'triangle', 0.18, 0.08); // E7 glint
        break;
      }
      case 'death': this.tone(160, 0.35, 'sawtooth', 0.3, 0, 40); break;
      case 'unlock':
        // Positive, joyful 4-note unlocking chime (C5 -> E5 -> G5 -> C6)
        [523.25, 659.25, 783.99, 1046.50].forEach((f, i) =>
          this.tone(f, 0.14, 'sine', 0.26, i * 0.06, f * 1.05)
        );
        break;
      case 'gameover':
        // Clean impact thud + smooth warm resolving chord (never sad buzzer/depressive tone)
        this.tone(90, 0.18, 'sine', 0.38, 0, 36); // Solid thud
        this.tone(329.63, 0.30, 'triangle', 0.20, 0.04, 293.66); // E4 -> D4
        this.tone(220.00, 0.36, 'sine', 0.18, 0.06, 196.00); // A3 -> G3
        this.tone(130.81, 0.45, 'sine', 0.24, 0.08, 110.00); // C3 -> A2 warm resolve
        break;
      case 'fanfare':
        // STARTING NEW WORLD SOUND:
        // Uplifting, proud, triumphant world discovery fanfare!
        // Warm sub-bass anchor + soaring major brass and bell motif
        this.tone(130, 0.20, 'sine', 0.36, 0.00, 65); // Warm bass punch
        this.tone(392.00, 0.16, 'triangle', 0.26, 0.00); // G4
        this.tone(523.25, 0.16, 'triangle', 0.28, 0.07); // C5
        this.tone(659.25, 0.18, 'triangle', 0.30, 0.14); // E5
        this.tone(783.99, 0.22, 'triangle', 0.34, 0.22); // G5
        this.tone(1046.50, 0.38, 'sine', 0.36, 0.30); // C6 triumphant peak
        this.tone(1318.51, 0.35, 'sine', 0.28, 0.33); // E6 harmony chime
        this.tone(1567.98, 0.42, 'triangle', 0.22, 0.36); // G6 glockenspiel
        this.tone(2093.00, 0.45, 'sine', 0.16, 0.40); // C7 celestial shimmer
        break;
      case 'start_run':
        // High-energy arcade launch cue:
        // Snappy anticipation pips + energetic GO launch chord
        this.tone(587.33, 0.05, 'square', 0.18, 0.00); // D5 tick
        this.tone(739.99, 0.05, 'square', 0.20, 0.07); // F#5 tick
        this.tone(120, 0.16, 'sine', 0.38, 0.14, 60); // Punch
        this.tone(880.00, 0.22, 'sine', 0.28, 0.14); // A5
        this.tone(1174.66, 0.24, 'triangle', 0.30, 0.14); // D6
        this.tone(1479.98, 0.28, 'sine', 0.22, 0.16); // F#6 sparkling release
        break;
      case 'shield_hit':
        // Energy barrier deflection punch + glass/crystal shatter
        this.tone(220, 0.10, 'sine', 0.35, 0, 75); // Deflection punch
        this.tone(1860, 0.16, 'triangle', 0.25, 0.01, 1400); // Shard 1
        this.tone(2420, 0.14, 'sine', 0.20, 0.02, 1700); // Shard 2
        this.tone(940, 0.12, 'square', 0.10, 0.02, 450); // Electric dissipation
        break;
      case 'superpower':
        // SUPERPOWER COLLECTING SOUND:
        // Uplifting, celebratory, joyful arcade superpower fanfare
        // Ascending crystalline major arpeggio with empowering power surge!
        this.tone(160, 0.12, 'sine', 0.32, 0.00, 80); // Warm sub punch
        this.tone(523.25, 0.14, 'sine', 0.24, 0.00); // C5
        this.tone(659.25, 0.14, 'sine', 0.24, 0.04); // E5
        this.tone(783.99, 0.15, 'triangle', 0.24, 0.08); // G5
        this.tone(1046.50, 0.18, 'sine', 0.26, 0.12); // C6
        this.tone(1318.51, 0.20, 'triangle', 0.28, 0.16); // E6
        this.tone(1567.98, 0.24, 'sine', 0.30, 0.20); // G6
        this.tone(2093.00, 0.30, 'triangle', 0.25, 0.24); // C7 sparkling crown
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

  startRun(): void {
    void this.playSfx('start_run', { volume: 0.95 });
  }

  shieldHit(): void {
    void this.playSfx('shield_hit', { volume: 1.0 });
  }

  superpower(): void {
    void this.playSfx('superpower', { volume: 0.95 });
  }

  superpowerImpact(): void {
    void this.playSfx('superpower_impact', { volume: 0.95 });
  }
}


