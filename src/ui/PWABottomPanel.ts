/**
 * Mobile PWA Bottom Gameplay Instruction Panel
 *
 * Implements a solid, world-integrated concave bottom gameplay instruction
 * panel for the installed mobile PWA (iOS & Android) ONLY.
 *
 * Requirements:
 * - Installed mobile PWA only (display-mode: standalone / fullscreen or iOS standalone)
 * - Solid color matching the active world's authoritative ground/environment tone
 * - Zero transparency, zero blur, zero glassmorphism
 * - Deep smooth concave curved top edge (higher on left/right, dips in center)
 * - Extends edge-to-edge behind the iOS/Android system gesture bar / home indicator
 * - Safe area padding for text content
 * - Minimal, elegant gameplay instructions:
 *     [subtle minimal swipe/move icon]
 *     SWIPE TO MOVE (bold uppercase white)
 *     AVOID TRAFFIC (warm off-white / slightly muted light uppercase)
 */

import { getFadeColorForWorld } from '../config/worlds.config';
import { isStandalonePWA, isTouchDevice } from '../utils/DeviceUtils';

export class PWABottomPanel {
  private container: HTMLElement | null = null;
  private pathEl: SVGPathElement | null = null;
  private currentWorldId: string = 'city';
  private visible: boolean = false;
  private isStandaloneMobile: boolean = false;

  constructor() {
    this.checkMode();
    this.createDOM();
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleResize);
  }

  private checkMode(): boolean {
    const isTouch = isTouchDevice();
    const isStandalone = isStandalonePWA();
    const forceDebug = typeof location !== 'undefined' && /[?&](pwapanel|pwadbg|forcepanel)/i.test(location.search);
    // Standalone PWA on touch/mobile device (or explicit ?pwapanel debug flag)
    this.isStandaloneMobile = (isStandalone && isTouch) || forceDebug;
    return this.isStandaloneMobile;
  }

  private createDOM(): void {
    if (typeof document === 'undefined') return;

    let el = document.getElementById('pwa-bottom-panel');
    if (!el) {
      el = document.createElement('section');
      el.id = 'pwa-bottom-panel';
      el.setAttribute('aria-label', 'Gameplay instructions');
      el.setAttribute('role', 'region');
      el.hidden = true;

      el.innerHTML = `
        <div class="pwa-panel-curve-wrap" aria-hidden="true">
          <svg class="pwa-panel-svg" viewBox="0 0 1000 120" preserveAspectRatio="none">
            <path id="pwa-panel-curve-path" d="M 0,0 Q 500,110 1000,0 L 1000,120 L 0,120 Z" fill="#848886" />
          </svg>
        </div>
        <div class="pwa-panel-body">
          <div class="pwa-panel-content">
            <div class="pwa-panel-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 4L7 9H17L12 4Z" fill="currentColor"/>
                <path d="M12 20L17 15H7L12 20Z" fill="currentColor" opacity="0.6"/>
                <path d="M4 12L9 17V7L4 12Z" fill="currentColor" opacity="0.6"/>
                <path d="M20 12L15 7V17L20 12Z" fill="currentColor" opacity="0.6"/>
                <circle cx="12" cy="12" r="2.2" fill="currentColor"/>
              </svg>
            </div>
            <div class="pwa-panel-primary">SWIPE TO MOVE</div>
            <div class="pwa-panel-secondary">AVOID TRAFFIC</div>
          </div>
        </div>
      `;

      document.body.appendChild(el);
    }

    this.container = el;
    this.pathEl = el.querySelector('#pwa-panel-curve-path');
    this.applyWorldColor(this.currentWorldId);
  }

  private handleResize(): void {
    this.checkMode();
    this.updateVisibility();
  }

  public setWorld(worldId: string): void {
    this.currentWorldId = worldId;
    this.applyWorldColor(worldId);
  }

  private applyWorldColor(worldId: string): void {
    const [r, g, b] = getFadeColorForWorld(worldId);
    const colorHex = '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');

    if (this.container) {
      this.container.style.setProperty('--panel-ground-color', colorHex);
    }
    if (this.pathEl) {
      this.pathEl.setAttribute('fill', colorHex);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--panel-ground-color', colorHex);
      const loading = document.getElementById('loading');
      // If loading is already gone, keep body matching the active world ground
      if (!loading || loading.style.display === 'none') {
        document.body.style.backgroundColor = colorHex;
      }
    }
  }

  public setVisible(show: boolean): void {
    this.visible = show;
    this.updateVisibility();
  }

  private updateVisibility(): void {
    if (!this.container) return;
    this.checkMode();

    // STRICT SCOPE: Only display in installed standalone mobile PWA during active gameplay/intro
    const shouldDisplay = this.isStandaloneMobile && this.visible;
    if (shouldDisplay) {
      this.container.hidden = false;
      this.container.classList.add('visible');
    } else {
      this.container.hidden = true;
      this.container.classList.remove('visible');
    }
  }

  public destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.pathEl = null;
  }
}
