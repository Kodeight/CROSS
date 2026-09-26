/**
 * PlatformAdapter — clean platform-agnostic boundary.
 * Decouples core gameplay from direct browser DOM / window / navigator calls,
 * making future iOS / Android native app packaging seamless.
 */

export interface PlatformCapabilities {
  isTouch: boolean;
  canVibrate: boolean;
  isStandalone: boolean;
  os: 'ios' | 'android' | 'desktop';
}

export class PlatformAdapter {
  private static instance: PlatformAdapter | null = null;

  static get(): PlatformAdapter {
    if (!PlatformAdapter.instance) {
      PlatformAdapter.instance = new PlatformAdapter();
    }
    return PlatformAdapter.instance;
  }

  getCapabilities(): PlatformCapabilities {
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    const os = /iphone|ipad|ipod/.test(ua) ? 'ios' : /android/.test(ua) ? 'android' : 'desktop';

    return { isTouch, canVibrate, isStandalone, os };
  }

  vibrate(pattern: number | number[]): void {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch { /* ignore */ }
  }

  storageGet(key: string): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch { /* ignore */ }
    return null;
  }

  storageSet(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch { /* ignore */ }
  }
}
