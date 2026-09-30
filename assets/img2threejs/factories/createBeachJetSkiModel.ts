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
 * Creates the aerodynamic & hydrodynamic fiberglass hull of the Jet Ski.
 */
function createJetSkiHullGeometry(length = 2.4, width = 0.95): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2; // 1.2

  // Jet Ski side profile
  shape.moveTo(-halfL, 0.52); // Sharp upturned bow prow
  shape.quadraticCurveTo(-halfL + 0.25, 0.22, -halfL + 0.55, 0.12); // deep-V entry chine
  shape.lineTo(halfL - 0.20, 0.12); // planing pad
  shape.lineTo(halfL + 0.05, 0.28); // transom jet outlet notch
  shape.lineTo(halfL - 0.02, 0.40); // rear swim boarding platform
  shape.lineTo(0.35, 0.44); // footwell deck
  shape.quadraticCurveTo(-0.15, 0.50, -halfL + 0.35, 0.55); // hood cowl
  shape.lineTo(-halfL, 0.52);
  shape.closePath();

  const hullWidth = width - 0.12;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: hullWidth,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 4,
    curveSegments: 10,
  });
  geo.translate(0, 0, -hullWidth / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the two-tier contoured racing saddle.
 */
function createJetSkiSaddle(seatMat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  // Rider seat (front) + passenger seat (raised rear tier)
  shape.moveTo(-0.25, 0.44);
  shape.lineTo(-0.18, 0.62); // rider support
  shape.lineTo(0.12, 0.62);
  shape.lineTo(0.18, 0.72); // passenger tier step
  shape.lineTo(0.55, 0.70);
  shape.lineTo(0.58, 0.44);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.32,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  geo.translate(0, 0, -0.16);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, seatMat);
  mesh.name = 'jetski-saddle';
  return mesh;
}

/**
 * Creates handlebar steering stem and console.
 */
function createJetSkiHandlebars(barMat: THREE.Material, hoodMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  // Steering hood cowl
  const cowlShape = new THREE.Shape();
  cowlShape.moveTo(-0.55, 0.52);
  cowlShape.lineTo(-0.35, 0.76);
  cowlShape.lineTo(-0.22, 0.74);
  cowlShape.lineTo(-0.32, 0.52);
  cowlShape.closePath();

  const cowlGeo = new THREE.ExtrudeGeometry(cowlShape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  cowlGeo.translate(0, 0, -0.21);
  cowlGeo.computeVertexNormals();
  g.add(new THREE.Mesh(cowlGeo, hoodMat));

  // Handlebar grips
  const gripGeo = new THREE.TorusGeometry(0.045, 0.02, 10, 16);
  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(gripGeo, barMat);
    grip.rotation.y = Math.PI / 2;
    grip.position.set(-0.32, 0.78, side * 0.28);
    g.add(grip);
  }

  return g;
}

/**
 * Creates stern water jet propulsion steering nozzle.
 */
function createJetNozzle(nozzleMat: THREE.Material): THREE.Mesh {
  const nozzleGeo = new THREE.TorusGeometry(0.07, 0.03, 10, 16);
  const mesh = new THREE.Mesh(nozzleGeo, nozzleMat);
  mesh.rotation.y = Math.PI / 2;
  mesh.position.set(1.26, 0.28, 0);
  return mesh;
}

export function createJetSkiModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Jet Ski (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x1e4fd8, // Brilliant Marine Cobalt Blue
    roughness: 0.25,
    metalness: 0.35,
  });

  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x0a1a3a, // Deep Navy deck & console
    roughness: 0.4,
    metalness: 0.2,
  });

  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x22272e, // Non-slip charcoal marine vinyl
    roughness: 0.6,
    metalness: 0.1,
  });

  const gripMat = new THREE.MeshStandardMaterial({
    color: 0xdfe4ea,
    roughness: 0.3,
    metalness: 0.7,
  });

  const nozzleMat = new THREE.MeshStandardMaterial({
    color: 0x2f3542,
    roughness: 0.4,
    metalness: 0.8,
  });

  // 1. Hydrodynamic Hull
  const hullGeo = createJetSkiHullGeometry(2.4, 0.95);
  const hullMesh = new THREE.Mesh(hullGeo, hullMat);
  hullMesh.castShadow = castShadow;
  hullMesh.receiveShadow = receiveShadow;
  root.add(hullMesh);

  // 2. Contoured Racing Saddle
  const saddle = createJetSkiSaddle(seatMat);
  saddle.castShadow = castShadow;
  root.add(saddle);

  // 3. Handlebars & Steering Console
  const handlebars = createJetSkiHandlebars(gripMat, deckMat);
  root.add(handlebars);

  // 4. Stern Jet Propulsion Nozzle
  const nozzle = createJetNozzle(nozzleMat);
  root.add(nozzle);

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
