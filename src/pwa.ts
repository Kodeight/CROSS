/**
 * §21/§22 — PWA: service-worker registration (http(s) only, never file://),
 * install affordance, iOS hint, and PWA screen orientation locking to portrait.
 * The game never depends on the worker.
 */
import type { UIManager } from './ui/UIManager';
import { isTouchDevice } from './utils/DeviceUtils';

/**
 * Locks screen orientation to portrait on mobile PWA and supporting browsers.
 * Handles modern Screen Orientation API, vendor prefixes, and user-gesture timing.
 */
export function lockScreenOrientationPortrait(): void {
  try {
    const screenAny = window.screen as unknown as {
      orientation?: {
        lock?: (orientation: string) => Promise<void>;
        type?: string;
      };
      lockOrientation?: (orientation: string) => boolean;
      mozLockOrientation?: (orientation: string) => boolean;
      msLockOrientation?: (orientation: string) => boolean;
    };
    if (screenAny?.orientation?.lock) {
      screenAny.orientation.lock('portrait').catch(() => {
        // Some browsers only allow lock in standalone / fullscreen or after user gesture
      });
    } else if (screenAny?.lockOrientation) {
      screenAny.lockOrientation('portrait');
    } else if (screenAny?.mozLockOrientation) {
      screenAny.mozLockOrientation('portrait');
    } else if (screenAny?.msLockOrientation) {
      screenAny.msLockOrientation('portrait');
    }
  } catch {
    /* Orientation lock is best-effort and must never throw */
  }
}

export function registerPWA(ui: UIManager, onClick: () => void): void {
  // Enforce portrait orientation lock immediately and on user gestures
  lockScreenOrientationPortrait();
  try {
    const lockOnGesture = (): void => {
      lockScreenOrientationPortrait();
    };
    window.addEventListener('pointerdown', lockOnGesture, { passive: true });
    window.addEventListener('touchstart', lockOnGesture, { passive: true });
  } catch { /* ignore */ }

  // Background auto-pause is handled by Game; viewport changes & orientation lock here.
  try {
    window.addEventListener('orientationchange', () => {
      lockScreenOrientationPortrait();
      window.dispatchEvent(new Event('cross:resize'));
      window.setTimeout(() => lockScreenOrientationPortrait(), 120);
      window.setTimeout(() => lockScreenOrientationPortrait(), 350);
    });
    window.addEventListener('resize', () => {
      lockScreenOrientationPortrait();
    }, { passive: true });
  } catch { /* ignore */ }

  try {
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          if ((name.includes('cross-assets') || name.includes('workbox-precache')) && !name.includes('2026-09-current')) {
            void caches.delete(name);
          }
        }
      }).catch(() => { /* ignore */ });
    }
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) {
      void import('virtual:pwa-register').then((mod) => {
        try {
          (mod as { registerSW: (opts: unknown) => void }).registerSW({ immediate: true });
        } catch { /* worker is optional */ }
      }).catch(() => { /* worker is optional */ });
    }
  } catch { /* ignore */ }

  try {
    const installBtn = document.getElementById('btn-install');
    const hint = document.getElementById('ios-install-hint');
    let dismissed = false;
    try {
      dismissed = localStorage.getItem('cross_install_dismiss') === '1';
    } catch { /* ignore */ }
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      ui.deferredInstallPrompt = e;
      if (installBtn) installBtn.hidden = false;
    });
    window.addEventListener('appinstalled', () => {
      ui.deferredInstallPrompt = null;
      if (installBtn) installBtn.hidden = true;
      if (hint) hint.hidden = true;
    });
    if (installBtn && !(installBtn as unknown as { _bound?: boolean })._bound) {
      (installBtn as unknown as { _bound?: boolean })._bound = true;
      installBtn.addEventListener('click', () => {
        onClick();
        const prompt = ui.deferredInstallPrompt as {
          prompt: () => void;
          userChoice: Promise<unknown>;
        } | null;
        if (!prompt) {
          installBtn.hidden = true;
          return;
        }
        try {
          prompt.prompt();
          prompt.userChoice.then(() => {
            ui.deferredInstallPrompt = null;
            installBtn.hidden = true;
          }).catch(() => { /* ignore */ });
        } catch {
          installBtn.hidden = true;
        }
      });
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
    let isStandalone = false;
    try {
      isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    } catch { /* ignore */ }
    if (hint && isIOS && !isStandalone && !dismissed && !('onbeforeinstallprompt' in window)) {
      hint.hidden = false;
      const dis = document.getElementById('btn-dismiss-install');
      if (dis && !(dis as unknown as { _bound?: boolean })._bound) {
        (dis as unknown as { _bound?: boolean })._bound = true;
        dis.addEventListener('click', () => {
          hint.hidden = true;
          try {
            localStorage.setItem('cross_install_dismiss', '1');
          } catch { /* ignore */ }
        });
      }
    }
    void isTouchDevice;
  } catch { /* ignore */ }
}
