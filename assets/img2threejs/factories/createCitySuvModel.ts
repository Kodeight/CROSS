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
 * Creates an SUV wheel assembly with rugged tire tread, 6-spoke sport alloy rim,
 * center hubcap, and disc brake. Zero BoxGeometry / CylinderGeometry used.
 */
function createSuvWheel(
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
  const wheel = new THREE.Group();
  wheel.name = 'suv-wheel';

  const tubeRadius = tireWidth * 0.48;
  const mainRadius = radius - tubeRadius;
  const tireGeo = new THREE.TorusGeometry(mainRadius, tubeRadius, 14, 24);
  const tireMesh = new THREE.Mesh(tireGeo, materials.tire);
  tireMesh.castShadow = castShadow;
  wheel.add(tireMesh);

  // 6-spoke rugged alloy rim
  const rimRadius = mainRadius * 0.86;
  const spokeShape = new THREE.Shape();
  const numSpokes = 6;
  const hubR = rimRadius * 0.35;
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
    depth: tireWidth * 0.38,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  rimGeo.center();
  const rimMesh = new THREE.Mesh(rimGeo, materials.rim);
  rimMesh.castShadow = castShadow;
  wheel.add(rimMesh);

  // Chrome center hubcap
  const hubShape = new THREE.Shape();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const hx = Math.cos(a) * hubR * 0.65;
    const hy = Math.sin(a) * hubR * 0.65;
    if (i === 0) hubShape.moveTo(hx, hy);
    else hubShape.lineTo(hx, hy);
  }
  const hubGeo = new THREE.ExtrudeGeometry(hubShape, {
    depth: tireWidth * 0.46,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  hubGeo.center();
  wheel.add(new THREE.Mesh(hubGeo, materials.hub));

  // Brake rotor disc
  const discShape = new THREE.Shape();
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const dx = Math.cos(a) * rimRadius * 0.78;
    const dy = Math.sin(a) * rimRadius * 0.78;
    if (i === 0) discShape.moveTo(dx, dy);
    else discShape.lineTo(dx, dy);
  }
  const discGeo = new THREE.ExtrudeGeometry(discShape, { depth: 0.02, bevelEnabled: false });
  discGeo.center();
  const discMesh = new THREE.Mesh(discGeo, materials.brake);
  discMesh.position.z = -tireWidth * 0.16;
  wheel.add(discMesh);

  return wheel;
}

/**
 * Creates the rugged, muscular 3D body of the City SUV.
 */
function createSuvBodyGeometry(length = 2.9, width = 1.25): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2; // 1.45

  // Front skid plate and high bumper
  shape.moveTo(-halfL, 0.22);
  shape.lineTo(-halfL - 0.04, 0.32);
  shape.lineTo(-halfL + 0.02, 0.54); // aggressive upright grille
  shape.lineTo(-halfL + 0.16, 0.58); // muscular hood line
  shape.quadraticCurveTo(-halfL * 0.45, 0.64, -0.48, 0.66); // cowl base
  shape.lineTo(0.50, 0.66); // beltline
  shape.quadraticCurveTo(halfL * 0.75, 0.64, halfL - 0.06, 0.60); // rear shoulder
  shape.quadraticCurveTo(halfL + 0.05, 0.54, halfL + 0.04, 0.34); // rear upright tailgate
  shape.lineTo(halfL - 0.02, 0.22); // rear lower skid plate

  // Rear flared wheel arch
  const rwCenterX = 0.74;
  const rwR = 0.30;
  shape.lineTo(rwCenterX + rwR + 0.08, 0.22);
  shape.quadraticCurveTo(rwCenterX + rwR, 0.24, rwCenterX + rwR * 0.85, 0.44);
  shape.quadraticCurveTo(rwCenterX, 0.52, rwCenterX - rwR * 0.85, 0.44);
  shape.quadraticCurveTo(rwCenterX - rwR, 0.24, rwCenterX - rwR - 0.08, 0.22);

  // Raised rock sill
  shape.lineTo(-0.74 + rwR + 0.08, 0.22);

  // Front flared wheel arch
  const fwCenterX = -0.74;
  const fwR = 0.30;
  shape.quadraticCurveTo(fwCenterX + fwR, 0.24, fwCenterX + fwR * 0.85, 0.44);
  shape.quadraticCurveTo(fwCenterX, 0.52, fwCenterX - fwR * 0.85, 0.44);
  shape.quadraticCurveTo(fwCenterX - fwR, 0.24, fwCenterX - fwR - 0.08, 0.22);

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
 * Creates the high-clearance SUV greenhouse cabin.
 */
function createSuvCabinGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.46, 0.64);
  shape.lineTo(-0.20, 1.08); // steep A-pillar
  shape.quadraticCurveTo(0.15, 1.10, 0.68, 1.08); // long roofline
  shape.lineTo(0.92, 0.64); // tailgate spoiler & rear window slope
  shape.closePath();

  const cabinWidth = 1.04;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: cabinWidth,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geo.translate(0, 0, -cabinWidth / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates tinted glass window panels for the SUV.
 */
function createSuvWindowsGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.42, 0.66);
  shape.lineTo(-0.19, 1.06);
  shape.quadraticCurveTo(0.15, 1.08, 0.66, 1.06);
  shape.lineTo(0.88, 0.66);
  shape.closePath();

  const winWidth = 1.08;
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
 * Creates sculpted roof utility rails on top of the SUV.
 */
function createSuvRoofRails(railMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const railShape = new THREE.Shape();
  railShape.moveTo(-0.25, 0);
  railShape.lineTo(-0.22, 0.05);
  railShape.lineTo(0.65, 0.05);
  railShape.lineTo(0.68, 0);
  railShape.closePath();

  const railGeo = new THREE.ExtrudeGeometry(railShape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  railGeo.translate(0, 0, -0.025);
  railGeo.computeVertexNormals();

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(0.05, 1.10, side * 0.44);
    g.add(rail);
  }
  return g;
}

/**
 * Creates front grille & off-road bumper guard for the SUV.
 */
function createSuvFrontBumper(trimMat: THREE.Material, chromeMat: THREE.Material, frontX = -1.43): THREE.Group {
  const g = new THREE.Group();
  const gShape = new THREE.Shape();
  gShape.moveTo(0, 0.32);
  gShape.lineTo(0.06, 0.52);
  gShape.lineTo(0.04, 0.54);
  gShape.lineTo(-0.03, 0.34);
  gShape.closePath();

  const gGeo = new THREE.ExtrudeGeometry(gShape, {
    depth: 0.72,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  gGeo.translate(0, 0, -0.36);
  gGeo.computeVertexNormals();

  const grille = new THREE.Mesh(gGeo, chromeMat);
  grille.position.x = frontX;
  g.add(grille);

  // Lower bumper bar / skid plate
  const bShape = new THREE.Shape();
  bShape.moveTo(-0.06, 0.18);
  bShape.lineTo(0.08, 0.18);
  bShape.lineTo(0.06, 0.28);
  bShape.lineTo(-0.04, 0.28);
  bShape.closePath();

  const bGeo = new THREE.ExtrudeGeometry(bShape, {
    depth: 1.05,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  bGeo.translate(0, 0, -0.525);
  bGeo.computeVertexNormals();

  const bumper = new THREE.Mesh(bGeo, trimMat);
  bumper.position.x = frontX - 0.02;
  g.add(bumper);

  return g;
}

/**
 * Creates SUV lighting clusters (aggressive LED headlights & wraparound rear lights).
 */
function createSuvLights(hlMat: THREE.Material, tlMat: THREE.Material, frontX = -1.41, rearX = 1.41): THREE.Group {
  const g = new THREE.Group();
  const zSpread = 0.46;

  // Angled LED headlights
  const hlShape = new THREE.Shape();
  hlShape.moveTo(-0.04, 0.42);
  hlShape.lineTo(0.04, 0.52);
  hlShape.lineTo(0.06, 0.50);
  hlShape.lineTo(-0.02, 0.40);
  hlShape.closePath();
  const hlGeo = new THREE.ExtrudeGeometry(hlShape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  hlGeo.translate(0, 0, -0.09);
  hlGeo.computeVertexNormals();

  // Vertical LED rear light blades
  const tlShape = new THREE.Shape();
  tlShape.moveTo(-0.04, 0.40);
  tlShape.lineTo(0.04, 0.62);
  tlShape.lineTo(0.02, 0.64);
  tlShape.lineTo(-0.06, 0.42);
  tlShape.closePath();
  const tlGeo = new THREE.ExtrudeGeometry(tlShape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  tlGeo.translate(0, 0, -0.08);
  tlGeo.computeVertexNormals();

  for (const side of [-1, 1]) {
    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.position.set(frontX, 0, side * zSpread);
    g.add(hl);

    const tl = new THREE.Mesh(tlGeo, tlMat);
    tl.position.set(rearX, 0, side * zSpread);
    g.add(tl);
  }

  return g;
}

export function createCitySUVModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'City SUV (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // ==========================================
  // MATERIALS
  // ==========================================
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xc62828, // Deep Crimson Red
    roughness: 0.32,
    metalness: 0.25,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f171e,
    roughness: 0.1,
    metalness: 0.9,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x16181b,
    roughness: 0.85,
    metalness: 0.05,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x9099a2, // Gunmetal / dark titanium
    roughness: 0.3,
    metalness: 0.8,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe0e6ed,
    roughness: 0.15,
    metalness: 0.9,
  });

  const brakeMat = new THREE.MeshStandardMaterial({
    color: 0x434c5e,
    roughness: 0.45,
    metalness: 0.75,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1c1e22, // Matte dark protective cladding
    roughness: 0.65,
    metalness: 0.15,
  });

  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 0.1,
    emissive: 0xffffff,
    emissiveIntensity: 1.2,
  });

  const tlMat = new THREE.MeshStandardMaterial({
    color: 0xff1e1e,
    roughness: 0.15,
    metalness: 0.1,
    emissive: 0xcc0000,
    emissiveIntensity: 1.0,
  });

  // 1. Muscular Body
  const bodyGeo = createSuvBodyGeometry(2.9, 1.25);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = castShadow;
  bodyMesh.receiveShadow = receiveShadow;
  root.add(bodyMesh);

  // 2. Greenhouse Cabin & Windows
  const cabinGeo = createSuvCabinGeometry();
  const cabinMesh = new THREE.Mesh(cabinGeo, bodyMat);
  cabinMesh.castShadow = castShadow;
  cabinMesh.receiveShadow = receiveShadow;
  root.add(cabinMesh);

  const winGeo = createSuvWindowsGeometry();
  const winMesh = new THREE.Mesh(winGeo, glassMat);
  winMesh.castShadow = castShadow;
  root.add(winMesh);

  // 3. Roof Rails
  const roofRails = createSuvRoofRails(chromeMat);
  root.add(roofRails);

  // 4. Front Bumper & Grille
  const frontDetails = createSuvFrontBumper(trimMat, chromeMat, -1.43);
  root.add(frontDetails);

  // 5. Lights
  const lights = createSuvLights(hlMat, tlMat, -1.41, 1.41);
  root.add(lights);

  // 6. Rugged Off-Road Wheels (4 corners)
  const wheelRadius = 0.28;
  const wheelWidth = 0.18;
  const wheelMaterials = {
    tire: tireMat,
    rim: rimMat,
    hub: chromeMat,
    brake: brakeMat,
  };

  const wheelPositions: [number, number, number][] = [
    [-0.74, wheelRadius, 0.58],  // Front Left
    [-0.74, wheelRadius, -0.58], // Front Right
    [0.74, wheelRadius, 0.58],   // Rear Left
    [0.74, wheelRadius, -0.58],  // Rear Right
  ];

  wheelPositions.forEach(([wx, wy, wz], idx) => {
    const wheel = createSuvWheel(wheelRadius, wheelWidth, wheelMaterials, castShadow);
    wheel.name = `suv_wheel_${idx}`;
    wheel.position.set(wx, wy, wz);
    if (wz < 0) wheel.rotation.y = Math.PI;
    root.add(wheel);
  });

  const nodes: Record<string, THREE.Object3D> = { root, body: bodyMesh, cabin: cabinMesh };
  const meshes: Record<string, THREE.Mesh> = { body: bodyMesh, cabin: cabinMesh, windows: winMesh };
  const sockets: Record<string, THREE.Object3D> = {};
  const colliders: Record<string, unknown> = {};
  const destructionGroups: Record<string, THREE.Object3D[]> = { root: [bodyMesh, cabinMesh] };

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
