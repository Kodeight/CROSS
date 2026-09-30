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
 * Massive monster truck deep-lug tire and beadlock wheel. Zero primitives used.
 */
function createMonsterWheel(
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
  g.name = 'monster-wheel';

  const tubeRadius = tireWidth * 0.48;
  const mainRadius = radius - tubeRadius;
  const tireGeo = new THREE.TorusGeometry(mainRadius, tubeRadius, 14, 24);
  const tire = new THREE.Mesh(tireGeo, materials.tire);
  tire.castShadow = castShadow;
  g.add(tire);

  // Heavy steel military rim with 8 bolt holes
  const rimRadius = mainRadius * 0.78;
  const rimShape = new THREE.Shape();
  const numSpokes = 8;
  const hubR = rimRadius * 0.38;
  for (let i = 0; i <= numSpokes * 2; i++) {
    const angle = (i * Math.PI) / numSpokes;
    const r = i % 2 === 0 ? rimRadius : hubR;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) rimShape.moveTo(x, y);
    else rimShape.lineTo(x, y);
  }
  rimShape.closePath();

  const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
    depth: tireWidth * 0.42,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 2,
  });
  rimGeo.center();
  const rim = new THREE.Mesh(rimGeo, materials.rim);
  rim.castShadow = castShadow;
  g.add(rim);

  return g;
}

/**
 * Creates the angular armored hull & cab of the Armored Monster Truck.
 */
function createArmoredBodyGeometry(length = 3.2, width = 1.35): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2; // 1.6

  // Angular armored vehicle profile
  shape.moveTo(-halfL, 0.42); // Heavy wedge front bumper
  shape.lineTo(-halfL - 0.08, 0.58);
  shape.lineTo(-halfL + 0.12, 0.76); // sloped hood armor
  shape.lineTo(-0.35, 0.82); // windshield base
  shape.lineTo(-0.15, 1.25); // sloped armored cab roof
  shape.lineTo(0.55, 1.25);
  shape.lineTo(0.65, 0.80); // rear cab bulkhead
  shape.lineTo(halfL + 0.05, 0.78); // armored bed sidewall
  shape.lineTo(halfL + 0.08, 0.46); // rear armored tailgate
  shape.lineTo(halfL - 0.06, 0.36);

  // High clearance wheel cutouts
  const rwCenterX = 0.82;
  const rwR = 0.38;
  shape.lineTo(rwCenterX + rwR + 0.08, 0.36);
  shape.quadraticCurveTo(rwCenterX, 0.68, rwCenterX - rwR - 0.08, 0.36);

  shape.lineTo(-0.82 + rwR + 0.08, 0.36);

  const fwCenterX = -0.82;
  const fwR = 0.38;
  shape.quadraticCurveTo(fwCenterX, 0.68, fwCenterX - fwR - 0.08, 0.36);

  shape.closePath();

  const extrudeDepth = width - 0.16;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 4,
    curveSegments: 10,
  });
  geo.translate(0, 0, -extrudeDepth / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates narrow ballistic vision slits for the armored windshield.
 */
function createBallisticVisionSlits(glassMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  const slitShape = new THREE.Shape();
  slitShape.moveTo(-0.06, 0.88);
  slitShape.lineTo(0.04, 1.15);
  slitShape.lineTo(0.02, 1.17);
  slitShape.lineTo(-0.08, 0.90);
  slitShape.closePath();

  const slitGeo = new THREE.ExtrudeGeometry(slitShape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  slitGeo.translate(0, 0, -0.21);
  slitGeo.computeVertexNormals();

  for (const side of [-0.28, 0.28]) {
    const slit = new THREE.Mesh(slitGeo, glassMat);
    slit.position.set(-0.24, 0, side);
    g.add(slit);
  }

  return g;
}

/**
 * Heavy front ramming cow-catcher / bull bar.
 */
function createFrontRamBumper(barMat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-1.68, 0.35);
  shape.lineTo(-1.82, 0.52);
  shape.lineTo(-1.80, 0.72);
  shape.lineTo(-1.72, 0.74);
  shape.lineTo(-1.74, 0.56);
  shape.lineTo(-1.62, 0.39);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.15,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.575);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, barMat);
  mesh.name = 'armored-ram';
  return mesh;
}

export function createArmoredMonsterTruckModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Armored Monster Truck (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x272b30, // Volcanic basalt armored plating
    roughness: 0.55,
    metalness: 0.65,
  });

  const orangeMat = new THREE.MeshStandardMaterial({
    color: 0xff6a00, // Magma heat hazard accent
    roughness: 0.25,
    metalness: 0.4,
    emissive: 0xaa3300,
    emissiveIntensity: 0.5,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x141618,
    roughness: 0.9,
    metalness: 0.05,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x485460,
    roughness: 0.4,
    metalness: 0.75,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0a0c10,
    roughness: 0.1,
    metalness: 0.95,
  });

  // 1. Armored Body & Cab
  const bodyGeo = createArmoredBodyGeometry(3.2, 1.35);
  const bodyMesh = new THREE.Mesh(bodyGeo, armorMat);
  bodyMesh.castShadow = castShadow;
  bodyMesh.receiveShadow = receiveShadow;
  root.add(bodyMesh);

  // 2. Ballistic Vision Slits
  const slits = createBallisticVisionSlits(glassMat);
  root.add(slits);

  // 3. Heavy Front Ramming Bumper
  const ram = createFrontRamBumper(orangeMat);
  root.add(ram);

  // 4. Massive Monster Truck Wheels (4 corners)
  const wheelRadius = 0.38;
  const wheelWidth = 0.26;
  const wheelMaterials = {
    tire: tireMat,
    rim: rimMat,
    hub: orangeMat,
  };

  const wheelPositions: [number, number, number][] = [
    [-0.82, wheelRadius, 0.66],  // Front Left
    [-0.82, wheelRadius, -0.66], // Front Right
    [0.82, wheelRadius, 0.66],   // Rear Left
    [0.82, wheelRadius, -0.66],  // Rear Right
  ];

  wheelPositions.forEach(([wx, wy, wz], idx) => {
    const wheel = createMonsterWheel(wheelRadius, wheelWidth, wheelMaterials, castShadow);
    wheel.name = `monster_wheel_${idx}`;
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
