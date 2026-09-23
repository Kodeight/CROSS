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

## Changed this round (TODO.md critical repair)
- index.html malformed `html,` CSS rule fixed (valid `html{...}`).
- Modal input isolation: `InputManager` drops any touch starting inside
  `.panel-screen` via DOM containment (target semantics, no coordinates);
  gameplay gestures structurally can't start there either (#game listeners).
- Progress rewrite (was stuck ~60-75%: the old 60/40 blend capped pure
  distance at 58.5%): single authoritative formula
  `(ref - max(S, runStart)) / (S+40 - max(S, runStart))` — 0% at spawn,
  exactly 100% at the transition boundary, linear between; missions still
  complete/reward/display separately. Wired via `ScoreSystem.startLane` +
  extended `HUD`. One calculation, no duplicates.
- Notch ~20% narrower (210px cap), center anchor untouched.
- SKILL repo inspected (README, package README, config source, demo App,
  OPTIMIZATION): our engine use matches; `dynamicLighting` is an alias for
  cursor-tracking (kept off: pointermove cost during touch scroll);
  per-frame cost scales with glass area (our limited surfaces + tiers comply).
- §49 pattern audit: no global touch/pointer blockers, no pointer capture,
  no backdrop-filter glass, no competing resize/progress/modal systems,
  100vh only as pre-dvh fallback.

## Verification labels
- VERIFIED: typecheck, production build, targeted audits/traces, engine
  source paths, §49 pattern grep.
- STATICALLY VERIFIED: progress math (0/25/50/75/100 across a fresh city
  stretch), resume math, gating, input guard, notch centering 320–1920px.
- UNVERIFIED (no runtime in this env): on-device strip/scroll/refraction,
  jump/resume/purchase playthroughs. `?debug` overlay exposes live scroll
  metrics for device tests.

