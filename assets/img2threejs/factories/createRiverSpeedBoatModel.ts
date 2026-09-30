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
 * Creates the sharp deep-V planing hull of the offshore Speed Boat.
 * Pointed bow at -X, wide planing transom at +X.
 */
function createSpeedBoatHullGeometry(length = 3.8, width = 1.35, height = 0.55): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2; // 1.9

  // Deep-V wedge profile
  shape.moveTo(-halfL, 0.65); // Sharp wave-piercing prow
  shape.quadraticCurveTo(-halfL + 0.35, 0.32, -halfL + 0.70, 0.14); // sharp entry forefoot
  shape.lineTo(halfL - 0.15, 0.12); // flat planing pad
  shape.lineTo(halfL + 0.05, 0.42); // transom angle
  shape.lineTo(halfL - 0.02, 0.48); // aft gunwale
  shape.quadraticCurveTo(0.2, 0.46, -halfL * 0.4, 0.52); // sleek reverse sheer
  shape.quadraticCurveTo(-halfL * 0.8, 0.58, -halfL, 0.65);
  shape.closePath();

  const hullWidth = width - 0.14;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: hullWidth,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.07,
    bevelSegments: 4,
    curveSegments: 12,
  });
  geo.translate(0, 0, -hullWidth / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the low-profile aerodynamic wraparound sport windscreen.
 */
function createSpeedBoatWindscreen(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.48, 0.50);
  shape.lineTo(-0.25, 0.76); // raked glass
  shape.quadraticCurveTo(0.05, 0.78, 0.32, 0.74);
  shape.lineTo(0.38, 0.50);
  shape.closePath();

  const winWidth = 1.05;
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

/**
 * Creates dual high-performance outboard motors on the transom.
 */
function createOutboardMotors(motorMat: THREE.Material, propMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  // Cowling shape (beveled teardrop)
  const cowlShape = new THREE.Shape();
  cowlShape.moveTo(-0.12, 0.15);
  cowlShape.lineTo(0.12, 0.15);
  cowlShape.quadraticCurveTo(0.18, 0.35, 0.08, 0.55);
  cowlShape.quadraticCurveTo(0, 0.58, -0.08, 0.55);
  cowlShape.quadraticCurveTo(-0.18, 0.35, -0.12, 0.15);
  cowlShape.closePath();

  const cowlGeo = new THREE.ExtrudeGeometry(cowlShape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  cowlGeo.translate(0, 0, -0.11);
  cowlGeo.computeVertexNormals();

  for (const side of [-1, 1]) {
    const motor = new THREE.Mesh(cowlGeo, motorMat);
    motor.position.set(1.95, 0.18, side * 0.32);
    g.add(motor);
  }

  return g;
}

/**
 * Creates cockpit luxury sport bucket seats and steering helm.
 */
function createCockpitInterior(seatMat: THREE.Material, dashMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  // Bucket seat shape
  const seatShape = new THREE.Shape();
  seatShape.moveTo(-0.14, 0.44);
  seatShape.lineTo(0.14, 0.44);
  seatShape.lineTo(0.14, 0.72);
  seatShape.quadraticCurveTo(0.08, 0.76, 0, 0.76);
  seatShape.lineTo(-0.14, 0.44);
  seatShape.closePath();

  const seatGeo = new THREE.ExtrudeGeometry(seatShape, {
    depth: 0.28,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  seatGeo.translate(0, 0, -0.14);
  seatGeo.computeVertexNormals();

  for (const side of [-1, 1]) {
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(-0.02, 0, side * 0.28);
    g.add(seat);
  }

  return g;
}

export function createSpeedBoatModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Speed Boat (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const hullWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf5f7fa, // Marine Pearl White
    roughness: 0.2,
    metalness: 0.2,
  });

  const stripeBlueMat = new THREE.MeshStandardMaterial({
    color: 0x1e4fd8, // Vibrant Cobalt Marine Blue
    roughness: 0.22,
    metalness: 0.3,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0a1420, // Smoked marine glass
    roughness: 0.08,
    metalness: 0.9,
  });

  const seatMat = new THREE.MeshStandardMaterial({
    color: 0xd63031, // Italian Racing Red leather
    roughness: 0.5,
    metalness: 0.1,
  });

  const motorMat = new THREE.MeshStandardMaterial({
    color: 0x22242a, // Gloss black outboard cowling
    roughness: 0.2,
    metalness: 0.6,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe0e6ed,
    roughness: 0.12,
    metalness: 0.95,
  });

  // 1. Deep-V Planing Hull
  const hullGeo = createSpeedBoatHullGeometry(3.8, 1.35, 0.55);
  const hullMesh = new THREE.Mesh(hullGeo, hullWhiteMat);
  hullMesh.castShadow = castShadow;
  hullMesh.receiveShadow = receiveShadow;
  root.add(hullMesh);

  // 2. Wrap-around Tinted Windscreen
  const winGeo = createSpeedBoatWindscreen();
  const winMesh = new THREE.Mesh(winGeo, glassMat);
  winMesh.castShadow = castShadow;
  root.add(winMesh);

  // 3. Cockpit Interior (Seats)
  const cockpit = createCockpitInterior(seatMat, motorMat);
  root.add(cockpit);

  // 4. Dual Outboard Motors
  const motors = createOutboardMotors(motorMat, chromeMat);
  root.add(motors);

  const nodes: Record<string, THREE.Object3D> = { root, hull: hullMesh };
  const meshes: Record<string, THREE.Mesh> = { hull: hullMesh, windscreen: winMesh };
  const sockets: Record<string, THREE.Object3D> = {};
  const colliders: Record<string, unknown> = {};
  const destructionGroups: Record<string, THREE.Object3D[]> = { root: [hullMesh] };

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
