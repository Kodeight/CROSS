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
 * Creates the tapered spiral drill head with cutting flutes.
 * Zero BoxGeometry/CylinderGeometry used.
 */
function createSpiralDrillHead(drillMat: THREE.Material, teethMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.name = 'drill-head';

  // Tapered drill cone profile rotated via LatheGeometry
  const points: THREE.Vector2[] = [];
  const length = 1.35;
  const maxR = 0.52;
  const segments = 24;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * length; // along drill axis
    // Tapered parabolic drill shape + stepped cutting rings
    const r = (1 - Math.pow(1 - t, 1.8)) * maxR;
    const ringRipple = Math.sin(t * Math.PI * 6) * 0.025;
    points.push(new THREE.Vector2(Math.max(0.02, r + ringRipple), -x));
  }

  const drillGeo = new THREE.LatheGeometry(points, 24);
  drillGeo.computeVertexNormals();
  const drillMesh = new THREE.Mesh(drillGeo, drillMat);
  drillMesh.rotation.z = Math.PI / 2; // point along -X
  drillMesh.position.x = -1.15;
  drillMesh.castShadow = true;
  g.add(drillMesh);

  // Spiral cutting carbide teeth / flutes
  const numTeeth = 8;
  for (let i = 0; i < numTeeth; i++) {
    const t = (i + 1) / (numTeeth + 1);
    const toothR = (1 - Math.pow(1 - t, 1.8)) * maxR + 0.04;
    const toothShape = new THREE.Shape();
    toothShape.moveTo(0, 0);
    toothShape.lineTo(0.04, 0.08);
    toothShape.lineTo(-0.04, 0.08);
    toothShape.closePath();

    const toothGeo = new THREE.ExtrudeGeometry(toothShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
    });
    toothGeo.center();

    const angle = t * Math.PI * 4;
    const tooth = new THREE.Mesh(toothGeo, teethMat);
    tooth.position.set(-1.15 - t * length, Math.cos(angle) * toothR, Math.sin(angle) * toothR);
    tooth.rotation.x = angle;
    g.add(tooth);
  }

  return g;
}

/**
 * Creates heavy industrial continuous crawler tracks.
 */
function createCrawlerTracks(trackMat: THREE.Material, wheelMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  // Track loop profile (stadium / oval path)
  const trackShape = new THREE.Shape();
  const tLen = 2.4;
  const tHeight = 0.52;
  const halfL = tLen / 2; // 1.2
  const r = tHeight / 2; // 0.26

  trackShape.moveTo(-halfL + r, 0.02);
  trackShape.lineTo(halfL - r, 0.02);
  trackShape.quadraticCurveTo(halfL + r * 0.5, 0.04, halfL + r * 0.4, r);
  trackShape.quadraticCurveTo(halfL + r * 0.5, tHeight, halfL - r, tHeight);
  trackShape.lineTo(-halfL + r, tHeight);
  trackShape.quadraticCurveTo(-halfL - r * 0.5, tHeight, -halfL - r * 0.4, r);
  trackShape.quadraticCurveTo(-halfL - r * 0.5, 0.04, -halfL + r, 0.02);
  trackShape.closePath();

  const trackGeo = new THREE.ExtrudeGeometry(trackShape, {
    depth: 0.32,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  trackGeo.translate(0, 0, -0.16);
  trackGeo.computeVertexNormals();

  for (const side of [-1, 1]) {
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.position.set(0.1, 0, side * 0.65);
    track.castShadow = true;
    g.add(track);

    // Track bogey wheels (3 road wheels per track)
    for (let i = -1; i <= 1; i++) {
      const wGeo = new THREE.TorusGeometry(0.14, 0.06, 10, 16);
      const w = new THREE.Mesh(wGeo, wheelMat);
      w.position.set(0.1 + i * 0.65, r + 0.02, side * 0.65);
      g.add(w);
    }
  }

  return g;
}

/**
 * Creates the reinforced armored body chassis.
 */
function createDrillChassisGeometry(length = 2.5, width = 1.15): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2;

  // Heavy armored chassis
  shape.moveTo(-halfL, 0.28);
  shape.lineTo(-halfL - 0.05, 0.52);
  shape.lineTo(-halfL + 0.15, 0.85); // drill collar mount
  shape.lineTo(-0.15, 0.88); // cab transition
  shape.lineTo(0.12, 1.25); // armored dome cab
  shape.lineTo(0.68, 1.22);
  shape.lineTo(halfL + 0.05, 0.85); // engine compartment
  shape.lineTo(halfL + 0.08, 0.35);
  shape.lineTo(-halfL, 0.28);
  shape.closePath();

  const extrudeDepth = width - 0.16;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 4,
    curveSegments: 10,
  });
  geo.translate(0, 0, -extrudeDepth / 2);
  geo.computeVertexNormals();
  return geo;
}

export function createDrillVehicleModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Drill Vehicle (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const redMat = new THREE.MeshStandardMaterial({
    color: 0xc0392b, // Industrial Magma Hazard Red
    roughness: 0.4,
    metalness: 0.3,
  });

  const drillMat = new THREE.MeshStandardMaterial({
    color: 0xb0bec5, // Hardened tungsten carbide steel
    roughness: 0.22,
    metalness: 0.85,
  });

  const teethMat = new THREE.MeshStandardMaterial({
    color: 0xf39c12, // High-heat titanium-coated cutting teeth
    roughness: 0.2,
    metalness: 0.9,
  });

  const trackMat = new THREE.MeshStandardMaterial({
    color: 0x1a1c20, // Heavy rubberized steel crawler treads
    roughness: 0.85,
    metalness: 0.3,
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x374151, // Structural steel bogey wheels & chassis
    roughness: 0.45,
    metalness: 0.7,
  });

  // 1. Armored Chassis
  const chassisGeo = createDrillChassisGeometry(2.5, 1.15);
  const chassisMesh = new THREE.Mesh(chassisGeo, redMat);
  chassisMesh.castShadow = castShadow;
  chassisMesh.receiveShadow = receiveShadow;
  root.add(chassisMesh);

  // 2. Giant Spiral Drill Head
  const drill = createSpiralDrillHead(drillMat, teethMat);
  root.add(drill);

  // 3. Heavy Crawler Tracks
  const tracks = createCrawlerTracks(trackMat, steelMat);
  root.add(tracks);

  // 4. Exhaust Smokestacks
  const stackShape = new THREE.Shape();
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const sx = Math.cos(a) * 0.05;
    const sy = Math.sin(a) * 0.05;
    if (i === 0) stackShape.moveTo(sx, sy);
    else stackShape.lineTo(sx, sy);
  }
  const stackGeo = new THREE.ExtrudeGeometry(stackShape, {
    depth: 0.48,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  stackGeo.center();

  for (const side of [-1, 1]) {
    const stack = new THREE.Mesh(stackGeo, steelMat);
    stack.rotation.x = Math.PI / 2;
    stack.position.set(0.85, 1.25, side * 0.28);
    root.add(stack);
  }

  const nodes: Record<string, THREE.Object3D> = { root, chassis: chassisMesh, drill };
  const meshes: Record<string, THREE.Mesh> = { chassis: chassisMesh };
  const sockets: Record<string, THREE.Object3D> = {};
  const colliders: Record<string, unknown> = {};
  const destructionGroups: Record<string, THREE.Object3D[]> = { root: [chassisMesh] };

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
