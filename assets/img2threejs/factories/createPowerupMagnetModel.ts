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
 * Creates horseshoe magnet 2D profile.
 * An outer arch with downward prongs and an inner hollow arch cutout.
 */
function createMagnetShape(outerR = 0.85, innerR = 0.45, armLen = 0.7): THREE.Shape {
  const shape = new THREE.Shape();
  const segments = 24;

  // Outer arch from left to right (pi to 0)
  for (let i = 0; i <= segments; i++) {
    const a = Math.PI - (i / segments) * Math.PI;
    const x = Math.cos(a) * outerR;
    const y = Math.sin(a) * outerR;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }

  // Right arm down
  shape.lineTo(outerR, -armLen);
  // Right pole bottom edge
  shape.lineTo(innerR, -armLen);
  // Right inner arm up
  shape.lineTo(innerR, 0);

  // Inner arch from right to left (0 to pi)
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI;
    const x = Math.cos(a) * innerR;
    const y = Math.sin(a) * innerR;
    shape.lineTo(x, y);
  }

  // Left inner arm down
  shape.lineTo(-innerR, -armLen);
  // Left pole bottom edge
  shape.lineTo(-outerR, -armLen);
  // Left arm up
  shape.lineTo(-outerR, 0);

  shape.closePath();
  return shape;
}

/**
 * Pole caps (metallic tips at the ends of the arms).
 */
function createPoleCapShape(outerR = 0.86, innerR = 0.44, capHeight = 0.3): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(innerR, 0);
  shape.lineTo(outerR, 0);
  shape.lineTo(outerR, -capHeight);
  shape.lineTo(innerR, -capHeight);
  shape.closePath();
  return shape;
}

/**
 * Creates zigzag electrical flux arc between the two magnetic poles.
 */
function createFluxArcGeometry(): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const startX = -0.55;
  const endX = 0.55;
  const numSteps = 8;
  const yBase = -0.55;

  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const x = startX + (endX - startX) * t;
    const yOffset = i === 0 || i === numSteps ? 0 : (Math.sin(t * Math.PI) * 0.18 + (i % 2 === 0 ? 0.08 : -0.08));
    const zOffset = (i % 2 === 0 ? 0.05 : -0.05) * Math.sin(t * Math.PI);
    points.push(new THREE.Vector3(x, yBase + yOffset, zOffset));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, 32, 0.03, 8, false);
}

export function createMagnetPowerupModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Magnet Powerup (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const redBodyMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48, // Vibrant Ferrari / candy magnetic red
    metalness: 0.55,
    roughness: 0.22,
    emissive: 0x881337,
    emissiveIntensity: 0.35,
  });

  const chromePoleMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // Polished chrome magnetic pole tips
    metalness: 0.95,
    roughness: 0.14,
    emissive: 0x475569,
    emissiveIntensity: 0.2,
  });

  const fluxMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, // Electric cyan magnetic flux arc
    emissive: 0x00f5d4,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.9,
  });

  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.9,
    roughness: 0.2,
  });

  // 1. Red U-Magnet Main Body
  const magnetShape = createMagnetShape(0.85, 0.45, 0.45);
  const magnetGeo = new THREE.ExtrudeGeometry(magnetShape, {
    depth: 0.32,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 3,
    curveSegments: 24,
  });
  magnetGeo.translate(0, 0, -0.16);
  magnetGeo.computeVertexNormals();
  const bodyMesh = new THREE.Mesh(magnetGeo, redBodyMat);
  bodyMesh.castShadow = castShadow;
  bodyMesh.receiveShadow = receiveShadow;
  root.add(bodyMesh);

  // 2. Right Pole Cap (Chrome)
  const rightPoleShape = createPoleCapShape(0.86, 0.44, 0.35);
  const poleGeoRight = new THREE.ExtrudeGeometry(rightPoleShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  poleGeoRight.translate(0, -0.45, -0.17);
  poleGeoRight.computeVertexNormals();
  const rightPole = new THREE.Mesh(poleGeoRight, chromePoleMat);
  rightPole.castShadow = castShadow;
  root.add(rightPole);

  // 3. Left Pole Cap (Chrome)
  const leftPoleShape = createPoleCapShape(-0.44, -0.86, 0.35);
  const poleGeoLeft = new THREE.ExtrudeGeometry(leftPoleShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  poleGeoLeft.translate(0, -0.45, -0.17);
  poleGeoLeft.computeVertexNormals();
  const leftPole = new THREE.Mesh(poleGeoLeft, chromePoleMat);
  leftPole.castShadow = castShadow;
  root.add(leftPole);

  // 4. Polarity Accent Bands (Red & Blue or Gold separation rings)
  const bandShapeR = createPoleCapShape(0.88, 0.42, 0.06);
  const bandGeoR = new THREE.ExtrudeGeometry(bandShapeR, { depth: 0.36, bevelEnabled: false });
  bandGeoR.translate(0, -0.44, -0.18);
  const bandR = new THREE.Mesh(bandGeoR, goldAccentMat);
  root.add(bandR);

  const bandShapeL = createPoleCapShape(-0.42, -0.88, 0.06);
  const bandGeoL = new THREE.ExtrudeGeometry(bandShapeL, { depth: 0.36, bevelEnabled: false });
  bandGeoL.translate(0, -0.44, -0.18);
  const bandL = new THREE.Mesh(bandGeoL, goldAccentMat);
  root.add(bandL);

  // 5. Electric Magnetic Flux Arcs between poles
  const arc1 = new THREE.Mesh(createFluxArcGeometry(), fluxMat);
  root.add(arc1);

  const arc2Geo = createFluxArcGeometry();
  arc2Geo.rotateX(Math.PI);
  const arc2 = new THREE.Mesh(arc2Geo, fluxMat);
  root.add(arc2);

  // Center the model in Y
  root.position.y = 0.2;

  return root;
}
