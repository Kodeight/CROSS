# img2threejs → CROSS! asset workflow (executed, not described)

All FIVE worlds' moving 3D assets, the coin, and the powerups were converted
from the supplied `/ref` images with the LOCAL `img2threejs/` repository —
the real forge pipeline, run in `E:\dev\games\CROSS!\img2threejs`:

```
probe_image.py
  → new_pre_spec_assessment.py  ("Name" --image <ref> --complexity moderate)
  → new_sculpt_spec.py          (assessment → starter ObjectSculptSpec)
  → enrich: subject-specific component tree / materials / detail inventory /
            feature targets / lighting (see build_specs.py)
  → validate_sculpt_spec.py --strict-quality        (fail-closed, must PASS)
  → extract_pbr_evidence.py     (<ref> → public/evidence/<id>/ body_*.png)
  → validate_sculpt_spec.py --strict-quality        (re-pass with evidence)
  → generate_threejs_factory.py --force  → assets/img2threejs/factories/
```

Batch drivers (re-runnable, in `C:\Users\WinTen\AppData\Local\Temp\opencode\`):
`build_specs.py` (assess→spec→enrich→validate→generate, 25/25 PASS),
`build_evidence.py` (PBR extraction→utility tiers→re-validate→regenerate).

## Asset map (id → ref source → factory → evidence → world pool)

Vehicles (15 — 3 per world):
| id | ref | factory fn | world |
|---|---|---|---|
| city_taxi | `C740… 2.jpg` (yellow taxi) | createCityTaxiModel | city/car |
| city_suv | `C740… 3.jpg` (red SUV) | createCitySUVModel | city/car |
| city_bus | `C740….jpg` (blue bus) | createCityBusModel | city/truck |
| river_fishing_boat | `C740… 4.jpg` | createFishingBoatModel | river/car |
| river_speed_boat | `C740… 5.jpg` | createSpeedBoatModel | river/car |
| river_cargo_boat | `C740… 6.jpg` | createCargoTugBoatModel | river/truck |
| beach_dune_buggy | `C740… 7.jpg` | createBeachDuneBuggyModel | beach/car |
| beach_atv | `C740… 8.jpg` | createBeachATVModel | beach/car |
| beach_jet_ski | `C740… 9.jpg` | createJetSkiModel | beach/truck |
| volcano_armored_truck | `C740… 10.jpg` | createArmoredMonsterTruckModel | volcano/car |
| volcano_dump_truck | `C740… 11.jpg` | createMiningDumpTruckModel | volcano/truck |
| volcano_drill_vehicle | `C740… 12.jpg` | createDrillVehicleModel | volcano/car |
| tokyo_white_tuner | `C740… 13.jpg` | createWhiteSportsTunerModel | tokyo/car |
| tokyo_red_tuner | `C740… 14.jpg` | createRedJapaneseTunerModel | tokyo/car |
| tokyo_neon_tram | `C740… 15.jpg` | createModernNeonTramModel | tokyo/truck |

Coin / powerups (10):
coin_star (`4B35…`, gold star coin), powerup_shield (`IMG_8880`),
powerup_magnet (`IMG_8877`), powerup_freeze (`IMG_8885`),
powerup_speed (`IMG_8882`), powerup_double_coins (`IMG_8883`),
powerup_extra_life (`IMG_8881`), powerup_slow_time (`IMG_8878`),
powerup_ghost (`IMG_8884`), powerup_jump_boost (`53CA…`, spring).

fire_shield reuses the shield factory with a heat tint (documented in
`WorldGenerator.generatedPowerCore`); double_jump/low_gravity share the
spring factory. Golden egg (`IMG_8879`) and chili (`BBBD…`) were reviewed:
egg maps to no gameplay type (kept out of spawn tables), chili's
speed+fire concept is covered by dash + fire_shield.

## Spec/evidence layout

- `assets/img2threejs/specs/<id>.spec.json` — strict-passing ObjectSculptSpec
- `assets/img2threejs/specs/<id>.assessment.json` + `.<id>.evidence-report.json`
- `assets/img2threejs/factories/create*.ts` — generated `THREE.Group` factories
  with `userData.sculptRuntime` (nodes/sockets/colliders/destructionGroups)
- `public/evidence/<id>/body_{albedo,roughness,height,normal,ao}.png` —
  reference-extracted PBR maps (128px runtime; reproducible at 256px via
  build_evidence.py), served + PWA-precached for offline play
- `src/assets/generated/` — runtime bridge only (lazy per-world chunks,
  prototype cache + clone, Y-up→Z-up orientation, scale-to-spec-length,
  emissive light lenses). No geometry is authored here.

## Integration

`VehicleFactory.create()` prefers the generated model at the catalogue
length/speed (spacing/collision math untouched) with logged procedural
fallback. `WorldGenerator.makeCoinMesh/makeCollectibleMesh` prefer the
generated coin/powerup cores with the same fallback rule. Preload: current
world + collectibles awaited at boot/run start, next world in background.
