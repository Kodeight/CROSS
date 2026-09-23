/**
 * ?viewportdebug — temporary on-device viewport diagnostic.
 * Shows live dimensions so physical iOS PWA tests can pinpoint exactly
 * which layer loses pixels and verify edge-to-edge layout.
 */
export interface RendererViewportInfo {
  bufW: number;
  bufH: number;
  cssW?: number;
  cssH?: number;
  aspect?: number;
  pixelRatio?: number;
}

declare const __CROSS_BUILD__: string | undefined;

function num(n: number): string {
  return Number.isFinite(n) ? String(Math.round(n)) : '?';
}

function rectStr(r: DOMRect | null | undefined): string {
  if (!r) return 'missing';
  return `top:${num(r.top)} btm:${num(r.bottom)} left:${num(r.left)} right:${num(r.right)} w:${num(r.width)} h:${num(r.height)}`;
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

function getSafeInsets(): { top: string; bottom: string; left: string; right: string } {
  try {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:0;height:0;width:0;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right);';
    document.body.appendChild(probe);
    const style = getComputedStyle(probe);
    const insets = {
      top: style.paddingTop || '0px',
      bottom: style.paddingBottom || '0px',
      left: style.paddingLeft || '0px',
      right: style.paddingRight || '0px',
    };
    probe.remove();
    return insets;
  } catch {
    return { top: '?', bottom: '?', left: '?', right: '?' };
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
      'max-width:96vw', 'max-height:80vh', 'overflow:auto',
      'background:rgba(0,0,0,.92)', 'color:#7CFC00',
      'font:10px/1.3 monospace', 'white-space:pre',
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
      const insets = getSafeInsets();
      const dpr = window.devicePixelRatio || 1;
      const isStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;

      // Authoritative target viewport
      const targetW = Math.max(window.innerWidth, html.clientWidth);
      const targetH = Math.max(window.innerHeight, html.clientHeight);

      // Gap calculations
      const gameBottom = gameRect ? gameRect.bottom : 0;
      const canvasBottom = canvasRect ? canvasRect.bottom : 0;
      const bottomGap = targetH - gameBottom;
      const canvasBottomGap = targetH - canvasBottom;
      const topGap = gameRect ? gameRect.top : 0;
      const canvasTopGap = canvasRect ? canvasRect.top : 0;
      const leftGap = gameRect ? gameRect.left : 0;
      const rightGap = targetW - (gameRect ? gameRect.right : 0);

      // PASS / FAIL conditions
      const passGameFills = (gameRect && Math.abs(gameRect.width - targetW) <= 1 && Math.abs(gameRect.height - targetH) <= 1 && Math.abs(topGap) <= 1 && Math.abs(bottomGap) <= 1);
      const passCanvasFills = (canvasRect && Math.abs(canvasRect.width - targetW) <= 1 && Math.abs(canvasRect.height - targetH) <= 1 && Math.abs(canvasTopGap) <= 1 && Math.abs(canvasBottomGap) <= 1);
      const rendererPr = r.pixelRatio && r.pixelRatio > 0 ? r.pixelRatio : dpr;
      const expectedBufW = Math.round(targetW * rendererPr);
      const expectedBufH = Math.round(targetH * rendererPr);
      const passRendererMatches = (Math.abs(r.bufW - expectedBufW) <= 2 && Math.abs(r.bufH - expectedBufH) <= 2);
      const passNoBottomGap = Math.abs(bottomGap) <= 1 && Math.abs(canvasBottomGap) <= 1;
      const passNoTopGap = Math.abs(topGap) <= 1 && Math.abs(canvasTopGap) <= 1;
      const passNoLeftGap = Math.abs(leftGap) <= 1;
      const passNoRightGap = Math.abs(rightGap) <= 1;

      const flag = (ok: boolean) => ok ? '✅ PASS' : '❌ FAIL';

      const lines = [
        `=== CROSS! VIEWPORT DIAGNOSTIC ===`,
        `Build: ${build} | DPR: ${dpr} (Renderer PR: ${rendererPr}) | Standalone: ${isStandalone} | Display: ${displayModes()}`,
        `Safe insets: top:${insets.top} btm:${insets.bottom} left:${insets.left} right:${insets.right}`,
        `--- STATUS SUMMARY ---`,
        `GAME FILLS VIEWPORT:      ${flag(Boolean(passGameFills))}`,
        `CANVAS FILLS VIEWPORT:    ${flag(Boolean(passCanvasFills))}`,
        `RENDERER MATCHES VIEWPORT:${flag(passRendererMatches)}`,
        `NO BOTTOM GAP:            ${flag(passNoBottomGap)} (gap: ${num(bottomGap)}px, canvasGap: ${num(canvasBottomGap)}px)`,
        `NO TOP GAP:               ${flag(passNoTopGap)} (gap: ${num(topGap)}px)`,
        `NO LEFT GAP:              ${flag(passNoLeftGap)} (gap: ${num(leftGap)}px)`,
        `NO RIGHT GAP:             ${flag(passNoRightGap)} (gap: ${num(rightGap)}px)`,
        `--- WINDOW & CLIENT SIZES ---`,
        `window.inner:    ${num(window.innerWidth)}x${num(window.innerHeight)}`,
        `visualViewport:  ${num(vv?.width ?? NaN)}x${num(vv?.height ?? NaN)}`,
        `docElement.client: ${num(html.clientWidth)}x${num(html.clientHeight)}`,
        `body.client:     ${num(body.clientWidth)}x${num(body.clientHeight)}`,
        `--- ELEMENT RECTANGLES ---`,
        `HTML:   ${rectStr(htmlRect)}`,
        `BODY:   ${rectStr(bodyRect)}`,
        `#GAME:  ${rectStr(gameRect)}`,
        `CANVAS: ${rectStr(canvasRect)}`,
        `--- THREE.JS RENDERER & CAMERA ---`,
        `Renderer Size:  ${r.cssW ?? '?'}x${r.cssH ?? '?'} (buf: ${num(r.bufW)}x${num(r.bufH)}, expected: ${expectedBufW}x${expectedBufH})`,
        `Camera Aspect:  ${r.aspect ? r.aspect.toFixed(3) : '?'} (target: ${(targetW / Math.max(1, targetH)).toFixed(3)})`,
        `Canvas attr:    ${canvas ? `${canvas.width}x${canvas.height}` : '?'}`,
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

