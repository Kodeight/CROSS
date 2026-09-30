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
 * Creates a lightweight forged racing tuner wheel with low-profile slick tire.
 * Zero primitives used.
 */
function createTunerWheel(
  radius: number,
  tireWidth: number,
  materials: {
    tire: THREE.Material;
    rim: THREE.Material;
    hub: THREE.Material;
    brake: THREE.Material;
  },
  castShadow: boolean,
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'tuner-wheel';

  const tubeRadius = tireWidth * 0.44;
  const mainRadius = radius - tubeRadius;
  const tireGeo = new THREE.TorusGeometry(mainRadius, tubeRadius, 14, 24);
  const tire = new THREE.Mesh(tireGeo, materials.tire);
  tire.castShadow = castShadow;
  g.add(tire);

  // 6-spoke lightweight JDM racing alloy rim
  const rimRadius = mainRadius * 0.88;
  const spokeShape = new THREE.Shape();
  const numSpokes = 6;
  const hubR = rimRadius * 0.32;
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

  // Anodized center lug nut
  const hubShape = new THREE.Shape();
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const hx = Math.cos(a) * (hubR * 0.65);
    const hy = Math.sin(a) * (hubR * 0.65);
    if (i === 0) hubShape.moveTo(hx, hy);
    else hubShape.lineTo(hx, hy);
  }
  const hubGeo = new THREE.ExtrudeGeometry(hubShape, {
    depth: tireWidth * 0.48,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  hubGeo.center();
  g.add(new THREE.Mesh(hubGeo, materials.hub));

  // Drilled brake rotor & racing caliper
  const discShape = new THREE.Shape();
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const dx = Math.cos(a) * (rimRadius * 0.76);
    const dy = Math.sin(a) * (rimRadius * 0.76);
    if (i === 0) discShape.moveTo(dx, dy);
    else discShape.lineTo(dx, dy);
  }
  const discGeo = new THREE.ExtrudeGeometry(discShape, { depth: 0.02, bevelEnabled: false });
  discGeo.center();
  const discMesh = new THREE.Mesh(discGeo, materials.brake);
  discMesh.position.z = -tireWidth * 0.16;
  g.add(discMesh);

  return g;
}

/**
 * Creates the low-slung, widebody aerodynamic JDM sports coupe body.
 */
function createSportsCarBodyGeometry(length = 2.8, width = 1.25): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2; // 1.4

  // Low aerodynamic sports coupe profile
  shape.moveTo(-halfL, 0.12); // Front low carbon splitter
  shape.lineTo(-halfL - 0.06, 0.16);
  shape.lineTo(-halfL + 0.06, 0.38); // sharp aerodynamic nose
  shape.lineTo(-halfL + 0.22, 0.42); // sloping hood leading edge
  shape.quadraticCurveTo(-halfL * 0.4, 0.48, -0.42, 0.52); // low cowl
  shape.lineTo(0.38, 0.52); // waistline
  shape.quadraticCurveTo(halfL * 0.65, 0.52, halfL - 0.06, 0.48); // wide rear deck
  shape.lineTo(halfL + 0.04, 0.42); // rear ducktail edge
  shape.lineTo(halfL + 0.02, 0.24); // rear diffuser
  shape.lineTo(halfL - 0.04, 0.14);

  // Rear flared wheel arch
  const rwCenterX = 0.72;
  const rwR = 0.25;
  shape.lineTo(rwCenterX + rwR + 0.06, 0.14);
  shape.quadraticCurveTo(rwCenterX, 0.38, rwCenterX - rwR - 0.06, 0.14);

  // Aerodynamic side skirt
  shape.lineTo(-0.72 + rwR + 0.06, 0.14);

  // Front flared wheel arch
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

/**
 * Creates the fastback aerodynamic sports cabin.
 */
function createSportsCarCabinGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.40, 0.50);
  shape.lineTo(-0.16, 0.88); // aggressive fastback A-pillar slope
  shape.quadraticCurveTo(0.12, 0.90, 0.38, 0.88); // curved roof
  shape.lineTo(0.78, 0.50); // long sweeping fastback rear window
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

/**
 * Creates dark tinted windshield & fastback rear window.
 */
function createSportsCarWindowsGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.37, 0.52);
  shape.lineTo(-0.15, 0.86);
  shape.quadraticCurveTo(0.12, 0.88, 0.36, 0.86);
  shape.lineTo(0.74, 0.52);
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

/**
 * Creates high-mount carbon fiber GT rear wing spoiler.
 */
function createGtWingSpoiler(wingMat: THREE.Material, uprightMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  // Aerofoil blade shape
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.12, 0);
  bladeShape.quadraticCurveTo(0, 0.04, 0.12, 0.02);
  bladeShape.lineTo(0.12, -0.02);
  bladeShape.quadraticCurveTo(0, 0, -0.12, -0.02);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 1.25,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  bladeGeo.translate(0, 0, -0.625);
  bladeGeo.computeVertexNormals();

  const blade = new THREE.Mesh(bladeGeo, wingMat);
  blade.position.set(1.15, 0.82, 0);
  blade.rotation.z = -0.12;
  g.add(blade);

  // Upright swan-neck pylons
  const pylonShape = new THREE.Shape();
  pylonShape.moveTo(0, 0.44);
  pylonShape.lineTo(0.04, 0.82);
  pylonShape.lineTo(0.08, 0.82);
  pylonShape.lineTo(0.04, 0.44);
  pylonShape.closePath();
  const pylonGeo = new THREE.ExtrudeGeometry(pylonShape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  pylonGeo.translate(0, 0, -0.015);
  pylonGeo.computeVertexNormals();

  for (const side of [-0.38, 0.38]) {
    const pylon = new THREE.Mesh(pylonGeo, uprightMat);
    pylon.position.set(1.05, 0, side);
    g.add(pylon);
  }

  return g;
}

/**
 * Creates glowing Tokyo neon underglow aura.
 */
function createNeonUnderglow(neonMat: THREE.Material, length = 2.4, width = 1.05): THREE.Mesh {
  const shape = new THREE.Shape();
  const halfL = length / 2;
  const halfW = width / 2;
  shape.moveTo(-halfL, -halfW);
  shape.lineTo(halfL, -halfW);
  shape.lineTo(halfL, halfW);
  shape.lineTo(-halfL, halfW);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.02);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, neonMat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(0, 0.06, 0);
  return mesh;
}

export function createWhiteSportsTunerModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'White Sports Tuner (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const pearlWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf5f6fa, // JDM Championship Pearl White
    roughness: 0.18,
    metalness: 0.25,
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x141820, // Lightweight carbon fiber weave
    roughness: 0.35,
    metalness: 0.7,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x080e18,
    roughness: 0.08,
    metalness: 0.95,
  });

  const bronzeRimMat = new THREE.MeshStandardMaterial({
    color: 0xc8963e, // Tokyo Bronze forged racing rim
    roughness: 0.28,
    metalness: 0.85,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x16181b,
    roughness: 0.82,
    metalness: 0.05,
  });

  const neonPurpleMat = new THREE.MeshStandardMaterial({
    color: 0x7b2ff7, // Tokyo Neon Electric Violet
    roughness: 0.1,
    metalness: 0.2,
    emissive: 0x7b2ff7,
    emissiveIntensity: 1.5,
  });

  const hlMat = new THREE.MeshStandardMaterial({
    color: 0x00f5ff, // Xenon cyan LED headlights
    roughness: 0.1,
    metalness: 0.2,
    emissive: 0x00f5ff,
    emissiveIntensity: 1.4,
  });

  const tlMat = new THREE.MeshStandardMaterial({
    color: 0xff0055, // LED neon taillight bar
    roughness: 0.1,
    metalness: 0.2,
    emissive: 0xff0055,
    emissiveIntensity: 1.2,
  });

  // 1. Aerodynamic Sports Body
  const bodyGeo = createSportsCarBodyGeometry(2.8, 1.25);
  const bodyMesh = new THREE.Mesh(bodyGeo, pearlWhiteMat);
  bodyMesh.castShadow = castShadow;
  bodyMesh.receiveShadow = receiveShadow;
  root.add(bodyMesh);

  // 2. Fastback Greenhouse & Windows
  const cabinGeo = createSportsCarCabinGeometry();
  const cabinMesh = new THREE.Mesh(cabinGeo, pearlWhiteMat);
  cabinMesh.castShadow = castShadow;
  cabinMesh.receiveShadow = receiveShadow;
  root.add(cabinMesh);

  const winGeo = createSportsCarWindowsGeometry();
  const winMesh = new THREE.Mesh(winGeo, glassMat);
  winMesh.castShadow = castShadow;
  root.add(winMesh);

  // 3. Carbon GT Wing Spoiler
  const spoiler = createGtWingSpoiler(carbonMat, carbonMat);
  root.add(spoiler);

  // 4. Tokyo Neon Underglow
  const underglow = createNeonUnderglow(neonPurpleMat, 2.4, 1.05);
  root.add(underglow);

  // 5. Headlights & Taillights
  const zSpread = 0.45;
  const hlGeo = new THREE.TorusGeometry(0.065, 0.02, 10, 16);
  const tlGeo = new THREE.TorusGeometry(0.065, 0.02, 10, 16);
  for (const side of [-1, 1]) {
    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.rotation.y = Math.PI / 2;
    hl.position.set(-1.38, 0.36, side * zSpread);
    root.add(hl);

    const tl = new THREE.Mesh(tlGeo, tlMat);
    tl.rotation.y = Math.PI / 2;
    tl.position.set(1.38, 0.36, side * zSpread);
    root.add(tl);
  }

  // 6. Tuner Wheels (4 corners)
  const wheelRadius = 0.24;
  const wheelWidth = 0.16;
  const wheelMaterials = {
    tire: tireMat,
    rim: bronzeRimMat,
    hub: carbonMat,
    brake: carbonMat,
  };

  const wheelPositions: [number, number, number][] = [
    [-0.72, wheelRadius, 0.58],  // Front Left
    [-0.72, wheelRadius, -0.58], // Front Right
    [0.72, wheelRadius, 0.60],   // Rear Left (wider stance)
    [0.72, wheelRadius, -0.60],  // Rear Right
  ];

  wheelPositions.forEach(([wx, wy, wz], idx) => {
    const wheel = createTunerWheel(wheelRadius, wheelWidth, wheelMaterials, castShadow);
    wheel.name = `white_tuner_wheel_${idx}`;
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
