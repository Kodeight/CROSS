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

## Changed this round (liquid lens + viewport)- SKILL source read: engine mount/filter/update paths, package README, demo
  App GLASS_BASE, OPTIMIZATION cost model. Key mechanism: the lens layer's
  `backdrop-filter: url()` samples everything painted below it — INCLUDING
  the host's own CSS background. Our cream paint (.68–.84) was the white
  veil: it got sampled into the refraction. Cut host paint hard
  (menu-card .30, panels .35, buttons .35, primary .50, HUD .45, cards .50,
  rows .45; notch keeps strong red) so the lens samples the live world.
- Panel preset is now a real lens: blur 12→7, refraction 18→26, bezel 30,
  thickness 22, edge .9, specular .45, dispersion .32. Utility 18→22,
  secondary 16→20. Text stays crisp (content lives above filter layers).
- Full height-rule audit (index.html + style.css): every shell rule is
  fixed/inset-0 with viewport units; no safe-area on #game/canvas; renderer
  measured from container rect + ResizeObserver. No geometric gap source
  remains in code.

## Earlier (kept)
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

