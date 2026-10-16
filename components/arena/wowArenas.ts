import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { ARENA_CONFIG } from './arenaConfig';
import { BOARD_COLS, BOARD_ROWS, axialToWorld3D, rowColToAxial } from '@/engine/hexMath';

export const WOW_ARENAS = [
  'Hierro', 'Bronce', 'Plata', 'Oro', 'Platino', 'Esmeralda',
  'Diamante', 'Maestro', 'GranMaestro', 'Retador',
] as const;
export type WowArena = typeof WOW_ARENAS[number];

/** Release only resources owned by this arena, never champion assets. */
export function disposeArena(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  const images = new Set<ImageBitmap>();
  textures.forEach(texture => {
    texture.dispose();
    if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) images.add(texture.image);
  });
  images.forEach(image => image.close());
  root.removeFromParent();
}

// Calibrated against the decoded GLBs: the playable courtyard, not the bounds
// of towers, roofs or underground foundations. Values are in source world units.
export const ARENA_FLOORS: Record<WowArena, { x: number; z: number; y: number; scale: number }> = {
  Hierro: { x: 1.658, z: 0.094, y: -0.38, scale: 1.355 },
  Bronce: { x: 1.780, z: 0.002, y: 0, scale: 1.496 },
  Plata: { x: 10.170, z: 0.017, y: -2.67, scale: 1.152 },
  Oro: { x: 12.682, z: -0.370, y: -4.90, scale: 1.062 },
  Platino: { x: -5, z: 5, y: -8, scale: 0.3 },
  Esmeralda: { x: 116.141, z: 48.488, y: 38.34, scale: 0.401 },
  Diamante: { x: -0.248, z: 17.126, y: -5.94, scale: 0.5 },
  Maestro: { x: 1.442, z: -2.970, y: -15.11, scale: 0.188 },
  GranMaestro: { x: -7.348, z: -2.904, y: -16.19, scale: 0.423 },
  Retador: { x: -16.529, z: 51.948, y: -38.31, scale: 0.687 },
};

export function fitArenaToBoard(root: THREE.Object3D, rank: WowArena) {
  // The Blender-authored Diamond courtyard is exported in game coordinates.
  // Reapplying the source temple fit would destroy its benches and framing.
  if (rank === 'Diamante') {
    root.traverse(object => { if (object instanceof THREE.Mesh) {
      object.receiveShadow = true;
      object.geometry.computeBoundingBox();
      const size = object.geometry.boundingBox!.getSize(new THREE.Vector3());
      // Thin inlays and paving must not cast self-shadow stripes on the floor.
      object.castShadow = size.y > 0.2;
    } });
    root.updateMatrixWorld(true);
    return;
  }
  if (rank === 'Platino' && !root.getObjectByName('wow-platinum-floor')) completePlatinumFloor(root);
  const floor = ARENA_FLOORS[rank];
  const board = new THREE.Box3();
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const p = axialToWorld3D(rowColToAxial(row, col));
      board.expandByPoint(new THREE.Vector3(p.x, 0, p.z));
    }
  }
  board.expandByScalar(ARENA_CONFIG.hexGrid.radius + 0.5);
  const size = board.getSize(new THREE.Vector3());
  const center = board.getCenter(new THREE.Vector3());
  const scale = floor.scale * Math.max(size.x / 16.7, (size.z + 4) / 14.31);
  root.scale.setScalar(scale);
  root.position.set(center.x - floor.x * scale, -0.08 - floor.y * scale, center.z - floor.z * scale);
  root.traverse(object => {
    if (object instanceof THREE.Mesh) object.receiveShadow = true;
  });
  root.updateMatrixWorld(true);
}

/** This export contains the surrounding architecture but no central ground. */
function completePlatinumFloor(root: THREE.Object3D) {
  let source: THREE.MeshStandardMaterial | undefined;
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material instanceof THREE.MeshStandardMaterial && material.name === 'mat_7ne_floor_01_weathered') source = material;
    }
  });
  const material = source?.clone() ?? new THREE.MeshStandardMaterial({ color: 0x65717a, roughness: 0.9 });
  if (material.map) {
    material.map = material.map.clone();
    material.map.wrapS = material.map.wrapT = THREE.RepeatWrapping;
    material.map.repeat.set(8, 8);
  }
  material.transparent = false;
  material.opacity = 1;
  material.side = THREE.DoubleSide;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(85, 85), material);
  floor.name = 'wow-platinum-floor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(-5, -8, 5);
  root.add(floor);
}

export async function loadWowArena(rank: WowArena): Promise<THREE.Group> {
  const draco = new DRACOLoader().setDecoderPath('/draco/').setDecoderConfig({ type: 'wasm' });
  draco.setWorkerLimit(2);
  try {
    const filename = rank === 'Diamante' ? 'Arena-Diamante-Autochess.glb' : `Arena-${rank}.glb`;
    const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(`/Arenas/${filename}`);
    try {
      fitArenaToBoard(gltf.scene, rank);
      return gltf.scene;
    } catch (error) {
      disposeArena(gltf.scene);
      throw error;
    }
  } finally {
    draco.dispose();
  }
}
