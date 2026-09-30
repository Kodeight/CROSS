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
 * Creates smooth 2D parametric heart profile.
 */
function createHeartShape(scale = 0.07): THREE.Shape {
  const shape = new THREE.Shape();
  const segments = 48;

  // Mathematical parametric heart curve:
  // x = 16 sin^3(t)
  // y = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const sinT = Math.sin(t);
    const x = 16 * sinT * sinT * sinT * scale;
    const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/**
 * Curved shine reflection highlight on the top-left heart lobe.
 */
function createGlossHighlightShape(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-0.48, 0.45);
  shape.quadraticCurveTo(-0.45, 0.72, -0.22, 0.72);
  shape.quadraticCurveTo(-0.25, 0.58, -0.38, 0.42);
  shape.quadraticCurveTo(-0.46, 0.42, -0.48, 0.45);
  shape.closePath();
  return shape;
}

class ExtraLifeHaloCurve extends THREE.Curve<THREE.Vector3> {
  constructor(public radius = 0.65) {
    super();
  }
  override getPoint(t: number, optionalTarget = new THREE.Vector3()): THREE.Vector3 {
    const a = t * Math.PI * 2;
    return optionalTarget.set(
      Math.cos(a) * this.radius,
      0,
      Math.sin(a) * (this.radius * 0.7)
    );
  }
}

/**
 * Creates curved golden halo ring hovering atop the heart.
 */
function createHaloGeometry(radius = 0.65, tubeR = 0.04): THREE.BufferGeometry {
  const curve = new ExtraLifeHaloCurve(radius);
  return new THREE.TubeGeometry(curve, 40, tubeR, 12, true);
}

export function createExtraLifePowerupModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Extra Life Powerup (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const heartBodyMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e, // Radiant ruby rose red
    metalness: 0.25,
    roughness: 0.14,
    emissive: 0xbe123c,
    emissiveIntensity: 0.5,
  });

  const glossMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, // Pristine white glossy highlight
    metalness: 0.9,
    roughness: 0.08,
    emissive: 0xffe4e6,
    emissiveIntensity: 0.8,
  });

  const goldHaloMat = new THREE.MeshStandardMaterial({
    color: 0xfde047, // Luminous celestial gold halo
    metalness: 0.95,
    roughness: 0.12,
    emissive: 0xeab308,
    emissiveIntensity: 0.9,
  });

  // 1. Plump 3D Beveled Heart Body
  const heartShape = createHeartShape(0.065);
  const heartGeo = new THREE.ExtrudeGeometry(heartShape, {
    depth: 0.32,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.08,
    bevelSegments: 4,
    curveSegments: 24,
  });
  heartGeo.translate(0, 0, -0.16);
  heartGeo.computeVertexNormals();
  const heartMesh = new THREE.Mesh(heartGeo, heartBodyMat);
  heartMesh.castShadow = castShadow;
  heartMesh.receiveShadow = receiveShadow;
  root.add(heartMesh);

  // 2. Front Gloss Shine Highlight (Retro 3D heart shine)
  const glossShape = createGlossHighlightShape();
  const glossGeo = new THREE.ExtrudeGeometry(glossShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  glossGeo.translate(0, 0, 0.22);
  glossGeo.computeVertexNormals();
  const frontGloss = new THREE.Mesh(glossGeo, glossMat);
  frontGloss.castShadow = castShadow;
  root.add(frontGloss);

  // Rear Gloss Shine Highlight
  const rearGlossGeo = glossGeo.clone();
  rearGlossGeo.translate(0, 0, -0.5);
  const rearGloss = new THREE.Mesh(rearGlossGeo, glossMat);
  root.add(rearGloss);

  // 3. Floating Golden Halo atop the heart
  const haloGeo = createHaloGeometry(0.72, 0.04);
  const halo = new THREE.Mesh(haloGeo, goldHaloMat);
  halo.position.set(0, 0.88, 0);
  halo.rotation.x = 0.2;
  halo.rotation.z = -0.1;
  halo.castShadow = castShadow;
  root.add(halo);

  // Center vertical pivot
  root.position.y = -0.1;

  return root;
}
