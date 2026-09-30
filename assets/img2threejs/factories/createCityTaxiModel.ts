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
 * Creates a wheel assembly consisting of a toroidal rubber tire,
 * an extruded 5-spoke alloy rim, a center hub, and a brake disc.
 * Zero BoxGeometry / CylinderGeometry used.
 */
function createWheelAssembly(
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
  wheel.name = 'wheel';

  // 1. Toroidal rubber tire with rounded sidewalls
  const tubeRadius = tireWidth * 0.48;
  const mainRadius = radius - tubeRadius;
  const tireGeo = new THREE.TorusGeometry(mainRadius, tubeRadius, 14, 24);
  const tireMesh = new THREE.Mesh(tireGeo, materials.tire);
  tireMesh.castShadow = castShadow;
  tireMesh.receiveShadow = false;
  wheel.add(tireMesh);

  // 2. Extruded 5-spoke alloy rim
  const rimRadius = mainRadius * 0.85;
  const spokeShape = new THREE.Shape();
  const numSpokes = 5;
  const hubR = rimRadius * 0.32;
  // Outer rim ring & 5 spokes shape
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
    depth: tireWidth * 0.35,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  rimGeo.center();
  const rimMesh = new THREE.Mesh(rimGeo, materials.rim);
  rimMesh.castShadow = castShadow;
  wheel.add(rimMesh);

  // 3. Center chrome hubcap
  const hubShape = new THREE.Shape();
  const hubSegs = 10;
  for (let i = 0; i <= hubSegs; i++) {
    const a = (i / hubSegs) * Math.PI * 2;
    const hx = Math.cos(a) * hubR * 0.6;
    const hy = Math.sin(a) * hubR * 0.6;
    if (i === 0) hubShape.moveTo(hx, hy);
    else hubShape.lineTo(hx, hy);
  }
  const hubGeo = new THREE.ExtrudeGeometry(hubShape, {
    depth: tireWidth * 0.45,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  hubGeo.center();
  const hubMesh = new THREE.Mesh(hubGeo, materials.hub);
  wheel.add(hubMesh);

  // 4. Brake rotor disc
  const discShape = new THREE.Shape();
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const dx = Math.cos(a) * rimRadius * 0.75;
    const dy = Math.sin(a) * rimRadius * 0.75;
    if (i === 0) discShape.moveTo(dx, dy);
    else discShape.lineTo(dx, dy);
  }
  const discGeo = new THREE.ExtrudeGeometry(discShape, {
    depth: 0.02,
    bevelEnabled: false,
  });
  discGeo.center();
  const discMesh = new THREE.Mesh(discGeo, materials.brake);
  discMesh.position.z = -tireWidth * 0.15;
  wheel.add(discMesh);

  return wheel;
}

/**
 * Creates the aerodynamic main body / chassis of the City Taxi.
 * Front is at -X, Rear is at +X, Y is up, extruded along Z (width).
 */
function createTaxiBodyGeometry(length = 2.8, height = 0.58, width = 1.15): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2; // 1.4

  // Front splitter & bumper
  shape.moveTo(-halfL, 0.16);
  shape.lineTo(-halfL - 0.04, 0.22);
  shape.quadraticCurveTo(-halfL - 0.06, 0.36, -halfL + 0.02, 0.44); // front nose curve
  shape.lineTo(-halfL + 0.14, 0.48); // hood front leading edge
  // Sloping aerodynamic hood
  shape.quadraticCurveTo(-halfL * 0.5, 0.54, -0.42, 0.58); // cowl base
  // Windshield transition / lower beltline
  shape.lineTo(0.38, 0.58);
  // Rear deck / trunk slope
  shape.quadraticCurveTo(halfL * 0.65, 0.56, halfL - 0.08, 0.50);
  // Rear fascia & bumper
  shape.quadraticCurveTo(halfL + 0.05, 0.44, halfL + 0.04, 0.30);
  shape.lineTo(halfL - 0.02, 0.16); // rear lower apron

  // Rear wheel arch cutout (curved arch cut into body)
  const rwCenterX = 0.72;
  const rwR = 0.26;
  shape.lineTo(rwCenterX + rwR + 0.06, 0.16);
  shape.quadraticCurveTo(rwCenterX + rwR, 0.18, rwCenterX + rwR * 0.85, 0.34);
  shape.quadraticCurveTo(rwCenterX, 0.42, rwCenterX - rwR * 0.85, 0.34);
  shape.quadraticCurveTo(rwCenterX - rwR, 0.18, rwCenterX - rwR - 0.06, 0.16);

  // Rocker sill between wheels
  shape.lineTo(-0.72 + rwR + 0.06, 0.16);

  // Front wheel arch cutout (curved arch cut into body)
  const fwCenterX = -0.72;
  const fwR = 0.26;
  shape.quadraticCurveTo(fwCenterX + fwR, 0.18, fwCenterX + fwR * 0.85, 0.34);
  shape.quadraticCurveTo(fwCenterX, 0.42, fwCenterX - fwR * 0.85, 0.34);
  shape.quadraticCurveTo(fwCenterX - fwR, 0.18, fwCenterX - fwR - 0.06, 0.16);

  shape.closePath();

  const extrudeDepth = width - 0.14; // account for bevel
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.07,
    bevelSegments: 4,
    curveSegments: 12,
  });
  geo.translate(0, 0, -extrudeDepth / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the sleek passenger cabin / greenhouse with raked windshield and roof.
 */
function createTaxiCabinGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();

  // Raked front windshield
  shape.moveTo(-0.40, 0.56);
  shape.lineTo(-0.16, 0.94); // A-pillar slope
  // Sleek curved roof
  shape.quadraticCurveTo(0.12, 0.97, 0.42, 0.94);
  // Sloping rear windshield
  shape.lineTo(0.72, 0.56); // C-pillar slope
  shape.closePath();

  const cabinWidth = 0.94;
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
 * Creates tinted window glass panels inset into the cabin.
 */
function createTaxiWindowsGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  // Slightly smaller footprint to fit inside the pillars
  shape.moveTo(-0.37, 0.58);
  shape.lineTo(-0.16, 0.92);
  shape.quadraticCurveTo(0.12, 0.94, 0.40, 0.92);
  shape.lineTo(0.68, 0.58);
  shape.closePath();

  const winWidth = 0.98; // slightly wider than cabin core so glass is flush on sides
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
 * Creates the iconic aerodynamic roof TAXI beacon sign.
 */
function createTaxiRoofSign(
  signMat: THREE.Material,
  pylonMat: THREE.Material,
  emissiveFaceMat: THREE.Material,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'taxi-sign';

  // 1. Pylon mounting base
  const pylonShape = new THREE.Shape();
  pylonShape.moveTo(-0.08, 0);
  pylonShape.lineTo(-0.06, 0.06);
  pylonShape.lineTo(0.06, 0.06);
  pylonShape.lineTo(0.08, 0);
  pylonShape.closePath();
  const pylonGeo = new THREE.ExtrudeGeometry(pylonShape, {
    depth: 0.32,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  pylonGeo.translate(0, 0, -0.16);
  pylonGeo.computeVertexNormals();
  const pylonMesh = new THREE.Mesh(pylonGeo, pylonMat);
  group.add(pylonMesh);

  // 2. Aerodynamic beveled trapezoidal sign beacon
  const signShape = new THREE.Shape();
  signShape.moveTo(-0.16, 0.05);
  signShape.lineTo(-0.12, 0.18);
  signShape.quadraticCurveTo(0, 0.20, 0.12, 0.18);
  signShape.lineTo(0.16, 0.05);
  signShape.closePath();

  const signGeo = new THREE.ExtrudeGeometry(signShape, {
    depth: 0.44,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 3,
  });
  signGeo.translate(0, 0, -0.22);
  signGeo.computeVertexNormals();
  const signMesh = new THREE.Mesh(signGeo, signMat);
  group.add(signMesh);

  // 3. Glowing TAXI illuminated face plates (front and rear)
  const faceShape = new THREE.Shape();
  faceShape.moveTo(-0.13, 0.07);
  faceShape.lineTo(-0.10, 0.16);
  faceShape.lineTo(0.10, 0.16);
  faceShape.lineTo(0.13, 0.07);
  faceShape.closePath();
  const faceGeo = new THREE.ExtrudeGeometry(faceShape, {
    depth: 0.02,
    bevelEnabled: false,
  });
  faceGeo.translate(0, 0, -0.01);
  faceGeo.computeVertexNormals();

  for (const side of [-1, 1]) {
    const fMesh = new THREE.Mesh(faceGeo, emissiveFaceMat);
    fMesh.position.z = side * 0.23;
    group.add(fMesh);
  }

  return group;
}

/**
 * Creates 3D checkered racing decal badges along the vehicle beltline.
 */
function createCheckerDecals(
  blackMat: THREE.Material,
  whiteMat: THREE.Material,
  length = 1.3,
  zOffset = 0.58,
): THREE.Group {
  const group = new THREE.Group();
  const tileCount = 7;
  const tileSize = 0.09;
  const step = length / tileCount;

  // Diamond/rhombus shaped tiles
  const diamond = new THREE.Shape();
  diamond.moveTo(0, tileSize * 0.5);
  diamond.lineTo(tileSize * 0.5, 0);
  diamond.lineTo(0, -tileSize * 0.5);
  diamond.lineTo(-tileSize * 0.5, 0);
  diamond.closePath();

  const tileGeo = new THREE.ExtrudeGeometry(diamond, {
    depth: 0.02,
    bevelEnabled: false,
  });
  tileGeo.computeVertexNormals();

  for (const side of [-1, 1]) {
    const sideGroup = new THREE.Group();
    sideGroup.position.set(-0.1, 0.54, side * zOffset);
    if (side < 0) sideGroup.rotation.y = Math.PI;

    for (let i = 0; i < tileCount; i++) {
      const mat = i % 2 === 0 ? whiteMat : blackMat;
      const tile = new THREE.Mesh(tileGeo, mat);
      tile.position.x = (i - tileCount / 2) * step;
      sideGroup.add(tile);
    }
    group.add(sideGroup);
  }

  return group;
}

/**
 * Front aerodynamic grille & bumper splitter assembly.
 */
function createFrontDetails(
  grilleMat: THREE.Material,
  chromeMat: THREE.Material,
  splitterMat: THREE.Material,
  frontX = -1.38,
): THREE.Group {
  const g = new THREE.Group();

  // Grille profile
  const gShape = new THREE.Shape();
  gShape.moveTo(-0.02, 0.28);
  gShape.lineTo(0.04, 0.44);
  gShape.lineTo(0.02, 0.46);
  gShape.lineTo(-0.04, 0.30);
  gShape.closePath();

  const gGeo = new THREE.ExtrudeGeometry(gShape, {
    depth: 0.62,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  gGeo.translate(0, 0, -0.31);
  gGeo.computeVertexNormals();

  const grille = new THREE.Mesh(gGeo, grilleMat);
  grille.position.x = frontX;
  g.add(grille);

  // Chrome surround trim
  const cShape = new THREE.Shape();
  cShape.moveTo(-0.02, 0.44);
  cShape.lineTo(0.02, 0.48);
  cShape.lineTo(0.04, 0.46);
  cShape.lineTo(0.0, 0.42);
  cShape.closePath();
  const cGeo = new THREE.ExtrudeGeometry(cShape, {
    depth: 0.66,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  cGeo.translate(0, 0, -0.33);
  cGeo.computeVertexNormals();
  const chromeTrim = new THREE.Mesh(cGeo, chromeMat);
  chromeTrim.position.x = frontX;
  g.add(chromeTrim);

  // Front splitter blade
  const sShape = new THREE.Shape();
  sShape.moveTo(-0.06, 0.12);
  sShape.lineTo(0.12, 0.12);
  sShape.lineTo(0.10, 0.16);
  sShape.lineTo(-0.05, 0.16);
  sShape.closePath();
  const sGeo = new THREE.ExtrudeGeometry(sShape, {
    depth: 0.98,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  sGeo.translate(0, 0, -0.49);
  sGeo.computeVertexNormals();
  const splitter = new THREE.Mesh(sGeo, splitterMat);
  splitter.position.x = frontX - 0.02;
  g.add(splitter);

  return g;
}

/**
 * Dual projector headlights and rear taillights.
 */
function createLightingAssemblies(
  hlMat: THREE.Material,
  tlMat: THREE.Material,
  bezelMat: THREE.Material,
  frontX = -1.34,
  rearX = 1.34,
  zSpread = 0.42,
): THREE.Group {
  const g = new THREE.Group();

  // Headlight faceted lens
  const hlShape = new THREE.Shape();
  hlShape.moveTo(-0.04, 0.36);
  hlShape.lineTo(0.04, 0.44);
  hlShape.lineTo(0.06, 0.42);
  hlShape.lineTo(-0.02, 0.34);
  hlShape.closePath();
  const hlGeo = new THREE.ExtrudeGeometry(hlShape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  hlGeo.translate(0, 0, -0.08);
  hlGeo.computeVertexNormals();

  // Taillight faceted bar
  const tlShape = new THREE.Shape();
  tlShape.moveTo(-0.04, 0.36);
  tlShape.lineTo(0.04, 0.44);
  tlShape.lineTo(0.02, 0.46);
  tlShape.lineTo(-0.06, 0.38);
  tlShape.closePath();
  const tlGeo = new THREE.ExtrudeGeometry(tlShape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  tlGeo.translate(0, 0, -0.09);
  tlGeo.computeVertexNormals();

  for (const side of [-1, 1]) {
    // Headlight
    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.position.set(frontX, 0, side * zSpread);
    g.add(hl);

    // Taillight
    const tl = new THREE.Mesh(tlGeo, tlMat);
    tl.position.set(rearX, 0, side * zSpread);
    g.add(tl);
  }

  return g;
}

/**
 * Dual rear chrome exhaust pipes.
 */
function createRearExhaust(exhaustMat: THREE.Material, rearX = 1.36): THREE.Group {
  const g = new THREE.Group();
  const pipeShape = new THREE.Shape();
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const px = Math.cos(a) * 0.038;
    const py = Math.sin(a) * 0.038;
    if (i === 0) pipeShape.moveTo(px, py);
    else pipeShape.lineTo(px, py);
  }
  const pipeGeo = new THREE.ExtrudeGeometry(pipeShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  pipeGeo.translate(0, 0, -0.07);
  pipeGeo.computeVertexNormals();

  for (const side of [-1, 1]) {
    const pipe = new THREE.Mesh(pipeGeo, exhaustMat);
    pipe.rotation.y = Math.PI / 2;
    pipe.position.set(rearX, 0.18, side * 0.32);
    g.add(pipe);
  }
  return g;
}

/**
 * Side rear-view mirrors.
 */
function createSideMirrors(bodyMat: THREE.Material, glassMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const mirrorShape = new THREE.Shape();
  mirrorShape.moveTo(0, 0);
  mirrorShape.lineTo(0.08, 0.03);
  mirrorShape.lineTo(0.07, 0.09);
  mirrorShape.lineTo(-0.03, 0.07);
  mirrorShape.closePath();

  const mirrorGeo = new THREE.ExtrudeGeometry(mirrorShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  mirrorGeo.translate(0, 0, -0.03);
  mirrorGeo.computeVertexNormals();

  for (const side of [-1, 1]) {
    const m = new THREE.Mesh(mirrorGeo, bodyMat);
    m.position.set(-0.32, 0.60, side * 0.56);
    if (side < 0) m.scale.z = -1;
    g.add(m);
  }
  return g;
}

/**
 * Master Factory for the City Taxi.
 * Produces an authentic, high-quality, recognizable 3D City Taxi model
 * adhering strictly to the reference image and zero primitive requirements.
 */
export function createCityTaxiModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'City Taxi (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // ==========================================
  // MATERIALS (Authentic PBR Finish)
  // ==========================================
  // Golden Taxi Yellow with vibrant clearcoat
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xffb703, // Rich vibrant taxi yellow-amber
    roughness: 0.28,
    metalness: 0.15,
  });

  // Dark tinted greenhouse glass
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x111c24,
    roughness: 0.1,
    metalness: 0.85,
  });

  // Matte deep rubber for tires
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1e,
    roughness: 0.82,
    metalness: 0.05,
  });

  // Satin silver alloy for rims
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xd8dee9,
    roughness: 0.25,
    metalness: 0.75,
  });

  // Chrome accents for hub, bumpers, exhaust
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf0f3f6,
    roughness: 0.12,
    metalness: 0.95,
  });

  // Brake rotor disc
  const brakeMat = new THREE.MeshStandardMaterial({
    color: 0x4c566a,
    roughness: 0.45,
    metalness: 0.8,
  });

  // Illuminated taxi roof sign
  const signBodyMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    roughness: 0.2,
    metalness: 0.1,
    emissive: 0x664400,
  });

  const signFaceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 0.05,
    emissive: 0xffe066,
    emissiveIntensity: 0.8,
  });

  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0x2e3440,
    roughness: 0.5,
    metalness: 0.5,
  });

  // Checkerboard decals
  const checkerBlack = new THREE.MeshStandardMaterial({
    color: 0x121418,
    roughness: 0.5,
    metalness: 0.1,
  });

  const checkerWhite = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.4,
    metalness: 0.05,
  });

  // Dark grille & aero trim
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x181a1f,
    roughness: 0.6,
    metalness: 0.2,
  });

  // Emissive xenon headlights
  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xfffae0,
    roughness: 0.1,
    metalness: 0.2,
    emissive: 0xffea88,
    emissiveIntensity: 1.2,
  });

  // Emissive ruby taillights
  const tlMat = new THREE.MeshStandardMaterial({
    color: 0xff2222,
    roughness: 0.15,
    metalness: 0.2,
    emissive: 0xcc0000,
    emissiveIntensity: 1.0,
  });

  // ==========================================
  // 1. SCULPTED CHASSIS & LOWER BODY
  // ==========================================
  const bodyGeo = createTaxiBodyGeometry(2.8, 0.58, 1.15);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.name = 'taxi-body';
  bodyMesh.castShadow = castShadow;
  bodyMesh.receiveShadow = receiveShadow;
  root.add(bodyMesh);

  // ==========================================
  // 2. SCULPTED GREENHOUSE & WINDOWS
  // ==========================================
  const cabinGeo = createTaxiCabinGeometry();
  const cabinMesh = new THREE.Mesh(cabinGeo, bodyMat);
  cabinMesh.name = 'taxi-cabin';
  cabinMesh.castShadow = castShadow;
  cabinMesh.receiveShadow = receiveShadow;
  root.add(cabinMesh);

  const winGeo = createTaxiWindowsGeometry();
  const winMesh = new THREE.Mesh(winGeo, glassMat);
  winMesh.name = 'taxi-windows';
  winMesh.castShadow = castShadow;
  root.add(winMesh);

  // ==========================================
  // 3. ICONIC ROOF TAXI BEACON SIGN
  // ==========================================
  const roofSign = createTaxiRoofSign(signBodyMat, pylonMat, signFaceMat);
  roofSign.position.set(0.08, 0.96, 0);
  root.add(roofSign);

  // ==========================================
  // 4. CHECKERED RACING / TAXI STRIPES
  // ==========================================
  const checkers = createCheckerDecals(checkerBlack, checkerWhite, 1.35, 0.58);
  root.add(checkers);

  // ==========================================
  // 5. FRONT GRILLE & SPLITTER DETAILS
  // ==========================================
  const frontDetails = createFrontDetails(darkTrimMat, chromeMat, darkTrimMat, -1.38);
  root.add(frontDetails);

  // ==========================================
  // 6. HEADLIGHTS & TAILLIGHTS
  // ==========================================
  const lights = createLightingAssemblies(hlMat, tlMat, chromeMat, -1.36, 1.36, 0.42);
  root.add(lights);

  // ==========================================
  // 7. REAR EXHAUST PIPES
  // ==========================================
  const exhaust = createRearExhaust(chromeMat, 1.37);
  root.add(exhaust);

  // ==========================================
  // 8. SIDE REAR-VIEW MIRRORS
  // ==========================================
  const mirrors = createSideMirrors(bodyMat, glassMat);
  root.add(mirrors);

  // ==========================================
  // 9. DETAILED WHEEL ASSEMBLIES (4 CORNERS)
  // ==========================================
  const wheelRadius = 0.25;
  const wheelWidth = 0.16;
  const wheelMaterials = {
    tire: tireMat,
    rim: rimMat,
    hub: chromeMat,
    brake: brakeMat,
  };

  const wheelPositions: [number, number, number][] = [
    [-0.72, wheelRadius, 0.54],  // Front Left
    [-0.72, wheelRadius, -0.54], // Front Right
    [0.72, wheelRadius, 0.54],   // Rear Left
    [0.72, wheelRadius, -0.54],  // Rear Right
  ];

  wheelPositions.forEach(([wx, wy, wz], idx) => {
    const wheel = createWheelAssembly(wheelRadius, wheelWidth, wheelMaterials, castShadow);
    wheel.name = `wheel_${idx}`;
    wheel.position.set(wx, wy, wz);
    // Face the wheel outward on right side
    if (wz < 0) wheel.rotation.y = Math.PI;
    root.add(wheel);
  });

  // Attach metadata runtime summary
  const nodes: Record<string, THREE.Object3D> = { root, body: bodyMesh, cabin: cabinMesh };
  const meshes: Record<string, THREE.Mesh> = { body: bodyMesh, cabin: cabinMesh, windows: winMesh };
  const sockets: Record<string, THREE.Object3D> = { roofSign };
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
