/**
 * liquidUI — central manager for CROSS! liquid-glass surfaces.
 *
 * Wraps the real QuickLiquid `LiquidGlassEngine` (+ `LiquidButton` press
 * physics) around the existing DOM. No parallel UI system, no mockups:
 * the same `#hud-coins`, `#world-header`, `#btn-pause`, `.menu-card`,
 * `.panel`, `.over-card` and menu buttons the game already owns.
 *
 * Chromium backdrop rules (from the QuickLiquid reel source):
 * `opacity`, `filter`, `mask`, `mix-blend-mode`, `isolation` must NEVER
 * appear on a glass host or its ancestors. Glass hosts animate via
 * transform / width / height / engine config only; fades happen on
 * children inside `.ql-content`. This file never sets those properties,
 * and style.css keeps glass hosts opacity-animation-free.
 */
import { LiquidGlassEngine, LiquidButton, type LiquidGlassConfig } from 'quick-liquid';
import type { QualityLevel } from '../config/game.config';

export type LiquidTier = 'low' | 'medium' | 'high';

/** Save quality → QuickLiquid fidelity. Layout never changes, only material. */
export function gameQualityToLiquid(q: QualityLevel): { quality: LiquidTier; refractionMode: 'svg' | 'css' } {
  switch (q) {
    case 'LOW':
      // Efficient fallback: CSS frost path, no SVG displacement maps.
      return { quality: 'low', refractionMode: 'css' };
    case 'HIGH':
      return { quality: 'high', refractionMode: 'svg' };
    case 'MEDIUM':
    case 'AUTO':
    default:
      return { quality: 'medium', refractionMode: 'svg' };
  }
}

/** Demo-derived base (demo/src/App.tsx GLASS_BASE): restrained, readable. */
const GLASS_BASE: Partial<LiquidGlassConfig> = {
  blur: 3,
  saturation: 1.5,
  refractionStrength: 22,
  bezelWidth: 34,
  thickness: 24,
  edgeHighlight: 0.9,
  specularStrength: 0.42,
  chromaticAberration: 0.3,
  tintOpacity: 0.04,
  ior: 1.5,
  lightAngle: -35,
  fresnelPower: 2.2,
  noiseOpacity: 0,
  refractionMode: 'svg',
  hoverLighting: true,
  cursorTracking: false,
  parallax: false,
};

const PRESETS = {
  /** Floating utility capsules: strong readability, minimal noise. */
  utility: { ...GLASS_BASE, material: 'clear', blur: 4, refractionStrength: 18, edgeHighlight: 0.7, specularStrength: 0.3, elevation: 0.8 },
  /** Primary PLAY: stronger depth + rim + interaction response. */
  primary: { ...GLASS_BASE, material: 'regular', blur: 10, refractionStrength: 24, bezelWidth: 30, thickness: 26, edgeHighlight: 1, specularStrength: 0.5, elevation: 1.2 },
  /** Secondary buttons: same family, lighter emphasis. */
  secondary: { ...GLASS_BASE, material: 'thin', blur: 8, refractionStrength: 16, bezelWidth: 24, thickness: 18, edgeHighlight: 0.6, specularStrength: 0.3, elevation: 0.7 },
  /** Large panels/sheets: heavy frost so the backdrop reads as creamy
   * blur, with real displacement + rim light underneath for the liquid
   * identity. Text stays crisp above the filter layers. */
  panel: { ...GLASS_BASE, material: 'regular', blur: 18, refractionStrength: 20, bezelWidth: 28, thickness: 20, edgeHighlight: 0.8, specularStrength: 0.35, tint: '255,253,245', tintOpacity: 0.12, elevation: 1 },
  /** Small cards (character/world): cheap, readable. */
  card: { ...GLASS_BASE, material: 'thin', blur: 6, refractionStrength: 14, bezelWidth: 22, thickness: 16, edgeHighlight: 0.55, specularStrength: 0.28, elevation: 0.7 },
} satisfies Record<string, Partial<LiquidGlassConfig>>;

/** Subtle per-world environmental influence — same material, whisper of tint. */
const WORLD_TINTS: Record<string, string> = {
  city: '255, 253, 245',
  jungle: '224, 255, 224',
  desert: '255, 240, 200',
  snow: '232, 243, 255',
  neon: '204, 224, 255',
  beach: '255, 250, 222',
};

interface AttachOpts {
  preset: keyof typeof PRESETS;
  borderRadius: number;
  press?: boolean | { scale?: number; squish?: number };
  /** Restore vertical scroll after mount (engine forces overflow hidden). */
  allowScroll?: boolean;
  /**
   * WAAPI scale animations (animateIn/jiggle) REPLACE the CSS `transform`
   * for their duration. Hosts positioned via transform (the world notch:
   * left:50% + translateX(-50%)) must opt out or they visibly jump
   * sideways; their motion is owned by translate-safe CSS keyframes.
   */
  waapi?: boolean;
  /**
   * Game color identity, integrated INTO the liquid material (engine tint,
   * not a flat CSS rectangle): subtle RGB + low opacity so refraction,
   * rim light and backdrop visibility survive.
   */
  tint?: { rgb: string; opacity: number };
}

class LiquidUIManager {
  private engines = new Map<HTMLElement, LiquidGlassEngine>();
  private presses = new Map<HTMLElement, LiquidButton>();
  private quality: QualityLevel = 'AUTO';
  private reduceMotion = false;

  get size(): number {
    return this.engines.size;
  }

  setReducedMotion(v: boolean): void {
    this.reduceMotion = v;
  }

  private liquidCfg(): { quality: LiquidTier; refractionMode: 'svg' | 'css' } {
    return gameQualityToLiquid(this.quality);
  }

  private attachOne(el: HTMLElement, opts: AttachOpts): void {
    if (this.engines.has(el)) return;
    if (el.dataset.liquid === 'off') return;
    try {
      const base = PRESETS[opts.preset];
      const cfg: Partial<LiquidGlassConfig> = {
        ...base,
        ...this.liquidCfg(),
        borderRadius: opts.borderRadius,
        ...(opts.tint ? { tint: opts.tint.rgb, tintOpacity: opts.tint.opacity, adaptiveTint: false } : {}),
      };
      const engine = new LiquidGlassEngine(el, cfg);
      this.engines.set(el, engine);
      if (opts.allowScroll) {
        // Scrollable host (menu card): keep engine layers, restore scrolling.
        el.style.overflowY = 'auto';
        el.style.overflowX = 'hidden';
      }
      if (opts.press && !this.reduceMotion) {
        try {
          const cfg = typeof opts.press === 'object'
            ? { pressScale: opts.press.scale, pressSquish: opts.press.squish }
            : undefined;
          const btn = new LiquidButton(el, cfg);
          this.presses.set(el, btn);
        } catch { /* press is decorative */ }
      }
      if (opts.waapi !== false) engine.animateIn(0);
    } catch { /* glass must never break the game — CSS stays readable */ }
  }

  /** Attach every known static surface. Safe to call repeatedly (idempotent). */
  refresh(): void {
    const q = (sel: string): HTMLElement | null => {
      try {
        return document.querySelector(sel) as HTMLElement | null;
      } catch {
        return null;
      }
    };
    const qa = (sel: string): HTMLElement[] => {
      try {
        return Array.from(document.querySelectorAll(sel)) as HTMLElement[];
      } catch {
        return [];
      }
    };
    const coins = q('#hud-coins');
    if (coins) this.attachOne(coins, { preset: 'utility', borderRadius: 999 });
    const notch = q('#world-header');
    if (notch) this.attachOne(notch, { preset: 'utility', borderRadius: 18, waapi: false });
    const pause = q('#btn-pause');
    if (pause) this.attachOne(pause, { preset: 'utility', borderRadius: 14, press: true });
    const menu = q('#menu .menu-card');
    if (menu) this.attachOne(menu, { preset: 'panel', borderRadius: 24, allowScroll: true });
    const play = q('#btn-play');
    if (play) this.attachOne(play, { preset: 'primary', borderRadius: 14, press: { scale: 0.94, squish: 0.025 }, tint: { rgb: '122,199,79', opacity: 0.14 } });
    // Game color identity per button (coherent CROSS! palette, always
    // subtle so the refraction underneath stays visible). PLAY stays green
    // and strongest; settings/install remain neutral/system.
    const menuTints: Record<string, { rgb: string; opacity: number }> = {
      '#btn-chars': { rgb: '255,150,50', opacity: 0.10 },
      '#btn-worlds': { rgb: '60,200,255', opacity: 0.10 },
      '#btn-missions': { rgb: '255,205,70', opacity: 0.12 },
    };
    for (const b of qa('#menu .menu-row .btn, #btn-settings, #menu .btn.wide, #btn-install')) {
      const key = b.id ? `#${b.id}` : '';
      this.attachOne(b, { preset: 'secondary', borderRadius: 14, press: true, tint: menuTints[key] });
    }
    for (const p of qa('#chars-screen .panel, #worlds-screen .panel, #missions-screen .panel, #pause-screen .panel')) {
      this.attachOne(p, { preset: 'panel', borderRadius: 22 });
    }
    // Settings rows are short but can exceed small landscape heights —
    // keep the host scrollable while the engine owns overflow.
    const settings = q('#settings-screen .panel');
    if (settings) this.attachOne(settings, { preset: 'panel', borderRadius: 22, allowScroll: true });
    const over = q('#gameover .over-card');
    if (over) this.attachOne(over, { preset: 'panel', borderRadius: 24 });
    // Primary continues (resume / play again) stay green; secondary actions
    // remain neutral.
    const actionTints: Record<string, { rgb: string; opacity: number }> = {
      '#btn-resume': { rgb: '122,199,79', opacity: 0.12 },
      '#btn-again': { rgb: '122,199,79', opacity: 0.12 },
    };
    for (const b of qa('#gameover .btn, #pause-screen .btn, .panel .btn, .panel .modal-x, #app-error .btn')) {
      const key = b.id ? `#${b.id}` : '';
      this.attachOne(b, { preset: 'secondary', borderRadius: 14, press: true, tint: actionTints[key] });
    }
    for (const c of qa('.char-card')) {
      this.attachOne(c, { preset: 'card', borderRadius: 16, press: true });
    }
    for (const m of qa('.mission, .ach')) {
      this.attachOne(m, { preset: 'card', borderRadius: 12 });
    }
  }

  /** Game quality changed → update material fidelity only (never layout). */
  setQuality(q: QualityLevel): void {
    this.quality = q;
    const lq = this.liquidCfg();
    for (const e of this.engines.values()) {
      try {
        e.updateConfig({ quality: lq.quality, refractionMode: lq.refractionMode });
      } catch { /* ignore */ }
    }
  }

  /** Subtle world-aware tint on the notch — same material, whisper of place. */
  setWorldTheme(worldId: string): void {
    const tint = WORLD_TINTS[worldId];
    if (!tint) return;
    const notch = document.getElementById('world-header');
    if (!notch) return;
    const engine = this.engines.get(notch);
    if (!engine) return;
    try {
      engine.updateConfig({ tint, tintOpacity: 0.08, adaptiveTint: false });
    } catch { /* ignore */ }
  }

  /**
   * World changed → the liquid surface reacts. The notch is positioned via
   * CSS translateX(-50%), so WAAPI jiggle (scale-only keyframes that would
   * drop the centering shift and fling the notch sideways) is deliberately
   * NOT used — the translate-safe wh-swap CSS animation in worldNotch.ts
   * owns the transition, triggered via hud.update().
   */
  notifyWorldChange(): void {
    // Intentionally animation-free: see above.
  }

  /** Content layer for floating feedback (engine wraps children in .ql-content). */
  contentLayer(host: HTMLElement): HTMLElement {
    try {
      const inner = host.querySelector(':scope > .ql-content');
      if (inner instanceof HTMLElement) return inner;
    } catch { /* ignore */ }
    return host;
  }

  destroy(): void {
    for (const b of this.presses.values()) {
      try {
        b.destroy();
      } catch { /* ignore */ }
    }
    this.presses.clear();
    for (const e of this.engines.values()) {
      try {
        e.destroy();
      } catch { /* ignore */ }
    }
    this.engines.clear();
  }
}

export const liquidUI = new LiquidUIManager();
