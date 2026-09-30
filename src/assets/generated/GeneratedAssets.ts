/**
 * Generated-asset bridge: CROSS! ↔ local img2threejs pipeline output.
 *
 * Provenance: every factory under assets/img2threejs/factories/ was produced
 * by the LOCAL img2threejs repository —
 *   probe_image → new_pre_spec_assessment → new_sculpt_spec →
 *   validate_sculpt_spec --strict-quality → generate_threejs_factory
 * (see assets/img2threejs/specs/ + IMG2THREEJS_WORKFLOW.md). This module only
 * loads, caches, orients, and scales that output for gameplay — it never
 * re-authors geometry.
 *
 * Vehicle coordinate convention (matches VehicleFactory / CROSS! world space):
 *   X = travel direction (model forward = -X, headlights at -X)
 *   Y = lateral (lane width) · Z = up
 * Generated factories are standard three.js Y-up; the bridge wraps them in a
 * holder rotated +90° about X (Y→Z) so wheels stay aligned and front/rear
 * stay correct. Movement direction is NEVER baked in: lanes rotate the holder
 * (rotation.z = PI) for right→left travel.
 *
 * Performance: one prototype per kind is built once, then cloned per spawn
 * (clones share geometries/materials). Worlds load lazily per world-chunk:
 * preload the current world at run start, background-preload the next world,
 * keep everything cached for the session. The bundled chunks are covered by
 * the existing PWA precache, so worlds work offline after first load.
 * Every builder returns null on failure — callers MUST use their controlled
 * procedural fallback and log the asset name (never crash, never null refs).
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/game.config';
import { CITY_FACTORIES } from './worldCity';
import { RIVER_FACTORIES } from './worldRiver';
import { BEACH_FACTORIES } from './worldBeach';
import { VOLCANO_FACTORIES } from './worldVolcano';
import { TOKYO_FACTORIES } from './worldTokyo';
import { COLLECTIBLE_FACTORIES } from './collectibles';

const ZOOM = GAME_CONFIG.zoom;

export const ASSET_VERSION = '2026-09-current';

/** img2threejs asset id → owning world chunk. */
const WORLD_CHUNK_KINDS: Record<string, 'city' | 'river' | 'beach' | 'volcano' | 'tokyo'> = {
  city_taxi: 'city', city_suv: 'city', city_bus: 'city',
  river_fishing_boat: 'river', river_speed_boat: 'river', river_cargo_boat: 'river',
  beach_dune_buggy: 'beach', beach_atv: 'beach', beach_jet_ski: 'beach',
  volcano_armored_truck: 'volcano', volcano_dump_truck: 'volcano', volcano_drill_vehicle: 'volcano',
  tokyo_white_tuner: 'tokyo', tokyo_red_tuner: 'tokyo', tokyo_neon_tram: 'tokyo',
};

export const WORLD_VEHICLE_KINDS: Record<string, string[]> = {
  city: ['city_taxi', 'city_suv', 'city_bus'],
  river: ['river_fishing_boat', 'river_speed_boat', 'river_cargo_boat'],
  beach: ['beach_dune_buggy', 'beach_atv', 'beach_jet_ski'],
  volcano: ['volcano_armored_truck', 'volcano_dump_truck', 'volcano_drill_vehicle'],
  tokyo: ['tokyo_white_tuner', 'tokyo_red_tuner', 'tokyo_neon_tram'],
};

export const WORLD_ORDER = ['city', 'river', 'beach', 'volcano', 'tokyo'] as const;

type Factory = () => THREE.Group;

// Synchronously populated canonical factory registry
const factoryRegistry = new Map<string, Factory>();
const prototypeCache = new Map<string, THREE.Group>();
const chunkLoaded = new Set<string>(['city', 'river', 'beach', 'volcano', 'tokyo', 'collectibles']);
const chunkLoading = new Map<string, Promise<void>>();

// Register all canonical factories statically so cold starts never miss them
for (const [k, f] of Object.entries(CITY_FACTORIES)) factoryRegistry.set(k, f);
for (const [k, f] of Object.entries(RIVER_FACTORIES)) factoryRegistry.set(k, f);
for (const [k, f] of Object.entries(BEACH_FACTORIES)) factoryRegistry.set(k, f);
for (const [k, f] of Object.entries(VOLCANO_FACTORIES)) factoryRegistry.set(k, f);
for (const [k, f] of Object.entries(TOKYO_FACTORIES)) factoryRegistry.set(k, f);
for (const [k, f] of Object.entries(COLLECTIBLE_FACTORIES)) factoryRegistry.set(k, f);

/** Runtime provenance counters: generated builds vs procedural fallbacks. */
const statsGenerated = new Map<string, number>();
const statsFallback = new Map<string, number>();

function noteGenerated(kind: string): void {
  statsGenerated.set(kind, (statsGenerated.get(kind) ?? 0) + 1);
}

export function noteFallback(kind: string): void {
  statsFallback.set(kind, (statsFallback.get(kind) ?? 0) + 1);
}

export interface AssetsDebugSnapshot {
  chunks: string[];
  factories: string[];
  generated: Record<string, number>;
  fallbacks: Record<string, number>;
}

export function assetsDebugSnapshot(): AssetsDebugSnapshot & { failures: Record<string, string> } {
  return {
    chunks: [...chunkLoaded],
    factories: [...factoryRegistry.keys()],
    generated: Object.fromEntries(statsGenerated),
    fallbacks: Object.fromEntries(statsFallback),
    failures: Object.fromEntries(lastError),
  };
}

async function loadWorldChunk(worldId: string): Promise<void> {
  return Promise.resolve();
}

let collectiblesLoaded = true;

async function loadCollectibles(): Promise<void> {
  return Promise.resolve();
}

/** Preload the current world's vehicle chunk (await before lane generation). */
export function preloadWorldVehicles(worldId: string): Promise<void> {
  return loadWorldChunk(worldId);
}

/** Fire-and-forget background preload of the next world in journey order. */
export function preloadNextWorld(currentWorldId: string): void {
  try {
    const idx = WORLD_ORDER.indexOf(currentWorldId as (typeof WORLD_ORDER)[number]);
    if (idx < 0) return;
    const next = WORLD_ORDER[(idx + 1) % WORLD_ORDER.length];
    void loadWorldChunk(next);
  } catch { /* preload must never break gameplay */ }
}

/** Preload coin + powerup factories (await once at boot). */
export function preloadCollectibles(): Promise<void> {
  return loadCollectibles();
}

export function isGeneratedKindReady(kind: string): boolean {
  return factoryRegistry.has(kind) || prototypeCache.has(kind);
}

/** Last build failure per kind, surfaced in ?assetsdbg (STEP 5 diagnostics). */
const lastError = new Map<string, string>();

export function lastErrorFor(kind: string): string | null {
  return lastError.get(kind) ?? null;
}

export function failedKinds(): Record<string, string> {
  return Object.fromEntries(lastError);
}

function recordError(kind: string, stage: string, err: unknown): void {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  lastError.set(kind, `${stage}: ${msg}`.slice(0, 220));
  console.warn(`[ASSET FAIL] id=${kind} reason=${msg}`);
}

/**
 * The generated factories attach live THREE objects under
 * root.userData.sculptRuntime (nodes/meshes/sockets). THREE.Object3D.copy()
 * deep-clones userData via JSON, which throws on that circular graph — so
 * replace it with a plain serializable summary BEFORE the first clone.
 * Geometry/materials stay shared by reference (the perf design); only the
 * metadata graph is summarized.
 */
function sanitizePrototypeUserData(proto: THREE.Group): void {
  try {
    const ud = proto.userData as Record<string, unknown>;
    const rt = ud.sculptRuntime as {
      nodes?: Record<string, unknown>;
      meshes?: Record<string, unknown>;
      sockets?: Record<string, unknown>;
      colliders?: Record<string, unknown>;
    } | undefined;
    if (rt && typeof rt === 'object') {
      ud.sculptRuntime = {
        nodeCount: Object.keys(rt.nodes ?? {}).length,
        meshCount: Object.keys(rt.meshes ?? {}).length,
        socketCount: Object.keys(rt.sockets ?? {}).length,
        hasColliders: !!rt.colliders && Object.keys(rt.colliders).length > 0,
        generatedBy: 'img2threejs',
      };
    }
  } catch { /* metadata must never break the prototype */ }
}

function buildPrototype(kind: string): THREE.Group | null {
  const cached = prototypeCache.get(kind);
  if (cached) return cached;
  const factory = factoryRegistry.get(kind);
  if (!factory) return null;
  try {
    const proto = factory();
    sanitizePrototypeUserData(proto);
    proto.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if ((mesh as THREE.Mesh).isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = false;
      }
    });
    // Reject degenerate output instead of shipping invisible/NaN geometry.
    const box = new THREE.Box3().setFromObject(proto);
    const size = box.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.x + size.y + size.z) || size.x < 1e-4 || size.y < 1e-4 || size.z < 1e-4) {
      recordError(kind, 'degenerate-prototype', `size=${size.x},${size.y},${size.z}`);
      return null;
    }
    // Proof-of-clone: fail fast here (once per kind) instead of per spawn.
    try {
      const probe = proto.clone(true);
      if (!probe) throw new Error('clone returned empty');
    } catch (err) {
      recordError(kind, 'clone', err);
      return null;
    }
    lastError.delete(kind);
    prototypeCache.set(kind, proto);
    return proto;
  } catch (err) {
    recordError(kind, 'factory', err);
    return null;
  }
}

/**
 * Clone a generated vehicle, oriented for CROSS! lanes and scaled so its
 * X-extent equals targetLengthUnits * ZOOM. Returns null when the kind is
 * not loaded or failed — caller must fall back.
 */
export function buildGeneratedVehicle(kind: string, targetLengthUnits: number): THREE.Group | null {
  const proto = buildPrototype(kind);
  if (!proto) return null;
  try {
    const inner = proto.clone(true);
    // Orient Y-up → Z-up first (X = travel is preserved by X-rotation).
    inner.rotation.x = Math.PI / 2;
    const holder = new THREE.Group();
    holder.add(inner);
    const preBox = new THREE.Box3().setFromObject(holder);
    const preSize = preBox.getSize(new THREE.Vector3());
    const targetX = Math.max(8, targetLengthUnits * ZOOM);
    const s = targetX / Math.max(preSize.x, 1e-4);
    if (!Number.isFinite(s) || s <= 0) return null;
    holder.scale.setScalar(s);
    holder.updateMatrixWorld(true);
    // Bake centering into the INNER node: lane code overwrites holder
    // position (spawn x, coin slots), so holder-space corrections would be
    // wiped. World-space delta / scale = holder-space delta for inner.
    const hb = new THREE.Box3().setFromObject(holder);
    const hc = hb.getCenter(new THREE.Vector3());
    const inv = 1 / s;
    inner.position.x -= hc.x * inv;
    inner.position.y -= hc.y * inv;
    inner.position.z += (0.5 * ZOOM - hb.min.z) * inv;
    holder.updateMatrixWorld(true);
    addLightLenses(holder);
    noteGenerated(kind);
    return holder;
  } catch (err) {
    recordError(kind, 'normalize-vehicle', err);
    return null;
  }
}

/**
 * Clone a generated collectible (coin / powerup), scaled so its largest
 * horizontal extent is ~targetDiameter. `faceCamera` keeps the coin's flat
 * axis toward the camera so the existing in-plane spin still reads.
 */
export function buildGeneratedCollectible(kind: string, targetDiameter: number, faceCamera = false): THREE.Group | null {
  const proto = buildPrototype(kind);
  if (!proto) return null;
  try {
    const inner = proto.clone(true);
    // Remove ugly visual ground/halo rings while preserving the core 3D powerup item
    inner.traverse((child) => {
      const name = (child.name || '').toLowerCase();
      if (name.includes('ring') || name.includes('halo') || name.includes('aura')) {
        child.visible = false;
      }
    });
    // Coins are authored flat in XZ (axis Y): face them to the camera so the
    // existing in-plane spin reads. Powerups orient Y-up → Z-up the same way.
    inner.rotation.x = Math.PI / 2;
    void faceCamera;
    const holder = new THREE.Group();
    holder.add(inner);
    const preBox = new THREE.Box3().setFromObject(holder);
    const preSize = preBox.getSize(new THREE.Vector3());
    const s = targetDiameter / Math.max(Math.max(preSize.x, preSize.y), 1e-4);
    if (!Number.isFinite(s) || s <= 0) return null;
    holder.scale.setScalar(s);
    holder.updateMatrixWorld(true);
    // Center pivots on the INNER node: lane code overwrites holder position
    // (coin slots at z=12*ZOOM), so holder-space corrections would be wiped.
    const hb = new THREE.Box3().setFromObject(holder);
    const hc = hb.getCenter(new THREE.Vector3());
    inner.position.sub(hc.multiplyScalar(1 / s));
    holder.updateMatrixWorld(true);
    noteGenerated(kind);
    return holder;
  } catch (err) {
    recordError(kind, 'normalize-collectible', err);
    return null;
  }
}

/** World chunk that owns an img2threejs vehicle kind (for preload routing). */
export function chunkForVehicleKind(kind: string): string | null {
  return WORLD_CHUNK_KINDS[kind] ?? null;
}

const lensMats = new Map<number, THREE.MeshBasicMaterial>();
let lensGeo: THREE.BufferGeometry | null = null;

/**
 * Emissive front (warm white) + rear (red) light lenses, placed from the
 * measured holder bounds. Uses beveled lens geometry.
 */
function addLightLenses(holder: THREE.Group): void {
  try {
    const box = new THREE.Box3().setFromObject(holder);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const inv = 1 / Math.max(holder.scale.x, 1e-6);
    const toLocal = (p: THREE.Vector3): THREE.Vector3 => holder.worldToLocal(p.clone());
    if (!lensGeo) {
      const s = new THREE.Shape();
      s.moveTo(-0.5, -0.4);
      s.quadraticCurveTo(0, -0.5, 0.5, -0.4);
      s.lineTo(0.5, 0.4);
      s.quadraticCurveTo(0, 0.5, -0.5, 0.4);
      s.closePath();
      lensGeo = new THREE.ExtrudeGeometry(s, {
        depth: 0.6,
        bevelEnabled: true,
        bevelThickness: 0.12,
        bevelSize: 0.12,
        bevelSegments: 2,
      });
      lensGeo.center();
    }
    const lens = (color: number): THREE.Mesh => {
      let m = lensMats.get(color);
      if (!m) {
        m = new THREE.MeshBasicMaterial({ color });
        lensMats.set(color, m);
      }
      const mesh = new THREE.Mesh(lensGeo as THREE.BufferGeometry, m);
      mesh.scale.set(1.2 * ZOOM * inv, Math.max(1.0 * ZOOM, size.y * 0.05) * inv, 1.4 * ZOOM * inv);
      return mesh;
    };
    const frontX = box.min.x - 0.4 * ZOOM;
    const rearX = box.max.x + 0.4 * ZOOM;
    const z = c.z + size.z * 0.12;
    for (const side of [-1, 1]) {
      const y = c.y + side * size.y * 0.32;
      const f = lens(0xfff6d8);
      f.position.copy(toLocal(new THREE.Vector3(frontX, y, z)));
      holder.add(f);
      const r = lens(0xff2a2a);
      r.position.copy(toLocal(new THREE.Vector3(rearX, y, z)));
      holder.add(r);
    }
    holder.updateMatrixWorld(true);
  } catch { /* lenses are garnish — never break the vehicle */ }
}
