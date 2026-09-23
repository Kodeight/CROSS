# CROSS! — Implementation Status

Last update: 2026-09-23 · branch `main` · typecheck PASS · production build PASS.

## Accepted / preserved systems (do NOT regress)
- Obstacle collision: `Lane.occupied` (generation) → `Player.queueMove(dir, max, isBlocked?)`
  → `PlayerController` predicate → `Game` predicate
  `(lane, col) => lanes.laneAt(lane)?.occupied[col] === true`. Traffic separate.
- Jump: `queueJump` (landing free, mid needs `jumpable`), SPACE / double-tap.
- Journey: `lastWorldId/lastLane` checkpoint; resume same world, backed off,
  re-validated to field. World switch starts a new journey.
- Missions: `requires` gating standard→challenge→master; data-driven.
- Economy: `TESTING_MODE = false`; chicken/city free, rest priced.
- Coins: full-integer internally, compact HUD format (no `.0`).
- QuickLiquid: engine owns visuals; no WAAPI on transform-positioned hosts;
  notch uses translate-safe CSS (`whIn`/`whSwap`); modal scroll chain intact
  (`.panel-masked > .ql-content` flex restoration, `.panel-scroll` scroller).
- LOW = gameplay baseline; quality changes rendering only.

## Changed this round (TASK 01: viewport + notch + color + liquid)
- Renderer follows the measured `#game` container rect (fallback visual
  viewport); ResizeObserver added alongside resize/orientation listeners.
- Notch compacted (260px cap, tighter padding/type/gaps; both CSS copies
  aligned) + blur/fade/settle content transition on inner content only
  (backdrop-safe). Center anchor untouched.
- Button color identity inside the liquid material (engine tint, low opacity):
  PLAY green .14, resume/again green .12, characters orange, worlds cyan,
  missions gold, settings/system neutral.
- Liquid strengthened: primary refraction 30, panel blur 12/refraction 18,
  hoverLighting on; CSS paint cover reduced (menu-card/panel/buttons/HUD)
  so the material — not flat opacity — dominates. Refraction path verified
  in engine source: runtime-generated lens maps + per-channel
  feDisplacementMap (real chromatic dispersion); `svg` mode on MED/ HIGH/
  AUTO, `css` lightweight fallback on LOW.
- `#event-banner` can no longer overflow narrow screens.

## Verification labels
- VERIFIED: typecheck, production build, targeted audits/traces, engine
  source paths (refraction, layers, WAAPI, pointer behavior).
- STATICALLY VERIFIED: container-measured sizing math, notch centering at
  320–1920px widths, tint/config plumbing, no gameplay changes.
- UNVERIFIED (no runtime in this env): on-device viewport strip, swipe→
  scrollTop, refraction appearance on iPhone/PWA, jump/resume/purchase
  playthroughs. `?debug` overlay exposes live scroll metrics for device tests.

