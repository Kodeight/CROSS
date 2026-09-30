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

function createRedTunerWheel(
  radius: number,
  tireWidth: number,
  materials: {
    tire: THREE.Material;
    rim: THREE.Material;
    hub: THREE.Material;
  },
  castShadow: boolean,
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'red-tuner-wheel';

  const tubeRadius = tireWidth * 0.44;
  const mainRadius = radius - tubeRadius;
  const tireGeo = new THREE.TorusGeometry(mainRadius, tubeRadius, 14, 24);
  const tire = new THREE.Mesh(tireGeo, materials.tire);
  tire.castShadow = castShadow;
  g.add(tire);

  // 10-spoke gold racing forged rim
  const rimRadius = mainRadius * 0.88;
  const spokeShape = new THREE.Shape();
  const numSpokes = 10;
  const hubR = rimRadius * 0.30;
  for (let i = 0; i <= numSpokes * 2; i++) {
    const angle = (i * Math.PI) / numSpokes;
    const r = i % 2 === 0 ? rimRadius : hubR;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) spokeShape.moveTo(x, y);
    else spokeShape.lineTo(x, y);
  }
  spokeShape.closePath();

  const rimGeo = new THREE.ExtrudeGeometry(spokeShape, {
    depth: tireWidth * 0.40,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  rimGeo.center();
  const rim = new THREE.Mesh(rimGeo, materials.rim);
  rim.castShadow = castShadow;
  g.add(rim);

  return g;
}

function createRedTunerBodyGeometry(length = 2.8, width = 1.28): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2;

  shape.moveTo(-halfL, 0.12);
  shape.lineTo(-halfL - 0.06, 0.18);
  shape.lineTo(-halfL + 0.08, 0.40); // aggressive sharp nose
  shape.lineTo(-halfL + 0.24, 0.44); // vented hood slope
  shape.quadraticCurveTo(-halfL * 0.4, 0.50, -0.42, 0.54);
  shape.lineTo(0.38, 0.54);
  shape.quadraticCurveTo(halfL * 0.65, 0.54, halfL - 0.06, 0.49);
  shape.lineTo(halfL + 0.05, 0.42);
  shape.lineTo(halfL + 0.02, 0.22);
  shape.lineTo(halfL - 0.04, 0.14);

  const rwCenterX = 0.72;
  const rwR = 0.25;
  shape.lineTo(rwCenterX + rwR + 0.06, 0.14);
  shape.quadraticCurveTo(rwCenterX, 0.38, rwCenterX - rwR - 0.06, 0.14);

  shape.lineTo(-0.72 + rwR + 0.06, 0.14);

  const fwCenterX = -0.72;
  const fwR = 0.25;
  shape.quadraticCurveTo(fwCenterX, 0.38, fwCenterX - fwR - 0.06, 0.14);

  shape.closePath();

  const extrudeDepth = width - 0.16;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 4,
    curveSegments: 12,
  });
  geo.translate(0, 0, -extrudeDepth / 2);
  geo.computeVertexNormals();
  return geo;
}

function createRedTunerCabinGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.40, 0.52);
  shape.lineTo(-0.16, 0.88);
  shape.quadraticCurveTo(0.12, 0.90, 0.38, 0.88);
  shape.lineTo(0.78, 0.52);
  shape.closePath();

  const cabinWidth = 0.96;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: cabinWidth,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geo.translate(0, 0, -cabinWidth / 2);
  geo.computeVertexNormals();
  return geo;
}

function createRedTunerWindowsGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.37, 0.54);
  shape.lineTo(-0.15, 0.86);
  shape.quadraticCurveTo(0.12, 0.88, 0.36, 0.86);
  shape.lineTo(0.74, 0.54);
  shape.closePath();

  const winWidth = 1.02;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: winWidth,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -winWidth / 2);
  geo.computeVertexNormals();
  return geo;
}

function createSwanNeckSpoiler(wingMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.14, 0);
  bladeShape.quadraticCurveTo(0, 0.05, 0.14, 0.03);
  bladeShape.lineTo(0.14, -0.02);
  bladeShape.quadraticCurveTo(0, 0, -0.14, -0.02);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 1.28,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  bladeGeo.translate(0, 0, -0.64);
  bladeGeo.computeVertexNormals();

  const blade = new THREE.Mesh(bladeGeo, wingMat);
  blade.position.set(1.18, 0.84, 0);
  blade.rotation.z = -0.14;
  g.add(blade);

  return g;
}

export function createRedJapaneseTunerModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Red Japanese Tuner (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const candyRedMat = new THREE.MeshStandardMaterial({
    color: 0xe63046, // Vivid Tokyo Candy Racing Red
    roughness: 0.22,
    metalness: 0.35,
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x141820,
    roughness: 0.35,
    metalness: 0.7,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x080e18,
    roughness: 0.08,
    metalness: 0.95,
  });

  const goldRimMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, // Forged gold racing rim
    roughness: 0.25,
    metalness: 0.85,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x16181b,
    roughness: 0.82,
    metalness: 0.05,
  });

  const neonCyanMat = new THREE.MeshStandardMaterial({
    color: 0x00f5ff, // Tokyo Neon Electric Cyan
    roughness: 0.1,
    metalness: 0.2,
    emissive: 0x00f5ff,
    emissiveIntensity: 1.5,
  });

  // 1. Widebody Sports Car Chassis
  const bodyGeo = createRedTunerBodyGeometry(2.8, 1.28);
  const bodyMesh = new THREE.Mesh(bodyGeo, candyRedMat);
  bodyMesh.castShadow = castShadow;
  bodyMesh.receiveShadow = receiveShadow;
  root.add(bodyMesh);

  // 2. Greenhouse & Windows
  const cabinGeo = createRedTunerCabinGeometry();
  const cabinMesh = new THREE.Mesh(cabinGeo, candyRedMat);
  cabinMesh.castShadow = castShadow;
  cabinMesh.receiveShadow = receiveShadow;
  root.add(cabinMesh);

  const winGeo = createRedTunerWindowsGeometry();
  const winMesh = new THREE.Mesh(winGeo, glassMat);
  winMesh.castShadow = castShadow;
  root.add(winMesh);

  // 3. Swan-neck GT Rear Wing
  const spoiler = createSwanNeckSpoiler(carbonMat);
  root.add(spoiler);

  // 4. Cyan Neon Underglow
  const underglowShape = new THREE.Shape();
  underglowShape.moveTo(-1.2, -0.55);
  underglowShape.lineTo(1.2, -0.55);
  underglowShape.lineTo(1.2, 0.55);
  underglowShape.lineTo(-1.2, 0.55);
  underglowShape.closePath();
  const underglowGeo = new THREE.ExtrudeGeometry(underglowShape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  underglowGeo.translate(0, 0, -0.02);
  underglowGeo.computeVertexNormals();
  const underglow = new THREE.Mesh(underglowGeo, neonCyanMat);
  underglow.rotation.x = Math.PI / 2;
  underglow.position.set(0, 0.06, 0);
  root.add(underglow);

  // 5. Wheels (4 corners)
  const wheelRadius = 0.24;
  const wheelWidth = 0.16;
  const wheelMaterials = {
    tire: tireMat,
    rim: goldRimMat,
    hub: carbonMat,
  };

  const wheelPositions: [number, number, number][] = [
    [-0.72, wheelRadius, 0.60],
    [-0.72, wheelRadius, -0.60],
    [0.72, wheelRadius, 0.62],
    [0.72, wheelRadius, -0.62],
  ];

  wheelPositions.forEach(([wx, wy, wz], idx) => {
    const wheel = createRedTunerWheel(wheelRadius, wheelWidth, wheelMaterials, castShadow);
    wheel.name = `red_tuner_wheel_${idx}`;
    wheel.position.set(wx, wy, wz);
    if (wz < 0) wheel.rotation.y = Math.PI;
    root.add(wheel);
  });

  const nodes: Record<string, THREE.Object3D> = { root, body: bodyMesh };
  const meshes: Record<string, THREE.Mesh> = { body: bodyMesh };
  const sockets: Record<string, THREE.Object3D> = {};
  const colliders: Record<string, unknown> = {};
  const destructionGroups: Record<string, THREE.Object3D[]> = { root: [bodyMesh] };

  root.userData.sculptRuntime = {
    nodes,
    meshes,
    sockets,
    colliders,
    destructionGroups,
  } satisfies ProceduralModelRuntime;

  root.userData.lookDevTargets = {
    qualityPriority: 'reference-fidelity',
    modelType: 'real-3d-asset',
  };

  return root;
}
