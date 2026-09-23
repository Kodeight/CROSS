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

## Changed this round (notch follows feet)
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

