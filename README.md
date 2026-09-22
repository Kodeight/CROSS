# CROSS! — Don't Get Hit

Production-grade TypeScript + Three.js arcade game. Cross as far as you can,
dodge traffic, collect coins, beat your best score.

## Stack

Vite + TypeScript (strict) + Three.js + PWA (vite-plugin-pwa). No frameworks,
no backend — client-side game.

## Workflow

```sh
npm install
npm run dev      # development server
npm run build    # typecheck + production build
npm run preview  # preview the production build
```

## Architecture

```text
Game
 ↓
Systems (GameManager, TrafficManager, WorldManager, …)
 ↓
Controllers (PlayerController, TrafficController, LaneTraffic, …)
 ↓
Data/config (src/config)
 ↓
Assets (src/assets, procedural — no downloads, offline-safe)
```

- `src/core` — Game, GameLoop (single authoritative loop), GameState,
  Time, Input (normalized MOVE_*/PAUSE actions), EventBus
- `src/renderer` — one Scene, one WebGLRenderer, third-person FollowCamera,
  per-world Lighting
- `src/player` — Player, PlayerController, CharacterFactory (6 characters)
- `src/world` — WorldManager, WorldGenerator (forward generation, static
  world-space), LaneManager + 6 data-driven worlds + environment factories
- `src/traffic` — TrafficManager/Controller/LaneTraffic + lane-aware spacing
  (vehicles brake, never overlap; player collision untouched)
- `src/gameplay` — GameManager, Score/Coin/Mission/Progression, Particles
- `src/ui` — UIManager, HUD, menus, selection screens with 3D previews,
  cinematic world intro (a real WORLD_INTRO game state)
- `src/save` — versioned SaveManager, corruption-tolerant, works without storage
- `src/audio` — procedural WebAudio (no assets)
- `src/config` — testing flag (`TESTING_MODE`), worlds, characters, traffic,
  missions

## Testing

- `TESTING_MODE` in `src/config/game.config.ts` unlocks everything for QA;
  set `false` to restore the economy.
- `?debug` URL flag shows the FPS/traffic-overlap audit overlay.
"# CROSS" 
