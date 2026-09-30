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
 * Creates the thick beveled gold coin blank.
 * Zero BoxGeometry / CylinderGeometry used.
 */
function createCoinBlankGeometry(radius = 0.82, thickness = 0.22): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const segments = 32;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = Math.cos(a) * (radius - 0.04);
    const y = Math.sin(a) * (radius - 0.04);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 4,
    curveSegments: 16,
  });
  geo.translate(0, 0, -thickness / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the 5-pointed 3D star medallion embossed on the coin face.
 */
function createStarEmbossGeometry(radius = 0.44, depth = 0.04): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const numPoints = 5;
  const innerR = radius * 0.42;

  for (let i = 0; i <= numPoints * 2; i++) {
    const a = (i * Math.PI) / numPoints - Math.PI / 2;
    const r = i % 2 === 0 ? radius : innerR;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
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
  geo.computeVertexNormals();
  return geo;
}

export function createGoldStarCoinModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Gold Star Coin (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials - Rich Polished Metallic Gold
  const goldBodyMat = new THREE.MeshStandardMaterial({
    color: 0xffb703, // Rich warm metallic 24K gold
    roughness: 0.22,
    metalness: 0.92,
    emissive: 0x332200,
    emissiveIntensity: 0.4,
  });

  const goldRimMat = new THREE.MeshStandardMaterial({
    color: 0xffc93c, // High-sheen bright gold rim
    roughness: 0.16,
    metalness: 0.95,
    emissive: 0x442800,
    emissiveIntensity: 0.5,
  });

  const starEmbossMat = new THREE.MeshStandardMaterial({
    color: 0xffe27a, // Polished mirror star face
    roughness: 0.12,
    metalness: 0.98,
    emissive: 0x553500,
    emissiveIntensity: 0.6,
  });

  // 1. Thick Beveled Coin Blank
  const coinGeo = createCoinBlankGeometry(0.82, 0.24);
  const coinMesh = new THREE.Mesh(coinGeo, goldBodyMat);
  coinMesh.name = 'coin-blank';
  coinMesh.castShadow = castShadow;
  coinMesh.receiveShadow = receiveShadow;
  root.add(coinMesh);

  // 2. Beveled Raised Rim on Both Faces (using TorusGeometry)
  const rimGeo = new THREE.TorusGeometry(0.72, 0.045, 12, 36);
  for (const s of [-1, 1]) {
    const rim = new THREE.Mesh(rimGeo, goldRimMat);
    rim.position.z = s * 0.12;
    rim.castShadow = castShadow;
    root.add(rim);
  }

  // 3. 3D Faceted Star Emboss on Both Faces
  const starGeo = createStarEmbossGeometry(0.42, 0.035);
  for (const s of [-1, 1]) {
    const star = new THREE.Mesh(starGeo, starEmbossMat);
    star.position.z = s * 0.14;
    star.castShadow = castShadow;
    root.add(star);
  }

  const nodes: Record<string, THREE.Object3D> = { root, coin: coinMesh };
  const meshes: Record<string, THREE.Mesh> = { coin: coinMesh };
  const sockets: Record<string, THREE.Object3D> = {};
  const colliders: Record<string, unknown> = {};
  const destructionGroups: Record<string, THREE.Object3D[]> = { root: [coinMesh] };

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
