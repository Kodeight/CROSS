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
 * Creates the aerodynamic bullet-nosed tram body.
 * Symmetric streamline profile at front and rear.
 */
function createTramBodyGeometry(length = 4.8, width = 1.35, height = 1.4): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2; // 2.4

  // Aerodynamic bullet train / tram nose curve at front and rear
  shape.moveTo(-halfL, 0.22);
  shape.lineTo(-halfL - 0.08, 0.40);
  shape.quadraticCurveTo(-halfL - 0.12, 0.85, -halfL + 0.25, 1.35); // raked nose cone
  shape.quadraticCurveTo(-halfL + 0.50, 1.45, -halfL + 0.85, 1.45); // front roof curve
  shape.lineTo(halfL - 0.85, 1.45);
  shape.quadraticCurveTo(halfL - 0.50, 1.45, halfL - 0.25, 1.35);
  shape.quadraticCurveTo(halfL + 0.12, 0.85, halfL + 0.08, 0.40); // rear raked nose cone
  shape.lineTo(halfL, 0.22);
  shape.lineTo(halfL - 0.40, 0.22); // low-floor skirt

  // Bogie skirt cutouts
  shape.lineTo(halfL - 0.45, 0.32);
  shape.lineTo(halfL - 1.25, 0.32);
  shape.lineTo(halfL - 1.30, 0.22);

  shape.lineTo(-halfL + 1.30, 0.22);
  shape.lineTo(-halfL + 1.25, 0.32);
  shape.lineTo(-halfL + 0.45, 0.32);
  shape.lineTo(-halfL + 0.40, 0.22);

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
 * Creates flush panoramic passenger window glass bands.
 */
function createTramWindowsGeometry(length = 4.8, width = 1.35): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2;

  shape.moveTo(-halfL + 0.05, 0.72);
  shape.lineTo(-halfL + 0.22, 1.28);
  shape.lineTo(halfL - 0.22, 1.28);
  shape.lineTo(halfL - 0.05, 0.72);
  shape.closePath();

  const winWidth = width - 0.02;
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
 * Creates the roof-mounted high-speed aerodynamic pantograph assembly.
 */
function createTramPantograph(metalMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  const armShape = new THREE.Shape();
  armShape.moveTo(-0.03, 0);
  armShape.lineTo(0.28, 0.38);
  armShape.lineTo(0.32, 0.36);
  armShape.lineTo(0.02, 0);
  armShape.closePath();

  const armGeo = new THREE.ExtrudeGeometry(armShape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  armGeo.translate(0, 0, -0.02);
  armGeo.computeVertexNormals();

  for (const side of [-0.25, 0.25]) {
    const arm1 = new THREE.Mesh(armGeo, metalMat);
    arm1.position.set(-0.25, 1.45, side);
    g.add(arm1);

    const arm2 = new THREE.Mesh(armGeo, metalMat);
    arm2.position.set(0.35, 1.45, side);
    arm2.scale.x = -1;
    g.add(arm2);
  }

  // Overhead contact head collector bar
  const headShape = new THREE.Shape();
  headShape.moveTo(-0.18, 0);
  headShape.lineTo(0.18, 0);
  headShape.lineTo(0.16, 0.04);
  headShape.lineTo(-0.16, 0.04);
  headShape.closePath();
  const headGeo = new THREE.ExtrudeGeometry(headShape, {
    depth: 0.72,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  headGeo.translate(0, 0, -0.36);
  headGeo.computeVertexNormals();
  const head = new THREE.Mesh(headGeo, metalMat);
  head.position.set(0.05, 1.83, 0);
  g.add(head);

  return g;
}

/**
 * Glowing continuous neon light bands along tram waistline.
 */
function createTramNeonStrips(neonMat: THREE.Material, length = 4.6, width = 1.35): THREE.Group {
  const g = new THREE.Group();
  const halfL = length / 2;

  const sShape = new THREE.Shape();
  sShape.moveTo(-halfL, 0.62);
  sShape.lineTo(halfL, 0.62);
  sShape.lineTo(halfL, 0.67);
  sShape.lineTo(-halfL, 0.67);
  sShape.closePath();

  const sGeo = new THREE.ExtrudeGeometry(sShape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  sGeo.computeVertexNormals();

  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(sGeo, neonMat);
    strip.position.z = side * (width / 2 + 0.01);
    g.add(strip);
  }

  return g;
}

export function createModernNeonTramModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Modern Neon Tram (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const pearlSilverMat = new THREE.MeshStandardMaterial({
    color: 0xf5f6fa, // Futuristic Pearl White-Silver
    roughness: 0.2,
    metalness: 0.45,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0c141d,
    roughness: 0.08,
    metalness: 0.9,
  });

  const neonMagentaMat = new THREE.MeshStandardMaterial({
    color: 0xc77dff, // Tokyo Neon Electric Magenta
    roughness: 0.1,
    metalness: 0.2,
    emissive: 0xc77dff,
    emissiveIntensity: 1.5,
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x57606f,
    roughness: 0.35,
    metalness: 0.8,
  });

  // 1. Aerodynamic Tram Coach Body
  const bodyGeo = createTramBodyGeometry(4.8, 1.35, 1.4);
  const bodyMesh = new THREE.Mesh(bodyGeo, pearlSilverMat);
  bodyMesh.castShadow = castShadow;
  bodyMesh.receiveShadow = receiveShadow;
  root.add(bodyMesh);

  // 2. Panoramic Flush Windows
  const winGeo = createTramWindowsGeometry(4.8, 1.35);
  const winMesh = new THREE.Mesh(winGeo, glassMat);
  winMesh.castShadow = castShadow;
  root.add(winMesh);

  // 3. High-Speed Roof Pantograph
  const pantograph = createTramPantograph(metalMat);
  root.add(pantograph);

  // 4. Glowing Neon Light Strips
  const neonStrips = createTramNeonStrips(neonMagentaMat, 4.6, 1.35);
  root.add(neonStrips);

  // 5. Tram Steel Bogie Wheels (concealed under aerodynamic skirt)
  const wheelRadius = 0.22;
  const wheelPositions: [number, number][] = [
    [-1.8, 0.52], [-1.4, 0.52], [1.4, 0.52], [1.8, 0.52],
    [-1.8, -0.52], [-1.4, -0.52], [1.4, -0.52], [1.8, -0.52],
  ];

  const wGeo = new THREE.TorusGeometry(0.18, 0.04, 10, 16);
  wheelPositions.forEach(([wx, wz]) => {
    const w = new THREE.Mesh(wGeo, metalMat);
    w.position.set(wx, wheelRadius, wz);
    root.add(w);
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
