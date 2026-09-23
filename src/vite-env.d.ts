/// <reference types="vite/client" />

/** Build identifier injected by vite.config.ts (timestamp + git hash). */
declare const __CROSS_BUILD__: string;

declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
  }): (reloadPage?: boolean) => void;
}
