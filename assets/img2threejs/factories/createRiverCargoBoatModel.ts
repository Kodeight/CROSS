import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type ProceduralModelOptions = {
  wireframe?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  textureSize?: number;
  textureAnisotropy?: number;
  qualityPriority?: 'reference-fidelity' | 'balanced';
};

export type ProceduralModelRuntime = {
  nodes: Record<string, THREE.Object3D>;
  meshes: Record<string, THREE.Mesh>;
  sockets: Record<string, THREE.Object3D>;
  colliders: Record<string, unknown>;
  destructionGroups: Record<string, THREE.Object3D[]>;
};

type SculptMaterialSpec = Record<string, any>;

function buildTubeGeometry(
  path: { points: [number, number, number][]; radius?: number; radialSegments?: number; closed?: boolean },
): THREE.TubeGeometry {
  const vectors = path.points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(vectors, path.closed ?? false);
  const tubularSegments = Math.max(8, path.points.length * 6);
  return new THREE.TubeGeometry(curve, tubularSegments, path.radius ?? 0.05, path.radialSegments ?? 8, path.closed ?? false);
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function readLayerNumber(value: unknown, keys: string[], fallback: number): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      if (typeof record[key] === 'number') return record[key] as number;
    }
  }
  return fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{3}$/i.test(hex)
    ? '#' + hex.slice(1).split('').map((part) => part + part).join('')
    : hex;
  const value = /^#[0-9a-f]{6}$/i.test(normalized) ? Number.parseInt(normalized.slice(1), 16) : 0x8a7a5f;
  return [clampAlbedoChannel((value >> 16) & 255), clampAlbedoChannel((value >> 8) & 255), clampAlbedoChannel(value & 255)];
}

function materialPalette(spec: SculptMaterialSpec): string[] {
  const palette = spec.colorVariation?.palette;
  if (Array.isArray(palette) && palette.length > 0) return palette.filter((value) => typeof value === 'string');
  const secondary = spec.albedo?.secondary;
  const colors = [spec.baseColor ?? spec.color ?? spec.albedo?.dominant, ...(Array.isArray(secondary) ? secondary : [])];
  return colors.filter((value): value is string => typeof value === 'string' && value.startsWith('#'));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampAlbedoChannel(value: number): number {
  return Math.max(30, Math.min(240, Math.round(value)));
}

function clampPbrF0(value: number): number {
  return Math.max(0.02, Math.min(1, value));
}

function clampPbrIor(value: number): number {
  return Math.max(1, Math.min(2.5, value));
}

function clampPbrMetalness(value: number): number {
  return value >= 0.5 ? 1 : 0;
}

function clampedAlbedoColor(spec: SculptMaterialSpec): THREE.Color {
  const source = typeof spec.baseColor === 'string' ? spec.baseColor : '#8A7A5F';
  // setStyle with an explicit SRGBColorSpace, NOT the numeric constructor.
  //
  // `new THREE.Color(r, g, b)` treats its arguments as LINEAR working-space components,
  // while an authored `baseColor` hex is sRGB. Feeding one to the other skipped the
  // transfer function and lifted every dark albedo: #2e2a28, authored as a near-black
  // vinyl, rendered at roughly sRGB 0.46 — a mid grey. The error is largest exactly where
  // it matters most, because the transfer curve is steepest near black.
  return new THREE.Color().setStyle(source, THREE.SRGBColorSpace);
}

function smoothCurve(value: number): number {
  return value * value * (3 - 2 * value);
}

function periodicHash(x: number, y: number, seed: number, periodX: number, periodY: number): number {
  const wrappedX = ((x % periodX) + periodX) % periodX;
  const wrappedY = ((y % periodY) + periodY) % periodY;
  let value = Math.imul(wrappedX + seed * 17, 374761393) ^ Math.imul(wrappedY + seed * 31, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function periodicValueNoise(u: number, v: number, seed: number, periodX: number, periodY: number): number {
  const x = u * periodX;
  const y = v * periodY;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothCurve(x - x0);
  const ty = smoothCurve(y - y0);
  const a = periodicHash(x0, y0, seed, periodX, periodY);
  const b = periodicHash(x0 + 1, y0, seed, periodX, periodY);
  const c = periodicHash(x0, y0 + 1, seed, periodX, periodY);
  const d = periodicHash(x0 + 1, y0 + 1, seed, periodX, periodY);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, tx), THREE.MathUtils.lerp(c, d, tx), ty);
}

type SurfaceBand = {
  frequency: number;
  amplitude: number;
  stretchX: number;
  stretchY: number;
  ridge: boolean;
};

function surfaceBands(spec: SculptMaterialSpec): SurfaceBand[] {
  const source = Array.isArray(spec.surfaceFrequencyBands) ? spec.surfaceFrequencyBands : [];
  const parsed = source.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const band = item as Record<string, unknown>;
    const frequency = typeof band.frequency === 'number' ? band.frequency : 0;
    const amplitude = typeof band.amplitude === 'number' ? band.amplitude : 0;
    if (frequency <= 0 || amplitude <= 0) return [];
    const stretch = Array.isArray(band.stretch) ? band.stretch : [1, 1];
    const description = `${String(band.pattern ?? '')} ${String(band.role ?? '')}`.toLowerCase();
    return [{
      frequency,
      amplitude,
      stretchX: typeof stretch[0] === 'number' ? Math.max(0.1, stretch[0]) : 1,
      stretchY: typeof stretch[1] === 'number' ? Math.max(0.1, stretch[1]) : 1,
      ridge: /(ridge|groove|grain|fiber|striated|crack)/.test(description),
    }];
  });
  return parsed.length > 0 ? parsed : [
    { frequency: 2, amplitude: 0.42, stretchX: 1, stretchY: 1, ridge: false },
    { frequency: 12, amplitude: 0.22, stretchX: 1, stretchY: 1, ridge: false },
    { frequency: 56, amplitude: 0.08, stretchX: 1, stretchY: 1, ridge: false },
  ];
}

function sampleSurface(u: number, v: number, bands: SurfaceBand[], seed: number): number {
  let value = 0;
  let weight = 0;
  for (let index = 0; index < bands.length; index += 1) {
    const band = bands[index];
    const periodX = Math.max(1, Math.round(band.frequency * band.stretchX));
    const periodY = Math.max(1, Math.round(band.frequency * band.stretchY));
    let sample = periodicValueNoise(u, v, seed + index * 1013, periodX, periodY);
    if (band.ridge) sample = 1 - Math.abs(sample * 2 - 1);
    value += sample * band.amplitude;
    weight += band.amplitude;
  }
  return weight > 0 ? clamp01(value / weight) : 0.5;
}

function mixPalette(colors: [number, number, number][], value: number): [number, number, number] {
  if (colors.length === 1) return colors[0];
  const scaled = clamp01(value) * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(scaled));
  const mix = scaled - index;
  const a = colors[index];
  const b = colors[index + 1];
  return [
    Math.round(THREE.MathUtils.lerp(a[0], b[0], mix)),
    Math.round(THREE.MathUtils.lerp(a[1], b[1], mix)),
    Math.round(THREE.MathUtils.lerp(a[2], b[2], mix)),
  ];
}

type ColorGradientStop = { offset: number; color: string };
type ColorGradientSpec = {
  type: 'linear' | 'radial';
  axis: [number, number];
  stops: ColorGradientStop[];
};

function parseRgba(value: string): [number, number, number] {
  const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value);
  if (!match) return [138, 122, 95];
  return [clampAlbedoChannel(Number(match[1])), clampAlbedoChannel(Number(match[2])), clampAlbedoChannel(Number(match[3]))];
}

// Analytical per-pixel gradient sample. The extraction schema's colorGradient carries
// exact rgba(...) stop colors (see extract_part_color_recipe.py), so this samples the
// same trend directly in JS math rather than round-tripping through a Canvas 2D
// createLinearGradient/createRadialGradient object — same visual result, and it composes
// directly with the existing noise/height-correlated colorVariation blend below.
function sampleColorGradient(gradient: ColorGradientSpec, u: number, v: number): [number, number, number] {
  const stops = gradient.stops.length >= 2 ? gradient.stops : [{ offset: 0, color: 'rgba(138,122,95,1)' }, { offset: 1, color: 'rgba(138,122,95,1)' }];
  let t: number;
  if (gradient.type === 'radial') {
    const [cx, cy] = gradient.axis;
    const dx = u - cx;
    const dy = v - cy;
    const maxRadius = Math.max(0.001, Math.hypot(Math.max(cx, 1 - cx), Math.max(cy, 1 - cy)));
    t = clamp01(Math.hypot(dx, dy) / maxRadius);
  } else {
    const [ax, ay] = gradient.axis;
    const projection = (u - 0.5) * ax + (v - 0.5) * ay;
    const maxProjection = 0.5 * (Math.abs(ax) + Math.abs(ay)) || 0.5;
    t = clamp01(projection / maxProjection + 0.5);
  }
  const scaled = t * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.max(0, Math.floor(scaled)));
  const mix = scaled - index;
  const a = parseRgba(stops[index].color);
  const b = parseRgba(stops[index + 1].color);
  return [
    THREE.MathUtils.lerp(a[0], b[0], mix),
    THREE.MathUtils.lerp(a[1], b[1], mix),
    THREE.MathUtils.lerp(a[2], b[2], mix),
  ];
}

function writePixel(data: Uint8ClampedArray, offset: number, red: number, green: number, blue: number): void {
  data[offset] = Math.max(0, Math.min(255, Math.round(red)));
  data[offset + 1] = Math.max(0, Math.min(255, Math.round(green)));
  data[offset + 2] = Math.max(0, Math.min(255, Math.round(blue)));
  data[offset + 3] = 255;
}

function makeCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function createMapTexture(
  canvas: HTMLCanvasElement,
  colorSpace: THREE.ColorSpace,
  spec: SculptMaterialSpec,
  options: ProceduralModelOptions,
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  const projection = spec.textureProjection && typeof spec.textureProjection === 'object' ? spec.textureProjection : {};
  const repeat = Array.isArray(projection.repeat) ? projection.repeat : [2, 2];
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    typeof repeat[0] === 'number' ? repeat[0] : 2,
    typeof repeat[1] === 'number' ? repeat[1] : 2,
  );
  texture.anisotropy = Math.max(1, Math.round(options.textureAnisotropy ?? projection.anisotropy ?? 8));
  texture.needsUpdate = true;
  return texture;
}

type ProceduralTextureSet = {
  albedo: THREE.Texture;
  roughness: THREE.Texture;
  height: THREE.Texture;
  normal: THREE.Texture;
  ao: THREE.Texture;
  source: 'reference-pixel-extraction' | 'procedural';
};

function referenceMapUrl(spec: SculptMaterialSpec, channel: string): string | null {
  const reference = spec.referencePbr;
  if (!reference || typeof reference !== 'object') return null;
  if (reference.usable === false) return null;
  const confidence = typeof reference.confidence === 'number'
    ? reference.confidence
    : (typeof reference.estimatedFidelity === 'number' ? reference.estimatedFidelity : 0);
  const threshold = typeof reference.targetThreshold === 'number' ? reference.targetThreshold : 0.7;
  if (confidence < threshold) return null;
  const maps = reference.maps;
  if (!maps || typeof maps !== 'object') return null;
  const map = (maps as Record<string, unknown>)[channel];
  if (!map || typeof map !== 'object') return null;
  const record = map as Record<string, unknown>;
  const url = typeof record.url === 'string' && record.url.trim() ? record.url : record.path;
  return typeof url === 'string' && url.trim() ? url : null;
}

function createLoadedMapTexture(
  url: string,
  colorSpace: THREE.ColorSpace,
  spec: SculptMaterialSpec,
  options: ProceduralModelOptions,
): THREE.Texture {
  const texture = new THREE.TextureLoader().load(url);
  const projection = spec.textureProjection && typeof spec.textureProjection === 'object' ? spec.textureProjection : {};
  const repeat = Array.isArray(projection.repeat) ? projection.repeat : [1, 1];
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    typeof repeat[0] === 'number' ? repeat[0] : 1,
    typeof repeat[1] === 'number' ? repeat[1] : 1,
  );
  texture.anisotropy = Math.max(1, Math.round(options.textureAnisotropy ?? projection.anisotropy ?? 8));
  texture.needsUpdate = true;
  return texture;
}

function makeReferenceTextureSet(spec: SculptMaterialSpec, options: ProceduralModelOptions): ProceduralTextureSet | null {
  const albedo = referenceMapUrl(spec, 'albedo');
  const roughness = referenceMapUrl(spec, 'roughness');
  const height = referenceMapUrl(spec, 'height');
  const normal = referenceMapUrl(spec, 'normal');
  const ao = referenceMapUrl(spec, 'ao');
  if (!albedo || !roughness || !height || !normal || !ao) return null;
  return {
    albedo: createLoadedMapTexture(albedo, THREE.SRGBColorSpace, spec, options),
    roughness: createLoadedMapTexture(roughness, THREE.NoColorSpace, spec, options),
    height: createLoadedMapTexture(height, THREE.NoColorSpace, spec, options),
    normal: createLoadedMapTexture(normal, THREE.NoColorSpace, spec, options),
    ao: createLoadedMapTexture(ao, THREE.NoColorSpace, spec, options),
    source: 'reference-pixel-extraction',
  };
}

function makeProceduralTextureSet(
  id: string,
  spec: SculptMaterialSpec,
  options: ProceduralModelOptions,
): ProceduralTextureSet | null {
  if (typeof document === 'undefined') return null;
  const qualityFirst = (options.qualityPriority ?? 'reference-fidelity') === 'reference-fidelity';
  const requested = options.textureSize ?? spec.textureResolution;
  const requestedSize = typeof requested === 'number' && Number.isFinite(requested)
    ? requested
    : (qualityFirst ? 1024 : 512);
  const size = Math.max(256, Math.min(2048, 2 ** Math.round(Math.log2(requestedSize))));
  const canvases = {
    albedo: makeCanvas(size),
    roughness: makeCanvas(size),
    height: makeCanvas(size),
    normal: makeCanvas(size),
    ao: makeCanvas(size),
  };
  const contexts = {
    albedo: canvases.albedo.getContext('2d'),
    roughness: canvases.roughness.getContext('2d'),
    height: canvases.height.getContext('2d'),
    normal: canvases.normal.getContext('2d'),
    ao: canvases.ao.getContext('2d'),
  };
  if (!contexts.albedo || !contexts.roughness || !contexts.height || !contexts.normal || !contexts.ao) return null;
  const images = {
    albedo: contexts.albedo.createImageData(size, size),
    roughness: contexts.roughness.createImageData(size, size),
    height: contexts.height.createImageData(size, size),
    normal: contexts.normal.createImageData(size, size),
    ao: contexts.ao.createImageData(size, size),
  };
  const seed = hashString(id);
  const bands = surfaceBands(spec);
  const heightField = new Float32Array(size * size);
  const roughnessField = new Float32Array(size * size);
  const palette = materialPalette(spec);
  const fallback = typeof spec.baseColor === 'string' ? spec.baseColor : '#8A7A5F';
  const colors = (palette.length >= 2 ? palette : [fallback, '#6E614B', '#A08F70']).map(hexToRgb);
  const baseRoughness = clamp01(readLayerNumber(spec.roughness, ['base'], 0.76));
  const roughnessVariation = clamp01(readLayerNumber(spec.roughness, ['variation'], 0.18));
  const colorAmplitude = clamp01(readLayerNumber(spec.colorVariation, ['amplitude', 'variation'], 0.18));
  const heightCorrelation = clamp01(readLayerNumber(spec.colorVariation, ['heightCorrelation'], 0.3));
  const colorGradient: ColorGradientSpec | undefined = spec.colorGradient;
  for (let y = 0; y < size; y += 1) {
    const v = y / size;
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const index = y * size + x;
      const height = sampleSurface(u, v, bands, seed + 101);
      const roughNoise = sampleSurface(u, v, bands, seed + 7001);
      const colorNoise = sampleSurface(u, v, bands, seed + 15013);
      heightField[index] = height;
      roughnessField[index] = clamp01(baseRoughness + (roughNoise - 0.5) * roughnessVariation * 2);
      let color: [number, number, number];
      if (colorGradient) {
        // Evidence-derived spatial gradient (Plan 1.3 Workstream C) takes priority
        // over the noise-based palette blend below — it is a measured trend, not a guess.
        color = sampleColorGradient(colorGradient, u, v);
      } else {
        const paletteValue = clamp01(
          0.5 + (colorNoise - 0.5) * colorAmplitude * 2 + (height - 0.5) * heightCorrelation
        );
        color = mixPalette(colors, paletteValue);
      }
      writePixel(images.albedo.data, index * 4, color[0], color[1], color[2]);
    }
  }
  const normalStrength = Math.max(0.05, readLayerNumber(spec.normal, ['strength', 'amplitude'], 0.35));
  const aoStrength = clamp01(readLayerNumber(spec.ambientOcclusion, ['cavityStrength', 'strength'], 0.35));
  for (let y = 0; y < size; y += 1) {
    const up = ((y - 1 + size) % size) * size;
    const down = ((y + 1) % size) * size;
    for (let x = 0; x < size; x += 1) {
      const left = (x - 1 + size) % size;
      const right = (x + 1) % size;
      const index = y * size + x;
      const center = heightField[index];
      const dx = (heightField[y * size + right] - heightField[y * size + left]) * normalStrength * 6;
      const dy = (heightField[down + x] - heightField[up + x]) * normalStrength * 6;
      const inverseLength = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const normalX = -dx * inverseLength;
      const normalY = -dy * inverseLength;
      const normalZ = inverseLength;
      const neighborAverage = (
        heightField[y * size + left] + heightField[y * size + right]
        + heightField[up + x] + heightField[down + x]
      ) * 0.25;
      const cavity = Math.max(0, neighborAverage - center);
      const ao = clamp01(1 - aoStrength * (cavity * 12 + (1 - center) * 0.16));
      const offset = index * 4;
      const heightByte = center * 255;
      const roughnessByte = roughnessField[index] * 255;
      writePixel(images.height.data, offset, heightByte, heightByte, heightByte);
      writePixel(images.roughness.data, offset, roughnessByte, roughnessByte, roughnessByte);
      writePixel(
        images.normal.data, offset,
        (normalX * 0.5 + 0.5) * 255,
        (normalY * 0.5 + 0.5) * 255,
        (normalZ * 0.5 + 0.5) * 255,
      );
      writePixel(images.ao.data, offset, ao * 255, ao * 255, ao * 255);
    }
  }
  contexts.albedo.putImageData(images.albedo, 0, 0);
  contexts.roughness.putImageData(images.roughness, 0, 0);
  contexts.height.putImageData(images.height, 0, 0);
  contexts.normal.putImageData(images.normal, 0, 0);
  contexts.ao.putImageData(images.ao, 0, 0);
  return {
    albedo: createMapTexture(canvases.albedo, THREE.SRGBColorSpace, spec, options),
    roughness: createMapTexture(canvases.roughness, THREE.NoColorSpace, spec, options),
    height: createMapTexture(canvases.height, THREE.NoColorSpace, spec, options),
    normal: createMapTexture(canvases.normal, THREE.NoColorSpace, spec, options),
    ao: createMapTexture(canvases.ao, THREE.NoColorSpace, spec, options),
    source: 'procedural',
  };
}

function createSculptMaterial(id: string, spec: SculptMaterialSpec, options: ProceduralModelOptions, denseComponent = false): THREE.MeshPhysicalMaterial {
  // A material that declares -- with evidence -- that its subject carries no texture
  // detail gets NO texture set. Synthesising one anyway is not a harmless default: the
  // branch below then forces color to white and roughness to 1 and reads both from the
  // generated maps, so the authored albedo and the reference-derived roughness are both
  // discarded, and the model gains mottling the reference does not have. Measured on the
  // tuxedo cat, whose black fur rendered as speckled grey-and-white from a palette that
  // only ever described two flat regions.
  const textureless = (spec.textureless as { declared?: boolean } | undefined)?.declared === true;
  const textures = textureless
    ? null
    : makeReferenceTextureSet(spec, options) ?? makeProceduralTextureSet(id, spec, options);
  const material = new THREE.MeshPhysicalMaterial({
    color: textures ? 0xffffff : clampedAlbedoColor(spec),
    roughness: textures ? 1 : clamp01(readLayerNumber(spec.roughness, ['base'], 0.76)),
    metalness: clampPbrMetalness(readLayerNumber(spec.metalness, ['base'], 0.0)),
    clearcoat: clamp01(readLayerNumber(spec.clearcoat, ['base', 'amount'], 0)),
    clearcoatRoughness: clamp01(readLayerNumber(spec.clearcoatRoughness, ['base'], 0.25)),
    transmission: clamp01(readLayerNumber(spec.transmission, ['base', 'amount'], 0)),
    ior: clampPbrIor(readLayerNumber(spec.ior, ['base', 'value'], 1.5)),
    thickness: Math.max(0, readLayerNumber(spec.thickness, ['base', 'amount'], 0)),
    attenuationDistance: Math.max(0.001, readLayerNumber(spec.attenuationDistance, ['base', 'value'], Infinity)),
    attenuationColor: new THREE.Color(typeof spec.attenuationColor === 'string' ? spec.attenuationColor : '#ffffff'),
    sheen: clamp01(readLayerNumber(spec.sheen, ['base', 'amount'], 0)),
    sheenColor: new THREE.Color(typeof spec.sheenColor === 'string' ? spec.sheenColor : '#ffffff'),
    sheenRoughness: clamp01(readLayerNumber(spec.sheenRoughness, ['base'], 1.0)),
    iridescence: clamp01(readLayerNumber(spec.iridescence, ['base', 'amount'], 0)),
    iridescenceIOR: clampPbrIor(readLayerNumber(spec.iridescenceIOR, ['base', 'value'], 1.3)),
    anisotropy: clamp01(readLayerNumber(spec.anisotropy, ['base', 'amount'], 0)),
    anisotropyRotation: readLayerNumber(spec.anisotropy, ['rotation'], 0),
    specularIntensity: clampPbrF0(readLayerNumber(spec.specularF0 ?? spec.f0 ?? spec.specularIntensity, ['base', 'value'], 1.0)),
    specularColor: new THREE.Color(typeof spec.specularColor === 'string' ? spec.specularColor : '#ffffff'),
    emissive: new THREE.Color(typeof spec.emissive === 'string' ? spec.emissive : '#000000'),
    emissiveIntensity: Math.max(0, readLayerNumber(spec.emissiveIntensity, ['base'], 1.0)),
    opacity: clamp01(readLayerNumber(spec.opacity, ['base'], 1)),
    transparent: readLayerNumber(spec.transmission, ['base', 'amount'], 0) > 0 || readLayerNumber(spec.opacity, ['base'], 1) < 1,
    alphaTest: Math.max(0, readLayerNumber(spec.alpha, ['cutoff', 'alphaTest'], 0)),
    wireframe: options.wireframe ?? false,
    side: spec.doubleSided === true ? THREE.DoubleSide : THREE.FrontSide,
    flatShading: spec.flatShading === true,
  });
  if (textures) {
    material.map = textures.albedo;
    material.roughnessMap = textures.roughness;
    material.normalMap = textures.normal;
    material.normalScale.setScalar(Math.max(0.05, readLayerNumber(spec.normal, ['strength', 'amplitude'], 0.35)));
    material.aoMap = textures.ao;
    material.aoMap.channel = 0;
    material.aoMapIntensity = readLayerNumber(spec.ambientOcclusion, ['cavityStrength', 'strength'], 0.35);
    const denseMesh = denseComponent || spec.denseMesh === true || spec.geometryDensity === 'dense' || spec.topologyClass === 'dense';
    const bumpScale = Math.max(0, readLayerNumber(spec.bump, ['amplitude', 'strength'], 0));
    const effectiveBumpScale = denseMesh ? Math.max(0.05, bumpScale) : bumpScale;
    if (effectiveBumpScale > 0) {
      material.bumpMap = textures.height;
      material.bumpScale = effectiveBumpScale;
    }
    const displacementScale = Math.max(0, readLayerNumber(spec.displacement, ['amplitude', 'strength'], 0));
    const effectiveDisplacementScale = denseMesh ? Math.max(0.005, displacementScale) : displacementScale;
    if (effectiveDisplacementScale > 0) {
      material.displacementMap = textures.height;
      material.displacementScale = effectiveDisplacementScale;
      material.displacementBias = -effectiveDisplacementScale * 0.5;
    }
  }
  material.envMapIntensity = readLayerNumber(spec, ['envMapIntensity'], 0.8);
  material.userData.sculptMaterial = spec;
  material.userData.proceduralMapsIndependent = true;
  material.userData.pbrConstraints = { albedoRange: [30, 240], binaryMetalness: true, f0Range: [0.02, 1], iorRange: [1, 2.5] };
  material.userData.pbrTextureSource = textures?.source ?? 'flat-fallback';
  material.userData.referencePbr = spec.referencePbr ?? null;
  material.userData.referenceMaterialId = spec.referenceMaterialId ?? spec.materialReference?.profileId ?? null;
  material.userData.materialEvidence = spec.materialEvidence ?? null;
  material.userData.validationViews = spec.materialReference?.validationViews ?? [];
  material.needsUpdate = true;
  return material;
}

type AttachmentEndpoint = {
  start: THREE.Vector3;
  midpoint: THREE.Vector3;
  quaternion: THREE.Quaternion;
  length: number;
  baseRadius: number;
  endRadius: number;
};

function readVector3(value: unknown, fallback: [number, number, number]): THREE.Vector3 {
  if (Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === 'number')) {
    return new THREE.Vector3(value[0], value[1], value[2]);
  }
  return new THREE.Vector3(fallback[0], fallback[1], fallback[2]);
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function makeAttachmentEndpoint(attachment: unknown): AttachmentEndpoint | null {
  if (!attachment || typeof attachment !== 'object') return null;
  const record = attachment as Record<string, unknown>;
  const start = readVector3(record.localStart, [0, 0, 0]);
  const end = readVector3(record.localEnd, [0, 1, 0]);
  const delta = end.clone().sub(start);
  const length = delta.length();
  if (length <= 0.0001) return null;
  const direction = delta.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  const baseRadius = Math.max(0.005, readNumber(record.baseRadius, 0.06));
  const endRadius = Math.max(0.003, readNumber(record.endRadius, baseRadius * 0.55));
  return {
    start,
    midpoint: delta.multiplyScalar(0.5),
    quaternion,
    length,
    baseRadius,
    endRadius,
  };
}

// Generated from ObjectSculptSpec target: Cargo Tug Boat
// Sculpt build pass: blockout
// This factory is intentionally pass-gated. Finish browser screenshot review before unlocking deeper passes.
export function createCargoTugBoatModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = "Cargo Tug Boat";
  root.userData.reconstructionEvidence = {"itemFamily": null, "subtype": null, "componentAdapter": null, "route": null, "exactnessTier": null, "referenceCamera": {"solved": false, "fovDegrees": 40.0, "aspect": 1.0, "orientation": {"yaw": 0.0, "pitch": 0.0, "roll": 0.0}, "positionHint": [0.0, 0.0, 3.0], "note": "For likeness work, solve the reference camera (forge/stage1_intake/solve_camera_pose.py) so the review render aligns with the photo and the reference can be projected. Confirm by overlay review."}, "approximationNotes": []};
  root.userData.materialPipeline = {};
  root.userData.materialReferenceRegistry = null;

  const materialMap: Record<string, THREE.Material> = {};
  materialMap["body"] = createSculptMaterial(
    "body",
    {"id": "body", "name": "Cargo Tug Boat body", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#2E6E5E", "color": "#2E6E5E", "albedo": {"dominant": "#35709A", "secondary": ["#152F46", "#271015", "#38545F"], "samplingNotes": "Reference-derived from foreground pixels; de-lit to reduce baked shadows/highlights.", "map": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\river_cargo_boat\\body_albedo.png", "url": "/evidence/river_cargo_boat/body_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}}, "colorVariation": {"palette": ["#35709A", "#152F46", "#271015", "#38545F", "#D3AF8B"], "pattern": "reference-derived pixel palette", "amplitude": 0.241, "heightCorrelation": 0.42}, "textureResolution": 1024, "textureProjection": {"mode": "uv", "repeat": [2.0, 2.0], "anisotropy": 8, "texelDensityIntent": "Preserve stable object-scale detail."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 2.0, "amplitude": 0.481, "role": "reference-derived broad albedo and height breakup"}, {"id": "meso", "frequency": 14.0, "amplitude": 0.35, "role": "reference-derived cracks, ridges, pores, grain, or leaf clusters"}, {"id": "micro", "frequency": 72.0, "amplitude": 0.14, "role": "reference-derived micro highlight breakup under grazing light"}], "roughness": {"base": 0.762, "variation": 0.215, "map": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\river_cargo_boat\\body_roughness.png", "url": "/evidence/river_cargo_boat/body_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "localResponse": "reference-derived roughness estimate; cavities and textured zones trend rougher, bright highlights trend smoother"}, "metalness": {"base": 0.35, "variation": 0.05}, "normal": {"pattern": "reference-derived height-gradient normal map", "strength": 0.456, "map": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\river_cargo_boat\\body_normal.png", "url": "/evidence/river_cargo_boat/body_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "heightSource": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\river_cargo_boat\\body_height.png", "url": "/evidence/river_cargo_boat/body_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "space": "tangent"}, "bump": {"pattern": "reference-derived height field", "amplitude": 0.08, "map": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\river_cargo_boat\\body_height.png", "url": "/evidence/river_cargo_boat/body_height.png", "channel": "height", "source": "reference-pixel-extraction"}}, "displacement": {"pattern": "none", "amplitude": 0.0, "scale": 1.0, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.35, "map": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\river_cargo_boat\\body_ao.png", "url": "/evidence/river_cargo_boat/body_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}, "notes": "Reference-derived cavity estimate from local height minima; verify against grazing-light screenshot."}, "wear": {"edgeWear": 0.12, "scratches": [{"region": "lower panels", "density": "sparse"}], "chips": [{"region": "bumper edge", "density": "sparse"}]}, "dirt": {"amount": 0.08, "cavityBias": 0.2, "color": "#2F2A22"}, "localOverrides": [{"id": "body-trim", "region": "trim edges", "note": "painted panels with edge wear"}, {"id": "reference-pbr-pixel-evidence", "type": "material-map-evidence", "evidenceRefs": ["full-object"], "channels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "notes": "Use generated maps as material evidence, then refine after browser screenshot comparison."}, {"id": "reference-pbr-pixel-evidence", "type": "material-map-evidence", "evidenceRefs": ["full-object"], "channels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "notes": "Use generated maps as material evidence, then refine after browser screenshot comparison."}, {"id": "reference-pbr-pixel-evidence", "type": "material-map-evidence", "evidenceRefs": ["full-object"], "channels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "notes": "Use generated maps as material evidence, then refine after browser screenshot comparison."}], "shaderNotes": ["MeshStandardMaterial-compatible PBR channels.", "Independent albedo/roughness/normal/AO.", "Reference-derived maps are estimates from image pixels; verify with neutral, grazing, and reference-matched renders.", "Do not treat baked image shadows as final albedo; rerun extraction with a tighter material crop if highlights/shadows pollute the maps.", "Reference-derived maps are estimates from image pixels; verify with neutral, grazing, and reference-matched renders.", "Do not treat baked image shadows as final albedo; rerun extraction with a tighter material crop if highlights/shadows pollute the maps.", "Reference-derived maps are estimates from image pixels; verify with neutral, grazing, and reference-matched renders.", "Do not treat baked image shadows as final albedo; rerun extraction with a tighter material crop if highlights/shadows pollute the maps."], "referencePbr": {"version": "1.0", "sourceImage": "E:\\dev\\games\\CROSS!\\ref\\C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.829, "estimatedFidelity": 0.829, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\river_cargo_boat\\body_albedo.png", "url": "/evidence/river_cargo_boat/body_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\river_cargo_boat\\body_roughness.png", "url": "/evidence/river_cargo_boat/body_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\river_cargo_boat\\body_height.png", "url": "/evidence/river_cargo_boat/body_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\river_cargo_boat\\body_normal.png", "url": "/evidence/river_cargo_boat/body_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\river_cargo_boat\\body_ao.png", "url": "/evidence/river_cargo_boat/body_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 481, "sourceHeight": 234, "mapSize": 256, "cropBBoxPixels": {"x": 0, "y": 0, "width": 481, "height": 234}, "mask": {"backgroundColor": "#46644A", "backgroundNoise": 76.864, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9834}, "mapStats": {"valueRange": 0.5732, "heightP90Gradient": 0.25539, "roughnessBase": 0.762, "roughnessVariation": 0.215, "normalStrength": 0.456, "blurRadius": 5}, "palette": ["#35709A", "#152F46", "#271015", "#38545F", "#D3AF8B"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "notes": "Cargo Tug Boat body observed from reference C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg."},
    options
  );
  materialMap["glass"] = createSculptMaterial(
    "glass",
    {"id": "glass", "name": "Cargo Tug Boat glass", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#F5F0E0", "color": "#F5F0E0", "albedo": {"dominant": "#F5F0E0", "secondary": ["#B03A2E", "#F5F0E0"], "samplingNotes": "Sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg main zones."}, "colorVariation": {"palette": ["#F5F0E0", "#B03A2E", "#F5F0E0"], "pattern": "mottled", "amplitude": 0.15, "heightCorrelation": 0.3}, "textureResolution": 1024, "textureProjection": {"mode": "uv", "repeat": [2.0, 2.0], "anisotropy": 8, "texelDensityIntent": "Preserve stable object-scale detail."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 2.0, "amplitude": 0.42, "role": "broad color breakup"}, {"id": "meso", "frequency": 12.0, "amplitude": 0.22, "role": "panel ridges and seams"}, {"id": "micro", "frequency": 56.0, "amplitude": 0.08, "role": "highlight breakup"}], "roughness": {"base": 0.12, "variation": 0.15, "map": "independent-procedural-field", "localResponse": "higher roughness in cavities, lower on worn edges"}, "metalness": {"base": 0.1, "variation": 0.05}, "normal": {"pattern": "derived-from-independent-height-field", "strength": 0.35, "scale": 24.0, "space": "tangent"}, "bump": {"pattern": "panel-seam-field", "amplitude": 0.02, "scale": 8.0}, "displacement": {"pattern": "none", "amplitude": 0.0, "scale": 1.0, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.25, "contactShadowBias": 0.35, "notes": "Darken seams, wheel wells, panel gaps."}, "wear": {"edgeWear": 0.12, "scratches": [{"region": "lower panels", "density": "sparse"}], "chips": [{"region": "bumper edge", "density": "sparse"}]}, "dirt": {"amount": 0.08, "cavityBias": 0.2, "color": "#2F2A22"}, "localOverrides": [{"id": "glass-trim", "region": "trim edges", "note": "tinted glazing"}], "shaderNotes": ["MeshStandardMaterial-compatible PBR channels.", "Independent albedo/roughness/normal/AO."], "notes": "Cargo Tug Boat glass observed from reference C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg.", "qualityTier": "utility"},
    options
  );
  materialMap["trim"] = createSculptMaterial(
    "trim",
    {"id": "trim", "name": "Cargo Tug Boat trim", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#B03A2E", "color": "#B03A2E", "albedo": {"dominant": "#B03A2E", "secondary": ["#B03A2E", "#F5F0E0"], "samplingNotes": "Sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg main zones."}, "colorVariation": {"palette": ["#B03A2E", "#B03A2E", "#F5F0E0"], "pattern": "mottled", "amplitude": 0.15, "heightCorrelation": 0.3}, "textureResolution": 1024, "textureProjection": {"mode": "uv", "repeat": [2.0, 2.0], "anisotropy": 8, "texelDensityIntent": "Preserve stable object-scale detail."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 2.0, "amplitude": 0.42, "role": "broad color breakup"}, {"id": "meso", "frequency": 12.0, "amplitude": 0.22, "role": "panel ridges and seams"}, {"id": "micro", "frequency": 56.0, "amplitude": 0.08, "role": "highlight breakup"}], "roughness": {"base": 0.6, "variation": 0.15, "map": "independent-procedural-field", "localResponse": "higher roughness in cavities, lower on worn edges"}, "metalness": {"base": 0.2, "variation": 0.05}, "normal": {"pattern": "derived-from-independent-height-field", "strength": 0.35, "scale": 24.0, "space": "tangent"}, "bump": {"pattern": "panel-seam-field", "amplitude": 0.02, "scale": 8.0}, "displacement": {"pattern": "none", "amplitude": 0.0, "scale": 1.0, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.25, "contactShadowBias": 0.35, "notes": "Darken seams, wheel wells, panel gaps."}, "wear": {"edgeWear": 0.12, "scratches": [{"region": "lower panels", "density": "sparse"}], "chips": [{"region": "bumper edge", "density": "sparse"}]}, "dirt": {"amount": 0.08, "cavityBias": 0.2, "color": "#2F2A22"}, "localOverrides": [{"id": "trim-trim", "region": "trim edges", "note": "rubber/trim dark zones"}], "shaderNotes": ["MeshStandardMaterial-compatible PBR channels.", "Independent albedo/roughness/normal/AO."], "notes": "Cargo Tug Boat trim observed from reference C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg.", "qualityTier": "utility"},
    options
  );

  const nodes: Record<string, THREE.Object3D> = { root };
  const meshes: Record<string, THREE.Mesh> = {};
  const sockets: Record<string, THREE.Object3D> = {};
  const colliders: Record<string, unknown> = {};
  const destructionGroups: Record<string, THREE.Object3D[]> = {};

  const endpoint_hull_0 = makeAttachmentEndpoint(null);
  const node_hull_0 = new THREE.Group();
  node_hull_0.name = "Cargo Tug Boat hull__pivot";
  node_hull_0.scale.set(1, 1, 1);
  if (endpoint_hull_0) {
    node_hull_0.position.copy(endpoint_hull_0.start);
    node_hull_0.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_hull_0.position.set(0.0, 0.0, 0.0);
    node_hull_0.rotation.set(0.0, 0.0, 0.0);
  }
  node_hull_0.userData.sculptComponent = {"id": "hull", "name": "Cargo Tug Boat hull", "level": "macro", "role": "body", "importance": 1.0, "confidence": 0.75, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "hull is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "hull blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": null, "attachment": null, "dimensions": {"width": 2.6, "height": 0.9, "depth": 1.1, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.0, 0.0, 0.0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["hull-seam"], "localFeatures": ["hull-bevel", "hull-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "hull panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_hull_0.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["root"] ?? root).add(node_hull_0);
  nodes["hull"] = node_hull_0;
  const mesh_hull_0Geometry = endpoint_hull_0
    ? new THREE.CylinderGeometry(endpoint_hull_0.endRadius, endpoint_hull_0.baseRadius, endpoint_hull_0.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_hull_0) {
    mesh_hull_0Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_hull_0 = new THREE.Mesh(
    mesh_hull_0Geometry,
    materialMap["body"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_hull_0.name = "Cargo Tug Boat hull";
  if (endpoint_hull_0) {
    mesh_hull_0.position.copy(endpoint_hull_0.midpoint);
    mesh_hull_0.quaternion.copy(endpoint_hull_0.quaternion);
  }
  mesh_hull_0.castShadow = options.castShadow ?? true;
  mesh_hull_0.receiveShadow = options.receiveShadow ?? true;
  mesh_hull_0.userData.sculptComponent = {"id": "hull", "name": "Cargo Tug Boat hull", "level": "macro", "role": "body", "importance": 1.0, "confidence": 0.75, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "hull is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "hull blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": null, "attachment": null, "dimensions": {"width": 2.6, "height": 0.9, "depth": 1.1, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.0, 0.0, 0.0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["hull-seam"], "localFeatures": ["hull-bevel", "hull-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "hull panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_hull_0.add(mesh_hull_0);
  meshes["hull"] = mesh_hull_0;
  colliders["hull"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_hull_0);

  const endpoint_deck_cabin_1 = makeAttachmentEndpoint(null);
  const node_deck_cabin_1 = new THREE.Group();
  node_deck_cabin_1.name = "Cargo Tug Boat deck cabin__pivot";
  node_deck_cabin_1.scale.set(1, 1, 1);
  if (endpoint_deck_cabin_1) {
    node_deck_cabin_1.position.copy(endpoint_deck_cabin_1.start);
    node_deck_cabin_1.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_deck_cabin_1.position.set(-0.7, 0.0, 0.1);
    node_deck_cabin_1.rotation.set(0.0, 0.0, 0.0);
  }
  node_deck_cabin_1.userData.sculptComponent = {"id": "deck_cabin", "name": "Cargo Tug Boat deck cabin", "level": "macro", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "deck_cabin is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "deck_cabin blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "hull", "attachment": {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 2.2, "height": 1.1, "depth": 1.2, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.1], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["deck_cabin-seam"], "localFeatures": ["deck_cabin-bevel", "deck_cabin-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "deck_cabin panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_deck_cabin_1.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["hull"] ?? root).add(node_deck_cabin_1);
  nodes["deck_cabin"] = node_deck_cabin_1;
  const mesh_deck_cabin_1Geometry = endpoint_deck_cabin_1
    ? new THREE.CylinderGeometry(endpoint_deck_cabin_1.endRadius, endpoint_deck_cabin_1.baseRadius, endpoint_deck_cabin_1.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_deck_cabin_1) {
    mesh_deck_cabin_1Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_deck_cabin_1 = new THREE.Mesh(
    mesh_deck_cabin_1Geometry,
    materialMap["body"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_deck_cabin_1.name = "Cargo Tug Boat deck cabin";
  if (endpoint_deck_cabin_1) {
    mesh_deck_cabin_1.position.copy(endpoint_deck_cabin_1.midpoint);
    mesh_deck_cabin_1.quaternion.copy(endpoint_deck_cabin_1.quaternion);
  }
  mesh_deck_cabin_1.castShadow = options.castShadow ?? true;
  mesh_deck_cabin_1.receiveShadow = options.receiveShadow ?? true;
  mesh_deck_cabin_1.userData.sculptComponent = {"id": "deck_cabin", "name": "Cargo Tug Boat deck cabin", "level": "macro", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "deck_cabin is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "deck_cabin blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "hull", "attachment": {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 2.2, "height": 1.1, "depth": 1.2, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.1], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["deck_cabin-seam"], "localFeatures": ["deck_cabin-bevel", "deck_cabin-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "deck_cabin panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_deck_cabin_1.add(mesh_deck_cabin_1);
  meshes["deck_cabin"] = mesh_deck_cabin_1;
  colliders["deck_cabin"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_deck_cabin_1);

  const attachment_bow_rail_2 = {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01};
  const endpoint_bow_rail_2 = makeAttachmentEndpoint(attachment_bow_rail_2);
  const node_bow_rail_2 = new THREE.Group();
  node_bow_rail_2.name = "Cargo Tug Boat bow rail__pivot";
  node_bow_rail_2.scale.set(1, 1, 1);
  if (endpoint_bow_rail_2) {
    node_bow_rail_2.position.copy(endpoint_bow_rail_2.start);
    node_bow_rail_2.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_bow_rail_2.position.set(0.7, 0.0, 0.2);
    node_bow_rail_2.rotation.set(0.0, 0.0, 0.0);
  }
  node_bow_rail_2.userData.sculptComponent = {"id": "bow_rail", "name": "Cargo Tug Boat bow rail", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "tube", "topologyClass": "assembled-solid", "topologyRationale": "bow_rail is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "bow_rail blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "hull", "attachment": {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.7, 0.0, 0.2], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["bow_rail-seam"], "localFeatures": ["bow_rail-bevel", "bow_rail-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "bow_rail panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_bow_rail_2.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["hull"] ?? root).add(node_bow_rail_2);
  nodes["bow_rail"] = node_bow_rail_2;
  const mesh_bow_rail_2Geometry = endpoint_bow_rail_2
    ? new THREE.CylinderGeometry(endpoint_bow_rail_2.endRadius, endpoint_bow_rail_2.baseRadius, endpoint_bow_rail_2.length, 32, 12)
    : buildTubeGeometry({"points": [[0.0, -0.5, 0.0], [0.0, 0.5, 0.0]], "radius": 0.05, "closed": false});
  if (!endpoint_bow_rail_2) {
    mesh_bow_rail_2Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_bow_rail_2 = new THREE.Mesh(
    mesh_bow_rail_2Geometry,
    materialMap["body"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_bow_rail_2.name = "Cargo Tug Boat bow rail";
  if (endpoint_bow_rail_2) {
    mesh_bow_rail_2.position.copy(endpoint_bow_rail_2.midpoint);
    mesh_bow_rail_2.quaternion.copy(endpoint_bow_rail_2.quaternion);
  }
  mesh_bow_rail_2.castShadow = options.castShadow ?? true;
  mesh_bow_rail_2.receiveShadow = options.receiveShadow ?? true;
  mesh_bow_rail_2.userData.sculptComponent = {"id": "bow_rail", "name": "Cargo Tug Boat bow rail", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "tube", "topologyClass": "assembled-solid", "topologyRationale": "bow_rail is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "bow_rail blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "hull", "attachment": {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.7, 0.0, 0.2], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["bow_rail-seam"], "localFeatures": ["bow_rail-bevel", "bow_rail-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "bow_rail panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_bow_rail_2.add(mesh_bow_rail_2);
  meshes["bow_rail"] = mesh_bow_rail_2;
  colliders["bow_rail"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_bow_rail_2);

  const endpoint_life_rings_3 = makeAttachmentEndpoint(null);
  const node_life_rings_3 = new THREE.Group();
  node_life_rings_3.name = "Cargo Tug Boat life rings__pivot";
  node_life_rings_3.scale.set(1, 1, 1);
  if (endpoint_life_rings_3) {
    node_life_rings_3.position.copy(endpoint_life_rings_3.start);
    node_life_rings_3.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_life_rings_3.position.set(-0.7, 0.0, 0.30000000000000004);
    node_life_rings_3.rotation.set(0.0, 0.0, 0.0);
  }
  node_life_rings_3.userData.sculptComponent = {"id": "life_rings", "name": "Cargo Tug Boat life rings", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "torus", "topologyClass": "assembled-solid", "topologyRationale": "life_rings is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "life_rings blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "hull", "attachment": {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.30000000000000004], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["life_rings-seam"], "localFeatures": ["life_rings-bevel", "life_rings-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "life_rings panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_life_rings_3.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["hull"] ?? root).add(node_life_rings_3);
  nodes["life_rings"] = node_life_rings_3;
  const mesh_life_rings_3Geometry = endpoint_life_rings_3
    ? new THREE.CylinderGeometry(endpoint_life_rings_3.endRadius, endpoint_life_rings_3.baseRadius, endpoint_life_rings_3.length, 32, 12)
    : new THREE.TorusGeometry(0.45, 0.08, 24, 96);
  if (!endpoint_life_rings_3) {
    mesh_life_rings_3Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_life_rings_3 = new THREE.Mesh(
    mesh_life_rings_3Geometry,
    materialMap["body"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_life_rings_3.name = "Cargo Tug Boat life rings";
  if (endpoint_life_rings_3) {
    mesh_life_rings_3.position.copy(endpoint_life_rings_3.midpoint);
    mesh_life_rings_3.quaternion.copy(endpoint_life_rings_3.quaternion);
  }
  mesh_life_rings_3.castShadow = options.castShadow ?? true;
  mesh_life_rings_3.receiveShadow = options.receiveShadow ?? true;
  mesh_life_rings_3.userData.sculptComponent = {"id": "life_rings", "name": "Cargo Tug Boat life rings", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "torus", "topologyClass": "assembled-solid", "topologyRationale": "life_rings is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "life_rings blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "hull", "attachment": {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.30000000000000004], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["life_rings-seam"], "localFeatures": ["life_rings-bevel", "life_rings-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "life_rings panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_life_rings_3.add(mesh_life_rings_3);
  meshes["life_rings"] = mesh_life_rings_3;
  colliders["life_rings"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_life_rings_3);

  const endpoint_cabin_windows_4 = makeAttachmentEndpoint(null);
  const node_cabin_windows_4 = new THREE.Group();
  node_cabin_windows_4.name = "Cargo Tug Boat cabin windows__pivot";
  node_cabin_windows_4.scale.set(1, 1, 1);
  if (endpoint_cabin_windows_4) {
    node_cabin_windows_4.position.copy(endpoint_cabin_windows_4.start);
    node_cabin_windows_4.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_cabin_windows_4.position.set(0.7, 0.0, 0.4);
    node_cabin_windows_4.rotation.set(0.0, 0.0, 0.0);
  }
  node_cabin_windows_4.userData.sculptComponent = {"id": "cabin_windows", "name": "Cargo Tug Boat cabin windows", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "surface-relief", "topologyRationale": "cabin_windows is modeled as surface-relief because the reference shows a fitted surface layer with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "cabin_windows blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "hull", "attachment": {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.7, 0.0, 0.4], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "glass", "materialLayers": ["glass"], "deformations": [], "joints": [], "seams": ["cabin_windows-seam"], "localFeatures": ["cabin_windows-bevel", "cabin_windows-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "cabin_windows panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_cabin_windows_4.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["hull"] ?? root).add(node_cabin_windows_4);
  nodes["cabin_windows"] = node_cabin_windows_4;
  const mesh_cabin_windows_4Geometry = endpoint_cabin_windows_4
    ? new THREE.CylinderGeometry(endpoint_cabin_windows_4.endRadius, endpoint_cabin_windows_4.baseRadius, endpoint_cabin_windows_4.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_cabin_windows_4) {
    mesh_cabin_windows_4Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_cabin_windows_4 = new THREE.Mesh(
    mesh_cabin_windows_4Geometry,
    materialMap["glass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_cabin_windows_4.name = "Cargo Tug Boat cabin windows";
  if (endpoint_cabin_windows_4) {
    mesh_cabin_windows_4.position.copy(endpoint_cabin_windows_4.midpoint);
    mesh_cabin_windows_4.quaternion.copy(endpoint_cabin_windows_4.quaternion);
  }
  mesh_cabin_windows_4.castShadow = options.castShadow ?? true;
  mesh_cabin_windows_4.receiveShadow = options.receiveShadow ?? true;
  mesh_cabin_windows_4.userData.sculptComponent = {"id": "cabin_windows", "name": "Cargo Tug Boat cabin windows", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "surface-relief", "topologyRationale": "cabin_windows is modeled as surface-relief because the reference shows a fitted surface layer with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "cabin_windows blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "hull", "attachment": {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.7, 0.0, 0.4], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "glass", "materialLayers": ["glass"], "deformations": [], "joints": [], "seams": ["cabin_windows-seam"], "localFeatures": ["cabin_windows-bevel", "cabin_windows-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "cabin_windows panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_cabin_windows_4.add(mesh_cabin_windows_4);
  meshes["cabin_windows"] = mesh_cabin_windows_4;
  colliders["cabin_windows"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_cabin_windows_4);

  const attachment_engine_stack_5 = {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01};
  const endpoint_engine_stack_5 = makeAttachmentEndpoint(attachment_engine_stack_5);
  const node_engine_stack_5 = new THREE.Group();
  node_engine_stack_5.name = "Cargo Tug Boat engine stack__pivot";
  node_engine_stack_5.scale.set(1, 1, 1);
  if (endpoint_engine_stack_5) {
    node_engine_stack_5.position.copy(endpoint_engine_stack_5.start);
    node_engine_stack_5.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_engine_stack_5.position.set(-0.7, 0.0, 0.5);
    node_engine_stack_5.rotation.set(0.0, 0.0, 0.0);
  }
  node_engine_stack_5.userData.sculptComponent = {"id": "engine_stack", "name": "Cargo Tug Boat engine stack", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "engine_stack is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "engine_stack blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "hull", "attachment": {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.5], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["engine_stack-seam"], "localFeatures": ["engine_stack-bevel", "engine_stack-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "engine_stack panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_engine_stack_5.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["hull"] ?? root).add(node_engine_stack_5);
  nodes["engine_stack"] = node_engine_stack_5;
  const mesh_engine_stack_5Geometry = endpoint_engine_stack_5
    ? new THREE.CylinderGeometry(endpoint_engine_stack_5.endRadius, endpoint_engine_stack_5.baseRadius, endpoint_engine_stack_5.length, 32, 12)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 48, 16);
  if (!endpoint_engine_stack_5) {
    mesh_engine_stack_5Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_engine_stack_5 = new THREE.Mesh(
    mesh_engine_stack_5Geometry,
    materialMap["body"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_engine_stack_5.name = "Cargo Tug Boat engine stack";
  if (endpoint_engine_stack_5) {
    mesh_engine_stack_5.position.copy(endpoint_engine_stack_5.midpoint);
    mesh_engine_stack_5.quaternion.copy(endpoint_engine_stack_5.quaternion);
  }
  mesh_engine_stack_5.castShadow = options.castShadow ?? true;
  mesh_engine_stack_5.receiveShadow = options.receiveShadow ?? true;
  mesh_engine_stack_5.userData.sculptComponent = {"id": "engine_stack", "name": "Cargo Tug Boat engine stack", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "engine_stack is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "engine_stack blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "hull", "attachment": {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.5], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["engine_stack-seam"], "localFeatures": ["engine_stack-bevel", "engine_stack-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "engine_stack panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_engine_stack_5.add(mesh_engine_stack_5);
  meshes["engine_stack"] = mesh_engine_stack_5;
  colliders["engine_stack"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_engine_stack_5);

  const endpoint_cargo_crates_6 = makeAttachmentEndpoint(null);
  const node_cargo_crates_6 = new THREE.Group();
  node_cargo_crates_6.name = "Cargo Tug Boat cargo crates__pivot";
  node_cargo_crates_6.scale.set(1, 1, 1);
  if (endpoint_cargo_crates_6) {
    node_cargo_crates_6.position.copy(endpoint_cargo_crates_6.start);
    node_cargo_crates_6.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_cargo_crates_6.position.set(0.7, 0.0, 0.6000000000000001);
    node_cargo_crates_6.rotation.set(0.0, 0.0, 0.0);
  }
  node_cargo_crates_6.userData.sculptComponent = {"id": "cargo_crates", "name": "Cargo Tug Boat cargo crates", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "cargo_crates is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "cargo_crates blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "hull", "attachment": {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.7, 0.0, 0.6000000000000001], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["cargo_crates-seam"], "localFeatures": ["cargo_crates-bevel", "cargo_crates-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "cargo_crates panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_cargo_crates_6.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["hull"] ?? root).add(node_cargo_crates_6);
  nodes["cargo_crates"] = node_cargo_crates_6;
  const mesh_cargo_crates_6Geometry = endpoint_cargo_crates_6
    ? new THREE.CylinderGeometry(endpoint_cargo_crates_6.endRadius, endpoint_cargo_crates_6.baseRadius, endpoint_cargo_crates_6.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_cargo_crates_6) {
    mesh_cargo_crates_6Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_cargo_crates_6 = new THREE.Mesh(
    mesh_cargo_crates_6Geometry,
    materialMap["body"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_cargo_crates_6.name = "Cargo Tug Boat cargo crates";
  if (endpoint_cargo_crates_6) {
    mesh_cargo_crates_6.position.copy(endpoint_cargo_crates_6.midpoint);
    mesh_cargo_crates_6.quaternion.copy(endpoint_cargo_crates_6.quaternion);
  }
  mesh_cargo_crates_6.castShadow = options.castShadow ?? true;
  mesh_cargo_crates_6.receiveShadow = options.receiveShadow ?? true;
  mesh_cargo_crates_6.userData.sculptComponent = {"id": "cargo_crates", "name": "Cargo Tug Boat cargo crates", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "cargo_crates is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "cargo_crates blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "hull", "attachment": {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.7, 0.0, 0.6000000000000001], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["cargo_crates-seam"], "localFeatures": ["cargo_crates-bevel", "cargo_crates-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "cargo_crates panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_cargo_crates_6.add(mesh_cargo_crates_6);
  meshes["cargo_crates"] = mesh_cargo_crates_6;
  colliders["cargo_crates"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_cargo_crates_6);

  const endpoint_wake_skirt_7 = makeAttachmentEndpoint(null);
  const node_wake_skirt_7 = new THREE.Group();
  node_wake_skirt_7.name = "Cargo Tug Boat wake skirt__pivot";
  node_wake_skirt_7.scale.set(1, 1, 1);
  if (endpoint_wake_skirt_7) {
    node_wake_skirt_7.position.copy(endpoint_wake_skirt_7.start);
    node_wake_skirt_7.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_wake_skirt_7.position.set(-0.7, 0.0, 0.7000000000000001);
    node_wake_skirt_7.rotation.set(0.0, 0.0, 0.0);
  }
  node_wake_skirt_7.userData.sculptComponent = {"id": "wake_skirt", "name": "Cargo Tug Boat wake skirt", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "conforming-shell", "topologyRationale": "wake_skirt is modeled as conforming-shell because the reference shows a fitted surface layer with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "wake_skirt blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "hull", "attachment": {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.7000000000000001], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["wake_skirt-seam"], "localFeatures": ["wake_skirt-bevel", "wake_skirt-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "wake_skirt panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_wake_skirt_7.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["hull"] ?? root).add(node_wake_skirt_7);
  nodes["wake_skirt"] = node_wake_skirt_7;
  const mesh_wake_skirt_7Geometry = endpoint_wake_skirt_7
    ? new THREE.CylinderGeometry(endpoint_wake_skirt_7.endRadius, endpoint_wake_skirt_7.baseRadius, endpoint_wake_skirt_7.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_wake_skirt_7) {
    mesh_wake_skirt_7Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_wake_skirt_7 = new THREE.Mesh(
    mesh_wake_skirt_7Geometry,
    materialMap["body"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_wake_skirt_7.name = "Cargo Tug Boat wake skirt";
  if (endpoint_wake_skirt_7) {
    mesh_wake_skirt_7.position.copy(endpoint_wake_skirt_7.midpoint);
    mesh_wake_skirt_7.quaternion.copy(endpoint_wake_skirt_7.quaternion);
  }
  mesh_wake_skirt_7.castShadow = options.castShadow ?? true;
  mesh_wake_skirt_7.receiveShadow = options.receiveShadow ?? true;
  mesh_wake_skirt_7.userData.sculptComponent = {"id": "wake_skirt", "name": "Cargo Tug Boat wake skirt", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "conforming-shell", "topologyRationale": "wake_skirt is modeled as conforming-shell because the reference shows a fitted surface layer with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "wake_skirt blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "hull", "attachment": {"parentId": "hull", "parentSocket": "hull-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.7000000000000001], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["wake_skirt-seam"], "localFeatures": ["wake_skirt-bevel", "wake_skirt-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "wake_skirt panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(46, 110, 94, 1.0)", "secondaryAlbedo": "rgba(176, 58, 46, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(46, 110, 94, 1.0)", "at": 0.0}, {"color": "rgba(176, 58, 46, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03 6.jpg"}};
  node_wake_skirt_7.add(mesh_wake_skirt_7);
  meshes["wake_skirt"] = mesh_wake_skirt_7;
  colliders["wake_skirt"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_wake_skirt_7);

  root.userData.sculptRuntime = { nodes, meshes, sockets, colliders, destructionGroups } satisfies ProceduralModelRuntime;
  root.userData.lookDevTargets = {"qualityPriority": "reference-fidelity", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "minimumTextureResolution": 1024, "preferredTextureResolution": 2048, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "requiredSurfaceFrequencyBands": ["macro", "meso", "micro"], "geometryReliefRequiredWhenSilhouetteAffected": true, "referencePbrExtraction": {"requiredWhenSourceImagePresent": true, "targetThreshold": 0.7, "stopOnLowConfidence": true, "script": "forge/stage1_intake/extract_pbr_evidence.py", "acceptedLimitation": "single-image extraction is reference-derived inference, not exact photogrammetry"}, "mustAvoid": ["single flat albedo per material", "uniform roughness", "albedo texture reused as roughness/height/normal/AO", "single-frequency random noise", "plastic-looking smooth bark, stone, cloth, foliage, or aged material", "local color/detail described only in prose without material masks", "claiming exact PBR recovery when confidence is below the target threshold"]}, "lightingPass": {"requiredTerms": ["key light", "fill light", "rim or environment light", "exposure", "tone mapping", "background", "contact shadow"], "mustAvoid": ["ambient-only lighting", "flat value range", "missing contact shadow", "reference lighting copied without separating material readability"]}, "screenshotReview": ["Compare albedo palette and local color zones.", "Compare roughness/normal/bump response under light.", "Compare cavity dirt, edge wear, stains, moss, scratches, or other local masks.", "Compare key/fill/rim structure, exposure, tone mapping, background, and contact shadows.", "Capture a neutral-light render to verify material readability without reference lighting.", "Capture a grazing-light close-up to expose flat normals, uniform roughness, tiling, and plastic highlights.", "Capture a reference-matched render from the same camera framing as the source."]};
  root.userData.actionReadiness = {
    note: 'Use root.userData.sculptRuntime.nodes for transforms, sockets for attachments, colliders for physics proxies, and destructionGroups for breakable sets.',
  };
  return root;
}

export function createCargoTugBoatLookDevLights(
  mode: 'neutral' | 'grazing' | 'reference' = 'neutral',
): THREE.Group {
  const lights = new THREE.Group();
  lights.name = "Cargo Tug Boat look-dev lights";
  const hemi = new THREE.HemisphereLight(
    mode === 'reference' ? 0xfff0d6 : 0xf2f4ff,
    0x363b42,
    mode === 'grazing' ? 0.28 : mode === 'reference' ? 0.72 : 0.85,
  );
  lights.add(hemi);
  const key = new THREE.DirectionalLight(
    mode === 'reference' ? 0xffcf8a : 0xfff4e8,
    mode === 'grazing' ? 4.2 : mode === 'reference' ? 2.6 : 2.15,
  );
  if (mode === 'grazing') key.position.set(7.5, 1.1, 4.0);
  else if (mode === 'reference') key.position.set(-4.5, 7.5, 5.0);
  else key.position.set(-4.0, 6.0, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.018;
  key.shadow.radius = 7;
  key.shadow.blurSamples = 24;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -2.6;
  key.shadow.camera.right = 2.6;
  key.shadow.camera.top = 2.6;
  key.shadow.camera.bottom = -2.6;
  key.shadow.camera.updateProjectionMatrix();
  lights.add(key);
  const fill = new THREE.DirectionalLight(0xa8c4ff, mode === 'grazing' ? 0.12 : 0.42);
  fill.position.set(4.0, 3.0, 3.5);
  lights.add(fill);
  const rim = new THREE.DirectionalLight(0xfff1c4, mode === 'grazing' ? 0.28 : 0.85);
  rim.position.set(0.5, 4.5, -6.0);
  lights.add(rim);
  lights.userData.reviewMode = mode;
  lights.userData.lightingFromPhoto = ["key light warm white from upper front-left, exposure 1.0 with ACES tone mapping", "fill light cool sky-blue from right at 0.4 intensity with filmic tone response", "rim light orange from rear for edge separation with contact shadow under body and ground ambient occlusion"];
  lights.userData.lookDevTargets = {"qualityPriority": "reference-fidelity", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "minimumTextureResolution": 1024, "preferredTextureResolution": 2048, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "requiredSurfaceFrequencyBands": ["macro", "meso", "micro"], "geometryReliefRequiredWhenSilhouetteAffected": true, "referencePbrExtraction": {"requiredWhenSourceImagePresent": true, "targetThreshold": 0.7, "stopOnLowConfidence": true, "script": "forge/stage1_intake/extract_pbr_evidence.py", "acceptedLimitation": "single-image extraction is reference-derived inference, not exact photogrammetry"}, "mustAvoid": ["single flat albedo per material", "uniform roughness", "albedo texture reused as roughness/height/normal/AO", "single-frequency random noise", "plastic-looking smooth bark, stone, cloth, foliage, or aged material", "local color/detail described only in prose without material masks", "claiming exact PBR recovery when confidence is below the target threshold"]}, "lightingPass": {"requiredTerms": ["key light", "fill light", "rim or environment light", "exposure", "tone mapping", "background", "contact shadow"], "mustAvoid": ["ambient-only lighting", "flat value range", "missing contact shadow", "reference lighting copied without separating material readability"]}, "screenshotReview": ["Compare albedo palette and local color zones.", "Compare roughness/normal/bump response under light.", "Compare cavity dirt, edge wear, stains, moss, scratches, or other local masks.", "Compare key/fill/rim structure, exposure, tone mapping, background, and contact shadows.", "Capture a neutral-light render to verify material readability without reference lighting.", "Capture a grazing-light close-up to expose flat normals, uniform roughness, tiling, and plastic highlights.", "Capture a reference-matched render from the same camera framing as the source."]};
  return lights;
}

// PBR materials (clearcoat/iridescence/transmission/anisotropy) need an environment
// map to visually behave as intended — call this once per renderer and assign the
// result to scene.environment before rendering. No external HDR asset required.
export function createCargoTugBoatEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return texture;
}

// Plan 1.3 §3.2 — auto-framing by bounding box. The Divine Eye can only compare a
// render to the reference if the object is FRAMED consistently (an object framed
// differently scores as wrong even when its shape is right). This positions the camera
// deterministically from the object's bounding box so it fills the frame at a stable
// margin, and sets near/far to the object scale. Call after adding the model to the
// scene, and again on resize (after updating camera.aspect).
export function frameCargoTugBoatCamera(
  camera: THREE.PerspectiveCamera,
  object: THREE.Object3D,
  options: { margin?: number; azimuthDeg?: number; elevationDeg?: number } = {},
): void {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const margin = options.margin ?? 1.15;
  const maxDim = Math.max(size.x, size.y, size.z) * margin;
  const fov = (camera.fov * Math.PI) / 180;
  // distance so the largest object dimension fits vertically in the frame
  const distance = (maxDim / 2) / Math.tan(fov / 2);
  const az = ((options.azimuthDeg ?? 0) * Math.PI) / 180;
  const el = ((options.elevationDeg ?? 0) * Math.PI) / 180;
  const dir = new THREE.Vector3(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    Math.cos(az) * Math.cos(el),
  );
  camera.position.copy(center).addScaledVector(dir, distance);
  camera.near = Math.max(0.01, distance - maxDim);
  camera.far = distance + maxDim * 2;
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

// Plan 1.3 §3.2c — PRESENTATION composer (DOF + bloom). CRITICAL (R-POSTFX): this is
// for the showcase/hero render ONLY. The Divine Eye's EVALUATION render MUST use a
// plain renderer with NO composer — bloom blows highlights and DOF blurs edges, which
// would corrupt the deterministic IoU/DCD/edge/blowout signals. Enable dof/bloom ONLY
// when the reference photo actually exhibits them (detect_reference_effects.py authorizes).
export function createCargoTugBoatPresentationComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: { dof?: boolean; bloom?: boolean; bloomStrength?: number; dofFocus?: number; dofAperture?: number } = {},
): EffectComposer {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (options.dof) {
    composer.addPass(new BokehPass(scene, camera, {
      focus: options.dofFocus ?? 10.0,
      aperture: options.dofAperture ?? 0.0002,
      maxblur: 0.01,
    }));
  }
  if (options.bloom) {
    const size = new THREE.Vector2();
    renderer.getSize(size);
    composer.addPass(new UnrealBloomPass(size, options.bloomStrength ?? 0.4, 0.4, 0.85));
  }
  return composer;
}

export function configureCargoTugBoatRenderer(renderer: THREE.WebGLRenderer): void {
  // Load-bearing for view-dependent finishes (anodized / Doppler): without ACES + sRGB
  // the environment reflection reads flat/washed instead of a believable metal response.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

export function createCargoTugBoatInspectControls(
  camera: THREE.Camera,
  domElement: HTMLElement,
): OrbitControls {
  // View-dependent finishes only read correctly once the user orbits — their color
  // comes from the environment reflection, not albedo, so free rotation matters here.
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.minDistance = 1.0;
  controls.maxDistance = 8.0;
  controls.autoRotate = false;
  return controls;
}
