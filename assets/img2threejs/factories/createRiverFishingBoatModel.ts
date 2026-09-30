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
 * Creates a nautical boat hull with flared bow, keel rocker, and transom.
 * Front is at -X, Stern is at +X, Y is up, width along Z.
 */
function createFishingBoatHullGeometry(length = 3.6, width = 1.35, height = 0.65): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2; // 1.8

  // Side profile of boat hull:
  // Waterline at Y = 0.18, Deck gunwale from Y = 0.50 to 0.72 (sheer curve higher at bow)
  shape.moveTo(-halfL, 0.72); // High flared bow stem
  shape.quadraticCurveTo(-halfL + 0.15, 0.40, -halfL + 0.35, 0.15); // cutwater / forefoot
  shape.lineTo(halfL - 0.40, 0.14); // keel bottom
  shape.quadraticCurveTo(halfL - 0.10, 0.16, halfL, 0.30); // stern skeg
  shape.lineTo(halfL + 0.04, 0.52); // transom stern
  shape.quadraticCurveTo(halfL * 0.4, 0.48, -halfL * 0.2, 0.52); // sheer line dipping slightly amidships
  shape.quadraticCurveTo(-halfL * 0.7, 0.58, -halfL, 0.72); // rising to bow
  shape.closePath();

  const hullWidth = width - 0.16;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: hullWidth,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 4,
    curveSegments: 12,
  });
  geo.translate(0, 0, -hullWidth / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the wheelhouse cabin structure with raked bridge windows.
 */
function createFishingCabinGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  // Sits on deck between X = -0.55 and X = 0.35, Y = 0.50 to 1.15
  shape.moveTo(-0.55, 0.52);
  shape.lineTo(-0.48, 1.12); // reverse-raked fishing vessel wheelhouse window
  shape.quadraticCurveTo(-0.10, 1.16, 0.32, 1.14); // roofline
  shape.lineTo(0.35, 0.52); // aft bulkhead
  shape.closePath();

  const cabinWidth = 0.95;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: cabinWidth,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geo.translate(0, 0, -cabinWidth / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates bridge window glass panels.
 */
function createFishingWindowsGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.52, 0.72);
  shape.lineTo(-0.46, 1.08);
  shape.lineTo(0.30, 1.08);
  shape.lineTo(0.30, 0.72);
  shape.closePath();

  const winWidth = 0.99;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: winWidth,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -winWidth / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates nautical details: lifebuoys, smokestack, and bow rail.
 */
function createFishingBoatDetails(
  trimMat: THREE.Material,
  lifebuoyMat: THREE.Material,
  pipeMat: THREE.Material,
  woodMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();

  // 1. Lifebuoy rings on cabin port and starboard (TorusGeometry)
  const buoyGeo = new THREE.TorusGeometry(0.12, 0.04, 12, 20);
  for (const side of [-1, 1]) {
    const buoy = new THREE.Mesh(buoyGeo, lifebuoyMat);
    buoy.position.set(-0.08, 0.85, side * 0.53);
    g.add(buoy);
  }

  // 2. Engine exhaust smokestack
  const stackShape = new THREE.Shape();
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const sx = Math.cos(a) * 0.06;
    const sy = Math.sin(a) * 0.06;
    if (i === 0) stackShape.moveTo(sx, sy);
    else stackShape.lineTo(sx, sy);
  }
  const stackGeo = new THREE.ExtrudeGeometry(stackShape, {
    depth: 0.45,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  stackGeo.center();
  const stack = new THREE.Mesh(stackGeo, pipeMat);
  stack.rotation.x = Math.PI / 2;
  stack.position.set(0.18, 1.35, 0);
  g.add(stack);

  // 3. Wooden fish cargo crates on the aft deck
  const crateShape = new THREE.Shape();
  crateShape.moveTo(-0.16, 0);
  crateShape.lineTo(0.16, 0);
  crateShape.lineTo(0.16, 0.22);
  crateShape.lineTo(-0.16, 0.22);
  crateShape.closePath();
  const crateGeo = new THREE.ExtrudeGeometry(crateShape, {
    depth: 0.38,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  crateGeo.translate(0, 0, -0.19);
  crateGeo.computeVertexNormals();

  const crate1 = new THREE.Mesh(crateGeo, woodMat);
  crate1.position.set(0.75, 0.50, -0.18);
  g.add(crate1);

  const crate2 = new THREE.Mesh(crateGeo, woodMat);
  crate2.position.set(1.15, 0.50, 0.12);
  crate2.rotation.y = 0.2;
  g.add(crate2);

  // 4. Bow railing around forward deck
  const railShape = new THREE.Shape();
  railShape.moveTo(-1.70, 0.74);
  railShape.quadraticCurveTo(-1.20, 0.82, -0.65, 0.70);
  railShape.lineTo(-0.65, 0.66);
  railShape.quadraticCurveTo(-1.20, 0.76, -1.68, 0.70);
  railShape.closePath();
  const railGeo = new THREE.ExtrudeGeometry(railShape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  railGeo.computeVertexNormals();

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(railGeo, trimMat);
    rail.position.z = side * 0.48;
    g.add(rail);
  }

  return g;
}

export function createFishingBoatModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Fishing Boat (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x2e6e5e, // Nautical Sea Green
    roughness: 0.42,
    metalness: 0.15,
  });

  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0xf5f0e0, // Weathered Marine Cream
    roughness: 0.48,
    metalness: 0.1,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0c1e28,
    roughness: 0.1,
    metalness: 0.85,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x8b5a2b, // Timber Brown
    roughness: 0.65,
    metalness: 0.05,
  });

  const lifebuoyMat = new THREE.MeshStandardMaterial({
    color: 0xff4757, // Safety Orange-Red
    roughness: 0.35,
    metalness: 0.1,
  });

  const pipeMat = new THREE.MeshStandardMaterial({
    color: 0x3d3d3d,
    roughness: 0.3,
    metalness: 0.8,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xdfe4ea,
    roughness: 0.3,
    metalness: 0.7,
  });

  // 1. Boat Hull
  const hullGeo = createFishingBoatHullGeometry(3.6, 1.35, 0.65);
  const hullMesh = new THREE.Mesh(hullGeo, hullMat);
  hullMesh.castShadow = castShadow;
  hullMesh.receiveShadow = receiveShadow;
  root.add(hullMesh);

  // 2. Wheelhouse Cabin
  const cabinGeo = createFishingCabinGeometry();
  const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
  cabinMesh.castShadow = castShadow;
  cabinMesh.receiveShadow = receiveShadow;
  root.add(cabinMesh);

  const winGeo = createFishingWindowsGeometry();
  const winMesh = new THREE.Mesh(winGeo, glassMat);
  winMesh.castShadow = castShadow;
  root.add(winMesh);

  // 3. Nautical Equipment & Details
  const details = createFishingBoatDetails(trimMat, lifebuoyMat, pipeMat, woodMat);
  root.add(details);

  const nodes: Record<string, THREE.Object3D> = { root, hull: hullMesh, cabin: cabinMesh };
  const meshes: Record<string, THREE.Mesh> = { hull: hullMesh, cabin: cabinMesh, windows: winMesh };
  const sockets: Record<string, THREE.Object3D> = {};
  const colliders: Record<string, unknown> = {};
  const destructionGroups: Record<string, THREE.Object3D[]> = { root: [hullMesh, cabinMesh] };

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
