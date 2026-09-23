/**
 * ?viewportdebug — temporary on-device viewport diagnostic.
 * Shows live dimensions so physical iOS PWA tests can pinpoint exactly
 * which layer loses pixels and verify edge-to-edge layout.
 */
export interface RendererViewportInfo {
  bufW: number;
  bufH: number;
}

declare const __CROSS_BUILD__: string | undefined;

function num(n: number): string {
  return Number.isFinite(n) ? String(Math.round(n)) : '?';
}

function rectStr(r: DOMRect | null | undefined): string {
  if (!r) return 'missing';
  return `top:${num(r.top)} btm:${num(r.bottom)} h:${num(r.height)} w:${num(r.width)}`;
}

function rectOf(el: Element | null | undefined): string {
  if (!(el instanceof HTMLElement)) return 'missing';
  const r = el.getBoundingClientRect();
  return `${num(r.width)}x${num(r.height)}@${num(r.left)},${num(r.top)} btm:${num(r.bottom)}`;
}

function cssComputed(sel: string, prop: string): string {
  try {
    const el = document.querySelector(sel);
    if (!(el instanceof HTMLElement)) return 'missing';
    return (getComputedStyle(el) as unknown as Record<string, string>)[prop] || '?';
  } catch {
    return '?';
  }
}

function displayModes(): string {
  try {
    const q = (s: string) => window.matchMedia?.(`(display-mode: ${s})`).matches ? s : null;
    const modes = [q('standalone'), q('fullscreen'), q('minimal-ui'), q('browser')].filter(Boolean);
    const ios = (window.navigator as unknown as { standalone?: boolean }).standalone;
    return [...modes, ios ? 'ios-standalone' : ''].filter(Boolean).join(',') || '?';
  } catch {
    return '?';
  }
}

function safeBottom(): string {
  try {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden;';
    document.body.appendChild(probe);
    const v = getComputedStyle(probe).paddingBottom;
    probe.remove();
    return v;
  } catch {
    return '?';
  }
}

export function installViewportDebug(getRenderer: () => RendererViewportInfo): void {
  let box: HTMLElement | null = null;
  try {
    box = document.createElement('div');
    box.id = 'viewport-debug';
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = [
      'position:fixed', 'left:6px', 'bottom:6px', 'z-index:90',
      'max-width:96vw', 'max-height:75vh', 'overflow:auto',
      'background:rgba(0,0,0,.88)', 'color:#7CFC00',
      'font:10px/1.4 monospace', 'white-space:pre',
      'padding:8px 10px', 'border-radius:8px', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(box);
  } catch {
    return;
  }

  let build = '?';
  try {
    build = typeof __CROSS_BUILD__ !== 'undefined' ? __CROSS_BUILD__ : '?';
  } catch { /* ignore */ }

  const render = (): void => {
    if (!box) return;
    try {
      const vv = window.visualViewport;
      const html = document.documentElement;
      const body = document.body;
      const game = document.getElementById('game');
      const canvas = game?.querySelector('canvas');
      const htmlRect = html.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const gameRect = game?.getBoundingClientRect();
      const canvasRect = canvas?.getBoundingClientRect();
      const r = getRenderer();
      const vvH = vv?.height ?? window.innerHeight;
      const gap = gameRect ? num(vvH - gameRect.bottom) : '?';
      const isStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;

      const lines = [
        `=== CROSS! VIEWPORT DIAGNOSTIC ===`,
        `Build: ${build} | DPR: ${window.devicePixelRatio || 1}`,
        `Modes: ${displayModes()} | nav.standalone: ${isStandalone}`,
        `matchMedia(standalone): ${window.matchMedia?.('(display-mode: standalone)').matches}`,
        `matchMedia(fullscreen): ${window.matchMedia?.('(display-mode: fullscreen)').matches}`,
        `matchMedia(minimal-ui): ${window.matchMedia?.('(display-mode: minimal-ui)').matches}`,
        `--- WINDOW & VIEWPORT ---`,
        `window.inner: ${num(window.innerWidth)}x${num(window.innerHeight)}`,
        `visualViewport: ${num(vv?.width ?? NaN)}x${num(vvH)} (top:${num(vv?.offsetTop ?? 0)}, left:${num(vv?.offsetLeft ?? 0)})`,
        `docElement.client: ${num(html.clientWidth)}x${num(html.clientHeight)}`,
        `body.client: ${num(body.clientWidth)}x${num(body.clientHeight)}`,
        `--- LAYER MEASUREMENTS (top, btm, h) ---`,
        `HTML:   ${rectStr(htmlRect)}`,
        `BODY:   ${rectStr(bodyRect)}`,
        `#GAME:  ${rectStr(gameRect)}`,
        `CANVAS: ${rectStr(canvasRect)}`,
        `--- CANVAS & THREE.JS RENDERER ---`,
        `canvas.attr: ${canvas ? `${canvas.width}x${canvas.height}` : '?'}`,
        `Three.js Buffer: ${num(r.bufW)}x${num(r.bufH)}`,
        `--- BOTTOM GAP STATUS ---`,
        `vv.bottom - game.bottom: ${gap}px ${gap === '0' ? '✅ (EDGE-TO-EDGE FULLSCREEN)' : '❌ (GAP DETECTED)'}`,
        `env(safe-area-inset-bottom): ${safeBottom()}`,
        `--- COMPUTED CSS HEIGHTS ---`,
        `html: ${cssComputed('html', 'height')} | body: ${cssComputed('body', 'height')}`,
        `#game: ${cssComputed('#game', 'height')} | canvas: ${cssComputed('#game canvas', 'height')}`,
      ];
      box.textContent = lines.join('\n');
    } catch { /* probes never break the game */ }
  };

  render();
  const iv = window.setInterval(render, 500);
  void iv;
  const vv = window.visualViewport;
  try {
    window.addEventListener('resize', render);
    window.addEventListener('orientationchange', () => window.setTimeout(render, 150));
    vv?.addEventListener('resize', render);
    vv?.addEventListener('scroll', render);
  } catch { /* interval still updates */ }
}

