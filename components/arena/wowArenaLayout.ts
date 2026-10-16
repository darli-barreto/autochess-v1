import * as THREE from 'three';
import { benchIndexToWorld3D, enemyBenchIndexToWorld3D } from '@/engine/hexMath';
import { ARENA_CONFIG } from './arenaConfig';
import type { WowArena } from './wowArenas';

// Coordinates match scripts/build-diamond-arena.py (already in game units).
export function getArenaBenchPosition(rank: WowArena, index: number, enemy = false) {
  if (rank === 'Diamante') return { x: 0.6 + (index - 4) * 1.65, y: 0.1, z: enemy ? -6.1 : 7.5 };
  return enemy ? enemyBenchIndexToWorld3D(index) : benchIndexToWorld3D(index);
}

export function getArenaCamera(rank: WowArena) {
  return rank === 'Diamante'
    ? { defaultPosition: new THREE.Vector3(0.6, 28.314, 29.012), defaultLookAt: new THREE.Vector3(0.6, 0, 1.4) }
    : ARENA_CONFIG.camera;
}

export function getArenaTacticianPosition(rank: WowArena, enemy = false) {
  if (rank === 'Diamante') return enemy ? new THREE.Vector3(10.8, 0.08, -4.2) : new THREE.Vector3(-9.6, 0.08, 5.6);
  return enemy ? new THREE.Vector3(6.2, 0.05, -5.4) : new THREE.Vector3(-6.2, 0.05, 5.4);
}
