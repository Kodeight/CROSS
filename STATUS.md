# CROSS! — Implementation Status

Last update: 2026-09-23 · branch `main` · typecheck PASS · production build PASS.

## Accepted / preserved systems (do NOT regress)
- Obstacle collision: `Lane.occupied` (generation) → `Player.queueMove(dir, max, isBlocked?)`
  → `PlayerController` predicate → `Game` predicate
  `(lane, col) => lanes.laneAt(lane)?.occupied[col] === true`. Traffic separate.
- Coins: full-integer internally, compact HUD format (`fmtCount`: 999/1K/1.2M/1B, no `.0`).
- QuickLiquid: engine owns visuals only; no WAAPI on transform-positioned hosts
  (notch uses translate-safe CSS `whIn`/`whSwap`).
- LOW = gameplay baseline; quality changes rendering only.

## Changed this round (TODO.md master overhaul)
- Notch slide-from-right: root cause was WAAPI scale keyframes (jiggle/animateIn)
  and `cross-in` replacing `translateX(-50%)`. Fixed: `whIn` keyframes,
  `waapi:false` notch attach, `notifyWorldChange` animation-free
  (`src/style.css`, `src/ui/liquidUI.ts`).
- Jump: `SPACE` (PC) + double-tap (touch; single tap still steps forward after
  280ms) → `JUMP` action → `Player.queueJump` (2-lane leap, landing must be
  free, mid cell needs `jumpable`) → `step('jump')` arcs above traffic plane.
  `Lane.jumpable` registered at generation (forest obstacles).
  (`Input.ts`, `PlayerController.ts`, `Player.ts`, `GameManager.ts`, `World.ts`)
- Safe spawn: lanes `startLane±1` forced field; center cols cleared
  `[startLane, startLane+3]`; forest density guard (≥3 free cols).
  `newRun` pre-places player (fairness), then re-validates to a calm field lane.
- Continue journey: `SaveData.lastWorldId/lastLane` updated on transition+death;
  `newRun` resumes same world, `lastLane-6` clamped to that world's stretch.
  WorldSelect/unlock starts a new journey there.
- Missions: `requires` gating (standard→challenge→master per world), LOCKED UI.
  Data-driven; check/progress fns = future Gemini-ready shape. No AI added.
- Economy: `TESTING_MODE = false`. Chicken/city free; rest priced
  (characters 200–2000, worlds 500–8000); existing validation/persist flows.
- Discovery: exotic vehicles gated to lane 40+ (fallback keeps neon playable).
- Readability: loosened jungle/desert/snow/neon/beach fog; neon hemi 0.62,
  dir 0.5, lifted road/safe tones.
- Modals: X on characters/worlds/missions/settings/pause; backdrop close needs
  press+release both on backdrop (scroll-drag can't close); Esc backs out.
- Debug: `?debug` overlay shows live modal scroll metrics
  (`sh/ch/st`, overflow, touch-action, elementFromPoint, last touch target).

## Verification labels
- VERIFIED: typecheck, production build, all targeted static audits/traces.
- STATICALLY VERIFIED: collision matrix paths, jump validation, resume math,
  mission gating, economy flows, notch transform safety, no JS scroll blockers.
- UNVERIFIED (no runtime in this env): swipe→scrollTop on iPhone, jump feel,
  resume-in-desert playthrough, purchase playthrough. Use `?debug` overlay
  on-device: modal line classifies scroll failures A–E immediately.
