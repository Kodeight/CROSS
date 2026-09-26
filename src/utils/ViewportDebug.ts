/**
 * ?viewportdebug — temporary on-device viewport diagnostic (task.md §2).
 * Shows live dimensions so a physical test can pinpoint exactly which layer
 * loses the bottom pixels. Query-gated (?viewportdebug), pointer-events
 * none, zero gameplay impact. Remove when the viewport case is closed.
 */
export interface RendererViewportInfo {
  bufW: number;
  bufH: number;
}

declare const __CROSS_BUILD__: string | undefined;

function num(n: number): string {
  return Number.isFinite(n) ? String(Math.round(n)) : '?';
}

function rectOf(el: Element | null | undefined): string {
  if (!(el instanceof HTMLElement)) return 'missing';
  const r = el.getBoundingClientRect();
  return `${num(r.width)}x${num(r.height)}@${num(r.left)},${num(r.top)}b${num(r.bottom)}`;
}

function cssHeight(sel: string): string {
  try {
    const el = document.querySelector(sel);
    if (!(el instanceof HTMLElement)) return 'missing';
    return getComputedStyle(el).height;
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
      'position:fixed', 'left:8px', 'bottom:8px', 'z-index:90',
      'max-width:94vw', 'max-height:62vh', 'overflow:auto',
      'background:rgba(0,0,0,.85)', 'color:#7CFC00',
      'font:10px/1.45 monospace', 'white-space:pre',
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
      const game = document.getElementById('game');
      const canvas = game?.querySelector('canvas');
      const gameRect = game?.getBoundingClientRect();
      const canvasRect = canvas?.getBoundingClientRect();
      const r = getRenderer();
      const vvH = vv?.height ?? window.innerHeight;
      const gap = gameRect ? num(vvH - gameRect.bottom) : '?';
      const lines = [
        `CROSS! viewportdebug · build ${build} · ${displayModes()}`,
        `inner ${num(window.innerWidth)}x${num(window.innerHeight)} vv ${num(vv?.width ?? NaN)}x${num(vvH)}`,
        `docEl ${num(document.documentElement.clientWidth)}x${num(document.documentElement.clientHeight)} body ${num(document.body.clientWidth)}x${num(document.body.clientHeight)}`,
        `#game ${rectOf(game)} canvas ${rectOf(canvas)}`,
        `canvas.attr ${canvas ? `${canvas.width}x${canvas.height}` : '?'} buffer ${num(r.bufW)}x${num(r.bufH)}`,
        `GAP vv.bottom-game.bottom = ${gap} (0 = full)`,
        `safe-bottom ${safeBottom()}`,
        `css html ${cssHeight('html')} body ${cssHeight('body')} #game ${cssHeight('#game')} canvas ${cssHeight('#game canvas')}`,
      ];
      box.textContent = lines.join('\n');
    } catch { /* probes never break the game */ }
  };

  render();
  const iv = window.setInterval(render, 750);
  void iv;
  const vv = window.visualViewport;
  try {
    window.addEventListener('resize', render);
    window.addEventListener('orientationchange', () => window.setTimeout(render, 300));
    vv?.addEventListener('resize', render);
    vv?.addEventListener('scroll', render);
  } catch { /* interval still updates */ }
}
