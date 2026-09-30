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

class SpringHelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor(public coils = 4.5, public radius = 0.42, public height = 0.9) {
    super();
  }
  override getPoint(t: number, optionalTarget = new THREE.Vector3()): THREE.Vector3 {
    const a = t * Math.PI * 2 * this.coils;
    const x = Math.cos(a) * this.radius;
    const y = (t - 0.5) * this.height;
    const z = Math.sin(a) * this.radius;
    return optionalTarget.set(x, y, z);
  }
}

/**
 * Creates 3D helical suspension spring coil using TubeGeometry.
 */
function createSpringHelixGeometry(coils = 4.5, radius = 0.42, height = 0.9, tubeR = 0.07): THREE.BufferGeometry {
  const curve = new SpringHelixCurve(coils, radius, height);
  return new THREE.TubeGeometry(curve, 96, tubeR, 12, false);
}

/**
 * Creates beveled circular spring end plate.
 */
function createSpringPlateGeometry(radius = 0.52, depth = 0.08): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const segs = 28;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    shape.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -depth / 2);
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates upward aerodynamic launch arrow / rocket chevron.
 */
function createUpwardArrowShape(width = 0.9, height = 0.85): THREE.Shape {
  const shape = new THREE.Shape();
  const halfW = width / 2;
  const tipY = height * 0.6;
  const notchY = 0.0;
  const botY = -height * 0.4;
  const shaftW = width * 0.28;

  // Arrow tip
  shape.moveTo(0, tipY);
  // Right barb
  shape.lineTo(halfW, notchY);
  shape.lineTo(shaftW, notchY);
  // Right shaft down
  shape.lineTo(shaftW, botY);
  // Shaft bottom
  shape.lineTo(-shaftW, botY);
  // Left shaft up
  shape.lineTo(-shaftW, notchY);
  // Left barb
  shape.lineTo(-halfW, notchY);
  shape.closePath();

  return shape;
}

export function createJumpBoostPowerupModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Jump Boost Powerup (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const springSteelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Heavy industrial coiled spring steel
    metalness: 0.95,
    roughness: 0.2,
    emissive: 0x334155,
    emissiveIntensity: 0.25,
  });

  const rocketOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xf97316, // Luminous rocket propulsion orange
    metalness: 0.6,
    roughness: 0.2,
    emissive: 0xea580c,
    emissiveIntensity: 0.75,
  });

  const rocketGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a, // Electric yellow boost flame
    metalness: 0.8,
    roughness: 0.15,
    emissive: 0xfacc15,
    emissiveIntensity: 1.1,
  });

  // 1. Helical 3D Suspension Spring
  const springGeo = createSpringHelixGeometry(4.5, 0.42, 0.8, 0.065);
  springGeo.translate(0, -0.15, 0);
  springGeo.computeVertexNormals();
  const springMesh = new THREE.Mesh(springGeo, springSteelMat);
  springMesh.castShadow = castShadow;
  springMesh.receiveShadow = receiveShadow;
  root.add(springMesh);

  // 2. Bottom Heavy Mounting Plate
  const basePlateGeo = createSpringPlateGeometry(0.5, 0.08);
  basePlateGeo.translate(0, -0.58, 0);
  const basePlate = new THREE.Mesh(basePlateGeo, springSteelMat);
  basePlate.castShadow = castShadow;
  root.add(basePlate);

  // 3. Top Piston Push Plate
  const topPlateGeo = createSpringPlateGeometry(0.48, 0.08);
  topPlateGeo.translate(0, 0.28, 0);
  const topPlate = new THREE.Mesh(topPlateGeo, springSteelMat);
  topPlate.castShadow = castShadow;
  root.add(topPlate);

  // 4. Upward Launch Arrow / Boost Chevron atop the spring
  const arrowShape = createUpwardArrowShape(0.9, 0.95);
  const arrowGeo = new THREE.ExtrudeGeometry(arrowShape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  arrowGeo.translate(0, 0.75, -0.08);
  arrowGeo.computeVertexNormals();
  const arrow = new THREE.Mesh(arrowGeo, rocketOrangeMat);
  arrow.castShadow = castShadow;
  root.add(arrow);

  // Inner Accent Flame Arrow
  const innerArrowShape = createUpwardArrowShape(0.62, 0.68);
  const innerArrowGeo = new THREE.ExtrudeGeometry(innerArrowShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  innerArrowGeo.translate(0, 0.72, 0.08);
  innerArrowGeo.computeVertexNormals();
  const innerArrow = new THREE.Mesh(innerArrowGeo, rocketGlowMat);
  root.add(innerArrow);

  // Rear Inner Accent Flame Arrow
  const rearInnerArrowGeo = innerArrowGeo.clone();
  rearInnerArrowGeo.translate(0, 0, -0.24);
  const rearInnerArrow = new THREE.Mesh(rearInnerArrowGeo, rocketGlowMat);
  root.add(rearInnerArrow);

  return root;
}
