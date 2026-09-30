import * as THREE from 'three';

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

/**
 * Creates thick beveled coin disk geometry with outer rim.
 */
function createCoinDiskGeometry(radius = 0.65, thickness = 0.16): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const segments = 32;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = Math.cos(a) * (radius - 0.03);
    const y = Math.sin(a) * (radius - 0.03);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 16,
  });
  geo.translate(0, 0, -thickness / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the "2" numeral shape for the "2X" badge.
 */
function createDigitTwoShape(scale = 0.5): THREE.Shape {
  const shape = new THREE.Shape();
  const s = scale;
  shape.moveTo(-0.4 * s, 0.45 * s);
  shape.quadraticCurveTo(-0.4 * s, 0.9 * s, 0.0 * s, 0.9 * s);
  shape.quadraticCurveTo(0.45 * s, 0.9 * s, 0.45 * s, 0.45 * s);
  shape.quadraticCurveTo(0.45 * s, 0.15 * s, -0.1 * s, -0.4 * s);
  shape.lineTo(0.48 * s, -0.4 * s);
  shape.lineTo(0.48 * s, -0.75 * s);
  shape.lineTo(-0.45 * s, -0.75 * s);
  shape.lineTo(-0.45 * s, -0.4 * s);
  shape.quadraticCurveTo(0.05 * s, 0.1 * s, 0.12 * s, 0.45 * s);
  shape.quadraticCurveTo(0.12 * s, 0.65 * s, 0.0 * s, 0.65 * s);
  shape.quadraticCurveTo(-0.15 * s, 0.65 * s, -0.15 * s, 0.45 * s);
  shape.closePath();
  return shape;
}

/**
 * Creates the "X" shape for the "2X" badge.
 */
function createLetterXShape(scale = 0.45): THREE.Shape {
  const shape = new THREE.Shape();
  const s = scale;
  const w = 0.16 * s;
  const h = 0.7 * s;
  shape.moveTo(-h + w, h);
  shape.lineTo(0, w);
  shape.lineTo(h - w, h);
  shape.lineTo(h, h - w);
  shape.lineTo(w, 0);
  shape.lineTo(h, -h + w);
  shape.lineTo(h - w, -h);
  shape.lineTo(0, -w);
  shape.lineTo(-h + w, -h);
  shape.lineTo(-h, -h + w);
  shape.lineTo(-w, 0);
  shape.lineTo(-h, h - w);
  shape.closePath();
  return shape;
}

export function createDoubleCoinsPowerupModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Double Coins Powerup (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const mirrorGoldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Rich warm 24K gold
    metalness: 0.94,
    roughness: 0.18,
    emissive: 0x78350f,
    emissiveIntensity: 0.35,
  });

  const brightGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfde047, // Bright lustrous gold rim
    metalness: 0.95,
    roughness: 0.12,
    emissive: 0xb45309,
    emissiveIntensity: 0.45,
  });

  const textMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, // Crisp luminous white enamel with gold rim
    metalness: 0.85,
    roughness: 0.15,
    emissive: 0xfef08a,
    emissiveIntensity: 0.8,
  });

  // 1. Left Rear Coin
  const coinGeoLeft = createCoinDiskGeometry(0.68, 0.18);
  const coinLeft = new THREE.Mesh(coinGeoLeft, mirrorGoldMat);
  coinLeft.position.set(-0.35, 0.12, -0.12);
  coinLeft.rotation.z = 0.15;
  coinLeft.rotation.y = -0.1;
  coinLeft.castShadow = castShadow;
  coinLeft.receiveShadow = receiveShadow;
  root.add(coinLeft);

  // 2. Right Front Coin
  const coinGeoRight = createCoinDiskGeometry(0.68, 0.18);
  const coinRight = new THREE.Mesh(coinGeoRight, brightGoldMat);
  coinRight.position.set(0.32, -0.08, 0.08);
  coinRight.rotation.z = -0.12;
  coinRight.rotation.y = 0.08;
  coinRight.castShadow = castShadow;
  coinRight.receiveShadow = receiveShadow;
  root.add(coinRight);

  // 3. Central "2X" Badge Plaque (Embossed on front)
  const twoShape = createDigitTwoShape(0.65);
  const twoGeo = new THREE.ExtrudeGeometry(twoShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  twoGeo.translate(-0.25, 0.02, 0.14);
  twoGeo.computeVertexNormals();
  const twoMesh = new THREE.Mesh(twoGeo, textMat);
  twoMesh.castShadow = castShadow;
  root.add(twoMesh);

  const xShape = createLetterXShape(0.55);
  const xGeo = new THREE.ExtrudeGeometry(xShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  xGeo.translate(0.24, -0.02, 0.14);
  xGeo.computeVertexNormals();
  const xMesh = new THREE.Mesh(xGeo, textMat);
  xMesh.castShadow = castShadow;
  root.add(xMesh);

  // Rear "2X" Badge for symmetrical rotation view
  const twoRearGeo = twoGeo.clone();
  twoRearGeo.translate(0, 0, -0.38);
  const twoRear = new THREE.Mesh(twoRearGeo, textMat);
  root.add(twoRear);

  const xRearGeo = xGeo.clone();
  xRearGeo.translate(0, 0, -0.38);
  const xRear = new THREE.Mesh(xRearGeo, textMat);
  root.add(xRear);

  return root;
}
