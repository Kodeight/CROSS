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
 * Creates aerodynamic supersonic chevron / speed wing shape.
 */
function createSpeedChevronShape(width = 1.4, height = 1.1, thickness = 0.32): THREE.Shape {
  const shape = new THREE.Shape();
  const halfW = width / 2;
  const tipY = height * 0.55;
  const innerY = tipY - thickness;
  const botY = -height * 0.45;
  const innerBotY = botY + thickness * 0.7;

  // Leading tip
  shape.moveTo(0, tipY);
  // Outer wing down to right wingtip
  shape.lineTo(halfW, botY);
  // Wingtip bevel cut
  shape.lineTo(halfW * 0.88, botY - 0.08);
  // Inner trailing edge to notch
  shape.lineTo(0, innerBotY);
  // Inner trailing edge to left wingtip
  shape.lineTo(-halfW * 0.88, botY - 0.08);
  // Left wingtip
  shape.lineTo(-halfW, botY);
  // Leading wing edge up to tip
  shape.lineTo(0, tipY);
  shape.closePath();

  return shape;
}

/**
 * Creates dynamic lightning bolt streak profile.
 */
function createLightningStreakShape(scale = 0.9): THREE.Shape {
  const shape = new THREE.Shape();
  const s = scale;
  shape.moveTo(0.08 * s, 0.7 * s); // Top tip
  shape.lineTo(-0.15 * s, 0.1 * s);
  shape.lineTo(0.04 * s, 0.1 * s); // Elbow
  shape.lineTo(-0.12 * s, -0.6 * s); // Bottom tip
  shape.lineTo(0.18 * s, -0.05 * s);
  shape.lineTo(0.0 * s, -0.05 * s); // Rear elbow
  shape.closePath();
  return shape;
}

export function createSpeedBoostPowerupModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Speed Boost Powerup (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const neonGreenMat = new THREE.MeshStandardMaterial({
    color: 0x10b981, // Electric high-velocity emerald green
    metalness: 0.7,
    roughness: 0.2,
    emissive: 0x059669,
    emissiveIntensity: 0.65,
  });

  const lightningMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a, // Electric blinding yellow lightning
    metalness: 0.85,
    roughness: 0.15,
    emissive: 0xeab308,
    emissiveIntensity: 1.1,
  });

  const cyanAeroMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4, // Cyan speed trail
    metalness: 0.5,
    roughness: 0.2,
    emissive: 0x0891b2,
    emissiveIntensity: 0.8,
  });

  // 1. Primary Leading Speed Chevron
  const chevronShape1 = createSpeedChevronShape(1.4, 1.2, 0.36);
  const chevronGeo1 = new THREE.ExtrudeGeometry(chevronShape1, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 3,
  });
  chevronGeo1.translate(0, 0.1, -0.09);
  chevronGeo1.computeVertexNormals();
  const chevron1 = new THREE.Mesh(chevronGeo1, neonGreenMat);
  chevron1.castShadow = castShadow;
  chevron1.receiveShadow = receiveShadow;
  root.add(chevron1);

  // 2. Secondary Trailing Speed Chevron (Motion Echo)
  const chevronShape2 = createSpeedChevronShape(1.15, 0.95, 0.28);
  const chevronGeo2 = new THREE.ExtrudeGeometry(chevronShape2, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  chevronGeo2.translate(0, -0.22, -0.07);
  chevronGeo2.computeVertexNormals();
  const chevron2 = new THREE.Mesh(chevronGeo2, cyanAeroMat);
  chevron2.castShadow = castShadow;
  root.add(chevron2);

  // 3. Tertiary Trailing Speed Chevron
  const chevronShape3 = createSpeedChevronShape(0.85, 0.7, 0.22);
  const chevronGeo3 = new THREE.ExtrudeGeometry(chevronShape3, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  chevronGeo3.translate(0, -0.46, -0.05);
  chevronGeo3.computeVertexNormals();
  const chevron3 = new THREE.Mesh(chevronGeo3, cyanAeroMat);
  root.add(chevron3);

  // 4. Central 3D Lightning Bolt Core (Front)
  const boltShape = createLightningStreakShape(1.0);
  const boltGeo = new THREE.ExtrudeGeometry(boltShape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  boltGeo.translate(0, 0.05, 0.06);
  boltGeo.computeVertexNormals();
  const boltFront = new THREE.Mesh(boltGeo, lightningMat);
  boltFront.castShadow = castShadow;
  root.add(boltFront);

  // Central 3D Lightning Bolt Core (Rear)
  const boltRearGeo = boltGeo.clone();
  boltRearGeo.translate(0, 0, -0.28);
  const boltRear = new THREE.Mesh(boltRearGeo, lightningMat);
  root.add(boltRear);

  return root;
}
