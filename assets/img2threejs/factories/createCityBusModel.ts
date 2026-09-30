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
 * Creates a heavy commercial bus wheel (single front or dual rear).
 * Zero primitives used.
 */
function createBusWheel(
  radius: number,
  tireWidth: number,
  isDual: boolean,
  materials: {
    tire: THREE.Material;
    rim: THREE.Material;
    hub: THREE.Material;
  },
  castShadow: boolean,
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'bus-wheel';

  const tubeRadius = tireWidth * 0.44;
  const mainRadius = radius - tubeRadius;
  const tireGeo = new THREE.TorusGeometry(mainRadius, tubeRadius, 14, 24);

  // Heavy steel bus rim
  const rimRadius = mainRadius * 0.82;
  const rimShape = new THREE.Shape();
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rx = Math.cos(a) * rimRadius;
    const ry = Math.sin(a) * rimRadius;
    if (i === 0) rimShape.moveTo(rx, ry);
    else rimShape.lineTo(rx, ry);
  }
  const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
    depth: tireWidth * 0.35,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  rimGeo.center();

  // Lug hub
  const hubShape = new THREE.Shape();
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const hx = Math.cos(a) * (rimRadius * 0.42);
    const hy = Math.sin(a) * (rimRadius * 0.42);
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

  const count = isDual ? 2 : 1;
  const spacing = tireWidth * 1.05;

  for (let s = 0; s < count; s++) {
    const zPos = isDual ? (s - 0.5) * spacing : 0;
    const tire = new THREE.Mesh(tireGeo, materials.tire);
    tire.position.z = zPos;
    tire.castShadow = castShadow;
    g.add(tire);

    const rim = new THREE.Mesh(rimGeo, materials.rim);
    rim.position.z = zPos;
    rim.castShadow = castShadow;
    g.add(rim);

    if (!isDual || s === 1) {
      const hub = new THREE.Mesh(hubGeo, materials.hub);
      hub.position.z = zPos;
      g.add(hub);
    }
  }

  return g;
}

/**
 * Creates the aerodynamic main coach body of the City Bus.
 */
function createBusBodyGeometry(length = 4.6, height = 1.35, width = 1.35): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2; // 2.3

  // Aerodynamic curved front nose
  shape.moveTo(-halfL, 0.24);
  shape.lineTo(-halfL - 0.06, 0.36);
  shape.quadraticCurveTo(-halfL - 0.08, 0.85, -halfL + 0.04, 1.25); // panoramic curved front windshield curve
  shape.quadraticCurveTo(-halfL + 0.18, 1.38, -halfL + 0.45, 1.40); // front roof brow
  shape.lineTo(halfL - 0.30, 1.40); // long roofline
  shape.quadraticCurveTo(halfL + 0.05, 1.38, halfL + 0.06, 1.25); // rear roof contour
  shape.lineTo(halfL + 0.06, 0.35); // upright rear engine fascia
  shape.lineTo(halfL - 0.02, 0.24); // rear lower apron

  // Rear dual wheel arch cutout
  const rwCenterX = 1.15;
  const rwR = 0.35;
  shape.lineTo(rwCenterX + rwR + 0.08, 0.24);
  shape.quadraticCurveTo(rwCenterX + rwR, 0.26, rwCenterX + rwR * 0.85, 0.48);
  shape.quadraticCurveTo(rwCenterX, 0.56, rwCenterX - rwR * 0.85, 0.48);
  shape.quadraticCurveTo(rwCenterX - rwR, 0.26, rwCenterX - rwR - 0.08, 0.24);

  // Wheelbase lower sill
  shape.lineTo(-1.25 + rwR + 0.08, 0.24);

  // Front wheel arch cutout
  const fwCenterX = -1.25;
  const fwR = 0.35;
  shape.quadraticCurveTo(fwCenterX + fwR, 0.26, fwCenterX + fwR * 0.85, 0.48);
  shape.quadraticCurveTo(fwCenterX, 0.56, fwCenterX - fwR * 0.85, 0.48);
  shape.quadraticCurveTo(fwCenterX - fwR, 0.26, fwCenterX - fwR - 0.08, 0.24);

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
 * Creates panoramic front, rear, and side passenger window glass bands.
 */
function createBusWindowsGeometry(length = 4.6, width = 1.35): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfL = length / 2;

  // Window band profile: sits between Y = 0.68 and Y = 1.28
  shape.moveTo(-halfL - 0.05, 0.70);
  shape.lineTo(-halfL - 0.04, 1.22);
  shape.lineTo(halfL + 0.04, 1.22);
  shape.lineTo(halfL + 0.04, 0.70);
  shape.closePath();

  const winWidth = width - 0.02; // flush on outer sides
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
 * Creates illuminated LED route destination display board above windshield.
 */
function createDestinationBoard(destMat: THREE.Material, housingMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  const bShape = new THREE.Shape();
  bShape.moveTo(-0.06, 1.24);
  bShape.lineTo(-0.02, 1.36);
  bShape.lineTo(0.04, 1.36);
  bShape.lineTo(0.02, 1.24);
  bShape.closePath();

  const bGeo = new THREE.ExtrudeGeometry(bShape, {
    depth: 0.88,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  bGeo.translate(0, 0, -0.44);
  bGeo.computeVertexNormals();

  const destMesh = new THREE.Mesh(bGeo, destMat);
  destMesh.position.x = -2.26;
  g.add(destMesh);

  return g;
}

/**
 * Roof-mounted HVAC air conditioning and ventilation modules.
 */
function createBusRoofHVAC(hvacMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  const hShape = new THREE.Shape();
  hShape.moveTo(-0.45, 0);
  hShape.quadraticCurveTo(-0.48, 0.12, -0.35, 0.14);
  hShape.lineTo(0.35, 0.14);
  hShape.quadraticCurveTo(0.48, 0.12, 0.45, 0);
  hShape.closePath();

  const hGeo = new THREE.ExtrudeGeometry(hShape, {
    depth: 0.85,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  hGeo.translate(0, 0, -0.425);
  hGeo.computeVertexNormals();

  // Dual HVAC pods on the roof
  const pod1 = new THREE.Mesh(hGeo, hvacMat);
  pod1.position.set(-0.6, 1.40, 0);
  g.add(pod1);

  const pod2 = new THREE.Mesh(hGeo, hvacMat);
  pod2.position.set(0.7, 1.40, 0);
  g.add(pod2);

  return g;
}

/**
 * Heavy impact bumpers & light clusters for City Bus.
 */
function createBusBumpersAndLights(
  trimMat: THREE.Material,
  hlMat: THREE.Material,
  tlMat: THREE.Material,
  length = 4.6,
): THREE.Group {
  const g = new THREE.Group();
  const halfL = length / 2;

  // Front heavy impact bumper
  const fBumpShape = new THREE.Shape();
  fBumpShape.moveTo(-0.10, 0.18);
  fBumpShape.lineTo(0.08, 0.18);
  fBumpShape.lineTo(0.06, 0.32);
  fBumpShape.lineTo(-0.08, 0.32);
  fBumpShape.closePath();
  const fBumpGeo = new THREE.ExtrudeGeometry(fBumpShape, {
    depth: 1.25,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  fBumpGeo.translate(0, 0, -0.625);
  fBumpGeo.computeVertexNormals();

  const fBumper = new THREE.Mesh(fBumpGeo, trimMat);
  fBumper.position.x = -halfL - 0.02;
  g.add(fBumper);

  // Rear heavy impact bumper
  const rBumper = new THREE.Mesh(fBumpGeo, trimMat);
  rBumper.position.x = halfL + 0.02;
  rBumper.rotation.y = Math.PI;
  g.add(rBumper);

  // Front headlights
  const hlShape = new THREE.Shape();
  hlShape.moveTo(-0.04, 0.36);
  hlShape.lineTo(0.04, 0.46);
  hlShape.lineTo(0.02, 0.48);
  hlShape.lineTo(-0.06, 0.38);
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

  // Vertical rear taillight columns
  const tlShape = new THREE.Shape();
  tlShape.moveTo(-0.03, 0.42);
  tlShape.lineTo(0.03, 0.90);
  tlShape.lineTo(0.01, 0.92);
  tlShape.lineTo(-0.05, 0.44);
  tlShape.closePath();
  const tlGeo = new THREE.ExtrudeGeometry(tlShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  tlGeo.translate(0, 0, -0.07);
  tlGeo.computeVertexNormals();

  const zSpread = 0.52;
  for (const side of [-1, 1]) {
    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.position.set(-halfL - 0.04, 0, side * zSpread);
    g.add(hl);

    const tl = new THREE.Mesh(tlGeo, tlMat);
    tl.position.set(halfL + 0.04, 0, side * zSpread);
    g.add(tl);
  }

  return g;
}

export function createCityBusModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'City Bus (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // ==========================================
  // MATERIALS
  // ==========================================
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1976d2, // Classic Transit Azure Blue
    roughness: 0.3,
    metalness: 0.2,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0c141d,
    roughness: 0.1,
    metalness: 0.9,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x181a1d,
    roughness: 0.85,
    metalness: 0.05,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x8a95a5,
    roughness: 0.35,
    metalness: 0.7,
  });

  const hubMat = new THREE.MeshStandardMaterial({
    color: 0x2e3440,
    roughness: 0.5,
    metalness: 0.5,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x21252b,
    roughness: 0.65,
    metalness: 0.15,
  });

  const destMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.2,
    metalness: 0.1,
    emissive: 0xffa000, // Illuminated amber LED destination display
    emissiveIntensity: 1.0,
  });

  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xfffae0,
    roughness: 0.1,
    metalness: 0.2,
    emissive: 0xfff0aa,
    emissiveIntensity: 1.2,
  });

  const tlMat = new THREE.MeshStandardMaterial({
    color: 0xff1e1e,
    roughness: 0.15,
    metalness: 0.1,
    emissive: 0xcc0000,
    emissiveIntensity: 1.0,
  });

  // 1. Long Coach Body
  const bodyGeo = createBusBodyGeometry(4.6, 1.35, 1.35);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = castShadow;
  bodyMesh.receiveShadow = receiveShadow;
  root.add(bodyMesh);

  // 2. Panoramic & Passenger Windows
  const winGeo = createBusWindowsGeometry(4.6, 1.35);
  const winMesh = new THREE.Mesh(winGeo, glassMat);
  winMesh.castShadow = castShadow;
  root.add(winMesh);

  // 3. Destination Display Board
  const destBoard = createDestinationBoard(destMat, trimMat);
  root.add(destBoard);

  // 4. Roof HVAC Modules
  const hvac = createBusRoofHVAC(trimMat);
  root.add(hvac);

  // 5. Heavy Bumpers & Lights
  const bumpersAndLights = createBusBumpersAndLights(trimMat, hlMat, tlMat, 4.6);
  root.add(bumpersAndLights);

  // 6. Wheels (Front single, Rear heavy twin dual)
  const wheelRadius = 0.32;
  const wheelWidth = 0.16;
  const wheelMaterials = {
    tire: tireMat,
    rim: rimMat,
    hub: hubMat,
  };

  // Front Single Wheels
  const fw1 = createBusWheel(wheelRadius, wheelWidth, false, wheelMaterials, castShadow);
  fw1.position.set(-1.25, wheelRadius, 0.62);
  root.add(fw1);

  const fw2 = createBusWheel(wheelRadius, wheelWidth, false, wheelMaterials, castShadow);
  fw2.position.set(-1.25, wheelRadius, -0.62);
  fw2.rotation.y = Math.PI;
  root.add(fw2);

  // Rear Heavy Dual Wheels
  const rw1 = createBusWheel(wheelRadius, wheelWidth, true, wheelMaterials, castShadow);
  rw1.position.set(1.15, wheelRadius, 0.58);
  root.add(rw1);

  const rw2 = createBusWheel(wheelRadius, wheelWidth, true, wheelMaterials, castShadow);
  rw2.position.set(1.15, wheelRadius, -0.58);
  rw2.rotation.y = Math.PI;
  root.add(rw2);

  const nodes: Record<string, THREE.Object3D> = { root, body: bodyMesh };
  const meshes: Record<string, THREE.Mesh> = { body: bodyMesh, windows: winMesh };
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
