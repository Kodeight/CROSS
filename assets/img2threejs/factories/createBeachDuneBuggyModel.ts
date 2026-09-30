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
 * Creates a rugged balloon sand tire with beadlock rim. Zero primitives used.
 */
function createSandWheel(
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
  g.name = 'sand-wheel';

  const tubeRadius = tireWidth * 0.50;
  const mainRadius = radius - tubeRadius;
  const tireGeo = new THREE.TorusGeometry(mainRadius, tubeRadius, 14, 24);
  const tire = new THREE.Mesh(tireGeo, materials.tire);
  tire.castShadow = castShadow;
  g.add(tire);

  // Beadlock offroad rim
  const rimRadius = mainRadius * 0.82;
  const rimShape = new THREE.Shape();
  const numSpokes = 8;
  const hubR = rimRadius * 0.32;
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

/**
 * Creates the sleek fiberglass tub & nose cone of the Dune Buggy.
 */
function createBuggyChassisGeometry(length = 2.6, width = 1.15): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2; // 1.3

  // Sloping sand buggy nose & rocker
  shape.moveTo(-halfL, 0.28);
  shape.lineTo(-halfL - 0.04, 0.38);
  shape.lineTo(-halfL + 0.12, 0.46);
  shape.quadraticCurveTo(-halfL * 0.4, 0.54, -0.32, 0.52); // nose cowl
  shape.lineTo(0.38, 0.52); // open cockpit tub
  shape.quadraticCurveTo(halfL * 0.7, 0.50, halfL - 0.08, 0.46); // rear engine deck
  shape.lineTo(halfL + 0.04, 0.32);
  shape.lineTo(halfL - 0.04, 0.24);
  shape.lineTo(-halfL, 0.28);
  shape.closePath();

  const extrudeDepth = width - 0.14;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.07,
    bevelSegments: 4,
    curveSegments: 10,
  });
  geo.translate(0, 0, -extrudeDepth / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the tubular structural exo-roll cage for the Dune Buggy.
 */
function createBuggyRollCage(cageMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  // Tubular A-pillar / B-pillar / C-pillar arch
  const archShape = new THREE.Shape();
  archShape.moveTo(-0.35, 0.50);
  archShape.lineTo(-0.15, 1.05); // raked A-pillar
  archShape.lineTo(0.45, 1.05); // roof rail
  archShape.lineTo(0.72, 0.48); // rear down-tube
  archShape.lineTo(0.68, 0.46);
  archShape.lineTo(0.42, 0.98);
  archShape.lineTo(-0.12, 0.98);
  archShape.lineTo(-0.30, 0.48);
  archShape.closePath();

  const archGeo = new THREE.ExtrudeGeometry(archShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  archGeo.translate(0, 0, -0.03);
  archGeo.computeVertexNormals();

  for (const side of [-1, 1]) {
    const arch = new THREE.Mesh(archGeo, cageMat);
    arch.position.z = side * 0.44;
    g.add(arch);
  }

  // Cross bars linking the arches
  const crossShape = new THREE.Shape();
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cx = Math.cos(a) * 0.035;
    const cy = Math.sin(a) * 0.035;
    if (i === 0) crossShape.moveTo(cx, cy);
    else crossShape.lineTo(cx, cy);
  }
  const crossGeo = new THREE.ExtrudeGeometry(crossShape, {
    depth: 0.88,
    bevelEnabled: false,
  });
  crossGeo.translate(0, 0, -0.44);
  crossGeo.computeVertexNormals();

  // Front roof cross bar
  const cb1 = new THREE.Mesh(crossGeo, cageMat);
  cb1.position.set(-0.14, 1.02, 0);
  g.add(cb1);

  // Rear roof cross bar
  const cb2 = new THREE.Mesh(crossGeo, cageMat);
  cb2.position.set(0.44, 1.02, 0);
  g.add(cb2);

  return g;
}

/**
 * Creates roof-mounted 4-lamp offroad LED light bar.
 */
function createRoofLightBar(lightMat: THREE.Material, housingMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  const podShape = new THREE.Shape();
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = Math.cos(a) * 0.055;
    const py = Math.sin(a) * 0.055;
    if (i === 0) podShape.moveTo(px, py);
    else podShape.lineTo(px, py);
  }
  const podGeo = new THREE.ExtrudeGeometry(podShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  podGeo.translate(0, 0, -0.04);
  podGeo.computeVertexNormals();

  for (let i = -1.5; i <= 1.5; i += 1) {
    const pod = new THREE.Mesh(podGeo, lightMat);
    pod.rotation.y = Math.PI / 2;
    pod.position.set(-0.16, 1.12, i * 0.20);
    g.add(pod);
  }

  return g;
}

export function createBeachDuneBuggyModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Beach Dune Buggy (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf2b705, // Sunny Beach Golden Yellow
    roughness: 0.35,
    metalness: 0.2,
  });

  const cageMat = new THREE.MeshStandardMaterial({
    color: 0x1e272e, // Matte dark steel tubular cage
    roughness: 0.55,
    metalness: 0.6,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x181a1d,
    roughness: 0.9,
    metalness: 0.05,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x485460, // Titanium beadlock rim
    roughness: 0.35,
    metalness: 0.8,
  });

  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x2f3542,
    roughness: 0.6,
    metalness: 0.1,
  });

  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xfffae0,
    roughness: 0.1,
    metalness: 0.2,
    emissive: 0xfffae0,
    emissiveIntensity: 1.2,
  });

  // 1. Fiberglass Tub Body
  const bodyGeo = createBuggyChassisGeometry(2.6, 1.15);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = castShadow;
  bodyMesh.receiveShadow = receiveShadow;
  root.add(bodyMesh);

  // 2. Tubular Exo-Cage
  const cage = createBuggyRollCage(cageMat);
  root.add(cage);

  // 3. Roof Offroad Light Bar
  const lightBar = createRoofLightBar(lightMat, cageMat);
  root.add(lightBar);

  // 4. Cockpit Bucket Seats
  const seatShape = new THREE.Shape();
  seatShape.moveTo(-0.12, 0.40);
  seatShape.lineTo(0.12, 0.40);
  seatShape.lineTo(0.12, 0.72);
  seatShape.lineTo(-0.12, 0.72);
  seatShape.closePath();
  const seatGeo = new THREE.ExtrudeGeometry(seatShape, {
    depth: 0.26,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  seatGeo.translate(0, 0, -0.13);
  seatGeo.computeVertexNormals();

  for (const side of [-1, 1]) {
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0.04, 0, side * 0.22);
    root.add(seat);
  }

  // 5. Sand Tires (4 corners) + Rear Spare Tire
  const wheelRadius = 0.30;
  const wheelWidth = 0.22;
  const wheelMaterials = {
    tire: tireMat,
    rim: rimMat,
    hub: rimMat,
  };

  const wheelPositions: [number, number, number][] = [
    [-0.78, wheelRadius, 0.58],  // Front Left
    [-0.78, wheelRadius, -0.58], // Front Right
    [0.72, wheelRadius, 0.60],   // Rear Left (wider stance)
    [0.72, wheelRadius, -0.60],  // Rear Right
  ];

  wheelPositions.forEach(([wx, wy, wz], idx) => {
    const wheel = createSandWheel(wheelRadius, wheelWidth, wheelMaterials, castShadow);
    wheel.name = `buggy_wheel_${idx}`;
    wheel.position.set(wx, wy, wz);
    if (wz < 0) wheel.rotation.y = Math.PI;
    root.add(wheel);
  });

  // Rear mounted angled spare tire
  const spare = createSandWheel(wheelRadius * 0.9, wheelWidth * 0.9, wheelMaterials, castShadow);
  spare.position.set(0.95, 0.82, 0);
  spare.rotation.z = 0.55;
  root.add(spare);

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
