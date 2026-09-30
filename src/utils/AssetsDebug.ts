/**
 * ?assetsdbg — img2threejs runtime provenance overlay.
 * Shows which 3D assets are reference-generated vs procedural fallback:
 * loaded world chunks, registered factories, per-kind generated build counts
 * and fallback counts. Query-gated, pointer-events none, zero gameplay
 * impact. This is how "are the 3D assets actually in the game" is answered
 * with runtime evidence instead of source inspection.
 */
import { assetsDebugSnapshot } from '../assets/generated/GeneratedAssets';

const EXPECTED_VEHICLES = [
  'city_taxi', 'city_suv', 'city_bus',
  'river_fishing_boat', 'river_speed_boat', 'river_cargo_boat',
  'beach_dune_buggy', 'beach_atv', 'beach_jet_ski',
  'volcano_armored_truck', 'volcano_dump_truck', 'volcano_drill_vehicle',
  'tokyo_white_tuner', 'tokyo_red_tuner', 'tokyo_neon_tram',
];
const EXPECTED_COLLECTIBLES = [
  'coin_star', 'powerup_shield', 'powerup_magnet', 'powerup_freeze',
  'powerup_speed', 'powerup_double_coins', 'powerup_slow_time',
  'powerup_ghost', 'powerup_jump_boost',
];

export function installAssetsDebug(): void {
  let box: HTMLElement | null = null;
  try {
    box = document.createElement('div');
    box.id = 'assetsdbg';
    box.style.cssText = [
      'position:fixed', 'left:8px', 'bottom:8px', 'z-index:9999',
      'max-width:min(92vw,430px)', 'max-height:46vh', 'overflow:auto',
      'background:rgba(10,14,24,.88)', 'color:#7CFC98',
      'font:11px/1.5 ui-monospace,Menlo,Consolas,monospace',
      'padding:8px 10px', 'border-radius:8px', 'white-space:pre-wrap',
      'pointer-events:none',
    ].join(';');
    document.body.appendChild(box);
    const tick = (): void => {
      try {
        if (!box) return;
        const s = assetsDebugSnapshot();
        const gen = Object.entries(s.generated);
        const fb = Object.entries(s.fallbacks);
        const genTotal = gen.reduce((a, [, n]) => a + n, 0);
        const fbTotal = fb.reduce((a, [, n]) => a + n, 0);
        const registered = new Set(s.factories);
        const row = (k: string): string => {
          const g = (s.generated as Record<string, number>)[k] ?? 0;
          const f = (s.fallbacks as Record<string, number>)[k] ?? 0;
          const reg = registered.has(k) ? 'Y' : '-';
          return `${k}|GEN${g}|FB${f}|REG${reg}`;
        };
        const fails = Object.entries(s.failures);
        box.textContent =
          `ASSETSDBG chunks=[${s.chunks.join(',') || '-'}] factories=${s.factories.length}\n` +
          `generated=${genTotal} fallbacks=${fbTotal}\n` +
          `VEHICLES\n${EXPECTED_VEHICLES.map(row).join('\n')}\n` +
          `COLLECTIBLES\n${EXPECTED_COLLECTIBLES.map(row).join('\n')}` +
          (fails.length ? `\nFAIL\n${fails.map(([k, m]) => `${k}: ${m}`).join('\n')}` : '\nFAIL none');
      } catch { /* overlay must never break the game */ }
    };
    tick();
    window.setInterval(tick, 1000);
  } catch { /* ignore */ }
}
