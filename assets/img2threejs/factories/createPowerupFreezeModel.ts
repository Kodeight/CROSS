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
 * Creates a single faceted 3D ice crystal branch with side barbs.
 */
function createIceBranchShape(): THREE.Shape {
  const shape = new THREE.Shape();
  // Central stem with side frost prongs
  shape.moveTo(0, 0.95); // Tip
  shape.lineTo(0.12, 0.75);
  shape.lineTo(0.32, 0.72); // Upper right barb tip
  shape.lineTo(0.15, 0.58);
  shape.lineTo(0.12, 0.45);
  shape.lineTo(0.38, 0.42); // Lower right barb tip
  shape.lineTo(0.14, 0.28);
  shape.lineTo(0.10, 0.12);
  shape.lineTo(0.06, 0.0); // Base center

  // Symmetrical left side
  shape.lineTo(-0.06, 0.0);
  shape.lineTo(-0.10, 0.12);
  shape.lineTo(-0.14, 0.28);
  shape.lineTo(-0.38, 0.42); // Lower left barb tip
  shape.lineTo(-0.12, 0.45);
  shape.lineTo(-0.15, 0.58);
  shape.lineTo(-0.32, 0.72); // Upper left barb tip
  shape.lineTo(-0.12, 0.75);
  shape.closePath();

  return shape;
}

/**
 * Creates faceted central hexagon core gem.
 */
function createHexGemShape(radius = 0.35): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/**
 * Creates an orbiting crystalline ring of floating ice diamonds.
 */
function createOrbitingShardShape(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.18);
  shape.lineTo(0.08, 0);
  shape.lineTo(0, -0.18);
  shape.lineTo(-0.08, 0);
  shape.closePath();
  return shape;
}

export function createFreezePowerupModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Freeze Powerup (High-Fidelity 3D)';

  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;

  // Materials
  const iceCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc, // Glacial cyan frost
    metalness: 0.1,
    roughness: 0.15,
    transparent: true,
    opacity: 0.92,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
  });

  const coreGemMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe, // Sparkling core frost gem
    metalness: 0.3,
    roughness: 0.08,
    transparent: true,
    opacity: 0.95,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.8,
  });

  const frostTrimMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.85,
    roughness: 0.1,
    emissive: 0xbae6fd,
    emissiveIntensity: 0.4,
  });

  // 1. Six Symmetrical Ice Branches
  const branchShape = createIceBranchShape();
  const branchGeo = new THREE.ExtrudeGeometry(branchShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  branchGeo.translate(0, 0, -0.06);
  branchGeo.computeVertexNormals();

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const branchMesh = new THREE.Mesh(branchGeo, iceCrystalMat);
    branchMesh.rotation.z = angle;
    branchMesh.castShadow = castShadow;
    branchMesh.receiveShadow = receiveShadow;
    root.add(branchMesh);
  }

  // 2. Central Hexagonal Faceted Gem Core
  const hexShape = createHexGemShape(0.38);
  const hexGeo = new THREE.ExtrudeGeometry(hexShape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 3,
  });
  hexGeo.translate(0, 0, -0.11);
  hexGeo.computeVertexNormals();
  const coreMesh = new THREE.Mesh(hexGeo, coreGemMat);
  coreMesh.castShadow = castShadow;
  root.add(coreMesh);

  // 3. Central Inner Diamond Starlet
  const innerHexShape = createHexGemShape(0.2);
  const innerGeo = new THREE.ExtrudeGeometry(innerHexShape, {
    depth: 0.32,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  innerGeo.translate(0, 0, -0.16);
  innerGeo.computeVertexNormals();
  const innerStar = new THREE.Mesh(innerGeo, frostTrimMat);
  innerStar.rotation.z = Math.PI / 6;
  root.add(innerStar);

  // 4. Orbiting Frost Diamond Shards (at 30-deg offsets between main branches)
  const shardShape = createOrbitingShardShape();
  const shardGeo = new THREE.ExtrudeGeometry(shardShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  shardGeo.translate(0, 0, -0.04);
  shardGeo.computeVertexNormals();

  for (let i = 0; i < 6; i++) {
    const angle = ((i + 0.5) / 6) * Math.PI * 2;
    const dist = 0.78;
    const shard = new THREE.Mesh(shardGeo, coreGemMat);
    shard.position.set(Math.cos(angle) * dist, Math.sin(angle) * dist, 0);
    shard.rotation.z = angle + Math.PI / 4;
    shard.castShadow = castShadow;
    root.add(shard);
  }

  return root;
}
