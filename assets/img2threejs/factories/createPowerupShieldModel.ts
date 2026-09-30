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
 * Creates heraldic knight's heater shield outline.
 * Curving shoulders down to a pointed lower vertex.
 */
function createShieldShape(w = 1.0, h = 1.3): THREE.Shape {
  const shape = new THREE.Shape();
  const halfW = w / 2;
  const topH = h * 0.45;
  const botH = -h * 0.55;

  // Start top-left corner
  shape.moveTo(-halfW + 0.1, topH);
  // Top curve
  shape.quadraticCurveTo(0, topH + 0.12, halfW - 0.1, topH);
  // Top-right rounded shoulder
  shape.quadraticCurveTo(halfW, topH, halfW, topH - 0.15);
  // Right side descending with inward sweep
  shape.quadraticCurveTo(halfW * 0.95, 0, halfW * 0.45, botH * 0.5);
  // Tip at bottom center
  shape.quadraticCurveTo(halfW * 0.15, botH * 0.85, 0, botH);
  // Left side ascending symmetrically
  shape.quadraticCurveTo(-halfW * 0.15, botH * 0.85, -halfW * 0.45, botH * 0.5);
  shape.quadraticCurveTo(-halfW * 0.95, 0, -halfW, topH - 0.15);
  shape.quadraticCurveTo(-halfW, topH, -halfW + 0.1, topH);
  shape.closePath();

  return shape;
}

/**
 * Creates 4-pointed heraldic energy diamond crest.
 */
function createEmblemShape(size = 0.35): THREE.Shape {
  const shape = new THREE.Shape();
  const s = size;
  const inner = size * 0.28;
  shape.moveTo(0, s);
  shape.lineTo(inner, inner);
  shape.lineTo(s * 0.85, 0);
  shape.lineTo(inner, -inner);
  shape.lineTo(0, -s);
  shape.lineTo(-inner, -inner);
  shape.lineTo(-s * 0.85, 0);
  shape.lineTo(-inner, inner);
  shape.closePath();
  return shape;
}

class ShieldEnergyRingCurve extends THREE.Curve<THREE.Vector3> {
  constructor(public radiusX = 0.9, public radiusY = 1.1) {
    super();
  }
  override getPoint(t: number, optionalTarget = new THREE.Vector3()): THREE.Vector3 {
    const a = t * Math.PI * 2;
    return optionalTarget.set(
      Math.cos(a) * this.radiusX,
      Math.sin(a) * this.radiusY,
      Math.sin(a * 2) * 0.12
    );
  }
}

/**
 * Creates a curved 3D oval energy halo ring.
 */
function createEnergyRingGeometry(radiusX = 0.9, radiusY = 1.1, tubeR = 0.04): THREE.BufferGeometry {
  const curve = new ShieldEnergyRingCurve(radiusX, radiusY);
  return new THREE.TubeGeometry(curve, 48, tubeR, 12, true);
}

export function createShieldPowerupModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Shield Powerup (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe, // Gleaming polished platinum rim
    metalness: 0.92,
    roughness: 0.18,
    emissive: 0x1e3a8a,
    emissiveIntensity: 0.3,
  });

  const shieldFaceMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8, // Deep electric cobalt sapphire
    metalness: 0.65,
    roughness: 0.25,
    emissive: 0x1e40af,
    emissiveIntensity: 0.45,
  });

  const emblemMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, // Luminous electric cyan energy crest
    metalness: 0.85,
    roughness: 0.12,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.9,
  });

  const auraRingMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    metalness: 0.3,
    roughness: 0.2,
    transparent: true,
    opacity: 0.85,
    emissive: 0x00f5d4,
    emissiveIntensity: 1.1,
  });

  // 1. Outer Heavy Beveled Rim
  const rimShape = createShieldShape(1.4, 1.7);
  const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.07,
    bevelSegments: 4,
    curveSegments: 24,
  });
  rimGeo.translate(0, 0, -0.09);
  rimGeo.computeVertexNormals();
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.castShadow = castShadow;
  rimMesh.receiveShadow = receiveShadow;
  root.add(rimMesh);

  // 2. Inner Recessed Shield Body Face
  const innerShape = createShieldShape(1.22, 1.48);
  const innerGeo = new THREE.ExtrudeGeometry(innerShape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 24,
  });
  innerGeo.translate(0, 0, -0.12);
  innerGeo.computeVertexNormals();
  const innerMesh = new THREE.Mesh(innerGeo, shieldFaceMat);
  innerMesh.castShadow = castShadow;
  innerMesh.receiveShadow = receiveShadow;
  root.add(innerMesh);

  // 3. Front Embossed Heraldic Diamond Crest
  const emblemShape = createEmblemShape(0.42);
  const emblemGeo = new THREE.ExtrudeGeometry(emblemShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  emblemGeo.translate(0, 0, 0.08);
  emblemGeo.computeVertexNormals();
  const frontEmblem = new THREE.Mesh(emblemGeo, emblemMat);
  frontEmblem.castShadow = castShadow;
  root.add(frontEmblem);

  // Rear Embossed Crest (symmetrical read when rotating)
  const rearEmblemGeo = emblemGeo.clone();
  rearEmblemGeo.translate(0, 0, -0.28);
  const rearEmblem = new THREE.Mesh(rearEmblemGeo, emblemMat);
  root.add(rearEmblem);

  // 4. Orbiting Translucent Energy Aura Ring
  const ringGeo = createEnergyRingGeometry(1.05, 1.25, 0.035);
  const auraRing = new THREE.Mesh(ringGeo, auraRingMat);
  auraRing.rotation.y = 0.25;
  auraRing.rotation.z = -0.15;
  root.add(auraRing);

  // Secondary Cross Aura Ring (perpendicular tilted)
  const ringGeo2 = createEnergyRingGeometry(1.0, 1.18, 0.025);
  const auraRing2 = new THREE.Mesh(ringGeo2, auraRingMat);
  auraRing2.rotation.x = Math.PI / 2.8;
  auraRing2.rotation.y = 0.35;
  root.add(auraRing2);

  return root;
}
