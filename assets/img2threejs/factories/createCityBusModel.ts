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

// Generated from ObjectSculptSpec target: City Bus
// Sculpt build pass: blockout
// This factory is intentionally pass-gated. Finish browser screenshot review before unlocking deeper passes.
export function createCityBusModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = "City Bus";
  root.userData.reconstructionEvidence = {"itemFamily": null, "subtype": null, "componentAdapter": null, "route": null, "exactnessTier": null, "referenceCamera": {"solved": false, "fovDegrees": 40.0, "aspect": 1.0, "orientation": {"yaw": 0.0, "pitch": 0.0, "roll": 0.0}, "positionHint": [0.0, 0.0, 3.0], "note": "For likeness work, solve the reference camera (forge/stage1_intake/solve_camera_pose.py) so the review render aligns with the photo and the reference can be projected. Confirm by overlay review."}, "approximationNotes": []};
  root.userData.materialPipeline = {};
  root.userData.materialReferenceRegistry = null;

  const materialMap: Record<string, THREE.Material> = {};
  materialMap["body"] = createSculptMaterial(
    "body",
    {"id": "body", "name": "City Bus body", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#2456E6", "color": "#2456E6", "albedo": {"dominant": "#172342", "secondary": ["#547CE1", "#080B1B", "#3C3844"], "samplingNotes": "Reference-derived from foreground pixels; de-lit to reduce baked shadows/highlights.", "map": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\city_bus\\body_albedo.png", "url": "/evidence/city_bus/body_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}}, "colorVariation": {"palette": ["#172342", "#547CE1", "#080B1B", "#3C3844", "#2E4285"], "pattern": "reference-derived pixel palette", "amplitude": 0.245, "heightCorrelation": 0.42}, "textureResolution": 1024, "textureProjection": {"mode": "uv", "repeat": [2.0, 2.0], "anisotropy": 8, "texelDensityIntent": "Preserve stable object-scale detail."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 2.0, "amplitude": 0.484, "role": "reference-derived broad albedo and height breakup"}, {"id": "meso", "frequency": 14.0, "amplitude": 0.35, "role": "reference-derived cracks, ridges, pores, grain, or leaf clusters"}, {"id": "micro", "frequency": 72.0, "amplitude": 0.14, "role": "reference-derived micro highlight breakup under grazing light"}], "roughness": {"base": 0.8, "variation": 0.218, "map": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\city_bus\\body_roughness.png", "url": "/evidence/city_bus/body_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "localResponse": "reference-derived roughness estimate; cavities and textured zones trend rougher, bright highlights trend smoother"}, "metalness": {"base": 0.35, "variation": 0.05}, "normal": {"pattern": "reference-derived height-gradient normal map", "strength": 0.428, "map": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\city_bus\\body_normal.png", "url": "/evidence/city_bus/body_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "heightSource": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\city_bus\\body_height.png", "url": "/evidence/city_bus/body_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "space": "tangent"}, "bump": {"pattern": "reference-derived height field", "amplitude": 0.08, "map": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\city_bus\\body_height.png", "url": "/evidence/city_bus/body_height.png", "channel": "height", "source": "reference-pixel-extraction"}}, "displacement": {"pattern": "none", "amplitude": 0.0, "scale": 1.0, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.35, "map": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\city_bus\\body_ao.png", "url": "/evidence/city_bus/body_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}, "notes": "Reference-derived cavity estimate from local height minima; verify against grazing-light screenshot."}, "wear": {"edgeWear": 0.12, "scratches": [{"region": "lower panels", "density": "sparse"}], "chips": [{"region": "bumper edge", "density": "sparse"}]}, "dirt": {"amount": 0.08, "cavityBias": 0.2, "color": "#2F2A22"}, "localOverrides": [{"id": "body-trim", "region": "trim edges", "note": "painted panels with edge wear"}, {"id": "reference-pbr-pixel-evidence", "type": "material-map-evidence", "evidenceRefs": ["full-object"], "channels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "notes": "Use generated maps as material evidence, then refine after browser screenshot comparison."}, {"id": "reference-pbr-pixel-evidence", "type": "material-map-evidence", "evidenceRefs": ["full-object"], "channels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "notes": "Use generated maps as material evidence, then refine after browser screenshot comparison."}, {"id": "reference-pbr-pixel-evidence", "type": "material-map-evidence", "evidenceRefs": ["full-object"], "channels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "notes": "Use generated maps as material evidence, then refine after browser screenshot comparison."}], "shaderNotes": ["MeshStandardMaterial-compatible PBR channels.", "Independent albedo/roughness/normal/AO.", "Reference-derived maps are estimates from image pixels; verify with neutral, grazing, and reference-matched renders.", "Do not treat baked image shadows as final albedo; rerun extraction with a tighter material crop if highlights/shadows pollute the maps.", "Reference-derived maps are estimates from image pixels; verify with neutral, grazing, and reference-matched renders.", "Do not treat baked image shadows as final albedo; rerun extraction with a tighter material crop if highlights/shadows pollute the maps.", "Reference-derived maps are estimates from image pixels; verify with neutral, grazing, and reference-matched renders.", "Do not treat baked image shadows as final albedo; rerun extraction with a tighter material crop if highlights/shadows pollute the maps."], "referencePbr": {"version": "1.0", "sourceImage": "E:\\dev\\games\\CROSS!\\ref\\C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.829, "estimatedFidelity": 0.829, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\city_bus\\body_albedo.png", "url": "/evidence/city_bus/body_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\city_bus\\body_roughness.png", "url": "/evidence/city_bus/body_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\city_bus\\body_height.png", "url": "/evidence/city_bus/body_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\city_bus\\body_normal.png", "url": "/evidence/city_bus/body_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "E:\\dev\\games\\CROSS!\\public\\evidence\\city_bus\\body_ao.png", "url": "/evidence/city_bus/body_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 497, "sourceHeight": 206, "mapSize": 256, "cropBBoxPixels": {"x": 0, "y": 0, "width": 497, "height": 206}, "mask": {"backgroundColor": "#182649", "backgroundNoise": 9.899, "transparentPixelFraction": 0.0, "foregroundCoverage": 1.0}, "mapStats": {"valueRange": 0.5826, "heightP90Gradient": 0.23175, "roughnessBase": 0.8, "roughnessVariation": 0.218, "normalStrength": 0.428, "blurRadius": 5}, "palette": ["#172342", "#547CE1", "#080B1B", "#3C3844", "#2E4285"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "notes": "City Bus body observed from reference C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg."},
    options
  );
  materialMap["glass"] = createSculptMaterial(
    "glass",
    {"id": "glass", "name": "City Bus glass", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#D0E8FA", "color": "#D0E8FA", "albedo": {"dominant": "#D0E8FA", "secondary": ["#141824", "#D0E8FA"], "samplingNotes": "Sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg main zones."}, "colorVariation": {"palette": ["#D0E8FA", "#141824", "#D0E8FA"], "pattern": "mottled", "amplitude": 0.15, "heightCorrelation": 0.3}, "textureResolution": 1024, "textureProjection": {"mode": "uv", "repeat": [2.0, 2.0], "anisotropy": 8, "texelDensityIntent": "Preserve stable object-scale detail."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 2.0, "amplitude": 0.42, "role": "broad color breakup"}, {"id": "meso", "frequency": 12.0, "amplitude": 0.22, "role": "panel ridges and seams"}, {"id": "micro", "frequency": 56.0, "amplitude": 0.08, "role": "highlight breakup"}], "roughness": {"base": 0.12, "variation": 0.15, "map": "independent-procedural-field", "localResponse": "higher roughness in cavities, lower on worn edges"}, "metalness": {"base": 0.1, "variation": 0.05}, "normal": {"pattern": "derived-from-independent-height-field", "strength": 0.35, "scale": 24.0, "space": "tangent"}, "bump": {"pattern": "panel-seam-field", "amplitude": 0.02, "scale": 8.0}, "displacement": {"pattern": "none", "amplitude": 0.0, "scale": 1.0, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.25, "contactShadowBias": 0.35, "notes": "Darken seams, wheel wells, panel gaps."}, "wear": {"edgeWear": 0.12, "scratches": [{"region": "lower panels", "density": "sparse"}], "chips": [{"region": "bumper edge", "density": "sparse"}]}, "dirt": {"amount": 0.08, "cavityBias": 0.2, "color": "#2F2A22"}, "localOverrides": [{"id": "glass-trim", "region": "trim edges", "note": "tinted glazing"}], "shaderNotes": ["MeshStandardMaterial-compatible PBR channels.", "Independent albedo/roughness/normal/AO."], "notes": "City Bus glass observed from reference C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg.", "qualityTier": "utility"},
    options
  );
  materialMap["trim"] = createSculptMaterial(
    "trim",
    {"id": "trim", "name": "City Bus trim", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#141824", "color": "#141824", "albedo": {"dominant": "#141824", "secondary": ["#141824", "#D0E8FA"], "samplingNotes": "Sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg main zones."}, "colorVariation": {"palette": ["#141824", "#141824", "#D0E8FA"], "pattern": "mottled", "amplitude": 0.15, "heightCorrelation": 0.3}, "textureResolution": 1024, "textureProjection": {"mode": "uv", "repeat": [2.0, 2.0], "anisotropy": 8, "texelDensityIntent": "Preserve stable object-scale detail."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 2.0, "amplitude": 0.42, "role": "broad color breakup"}, {"id": "meso", "frequency": 12.0, "amplitude": 0.22, "role": "panel ridges and seams"}, {"id": "micro", "frequency": 56.0, "amplitude": 0.08, "role": "highlight breakup"}], "roughness": {"base": 0.6, "variation": 0.15, "map": "independent-procedural-field", "localResponse": "higher roughness in cavities, lower on worn edges"}, "metalness": {"base": 0.2, "variation": 0.05}, "normal": {"pattern": "derived-from-independent-height-field", "strength": 0.35, "scale": 24.0, "space": "tangent"}, "bump": {"pattern": "panel-seam-field", "amplitude": 0.02, "scale": 8.0}, "displacement": {"pattern": "none", "amplitude": 0.0, "scale": 1.0, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.25, "contactShadowBias": 0.35, "notes": "Darken seams, wheel wells, panel gaps."}, "wear": {"edgeWear": 0.12, "scratches": [{"region": "lower panels", "density": "sparse"}], "chips": [{"region": "bumper edge", "density": "sparse"}]}, "dirt": {"amount": 0.08, "cavityBias": 0.2, "color": "#2F2A22"}, "localOverrides": [{"id": "trim-trim", "region": "trim edges", "note": "rubber/trim dark zones"}], "shaderNotes": ["MeshStandardMaterial-compatible PBR channels.", "Independent albedo/roughness/normal/AO."], "notes": "City Bus trim observed from reference C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg.", "qualityTier": "utility"},
    options
  );

  const nodes: Record<string, THREE.Object3D> = { root };
  const meshes: Record<string, THREE.Mesh> = {};
  const sockets: Record<string, THREE.Object3D> = {};
  const colliders: Record<string, unknown> = {};
  const destructionGroups: Record<string, THREE.Object3D[]> = {};

  const endpoint_body_0 = makeAttachmentEndpoint(null);
  const node_body_0 = new THREE.Group();
  node_body_0.name = "City Bus body__pivot";
  node_body_0.scale.set(1, 1, 1);
  if (endpoint_body_0) {
    node_body_0.position.copy(endpoint_body_0.start);
    node_body_0.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_body_0.position.set(0.0, 0.0, 0.0);
    node_body_0.rotation.set(0.0, 0.0, 0.0);
  }
  node_body_0.userData.sculptComponent = {"id": "body", "name": "City Bus body", "level": "macro", "role": "body", "importance": 1.0, "confidence": 0.75, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "body is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "body blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": null, "attachment": null, "dimensions": {"width": 2.2, "height": 1.1, "depth": 1.2, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.0, 0.0, 0.0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["body-seam"], "localFeatures": ["body-bevel", "body-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "body panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_body_0.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["root"] ?? root).add(node_body_0);
  nodes["body"] = node_body_0;
  const mesh_body_0Geometry = endpoint_body_0
    ? new THREE.CylinderGeometry(endpoint_body_0.endRadius, endpoint_body_0.baseRadius, endpoint_body_0.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_body_0) {
    mesh_body_0Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_body_0 = new THREE.Mesh(
    mesh_body_0Geometry,
    materialMap["body"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_body_0.name = "City Bus body";
  if (endpoint_body_0) {
    mesh_body_0.position.copy(endpoint_body_0.midpoint);
    mesh_body_0.quaternion.copy(endpoint_body_0.quaternion);
  }
  mesh_body_0.castShadow = options.castShadow ?? true;
  mesh_body_0.receiveShadow = options.receiveShadow ?? true;
  mesh_body_0.userData.sculptComponent = {"id": "body", "name": "City Bus body", "level": "macro", "role": "body", "importance": 1.0, "confidence": 0.75, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "body is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "body blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": null, "attachment": null, "dimensions": {"width": 2.2, "height": 1.1, "depth": 1.2, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.0, 0.0, 0.0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["body-seam"], "localFeatures": ["body-bevel", "body-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "body panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_body_0.add(mesh_body_0);
  meshes["body"] = mesh_body_0;
  colliders["body"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_body_0);

  const endpoint_roof_1 = makeAttachmentEndpoint(null);
  const node_roof_1 = new THREE.Group();
  node_roof_1.name = "City Bus roof__pivot";
  node_roof_1.scale.set(1, 1, 1);
  if (endpoint_roof_1) {
    node_roof_1.position.copy(endpoint_roof_1.start);
    node_roof_1.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_roof_1.position.set(-0.7, 0.0, 0.1);
    node_roof_1.rotation.set(0.0, 0.0, 0.0);
  }
  node_roof_1.userData.sculptComponent = {"id": "roof", "name": "City Bus roof", "level": "macro", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "roof is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "roof blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "body", "attachment": {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 2.2, "height": 1.1, "depth": 1.2, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.1], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["roof-seam"], "localFeatures": ["roof-bevel", "roof-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "roof panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_roof_1.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["body"] ?? root).add(node_roof_1);
  nodes["roof"] = node_roof_1;
  const mesh_roof_1Geometry = endpoint_roof_1
    ? new THREE.CylinderGeometry(endpoint_roof_1.endRadius, endpoint_roof_1.baseRadius, endpoint_roof_1.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_roof_1) {
    mesh_roof_1Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_roof_1 = new THREE.Mesh(
    mesh_roof_1Geometry,
    materialMap["body"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_roof_1.name = "City Bus roof";
  if (endpoint_roof_1) {
    mesh_roof_1.position.copy(endpoint_roof_1.midpoint);
    mesh_roof_1.quaternion.copy(endpoint_roof_1.quaternion);
  }
  mesh_roof_1.castShadow = options.castShadow ?? true;
  mesh_roof_1.receiveShadow = options.receiveShadow ?? true;
  mesh_roof_1.userData.sculptComponent = {"id": "roof", "name": "City Bus roof", "level": "macro", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "roof is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "roof blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "body", "attachment": {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 2.2, "height": 1.1, "depth": 1.2, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.1], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["roof-seam"], "localFeatures": ["roof-bevel", "roof-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "roof panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_roof_1.add(mesh_roof_1);
  meshes["roof"] = mesh_roof_1;
  colliders["roof"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_roof_1);

  const attachment_wheel_fl_2 = {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01};
  const endpoint_wheel_fl_2 = makeAttachmentEndpoint(attachment_wheel_fl_2);
  const node_wheel_fl_2 = new THREE.Group();
  node_wheel_fl_2.name = "City Bus wheel fl__pivot";
  node_wheel_fl_2.scale.set(1, 1, 1);
  if (endpoint_wheel_fl_2) {
    node_wheel_fl_2.position.copy(endpoint_wheel_fl_2.start);
    node_wheel_fl_2.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_wheel_fl_2.position.set(0.7, 0.0, 0.2);
    node_wheel_fl_2.rotation.set(0.0, 0.0, 0.0);
  }
  node_wheel_fl_2.userData.sculptComponent = {"id": "wheel_fl", "name": "City Bus wheel fl", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "wheel_fl is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "wheel_fl blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "body", "attachment": {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.7, 0.0, 0.2], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "trim", "materialLayers": ["trim"], "deformations": [], "joints": [], "seams": ["wheel_fl-seam"], "localFeatures": ["wheel_fl-bevel", "wheel_fl-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "wheel_fl panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "rubber", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_wheel_fl_2.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["body"] ?? root).add(node_wheel_fl_2);
  nodes["wheel_fl"] = node_wheel_fl_2;
  const mesh_wheel_fl_2Geometry = endpoint_wheel_fl_2
    ? new THREE.CylinderGeometry(endpoint_wheel_fl_2.endRadius, endpoint_wheel_fl_2.baseRadius, endpoint_wheel_fl_2.length, 32, 12)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 48, 16);
  if (!endpoint_wheel_fl_2) {
    mesh_wheel_fl_2Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_wheel_fl_2 = new THREE.Mesh(
    mesh_wheel_fl_2Geometry,
    materialMap["trim"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_wheel_fl_2.name = "City Bus wheel fl";
  if (endpoint_wheel_fl_2) {
    mesh_wheel_fl_2.position.copy(endpoint_wheel_fl_2.midpoint);
    mesh_wheel_fl_2.quaternion.copy(endpoint_wheel_fl_2.quaternion);
  }
  mesh_wheel_fl_2.castShadow = options.castShadow ?? true;
  mesh_wheel_fl_2.receiveShadow = options.receiveShadow ?? true;
  mesh_wheel_fl_2.userData.sculptComponent = {"id": "wheel_fl", "name": "City Bus wheel fl", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "wheel_fl is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "wheel_fl blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "body", "attachment": {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.7, 0.0, 0.2], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "trim", "materialLayers": ["trim"], "deformations": [], "joints": [], "seams": ["wheel_fl-seam"], "localFeatures": ["wheel_fl-bevel", "wheel_fl-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "wheel_fl panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "rubber", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_wheel_fl_2.add(mesh_wheel_fl_2);
  meshes["wheel_fl"] = mesh_wheel_fl_2;
  colliders["wheel_fl"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_wheel_fl_2);

  const attachment_wheel_rl_3 = {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01};
  const endpoint_wheel_rl_3 = makeAttachmentEndpoint(attachment_wheel_rl_3);
  const node_wheel_rl_3 = new THREE.Group();
  node_wheel_rl_3.name = "City Bus wheel rl__pivot";
  node_wheel_rl_3.scale.set(1, 1, 1);
  if (endpoint_wheel_rl_3) {
    node_wheel_rl_3.position.copy(endpoint_wheel_rl_3.start);
    node_wheel_rl_3.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_wheel_rl_3.position.set(-0.7, 0.0, 0.30000000000000004);
    node_wheel_rl_3.rotation.set(0.0, 0.0, 0.0);
  }
  node_wheel_rl_3.userData.sculptComponent = {"id": "wheel_rl", "name": "City Bus wheel rl", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "wheel_rl is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "wheel_rl blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "body", "attachment": {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.30000000000000004], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "trim", "materialLayers": ["trim"], "deformations": [], "joints": [], "seams": ["wheel_rl-seam"], "localFeatures": ["wheel_rl-bevel", "wheel_rl-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "wheel_rl panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "rubber", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_wheel_rl_3.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["body"] ?? root).add(node_wheel_rl_3);
  nodes["wheel_rl"] = node_wheel_rl_3;
  const mesh_wheel_rl_3Geometry = endpoint_wheel_rl_3
    ? new THREE.CylinderGeometry(endpoint_wheel_rl_3.endRadius, endpoint_wheel_rl_3.baseRadius, endpoint_wheel_rl_3.length, 32, 12)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 48, 16);
  if (!endpoint_wheel_rl_3) {
    mesh_wheel_rl_3Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_wheel_rl_3 = new THREE.Mesh(
    mesh_wheel_rl_3Geometry,
    materialMap["trim"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_wheel_rl_3.name = "City Bus wheel rl";
  if (endpoint_wheel_rl_3) {
    mesh_wheel_rl_3.position.copy(endpoint_wheel_rl_3.midpoint);
    mesh_wheel_rl_3.quaternion.copy(endpoint_wheel_rl_3.quaternion);
  }
  mesh_wheel_rl_3.castShadow = options.castShadow ?? true;
  mesh_wheel_rl_3.receiveShadow = options.receiveShadow ?? true;
  mesh_wheel_rl_3.userData.sculptComponent = {"id": "wheel_rl", "name": "City Bus wheel rl", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "wheel_rl is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "wheel_rl blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "body", "attachment": {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.30000000000000004], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "trim", "materialLayers": ["trim"], "deformations": [], "joints": [], "seams": ["wheel_rl-seam"], "localFeatures": ["wheel_rl-bevel", "wheel_rl-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "wheel_rl panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "rubber", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_wheel_rl_3.add(mesh_wheel_rl_3);
  meshes["wheel_rl"] = mesh_wheel_rl_3;
  colliders["wheel_rl"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_wheel_rl_3);

  const attachment_wheel_rr_4 = {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01};
  const endpoint_wheel_rr_4 = makeAttachmentEndpoint(attachment_wheel_rr_4);
  const node_wheel_rr_4 = new THREE.Group();
  node_wheel_rr_4.name = "City Bus wheel rr__pivot";
  node_wheel_rr_4.scale.set(1, 1, 1);
  if (endpoint_wheel_rr_4) {
    node_wheel_rr_4.position.copy(endpoint_wheel_rr_4.start);
    node_wheel_rr_4.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_wheel_rr_4.position.set(0.7, 0.0, 0.4);
    node_wheel_rr_4.rotation.set(0.0, 0.0, 0.0);
  }
  node_wheel_rr_4.userData.sculptComponent = {"id": "wheel_rr", "name": "City Bus wheel rr", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "wheel_rr is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "wheel_rr blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "body", "attachment": {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.7, 0.0, 0.4], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "trim", "materialLayers": ["trim"], "deformations": [], "joints": [], "seams": ["wheel_rr-seam"], "localFeatures": ["wheel_rr-bevel", "wheel_rr-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "wheel_rr panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "rubber", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_wheel_rr_4.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["body"] ?? root).add(node_wheel_rr_4);
  nodes["wheel_rr"] = node_wheel_rr_4;
  const mesh_wheel_rr_4Geometry = endpoint_wheel_rr_4
    ? new THREE.CylinderGeometry(endpoint_wheel_rr_4.endRadius, endpoint_wheel_rr_4.baseRadius, endpoint_wheel_rr_4.length, 32, 12)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 48, 16);
  if (!endpoint_wheel_rr_4) {
    mesh_wheel_rr_4Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_wheel_rr_4 = new THREE.Mesh(
    mesh_wheel_rr_4Geometry,
    materialMap["trim"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_wheel_rr_4.name = "City Bus wheel rr";
  if (endpoint_wheel_rr_4) {
    mesh_wheel_rr_4.position.copy(endpoint_wheel_rr_4.midpoint);
    mesh_wheel_rr_4.quaternion.copy(endpoint_wheel_rr_4.quaternion);
  }
  mesh_wheel_rr_4.castShadow = options.castShadow ?? true;
  mesh_wheel_rr_4.receiveShadow = options.receiveShadow ?? true;
  mesh_wheel_rr_4.userData.sculptComponent = {"id": "wheel_rr", "name": "City Bus wheel rr", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "wheel_rr is modeled as assembled-solid because the reference shows a solid joined volume with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "wheel_rr blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "body", "attachment": {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.7, 0.0, 0.4], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "trim", "materialLayers": ["trim"], "deformations": [], "joints": [], "seams": ["wheel_rr-seam"], "localFeatures": ["wheel_rr-bevel", "wheel_rr-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "wheel_rr panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "rubber", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_wheel_rr_4.add(mesh_wheel_rr_4);
  meshes["wheel_rr"] = mesh_wheel_rr_4;
  colliders["wheel_rr"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_wheel_rr_4);

  const endpoint_windshield_5 = makeAttachmentEndpoint(null);
  const node_windshield_5 = new THREE.Group();
  node_windshield_5.name = "City Bus windshield__pivot";
  node_windshield_5.scale.set(1, 1, 1);
  if (endpoint_windshield_5) {
    node_windshield_5.position.copy(endpoint_windshield_5.start);
    node_windshield_5.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_windshield_5.position.set(-0.7, 0.0, 0.5);
    node_windshield_5.rotation.set(0.0, 0.0, 0.0);
  }
  node_windshield_5.userData.sculptComponent = {"id": "windshield", "name": "City Bus windshield", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "conforming-shell", "topologyRationale": "windshield is modeled as conforming-shell because the reference shows a fitted surface layer with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "windshield blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "body", "attachment": {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.5], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "glass", "materialLayers": ["glass"], "deformations": [], "joints": [], "seams": ["windshield-seam"], "localFeatures": ["windshield-bevel", "windshield-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "windshield panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_windshield_5.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["body"] ?? root).add(node_windshield_5);
  nodes["windshield"] = node_windshield_5;
  const mesh_windshield_5Geometry = endpoint_windshield_5
    ? new THREE.CylinderGeometry(endpoint_windshield_5.endRadius, endpoint_windshield_5.baseRadius, endpoint_windshield_5.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_windshield_5) {
    mesh_windshield_5Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_windshield_5 = new THREE.Mesh(
    mesh_windshield_5Geometry,
    materialMap["glass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_windshield_5.name = "City Bus windshield";
  if (endpoint_windshield_5) {
    mesh_windshield_5.position.copy(endpoint_windshield_5.midpoint);
    mesh_windshield_5.quaternion.copy(endpoint_windshield_5.quaternion);
  }
  mesh_windshield_5.castShadow = options.castShadow ?? true;
  mesh_windshield_5.receiveShadow = options.receiveShadow ?? true;
  mesh_windshield_5.userData.sculptComponent = {"id": "windshield", "name": "City Bus windshield", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "conforming-shell", "topologyRationale": "windshield is modeled as conforming-shell because the reference shows a fitted surface layer with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "windshield blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "body", "attachment": {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.5], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "glass", "materialLayers": ["glass"], "deformations": [], "joints": [], "seams": ["windshield-seam"], "localFeatures": ["windshield-bevel", "windshield-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "windshield panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_windshield_5.add(mesh_windshield_5);
  meshes["windshield"] = mesh_windshield_5;
  colliders["windshield"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_windshield_5);

  const endpoint_side_windows_6 = makeAttachmentEndpoint(null);
  const node_side_windows_6 = new THREE.Group();
  node_side_windows_6.name = "City Bus side windows__pivot";
  node_side_windows_6.scale.set(1, 1, 1);
  if (endpoint_side_windows_6) {
    node_side_windows_6.position.copy(endpoint_side_windows_6.start);
    node_side_windows_6.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_side_windows_6.position.set(0.7, 0.0, 0.6000000000000001);
    node_side_windows_6.rotation.set(0.0, 0.0, 0.0);
  }
  node_side_windows_6.userData.sculptComponent = {"id": "side_windows", "name": "City Bus side windows", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "surface-relief", "topologyRationale": "side_windows is modeled as surface-relief because the reference shows a fitted surface layer with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "side_windows blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "body", "attachment": {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.7, 0.0, 0.6000000000000001], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "glass", "materialLayers": ["glass"], "deformations": [], "joints": [], "seams": ["side_windows-seam"], "localFeatures": ["side_windows-bevel", "side_windows-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "side_windows panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_side_windows_6.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["body"] ?? root).add(node_side_windows_6);
  nodes["side_windows"] = node_side_windows_6;
  const mesh_side_windows_6Geometry = endpoint_side_windows_6
    ? new THREE.CylinderGeometry(endpoint_side_windows_6.endRadius, endpoint_side_windows_6.baseRadius, endpoint_side_windows_6.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_side_windows_6) {
    mesh_side_windows_6Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_side_windows_6 = new THREE.Mesh(
    mesh_side_windows_6Geometry,
    materialMap["glass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_side_windows_6.name = "City Bus side windows";
  if (endpoint_side_windows_6) {
    mesh_side_windows_6.position.copy(endpoint_side_windows_6.midpoint);
    mesh_side_windows_6.quaternion.copy(endpoint_side_windows_6.quaternion);
  }
  mesh_side_windows_6.castShadow = options.castShadow ?? true;
  mesh_side_windows_6.receiveShadow = options.receiveShadow ?? true;
  mesh_side_windows_6.userData.sculptComponent = {"id": "side_windows", "name": "City Bus side windows", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "surface-relief", "topologyRationale": "side_windows is modeled as surface-relief because the reference shows a fitted surface layer with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "side_windows blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "body", "attachment": {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [0.7, 0.0, 0.6000000000000001], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "glass", "materialLayers": ["glass"], "deformations": [], "joints": [], "seams": ["side_windows-seam"], "localFeatures": ["side_windows-bevel", "side_windows-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "side_windows panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_side_windows_6.add(mesh_side_windows_6);
  meshes["side_windows"] = mesh_side_windows_6;
  colliders["side_windows"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_side_windows_6);

  const endpoint_destination_board_7 = makeAttachmentEndpoint(null);
  const node_destination_board_7 = new THREE.Group();
  node_destination_board_7.name = "City Bus destination board__pivot";
  node_destination_board_7.scale.set(1, 1, 1);
  if (endpoint_destination_board_7) {
    node_destination_board_7.position.copy(endpoint_destination_board_7.start);
    node_destination_board_7.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_destination_board_7.position.set(-0.7, 0.0, 0.7000000000000001);
    node_destination_board_7.rotation.set(0.0, 0.0, 0.0);
  }
  node_destination_board_7.userData.sculptComponent = {"id": "destination_board", "name": "City Bus destination board", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "surface-relief", "topologyRationale": "destination_board is modeled as surface-relief because the reference shows a fitted surface layer with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "destination_board blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "body", "attachment": {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.7000000000000001], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["destination_board-seam"], "localFeatures": ["destination_board-bevel", "destination_board-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "destination_board panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_destination_board_7.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}};
  (nodes["body"] ?? root).add(node_destination_board_7);
  nodes["destination_board"] = node_destination_board_7;
  const mesh_destination_board_7Geometry = endpoint_destination_board_7
    ? new THREE.CylinderGeometry(endpoint_destination_board_7.endRadius, endpoint_destination_board_7.baseRadius, endpoint_destination_board_7.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_destination_board_7) {
    mesh_destination_board_7Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_destination_board_7 = new THREE.Mesh(
    mesh_destination_board_7Geometry,
    materialMap["body"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_destination_board_7.name = "City Bus destination board";
  if (endpoint_destination_board_7) {
    mesh_destination_board_7.position.copy(endpoint_destination_board_7.midpoint);
    mesh_destination_board_7.quaternion.copy(endpoint_destination_board_7.quaternion);
  }
  mesh_destination_board_7.castShadow = options.castShadow ?? true;
  mesh_destination_board_7.receiveShadow = options.receiveShadow ?? true;
  mesh_destination_board_7.userData.sculptComponent = {"id": "destination_board", "name": "City Bus destination board", "level": "meso", "role": "detail", "importance": 0.7, "confidence": 0.75, "primitive": "box", "topologyClass": "surface-relief", "topologyRationale": "destination_board is modeled as surface-relief because the reference shows a fitted surface layer with clean panel breaks.", "geometryDescriptor": {"topologyIntent": "destination_board blockout with beveled edges", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.06, "segments": 2}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "body", "attachment": {"parentId": "body", "parentSocket": "body-socket", "localStart": [0.0, -0.4, 0.0], "localEnd": [0.0, 0.4, 0.2], "contactType": "overlap", "embedDepth": 0.05, "overlap": 0.05, "gapTolerance": 0.01}, "dimensions": {"width": 0.9, "height": 0.5, "depth": 0.5, "units": "relative", "confidence": 0.7}, "transform": {"position": [-0.7, 0.0, 0.7000000000000001], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "base"}}, "material": "body", "materialLayers": ["body"], "deformations": [], "joints": [], "seams": ["destination_board-seam"], "localFeatures": ["destination_board-bevel", "destination_board-panel-line"], "surfaceDetail": {"macroRoughness": 0.4, "microRoughness": 0.15, "bumpAmplitude": 0.02, "normalPattern": "panel-seam-field", "displacementPattern": "none", "occlusionPattern": "cavity", "edgeWearPattern": "edge-highlight", "notes": "destination_board panel relief observed in reference."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 86, 230, 1.0)", "secondaryAlbedo": "rgba(20, 24, 36, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "colorGradient": {"type": "linear", "stops": [{"color": "rgba(36, 86, 230, 1.0)", "at": 0.0}, {"color": "rgba(20, 24, 36, 1.0)", "at": 1.0}]}, "evidence": "sampled from C740D9EE-2E3A-4C8D-9B46-43CE14D9FB03.jpg"}};
  node_destination_board_7.add(mesh_destination_board_7);
  meshes["destination_board"] = mesh_destination_board_7;
  colliders["destination_board"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_destination_board_7);

  root.userData.sculptRuntime = { nodes, meshes, sockets, colliders, destructionGroups } satisfies ProceduralModelRuntime;
  root.userData.lookDevTargets = {"qualityPriority": "reference-fidelity", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "minimumTextureResolution": 1024, "preferredTextureResolution": 2048, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "requiredSurfaceFrequencyBands": ["macro", "meso", "micro"], "geometryReliefRequiredWhenSilhouetteAffected": true, "referencePbrExtraction": {"requiredWhenSourceImagePresent": true, "targetThreshold": 0.7, "stopOnLowConfidence": true, "script": "forge/stage1_intake/extract_pbr_evidence.py", "acceptedLimitation": "single-image extraction is reference-derived inference, not exact photogrammetry"}, "mustAvoid": ["single flat albedo per material", "uniform roughness", "albedo texture reused as roughness/height/normal/AO", "single-frequency random noise", "plastic-looking smooth bark, stone, cloth, foliage, or aged material", "local color/detail described only in prose without material masks", "claiming exact PBR recovery when confidence is below the target threshold"]}, "lightingPass": {"requiredTerms": ["key light", "fill light", "rim or environment light", "exposure", "tone mapping", "background", "contact shadow"], "mustAvoid": ["ambient-only lighting", "flat value range", "missing contact shadow", "reference lighting copied without separating material readability"]}, "screenshotReview": ["Compare albedo palette and local color zones.", "Compare roughness/normal/bump response under light.", "Compare cavity dirt, edge wear, stains, moss, scratches, or other local masks.", "Compare key/fill/rim structure, exposure, tone mapping, background, and contact shadows.", "Capture a neutral-light render to verify material readability without reference lighting.", "Capture a grazing-light close-up to expose flat normals, uniform roughness, tiling, and plastic highlights.", "Capture a reference-matched render from the same camera framing as the source."]};
  root.userData.actionReadiness = {
    note: 'Use root.userData.sculptRuntime.nodes for transforms, sockets for attachments, colliders for physics proxies, and destructionGroups for breakable sets.',
  };
  return root;
}

export function createCityBusLookDevLights(
  mode: 'neutral' | 'grazing' | 'reference' = 'neutral',
): THREE.Group {
  const lights = new THREE.Group();
  lights.name = "City Bus look-dev lights";
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
export function createCityBusEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
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
export function frameCityBusCamera(
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
export function createCityBusPresentationComposer(
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

export function configureCityBusRenderer(renderer: THREE.WebGLRenderer): void {
  // Load-bearing for view-dependent finishes (anodized / Doppler): without ACES + sRGB
  // the environment reflection reads flat/washed instead of a believable metal response.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

export function createCityBusInspectControls(
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
