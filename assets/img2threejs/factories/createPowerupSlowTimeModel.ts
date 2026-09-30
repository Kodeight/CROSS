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
 * Creates outer pocket watch gear / milled casing profile.
 */
function createClockCasingShape(outerR = 0.85, teeth = 12): THREE.Shape {
  const shape = new THREE.Shape();
  const numSteps = teeth * 2;
  const toothDepth = 0.08;

  for (let i = 0; i <= numSteps; i++) {
    const a = (i / numSteps) * Math.PI * 2;
    const r = i % 2 === 0 ? outerR : outerR - toothDepth;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/**
 * Creates circular watch dial face.
 */
function createWatchDialShape(radius = 0.65): THREE.Shape {
  const shape = new THREE.Shape();
  const segs = 32;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

class WatchBowCurve extends THREE.Curve<THREE.Vector3> {
  constructor(public radius = 0.28) {
    super();
  }
  override getPoint(t: number, optionalTarget = new THREE.Vector3()): THREE.Vector3 {
    const a = Math.PI * (1 - t);
    return optionalTarget.set(Math.cos(a) * this.radius, Math.sin(a) * this.radius, 0);
  }
}

/**
 * Creates top pocket watch winding bow / suspension loop.
 */
function createWatchBowGeometry(radius = 0.28, tubeR = 0.04): THREE.BufferGeometry {
  const curve = new WatchBowCurve(radius);
  return new THREE.TubeGeometry(curve, 24, tubeR, 10, false);
}

/**
 * Creates tapered clock hand shape.
 */
function createClockHandShape(length = 0.45, width = 0.07): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(-width * 0.3, length * 0.8);
  shape.lineTo(0, length); // Pointed arrow tip
  shape.lineTo(width * 0.3, length * 0.8);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, -width * 0.5);
  shape.closePath();
  return shape;
}

export function createSlowTimePowerupModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Slow Time Powerup (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const antiqueBrassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Rich antique chronometer brass / bronze
    metalness: 0.92,
    roughness: 0.22,
    emissive: 0x78350f,
    emissiveIntensity: 0.3,
  });

  const chronalDialMat = new THREE.MeshStandardMaterial({
    color: 0x581c87, // Deep mystic chronal violet dial
    metalness: 0.5,
    roughness: 0.3,
    emissive: 0x7e22ce,
    emissiveIntensity: 0.55,
  });

  const handsMat = new THREE.MeshStandardMaterial({
    color: 0xe9d5ff, // Luminous lavender-white ticking hands
    metalness: 0.8,
    roughness: 0.15,
    emissive: 0xc084fc,
    emissiveIntensity: 0.95,
  });

  const hourTicksMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a, // Gold tick marks
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0xeab308,
    emissiveIntensity: 0.8,
  });

  // 1. Milled Chronometer Outer Gear Casing
  const casingShape = createClockCasingShape(0.88, 12);
  const casingGeo = new THREE.ExtrudeGeometry(casingShape, {
    depth: 0.26,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 3,
  });
  casingGeo.translate(0, 0, -0.13);
  casingGeo.computeVertexNormals();
  const casingMesh = new THREE.Mesh(casingGeo, antiqueBrassMat);
  casingMesh.castShadow = castShadow;
  casingMesh.receiveShadow = receiveShadow;
  root.add(casingMesh);

  // 2. Watch Dial Face (Front)
  const dialShape = createWatchDialShape(0.68);
  const dialGeo = new THREE.ExtrudeGeometry(dialShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  dialGeo.translate(0, 0, 0.08);
  dialGeo.computeVertexNormals();
  const frontDial = new THREE.Mesh(dialGeo, chronalDialMat);
  frontDial.castShadow = castShadow;
  root.add(frontDial);

  // Watch Dial Face (Rear)
  const rearDialGeo = dialGeo.clone();
  rearDialGeo.translate(0, 0, -0.22);
  const rearDial = new THREE.Mesh(rearDialGeo, chronalDialMat);
  root.add(rearDial);

  // 3. Hour Markers (12 cardinal ticks)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const isMajor = i % 3 === 0;
    const tickLen = isMajor ? 0.12 : 0.07;
    const tickShape = new THREE.Shape();
    tickShape.moveTo(-0.02, 0);
    tickShape.lineTo(-0.02, tickLen);
    tickShape.lineTo(0.02, tickLen);
    tickShape.lineTo(0.02, 0);
    tickShape.closePath();
    const tickGeo = new THREE.ExtrudeGeometry(tickShape, { depth: 0.04, bevelEnabled: false });
    tickGeo.translate(0, 0.52 - tickLen, 0.14);
    const tickMesh = new THREE.Mesh(tickGeo, hourTicksMat);
    tickMesh.rotation.z = -a;
    root.add(tickMesh);
  }

  // 4. Minute Hand (pointing toward 2 o'clock, angle = -pi/6)
  const minHandShape = createClockHandShape(0.48, 0.06);
  const minHandGeo = new THREE.ExtrudeGeometry(minHandShape, { depth: 0.04, bevelEnabled: false });
  minHandGeo.translate(0, 0, 0.15);
  const minHand = new THREE.Mesh(minHandGeo, handsMat);
  minHand.rotation.z = -Math.PI / 3;
  minHand.castShadow = castShadow;
  root.add(minHand);

  // 5. Hour Hand (pointing toward 10 o'clock, angle = 2*pi/3)
  const hrHandShape = createClockHandShape(0.32, 0.08);
  const hrHandGeo = new THREE.ExtrudeGeometry(hrHandShape, { depth: 0.04, bevelEnabled: false });
  hrHandGeo.translate(0, 0, 0.16);
  const hrHand = new THREE.Mesh(hrHandGeo, handsMat);
  hrHand.rotation.z = (2 * Math.PI) / 3;
  hrHand.castShadow = castShadow;
  root.add(hrHand);

  // 6. Top Winding Stem and Suspension Bow Loop
  const bowGeo = createWatchBowGeometry(0.24, 0.035);
  bowGeo.translate(0, 0.94, 0);
  const bowMesh = new THREE.Mesh(bowGeo, antiqueBrassMat);
  bowMesh.castShadow = castShadow;
  root.add(bowMesh);

  return root;
}
