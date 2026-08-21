// src/components/arena/arenaGrids.ts

import * as THREE from 'three';
import {
  BOARD_ROWS,
  BOARD_COLS,
  axialToWorld3D,
  benchIndexToWorld3D,
  enemyBenchIndexToWorld3D,
  rowColToAxial,
} from '@/engine/hexMath';
import { ARENA_CONFIG } from './arenaConfig';

export function createBoardHexes(scene: THREE.Scene): Map<string, THREE.Mesh> {
  const conf = ARENA_CONFIG.hexGrid;
  const hexGeo = new THREE.CylinderGeometry(conf.radius, conf.radius, conf.height, 6);

  const allyMat = new THREE.MeshStandardMaterial({
    color: conf.ally.color,
    roughness: conf.ally.roughness,
    metalness: conf.ally.metalness,
  });

  const enemyMat = new THREE.MeshStandardMaterial({
    color: conf.enemy.color,
    roughness: conf.enemy.roughness,
    metalness: conf.enemy.metalness,
  });

  const hexMap = new Map<string, THREE.Mesh>();

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const axial = rowColToAxial(r, c);
      const pos = axialToWorld3D(axial, 0);

      const isAllySide = r >= 4;
      const mesh = new THREE.Mesh(hexGeo, isAllySide ? allyMat.clone() : enemyMat.clone());
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.receiveShadow = true;
      mesh.userData = {
        row: r,
        col: c,
        q: axial.q,
        rAxial: axial.r,
        isBoardHex: true,
      };

      // Borde del Hexágono
      const edges = new THREE.EdgesGeometry(hexGeo);
      const lineMat = new THREE.LineBasicMaterial({
        color: isAllySide ? conf.ally.outlineColor : conf.enemy.outlineColor,
        transparent: true,
        opacity: isAllySide ? conf.ally.outlineOpacity : conf.enemy.outlineOpacity,
      });
      const line = new THREE.LineSegments(edges, lineMat);
      mesh.add(line);

      scene.add(mesh);
      hexMap.set(`${axial.q},${axial.r}`, mesh);
    }
  }

  return hexMap;
}

export function createAllyBenchHexes(scene: THREE.Scene): THREE.Mesh[] {
  const bConf = ARENA_CONFIG.benches;
  const benchGeo = new THREE.CylinderGeometry(bConf.radius, bConf.radius, bConf.height, 6);
  const allyBenchMat = new THREE.MeshStandardMaterial({
    color: bConf.ally.color,
    roughness: 0.35,
    metalness: 0.5,
  });
  const benchList: THREE.Mesh[] = [];

  for (let i = 0; i < 9; i++) {
    const pos = benchIndexToWorld3D(i);
    const bMesh = new THREE.Mesh(benchGeo, allyBenchMat.clone());
    bMesh.position.set(pos.x, pos.y, pos.z);
    bMesh.receiveShadow = true;
    bMesh.userData = { benchIndex: i, isBenchHex: true };

    const bEdges = new THREE.EdgesGeometry(benchGeo);
    const bLine = new THREE.LineSegments(
      bEdges,
      new THREE.LineBasicMaterial({
        color: bConf.ally.outlineColor,
        transparent: true,
        opacity: 0.9,
      })
    );
    bMesh.add(bLine);

    const innerRingGeo = new THREE.RingGeometry(0, 0, 0);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: bConf.ally.innerRingColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.08;
    bMesh.add(innerRing);

    scene.add(bMesh);
    benchList.push(bMesh);
  }

  return benchList;
}

export function createEnemyBenchHexes(scene: THREE.Scene): THREE.Mesh[] {
  const bConf = ARENA_CONFIG.benches;
  const benchGeo = new THREE.CylinderGeometry(bConf.radius, bConf.radius, bConf.height, 6);
  const enemyBenchMat = new THREE.MeshStandardMaterial({
    color: bConf.enemy.color,
    roughness: 0.45,
    metalness: 0.45,
  });
  const enemyBenchList: THREE.Mesh[] = [];

  for (let i = 0; i < 9; i++) {
    const pos = enemyBenchIndexToWorld3D(i);
    const ebMesh = new THREE.Mesh(benchGeo, enemyBenchMat.clone());
    ebMesh.position.set(pos.x, pos.y, pos.z);
    ebMesh.receiveShadow = true;
    ebMesh.userData = { enemyBenchIndex: i, isEnemyBenchHex: true };

    const ebEdges = new THREE.EdgesGeometry(benchGeo);
    const ebLine = new THREE.LineSegments(
      ebEdges,
      new THREE.LineBasicMaterial({
        color: bConf.enemy.outlineColor,
        transparent: true,
        opacity: 0.75,
      })
    );
    ebMesh.add(ebLine);

    const innerRingGeo = new THREE.RingGeometry(0, 0, 6);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: bConf.enemy.innerRingColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.08;
    ebMesh.add(innerRing);

    scene.add(ebMesh);
    enemyBenchList.push(ebMesh);
  }

  return enemyBenchList;
}

export function createDragHighlightMesh(scene: THREE.Scene): THREE.Group {
  const hlConf = ARENA_CONFIG.dragHighlight;
  const dragHlGroup = new THREE.Group();

  const hlGeo = new THREE.RingGeometry(hlConf.innerRadius, hlConf.outerRadius, 6);
  const hlMat = new THREE.MeshBasicMaterial({
    color: hlConf.colorAlly,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const hlRing = new THREE.Mesh(hlGeo, hlMat);
  hlRing.rotation.x = -Math.PI / 2;
  hlRing.name = 'hl_ring';
  dragHlGroup.add(hlRing);

  const innerHlGeo = new THREE.CircleGeometry(hlConf.innerRadius - 0.02, 6);
  const innerHlMat = new THREE.MeshBasicMaterial({
    color: hlConf.colorAlly,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.25,
  });
  const innerHlMesh = new THREE.Mesh(innerHlGeo, innerHlMat);
  innerHlMesh.rotation.x = -Math.PI / 2;
  innerHlMesh.position.y = -0.01;
  innerHlMesh.name = 'hl_inner';
  dragHlGroup.add(innerHlMesh);

  dragHlGroup.position.set(0, 0.12, 0);
  dragHlGroup.visible = false;
  scene.add(dragHlGroup);

  return dragHlGroup;
}