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
 * Creates the heavy industrial displacement hull of the River Cargo Tug Boat.
 */
function createCargoTugHullGeometry(length = 4.4, width = 1.5, height = 0.75): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2; // 2.2

  // Heavy push-bow with reinforced push-knees
  shape.moveTo(-halfL, 0.85); // High bluff bow
  shape.lineTo(-halfL - 0.08, 0.65);
  shape.quadraticCurveTo(-halfL + 0.1, 0.35, -halfL + 0.35, 0.18);
  shape.lineTo(halfL - 0.40, 0.18); // long flat bottom
  shape.quadraticCurveTo(halfL - 0.15, 0.20, halfL, 0.35);
  shape.lineTo(halfL + 0.06, 0.62); // heavy transom
  shape.lineTo(-halfL, 0.85); // deck sheer
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
 * Creates the elevated multi-tier wheelhouse superstructure.
 */
function createTugSuperstructure(cabinMat: THREE.Material, glassMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  // Tier 1 cabin base
  const t1Shape = new THREE.Shape();
  t1Shape.moveTo(-0.65, 0.60);
  t1Shape.lineTo(0.55, 0.60);
  t1Shape.lineTo(0.55, 1.15);
  t1Shape.lineTo(-0.65, 1.15);
  t1Shape.closePath();

  const t1Geo = new THREE.ExtrudeGeometry(t1Shape, {
    depth: 1.05,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  t1Geo.translate(0, 0, -0.525);
  t1Geo.computeVertexNormals();
  g.add(new THREE.Mesh(t1Geo, cabinMat));

  // Tier 2 elevated pilot wheelhouse
  const t2Shape = new THREE.Shape();
  t2Shape.moveTo(-0.45, 1.15);
  t2Shape.lineTo(0.35, 1.15);
  t2Shape.lineTo(0.35, 1.65);
  t2Shape.lineTo(-0.45, 1.65);
  t2Shape.closePath();

  const t2Geo = new THREE.ExtrudeGeometry(t2Shape, {
    depth: 0.85,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  t2Geo.translate(0, 0, -0.425);
  t2Geo.computeVertexNormals();
  g.add(new THREE.Mesh(t2Geo, cabinMat));

  // Wheelhouse panoramic windows
  const winShape = new THREE.Shape();
  winShape.moveTo(-0.48, 1.35);
  winShape.lineTo(0.38, 1.35);
  winShape.lineTo(0.38, 1.60);
  winShape.lineTo(-0.48, 1.60);
  winShape.closePath();

  const winGeo = new THREE.ExtrudeGeometry(winShape, {
    depth: 0.89,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  winGeo.translate(0, 0, -0.445);
  winGeo.computeVertexNormals();
  g.add(new THREE.Mesh(winGeo, glassMat));

  return g;
}

/**
 * Creates heavy river cargo containers strapped on the aft deck.
 */
function createCargoContainers(colors: number[]): THREE.Group {
  const g = new THREE.Group();

  const cShape = new THREE.Shape();
  cShape.moveTo(-0.48, 0);
  cShape.lineTo(0.48, 0);
  cShape.lineTo(0.48, 0.42);
  cShape.lineTo(-0.48, 0.42);
  cShape.closePath();

  const cGeo = new THREE.ExtrudeGeometry(cShape, {
    depth: 0.52,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  cGeo.translate(0, 0, -0.26);
  cGeo.computeVertexNormals();

  // Stack of 3 containers on the aft deck
  const positions: [number, number, number, number][] = [
    [1.35, 0.60, -0.32, colors[0]],
    [1.35, 0.60, 0.32, colors[1]],
    [1.35, 1.05, 0.0, colors[2]],
  ];

  positions.forEach(([cx, cy, cz, col]) => {
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.45,
      metalness: 0.35,
    });
    const cMesh = new THREE.Mesh(cGeo, mat);
    cMesh.position.set(cx, cy, cz);
    cMesh.castShadow = true;
    g.add(cMesh);
  });

  return g;
}

/**
 * Heavy rubber tire push bumpers on the bow and gunwales.
 */
function createTugFenders(tireMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const tireGeo = new THREE.TorusGeometry(0.14, 0.05, 12, 18);

  // Bow push-knee heavy rubber fenders
  for (let y = 0; y < 3; y++) {
    for (const z of [-0.25, 0.25]) {
      const f = new THREE.Mesh(tireGeo, tireMat);
      f.rotation.y = Math.PI / 2;
      f.position.set(-2.28, 0.42 + y * 0.16, z);
      g.add(f);
    }
  }

  // Side gunwale hanging fenders
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(tireGeo, tireMat);
      f.position.set(-1.0 + i * 0.8, 0.58, side * 0.72);
      g.add(f);
    }
  }

  return g;
}

export function createCargoTugBoatModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Cargo Tug Boat (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x2e6e5e, // Heavy Forest Marine Green
    roughness: 0.45,
    metalness: 0.2,
  });

  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0xf5f0e0, // Heavy Nautical Cream
    roughness: 0.42,
    metalness: 0.15,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0c141d,
    roughness: 0.1,
    metalness: 0.9,
  });

  const rubberMat = new THREE.MeshStandardMaterial({
    color: 0x16181b,
    roughness: 0.85,
    metalness: 0.05,
  });

  const exhaustMat = new THREE.MeshStandardMaterial({
    color: 0x3d3d3d,
    roughness: 0.35,
    metalness: 0.75,
  });

  // 1. Heavy Tugboat Hull
  const hullGeo = createCargoTugHullGeometry(4.4, 1.5, 0.75);
  const hullMesh = new THREE.Mesh(hullGeo, hullMat);
  hullMesh.castShadow = castShadow;
  hullMesh.receiveShadow = receiveShadow;
  root.add(hullMesh);

  // 2. Multi-tier Superstructure
  const superStructure = createTugSuperstructure(cabinMat, glassMat);
  root.add(superStructure);

  // 3. Freight Cargo Containers
  const containers = createCargoContainers([0xb03a2e, 0x1e88e5, 0xf39c12]);
  root.add(containers);

  // 4. Rubber Push Bumpers
  const fenders = createTugFenders(rubberMat);
  root.add(fenders);

  // 5. Dual Heavy Exhaust Smokestacks
  const stackShape = new THREE.Shape();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const sx = Math.cos(a) * 0.08;
    const sy = Math.sin(a) * 0.08;
    if (i === 0) stackShape.moveTo(sx, sy);
    else stackShape.lineTo(sx, sy);
  }
  const stackGeo = new THREE.ExtrudeGeometry(stackShape, {
    depth: 0.65,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  stackGeo.center();

  for (const side of [-1, 1]) {
    const stack = new THREE.Mesh(stackGeo, exhaustMat);
    stack.rotation.x = Math.PI / 2;
    stack.position.set(0.15, 1.75, side * 0.22);
    root.add(stack);
  }

  const nodes: Record<string, THREE.Object3D> = { root, hull: hullMesh };
  const meshes: Record<string, THREE.Mesh> = { hull: hullMesh };
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
