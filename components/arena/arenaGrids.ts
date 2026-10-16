import * as THREE from 'three';
import { BOARD_ROWS, BOARD_COLS, axialToWorld3D, benchIndexToWorld3D, enemyBenchIndexToWorld3D, rowColToAxial } from '@/engine/hexMath';
import { ARENA_CONFIG } from './arenaConfig';

const GRID_COLOR = 0x63c8d6;
// Picking surfaces never write color or depth. Visible guides are separate children.
function pickingMaterial() {
  return new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
}
function outline(points: THREE.Vector3[], name = 'placement-guide') {
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: GRID_COLOR, transparent: true, opacity: 0.65, depthWrite: false }));
  line.name = name;
  line.visible = false;
  line.raycast = () => {}; // Only the surface participates in picking.
  return line;
}
function hexPoints(radius: number, y = 0.03) {
  return Array.from({ length: 6 }, (_, i) => new THREE.Vector3(Math.sin(i * Math.PI / 3) * radius, y, Math.cos(i * Math.PI / 3) * radius));
}
function benchPoints(y = 0.025) {
  return [[-.76, -.65], [.76, -.65], [.76, .65], [-.76, .65]].map(([x, z]) => new THREE.Vector3(x, y, z));
}
export function createBoardHexes(scene: THREE.Scene): Map<string, THREE.Mesh> {
  const conf = ARENA_CONFIG.hexGrid;
  const geometry = new THREE.CylinderGeometry(conf.radius, conf.radius, conf.height, 6);
  const material = pickingMaterial();
  const result = new Map<string, THREE.Mesh>();
  for (let row = 0; row < BOARD_ROWS; row++) for (let col = 0; col < BOARD_COLS; col++) {
    const axial = rowColToAxial(row, col);
    const pos = axialToWorld3D(axial);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pos.x, 0, pos.z);
    mesh.userData = { row, col, q: axial.q, rAxial: axial.r, isBoardHex: true };
    mesh.add(outline(hexPoints(conf.radius)));
    scene.add(mesh);
    result.set(`${axial.q},${axial.r}`, mesh);
  }
  return result;
}
function createBench(scene: THREE.Scene, enemy: boolean) {
  const geometry = new THREE.BoxGeometry(1.52, 0.015, 1.3);
  const material = pickingMaterial();
  return Array.from({ length: 9 }, (_, index) => {
    const pos = enemy ? enemyBenchIndexToWorld3D(index) : benchIndexToWorld3D(index);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.userData = enemy ? { enemyBenchIndex: index, isEnemyBenchHex: true } : { benchIndex: index, isBenchHex: true };
    mesh.add(outline(benchPoints()));
    scene.add(mesh);
    return mesh;
  });
}
export const createAllyBenchHexes = (scene: THREE.Scene) => createBench(scene, false);
export const createEnemyBenchHexes = (scene: THREE.Scene) => createBench(scene, true);

export function setPlacementGridVisible(board: Map<string, THREE.Mesh>, bench: THREE.Mesh[], visible: boolean) {
  board.forEach(mesh => { mesh.getObjectByName('placement-guide')!.visible = visible && mesh.userData.row >= 4; });
  bench.forEach(mesh => { mesh.getObjectByName('placement-guide')!.visible = visible; });
}
export type PlacementTarget = {
  kind: 'board'; row: number; col: number; pos: { x: number; y: number; z: number };
} | { kind: 'bench'; index: number; pos: { x: number; y: number; z: number } };
export function findPlacementTarget(point: { x: number; z: number }, benchPosition: (index: number) => { x: number; y: number; z: number }): PlacementTarget | null {
  let nearest: PlacementTarget | null = null;
  let distance = Infinity;
  for (let row = 4; row < BOARD_ROWS; row++) for (let col = 0; col < BOARD_COLS; col++) {
    const pos = axialToWorld3D(rowColToAxial(row, col), 0.12);
    const d = Math.hypot(point.x - pos.x, point.z - pos.z);
    if (d < distance && d < 1.0) { distance = d; nearest = { kind: 'board', row, col, pos }; }
  }
  for (let index = 0; index < 9; index++) {
    const pos = benchPosition(index);
    const d = Math.hypot(point.x - pos.x, point.z - pos.z);
    if (d < distance && Math.abs(point.x - pos.x) < .79 && Math.abs(point.z - pos.z) < .70) {
      distance = d; nearest = { kind: 'bench', index, pos };
    }
  }
  return nearest;
}
export function createDragHighlightMesh(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  const hex = outline(hexPoints(0.74, 0), 'target-board');
  const bench = outline(benchPoints(0), 'target-bench');
  for (const line of [hex, bench]) { line.material.opacity = 1; line.material.color.setHex(0xb5f2f4); }
  group.add(hex, bench);
  group.visible = false;
  scene.add(group);
  return group;
}
export function showPlacementTarget(group: THREE.Group, target: PlacementTarget | null) {
  group.visible = target !== null;
  if (!target) return;
  group.position.set(target.pos.x, 0.12, target.pos.z);
  group.getObjectByName('target-board')!.visible = target.kind === 'board';
  group.getObjectByName('target-bench')!.visible = target.kind === 'bench';
}
