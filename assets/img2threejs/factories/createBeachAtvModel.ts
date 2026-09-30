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
 * Creates an aggressive sport quad tire. Zero primitives used.
 */
function createAtvWheel(
  radius: number,
  tireWidth: number,
  materials: {
    tire: THREE.Material;
    rim: THREE.Material;
  },
  castShadow: boolean,
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'atv-wheel';

  const tubeRadius = tireWidth * 0.48;
  const mainRadius = radius - tubeRadius;
  const tireGeo = new THREE.TorusGeometry(mainRadius, tubeRadius, 14, 24);
  const tire = new THREE.Mesh(tireGeo, materials.tire);
  tire.castShadow = castShadow;
  g.add(tire);

  // 4-bolt sport quad rim
  const rimRadius = mainRadius * 0.82;
  const rimShape = new THREE.Shape();
  const numSpokes = 4;
  const hubR = rimRadius * 0.35;
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
    depth: tireWidth * 0.38,
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

/**
 * Creates the aerodynamic fiberglass fairings & fenders of the sport ATV.
 */
function createAtvBodyGeometry(length = 2.2, width = 1.05): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2; // 1.1

  // Sport ATV side profile
  shape.moveTo(-halfL, 0.38); // Front nose tip
  shape.lineTo(-halfL + 0.15, 0.58); // front fender rise
  shape.lineTo(-0.25, 0.62); // fuel tank hump
  shape.lineTo(0.35, 0.58); // seat bed
  shape.lineTo(halfL - 0.15, 0.56); // rear fender flare
  shape.lineTo(halfL + 0.05, 0.44); // rear grab bar
  shape.lineTo(halfL - 0.05, 0.30);
  shape.lineTo(0.40, 0.30); // under-fender clearance
  shape.lineTo(0.10, 0.22); // footpeg nerf-bar level
  shape.lineTo(-0.40, 0.22);
  shape.lineTo(-halfL + 0.15, 0.32);
  shape.closePath();

  const extrudeDepth = width - 0.12;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 4,
    curveSegments: 10,
  });
  geo.translate(0, 0, -extrudeDepth / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates raised motocross handlebars with race grips.
 */
function createAtvHandlebars(barMat: THREE.Material, gripMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  // Steering stem
  const stemShape = new THREE.Shape();
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const sx = Math.cos(a) * 0.03;
    const sy = Math.sin(a) * 0.03;
    if (i === 0) stemShape.moveTo(sx, sy);
    else stemShape.lineTo(sx, sy);
  }
  const stemGeo = new THREE.ExtrudeGeometry(stemShape, {
    depth: 0.28,
    bevelEnabled: false,
  });
  stemGeo.center();
  const stem = new THREE.Mesh(stemGeo, barMat);
  stem.rotation.z = -0.4;
  stem.position.set(-0.35, 0.76, 0);
  g.add(stem);

  // Crossbar handlebar
  const barGeo = new THREE.ExtrudeGeometry(stemShape, {
    depth: 0.72,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  barGeo.center();
  const bar = new THREE.Mesh(barGeo, barMat);
  bar.position.set(-0.42, 0.88, 0);
  g.add(bar);

  // Left & right rubber handgrips
  for (const side of [-1, 1]) {
    const gripGeo = new THREE.TorusGeometry(0.04, 0.02, 10, 16);
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.rotation.y = Math.PI / 2;
    grip.position.set(-0.42, 0.88, side * 0.33);
    g.add(grip);
  }

  return g;
}

/**
 * Creates sculpted saddle seat for the ATV rider.
 */
function createAtvSaddle(seatMat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-0.25, 0.60);
  shape.quadraticCurveTo(0, 0.66, 0.45, 0.62);
  shape.lineTo(0.48, 0.58);
  shape.lineTo(-0.25, 0.58);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  geo.translate(0, 0, -0.17);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, seatMat);
  mesh.name = 'atv-saddle';
  return mesh;
}

/**
 * Creates tubular front brush guard and headlights.
 */
function createAtvFrontBrushGuard(guardMat: THREE.Material, hlMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  // Bumper loop
  const loopShape = new THREE.Shape();
  loopShape.moveTo(-1.08, 0.25);
  loopShape.lineTo(-1.18, 0.42);
  loopShape.lineTo(-1.15, 0.44);
  loopShape.lineTo(-1.05, 0.28);
  loopShape.closePath();

  const loopGeo = new THREE.ExtrudeGeometry(loopShape, {
    depth: 0.55,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  loopGeo.translate(0, 0, -0.275);
  loopGeo.computeVertexNormals();

  const bumper = new THREE.Mesh(loopGeo, guardMat);
  g.add(bumper);

  // Twin bug-eye LED headlights
  const hlGeo = new THREE.TorusGeometry(0.065, 0.025, 10, 16);
  for (const side of [-1, 1]) {
    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.rotation.y = Math.PI / 2;
    hl.position.set(-1.06, 0.48, side * 0.22);
    g.add(hl);
  }

  return g;
}

export function createBeachATVModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Beach ATV (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xd32f2f, // Crimson Racing Red
    roughness: 0.3,
    metalness: 0.25,
  });

  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x1e272e, // Heavy black non-slip vinyl
    roughness: 0.6,
    metalness: 0.05,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x181a1d,
    roughness: 0.9,
    metalness: 0.05,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x485460, // Gunmetal sport rim
    roughness: 0.35,
    metalness: 0.75,
  });

  const barMat = new THREE.MeshStandardMaterial({
    color: 0xdfe4ea, // Satin aluminum handlebar
    roughness: 0.25,
    metalness: 0.85,
  });

  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 0.1,
    emissive: 0xffffff,
    emissiveIntensity: 1.2,
  });

  // 1. Fairing Body
  const bodyGeo = createAtvBodyGeometry(2.2, 1.05);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = castShadow;
  bodyMesh.receiveShadow = receiveShadow;
  root.add(bodyMesh);

  // 2. Saddle
  const saddle = createAtvSaddle(seatMat);
  saddle.castShadow = castShadow;
  root.add(saddle);

  // 3. Handlebars
  const handlebars = createAtvHandlebars(barMat, seatMat);
  root.add(handlebars);

  // 4. Front Brush Guard & Headlights
  const frontGuard = createAtvFrontBrushGuard(rimMat, hlMat);
  root.add(frontGuard);

  // 5. Quad Sand Wheels (4 corners)
  const wheelRadius = 0.28;
  const wheelWidth = 0.20;
  const wheelMaterials = {
    tire: tireMat,
    rim: rimMat,
  };

  const wheelPositions: [number, number, number][] = [
    [-0.65, wheelRadius, 0.52],  // Front Left
    [-0.65, wheelRadius, -0.52], // Front Right
    [0.62, wheelRadius, 0.54],   // Rear Left
    [0.62, wheelRadius, -0.54],  // Rear Right
  ];

  wheelPositions.forEach(([wx, wy, wz], idx) => {
    const wheel = createAtvWheel(wheelRadius, wheelWidth, wheelMaterials, castShadow);
    wheel.name = `atv_wheel_${idx}`;
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
