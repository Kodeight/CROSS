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
 * Massive heavy-haul industrial mining earthmover wheel.
 */
function createHaulWheel(
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
  g.name = 'haul-wheel';

  const tubeRadius = tireWidth * 0.46;
  const mainRadius = radius - tubeRadius;
  const tireGeo = new THREE.TorusGeometry(mainRadius, tubeRadius, 14, 24);
  const tire = new THREE.Mesh(tireGeo, materials.tire);
  tire.castShadow = castShadow;
  g.add(tire);

  // Heavy planetary hub rim
  const rimRadius = mainRadius * 0.76;
  const rimShape = new THREE.Shape();
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rx = Math.cos(a) * rimRadius;
    const ry = Math.sin(a) * rimRadius;
    if (i === 0) rimShape.moveTo(rx, ry);
    else rimShape.lineTo(rx, ry);
  }
  const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
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

  // Large planetary final drive hub
  const hubShape = new THREE.Shape();
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const hx = Math.cos(a) * (rimRadius * 0.52);
    const hy = Math.sin(a) * (rimRadius * 0.52);
    if (i === 0) hubShape.moveTo(hx, hy);
    else hubShape.lineTo(hx, hy);
  }
  const hubGeo = new THREE.ExtrudeGeometry(hubShape, {
    depth: tireWidth * 0.52,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  hubGeo.center();
  g.add(new THREE.Mesh(hubGeo, materials.hub));

  return g;
}

/**
 * Creates the colossal angled dump bed with rock-deflection canopy extending over the cab.
 */
function createDumpBedGeometry(length = 3.6, width = 1.65): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  // Canopy overhang at front (-X), high dump box walls, tapered rear chute (+X)
  shape.moveTo(-1.60, 1.85); // Forward canopy tip over cab
  shape.lineTo(-1.10, 1.82);
  shape.lineTo(-0.95, 1.15); // front dump box wall
  shape.lineTo(1.45, 1.05); // floor of dump bed
  shape.lineTo(1.75, 1.55); // angled rear tail chute
  shape.lineTo(1.68, 1.65);
  shape.lineTo(1.35, 1.25);
  shape.lineTo(-0.85, 1.35); // inner floor
  shape.lineTo(-0.95, 1.85);
  shape.closePath();

  const bedWidth = width - 0.16;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: bedWidth,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geo.translate(0, 0, -bedWidth / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the heavy industrial chassis frame and radiator housing.
 */
function createHaulerChassisGeometry(length = 3.8, width = 1.35): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2; // 1.9

  shape.moveTo(-halfL, 0.35); // Heavy front radiator grille
  shape.lineTo(-halfL - 0.06, 0.55);
  shape.lineTo(-halfL + 0.15, 1.10); // front deck
  shape.lineTo(0.10, 1.10);
  shape.lineTo(0.35, 0.95);
  shape.lineTo(halfL - 0.10, 0.95);
  shape.lineTo(halfL + 0.05, 0.45);
  shape.lineTo(halfL - 0.05, 0.32);
  shape.lineTo(0.95, 0.32);
  shape.quadraticCurveTo(0.70, 0.70, 0.45, 0.32); // rear wheel clearance
  shape.lineTo(-0.45, 0.32);
  shape.quadraticCurveTo(-0.70, 0.70, -0.95, 0.32); // front wheel clearance
  shape.lineTo(-halfL, 0.35);
  shape.closePath();

  const chassisWidth = width - 0.16;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: chassisWidth,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geo.translate(0, 0, -chassisWidth / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the offset left-side operator cab.
 */
function createHaulerCab(cabMat: THREE.Material, glassMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  const cShape = new THREE.Shape();
  cShape.moveTo(-0.42, 1.10);
  cShape.lineTo(0.15, 1.10);
  cShape.lineTo(0.15, 1.62);
  cShape.lineTo(-0.42, 1.62);
  cShape.closePath();

  const cGeo = new THREE.ExtrudeGeometry(cShape, {
    depth: 0.48,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  cGeo.translate(0, 0, -0.24);
  cGeo.computeVertexNormals();

  const cab = new THREE.Mesh(cGeo, cabMat);
  cab.position.set(-0.65, 0, 0.42); // offset to driver's side (left)
  g.add(cab);

  // Cab windows
  const winShape = new THREE.Shape();
  winShape.moveTo(-0.40, 1.25);
  winShape.lineTo(0.12, 1.25);
  winShape.lineTo(0.12, 1.58);
  winShape.lineTo(-0.40, 1.58);
  winShape.closePath();

  const winGeo = new THREE.ExtrudeGeometry(winShape, {
    depth: 0.50,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  winGeo.translate(0, 0, -0.25);
  winGeo.computeVertexNormals();

  const win = new THREE.Mesh(winGeo, glassMat);
  win.position.set(-0.65, 0, 0.42);
  g.add(win);

  return g;
}

export function createMiningDumpTruckModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Mining Dump Truck (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xf2a007, // Industrial Volcanic Hazard Orange-Yellow
    roughness: 0.4,
    metalness: 0.35,
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x222a35, // Heavy industrial dark structural steel
    roughness: 0.6,
    metalness: 0.5,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0c141d,
    roughness: 0.1,
    metalness: 0.9,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x16181b,
    roughness: 0.9,
    metalness: 0.05,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x4a5568,
    roughness: 0.4,
    metalness: 0.75,
  });

  // 1. Heavy Hauler Chassis
  const chassisGeo = createHaulerChassisGeometry(3.8, 1.35);
  const chassisMesh = new THREE.Mesh(chassisGeo, steelMat);
  chassisMesh.castShadow = castShadow;
  chassisMesh.receiveShadow = receiveShadow;
  root.add(chassisMesh);

  // 2. Colossal Dump Bed Container
  const bedGeo = createDumpBedGeometry(3.6, 1.65);
  const bedMesh = new THREE.Mesh(bedGeo, yellowMat);
  bedMesh.castShadow = castShadow;
  bedMesh.receiveShadow = receiveShadow;
  root.add(bedMesh);

  // 3. Offset Operator Cab
  const cab = createHaulerCab(yellowMat, glassMat);
  root.add(cab);

  // 4. Heavy Earthmover Wheels (Front singles, Rear heavy duals)
  const wheelRadius = 0.42;
  const wheelWidth = 0.28;
  const wheelMaterials = {
    tire: tireMat,
    rim: rimMat,
    hub: steelMat,
  };

  // Front Wheels
  const fw1 = createHaulWheel(wheelRadius, wheelWidth, wheelMaterials, castShadow);
  fw1.position.set(-1.15, wheelRadius, 0.68);
  root.add(fw1);

  const fw2 = createHaulWheel(wheelRadius, wheelWidth, wheelMaterials, castShadow);
  fw2.position.set(-1.15, wheelRadius, -0.68);
  fw2.rotation.y = Math.PI;
  root.add(fw2);

  // Rear Heavy Wheels
  const rw1 = createHaulWheel(wheelRadius, wheelWidth * 1.3, wheelMaterials, castShadow);
  rw1.position.set(0.95, wheelRadius, 0.68);
  root.add(rw1);

  const rw2 = createHaulWheel(wheelRadius, wheelWidth * 1.3, wheelMaterials, castShadow);
  rw2.position.set(0.95, wheelRadius, -0.68);
  rw2.rotation.y = Math.PI;
  root.add(rw2);

  const nodes: Record<string, THREE.Object3D> = { root, chassis: chassisMesh, dumpBed: bedMesh };
  const meshes: Record<string, THREE.Mesh> = { chassis: chassisMesh, dumpBed: bedMesh };
  const sockets: Record<string, THREE.Object3D> = {};
  const colliders: Record<string, unknown> = {};
  const destructionGroups: Record<string, THREE.Object3D[]> = { root: [chassisMesh, bedMesh] };

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
