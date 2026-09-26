/**
 * §21/§22 — PWA: service-worker registration (http(s) only, never file://),
 * install affordance, iOS hint. The game never depends on the worker.
 */
import type { UIManager } from './ui/UIManager';
import { isTouchDevice } from './utils/DeviceUtils';

export function registerPWA(ui: UIManager, onClick: () => void): void {
  // Background auto-pause is handled by Game; viewport changes here.
  try {
    window.addEventListener('orientationchange', () => {
      window.dispatchEvent(new Event('cross:resize'));
    });
  } catch { /* ignore */ }

  try {
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
