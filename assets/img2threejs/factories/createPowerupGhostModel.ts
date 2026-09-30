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
 * Creates 2D stylized ghost silhouette:
 * Rounded dome head, widening torso, scalloped wavy flowing bottom hem.
 */
function createGhostBodyShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const w = 0.72;
  const topY = 0.85;
  const botY = -0.75;

  // Head dome
  shape.moveTo(-w * 0.7, 0.4);
  shape.quadraticCurveTo(-w * 0.7, topY, 0, topY);
  shape.quadraticCurveTo(w * 0.7, topY, w * 0.7, 0.4);

  // Right side flowing down to wavy hem
  shape.quadraticCurveTo(w * 0.85, -0.2, w * 0.9, botY + 0.15);

  // Scalloped bottom ripples (3 wavy tails)
  shape.quadraticCurveTo(w * 0.75, botY, w * 0.55, botY + 0.22);
  shape.quadraticCurveTo(w * 0.35, botY - 0.08, w * 0.15, botY + 0.25);
  shape.quadraticCurveTo(-w * 0.05, botY - 0.05, -w * 0.25, botY + 0.22);
  shape.quadraticCurveTo(-w * 0.45, botY - 0.08, -w * 0.65, botY + 0.25);
  shape.quadraticCurveTo(-w * 0.85, botY - 0.02, -w * 0.9, botY + 0.15);

  // Left side ascending to head
  shape.quadraticCurveTo(-w * 0.85, -0.2, -w * 0.7, 0.4);
  shape.closePath();

  return shape;
}

/**
 * Creates stubby ghost arm shape.
 */
function createGhostArmShape(isRight = true): THREE.Shape {
  const shape = new THREE.Shape();
  const dir = isRight ? 1 : -1;
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(dir * 0.25, 0.2, dir * 0.38, 0.05);
  shape.quadraticCurveTo(dir * 0.45, -0.1, dir * 0.25, -0.15);
  shape.quadraticCurveTo(dir * 0.1, -0.15, 0, -0.05);
  shape.closePath();
  return shape;
}

/**
 * Creates expressive ghost eye shape.
 */
function createGhostEyeShape(radius = 0.1): THREE.Shape {
  const shape = new THREE.Shape();
  const segs = 20;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    // Slightly tall oval
    const x = Math.cos(a) * (radius * 0.75);
    const y = Math.sin(a) * (radius * 1.2);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export function createInvisibilityPowerupModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Invisibility Ghost Powerup (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const phantomMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // Translucent spectral pearlescent white
    metalness: 0.1,
    roughness: 0.18,
    transparent: true,
    opacity: 0.88,
    emissive: 0x818cf8,
    emissiveIntensity: 0.45,
  });

  const glowingEyesMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc, // Mystic glowing violet eyes
    metalness: 0.3,
    roughness: 0.1,
    emissive: 0xd946ef,
    emissiveIntensity: 1.3,
  });

  const mouthMat = new THREE.MeshStandardMaterial({
    color: 0x6b21a8,
    roughness: 0.3,
    emissive: 0x4c1d95,
    emissiveIntensity: 0.4,
  });

  // 1. Ghost Body
  const bodyShape = createGhostBodyShape();
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 0.44,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.1,
    bevelSegments: 4,
    curveSegments: 24,
  });
  bodyGeo.translate(0, 0, -0.22);
  bodyGeo.computeVertexNormals();
  const bodyMesh = new THREE.Mesh(bodyGeo, phantomMat);
  bodyMesh.castShadow = castShadow;
  bodyMesh.receiveShadow = receiveShadow;
  root.add(bodyMesh);

  // 2. Right Phantom Arm
  const armRShape = createGhostArmShape(true);
  const armRGeo = new THREE.ExtrudeGeometry(armRShape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  armRGeo.translate(0.55, 0.15, -0.08);
  armRGeo.computeVertexNormals();
  const armR = new THREE.Mesh(armRGeo, phantomMat);
  armR.castShadow = castShadow;
  root.add(armR);

  // 3. Left Phantom Arm
  const armLShape = createGhostArmShape(false);
  const armLGeo = new THREE.ExtrudeGeometry(armLShape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  armLGeo.translate(-0.55, 0.15, -0.08);
  armLGeo.computeVertexNormals();
  const armL = new THREE.Mesh(armLGeo, phantomMat);
  armL.castShadow = castShadow;
  root.add(armL);

  // 4. Front Glowing Purple Eyes
  const eyeShape = createGhostEyeShape(0.12);
  const eyeGeo = new THREE.ExtrudeGeometry(eyeShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  eyeGeo.translate(0, 0, 0.28);
  eyeGeo.computeVertexNormals();

  const eyeR = new THREE.Mesh(eyeGeo, glowingEyesMat);
  eyeR.position.set(0.2, 0.35, 0);
  root.add(eyeR);

  const eyeL = new THREE.Mesh(eyeGeo, glowingEyesMat);
  eyeL.position.set(-0.2, 0.35, 0);
  root.add(eyeL);

  // Cute Little O-mouth
  const mouthShape = createGhostEyeShape(0.06);
  const mouthGeo = new THREE.ExtrudeGeometry(mouthShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  mouthGeo.translate(0, 0.18, 0.28);
  mouthGeo.computeVertexNormals();
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  root.add(mouth);

  return root;
}
