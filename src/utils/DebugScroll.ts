/**
 * ?debug-only runtime probes for the Characters/Worlds/Missions scroll
 * investigation (task.md). Never runs in production: Game installs these
 * only when location has ?debug, mirroring the traffic-audit pattern.
 *
 * Purpose: on a real device the ?debug overlay shows live values that
 * classify a scroll failure immediately:
 *   A) no overflow            -> sh <= ch  (layout/content problem)
 *   B) wrong event target     -> tgt/el not inside the modal
 *   C) touch blocked          -> touchAction none / preventDefault (see tgt)
 *   D) container not changing -> st frozen while swiping
 *   E) gesture intercepted    -> game lane/moves change during modal swipe
 */

export interface ModalScrollInfo {
  section: string;
  visible: boolean;
  /** scrollHeight / clientHeight / scrollTop of .panel-scroll */
  sh: number;
  ch: number;
  st: number;
  overflowY: string;
  touchAction: string;
  pointerEvents: string;
  maxH: string;
  rect: string;
  /** elementFromPoint at the scroller center: must be modal/card, not canvas */
  elAtCenter: string;
}

function selOf(el: Element | null): string {
  if (!el || !(el instanceof Element)) return '(none)';
  const parts: string[] = [];
  let cur: Element | null = el;
  for (let i = 0; i < 4 && cur; i++) {
    let s = cur.tagName.toLowerCase();
    if (cur.id) s += `#${cur.id}`;
    else if (cur.className && typeof cur.className === 'string') {
      const c = cur.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (c) s += `.${c}`;
    }
    parts.unshift(s);
    cur = cur.parentElement;
  }
  return parts.join(' ');
}

const SECTIONS = ['chars-screen', 'worlds-screen', 'missions-screen'] as const;

export function modalScrollInfo(): ModalScrollInfo[] {
  const out: ModalScrollInfo[] = [];
  for (const id of SECTIONS) {
    try {
      const sec = document.getElementById(id);
      if (!sec) continue;
      const visible = !sec.hidden;
      const scroller = sec.querySelector('.panel-scroll');
      if (!(scroller instanceof HTMLElement)) {
        out.push({
          section: id, visible, sh: -1, ch: -1, st: -1, overflowY: '?',
          touchAction: '?', pointerEvents: '?', maxH: '?', rect: '?', elAtCenter: '?',
        });
        continue;
      }
      const cs = getComputedStyle(scroller);
      const r = scroller.getBoundingClientRect();
      let elAtCenter = '(none)';
      try {
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        elAtCenter = selOf(hit);
      } catch { /* ignore */ }
      out.push({
        section: id,
        visible,
        sh: scroller.scrollHeight,
        ch: scroller.clientHeight,
        st: scroller.scrollTop,
        overflowY: cs.overflowY,
        touchAction: cs.touchAction,
        pointerEvents: cs.pointerEvents,
        maxH: cs.maxHeight,
        rect: `${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.left)},${Math.round(r.top)}`,
        elAtCenter,
      });
    } catch { /* probes must never break the game */ }
  }
  return out;
}

/** Last pointerdown target (?debug): proves whether modal or game got the touch. */
let lastDown = '(none)';
let downCount = 0;

export function installPointerProbe(): void {
  try {
    document.addEventListener('pointerdown', (e) => {
      try {
        downCount++;
        const t = e.target instanceof Element ? e.target : null;
        lastDown = `${Math.round(e.clientX)},${Math.round(e.clientY)} ${selOf(t)}`;
      } catch { /* ignore */ }
    }, { capture: true, passive: true });
  } catch { /* ignore */ }
}

export function lastPointerDown(): string {
  return `#${downCount} ${lastDown}`;
}
