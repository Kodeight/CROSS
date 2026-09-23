# CROSS! — Implementation Status

Last update: 2026-09-23 · branch `main` · typecheck PASS · production build PASS.

## Accepted / preserved systems (do NOT regress)
- Obstacle collision: `Lane.occupied` (generation) → `Player.queueMove(dir, max, isBlocked?)`
  → `PlayerController` predicate → `Game` predicate. Traffic separate.
- Jump: `queueJump` (landing free, mid needs `jumpable`), SPACE / double-tap.
- Journey: `lastWorldId/lastLane` checkpoint; resume same world, backed off,
  re-validated to field. World switch starts a new journey.
- Missions: `requires` gating standard→challenge→master; data-driven.
- Economy: `TESTING_MODE = false`; chicken/city free, rest priced.
- Coins: full-integer internally, compact HUD format (no `.0`).
- QuickLiquid: real `LiquidGlassEngine` API (values match the repo demo's own
  GLASS_BASE); no WAAPI on transform-positioned hosts; modal scroll chain
  intact; overlay layers are pointer-events:none (verified in engine source).
- LOW = gameplay baseline; quality changes rendering only.

## Changed this round (task.md device-truth)
- Engine trace: `updateConfig` merges (tints survive); `{...DEFAULT,
  ...preset, ...config}` order means our values win; `hoverLighting`
  reverted to false per repo authors' own guidance.
- Tints now vivid (violet .32, cyan/amber .30, coral .28, green .28–.30);
  button CSS paint lowered so engine color dominates.
- Preview rotation freezes while its list scrolls (hold-until timestamp).
- New `?viewportdebug` overlay: live layer-by-layer dims, GAP value,
  display-mode, safe-area, CSS heights, build id (`__CROSS_BUILD__`
  timestamp+hash via vite define). Deployment: vercel.json builds main
  from source; canonical domain crosss-road.vercel.app (per vite comment).
- Resize chain unified: container → renderer (`cssWidth/cssHeight`) →
  camera aspect; one funnel, no competing paths.
- §4 audit: no rule shrinks #game/canvas/body/html; safe-area is UI-only;
  no svh/lvh, no global touch blockers, no pointer capture, no
  backdrop-filter glass. Body blue kept as diagnostic (§7).
- Menu tints now vivid per spec (chars violet, worlds cyan, missions
  amber, settings coral, PLAY green strongest) inside the liquid material;
  secondary edge .7. Layout: PLAY full, CHARACTERS+WORLDS pair,
  MISSIONS/SETTINGS full width.
- Reference: `C:\Users\WinTen\Documents\web dev projects\streamy`
  (`src/index.css` `.ios-full-height` + `App.tsx` root). Mechanism:
  `min-height:100vh → 100dvh`, then `@supports (-webkit-touch-callout:none)`
  overrides with `-webkit-fill-available`, which tracks the real visible
  height on iOS Safari/PWA where vh/dvh can leave a gap.
- Adapted to CROSS! shell (index.html + style.css): same layered stack on
  `html`/`body`/`#game`/canvas, fill-available declared last, iOS-only.
  Renderer already sizes from the measured container rect, so the
  fill-available layout flows into the backing store automatically.
- Active world now follows `player.lane`, not the `maxLane` frontier:
  stepping back into a previous stretch switches notch, environment,
  lighting and missions back to that world (`GameManager`).
- `worldBest` records furthest lane reached *while in* that world
  (frontier on forward cross, feet on step-back; `recordRun` takes the
  in-world lane) — another stretch's lanes can never leak in.
- Checkpoints store the actual stop position (`player.lane`); resume math
  unchanged and now consistent with it.
- Progress reference uses in-stretch feet when standing in the active
  world, frontier otherwise (HUD + `worldNotch` wiring).

## Earlier (kept)
- Frosted lens: heavy engine blur + paper tint + restored surface cover
  (user wants blurry bg, not clear lens); displacement/rim/press underneath.
- Full height-rule audit: shell chain airtight; renderer measured from
  container rect + ResizeObserver.
- Progress: single formula `(ref - max(S, runStart)) / (S+40 - max(...))`.
- Modal: containment guard in `InputManager`; X on all modals; backdrop needs
  press+release on backdrop; Esc backs out; `?debug` scroll metrics.
- Collision/jump/journey/missions/economy as previously reported; notch
  translate-safe (`whIn`/`whSwap`, no WAAPI on it).

## Verification labels
- VERIFIED: typecheck, production build, targeted audits/traces, engine
  source paths, §49 pattern grep.
- STATICALLY VERIFIED: progress math (0/25/50/75/100 across a fresh city
  stretch), resume math, gating, input guard, notch centering 320–1920px.
- UNVERIFIED (no runtime in this env): on-device strip/scroll/refraction,
  jump/resume/purchase playthroughs. `?debug` overlay exposes live scroll
  metrics for device tests.

