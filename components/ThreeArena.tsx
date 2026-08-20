'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BoardUnit, AxialCoord, DamageNumberEvent, ProjectileEvent, VisualEffectEvent } from '@/types/game';
import { CHAMPIONS_DATA } from '@/data/champions';
import { ALL_ITEMS } from '@/data/items';
import {
  BOARD_ROWS,
  BOARD_COLS,
  axialToWorld3D,
  benchIndexToWorld3D,
  enemyBenchIndexToWorld3D,
  rowColToAxial,
  axialToRowCol,
  hexDistance,
} from '@/engine/hexMath';
import { CombatEngine } from '@/engine/combatEngine';
import { championModelManager } from '@/engine/championModelManager';
import { LittleLegendManager, LittleLegendEntity } from '@/engine/littleLegendManager';
import { getLittleLegendById } from '@/data/littleLegends';

interface ThreeArenaProps {
  boardUnits: BoardUnit[];
  benchUnits: (BoardUnit | null)[];
  enemyBenchUnits?: (BoardUnit | null)[];
  combatEngine: CombatEngine | null;
  isCombatPhase: boolean;
  selectedUnitId: string | null;
  playerLegendId?: string;
  opponentLegendId?: string;
  playerName?: string;
  opponentName?: string;
  onSelectUnit: (unit: BoardUnit | null) => void;
  onMoveUnit: (unitId: string, row: number, col: number) => void;
  onMoveToBench: (unitId: string, benchIndex?: number) => void;
  onSellUnit?: (unit: BoardUnit) => void;
  showDebugOverlay: boolean;
  onDebugStatsUpdate?: (stats: { fps: number; drawCalls: number; triangles: number }) => void;
  onTriggerEmoteRef?: React.MutableRefObject<((emote: 'DANCE' | 'TAUNT' | 'CHEER' | 'LAUGH') => void) | null>;
  onZoomInRef?: React.MutableRefObject<(() => void) | null>;
  onZoomOutRef?: React.MutableRefObject<(() => void) | null>;
  onResetCameraRef?: React.MutableRefObject<(() => void) | null>;
  onToggleFollowTacticianRef?: React.MutableRefObject<(() => void) | null>;
  onInspectUnitRef?: React.MutableRefObject<((unit: BoardUnit) => void) | null>;
  isFollowingTactician?: boolean;
  setIsFollowingTactician?: (following: boolean) => void;
  isInspectingChampion?: boolean;
  setIsInspectingChampion?: (inspecting: boolean) => void;
}

export const ThreeArena: React.FC<ThreeArenaProps> = ({
  boardUnits,
  benchUnits,
  enemyBenchUnits,
  combatEngine,
  isCombatPhase,
  selectedUnitId,
  playerLegendId = 'river_sprite',
  opponentLegendId = 'pengu_knight',
  playerName = 'Estratega',
  opponentName = 'Rival',
  onSelectUnit,
  onMoveUnit,
  onMoveToBench,
  onSellUnit,
  showDebugOverlay,
  onDebugStatsUpdate,
  onTriggerEmoteRef,
  onZoomInRef,
  onZoomOutRef,
  onResetCameraRef,
  onToggleFollowTacticianRef,
  onInspectUnitRef,
  isFollowingTactician = false,
  setIsFollowingTactician,
  isInspectingChampion = false,
  setIsInspectingChampion,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Little Legend / Tactician Entities
  const playerLegendEntityRef = useRef<LittleLegendEntity | null>(null);
  const opponentLegendEntityRef = useRef<LittleLegendEntity | null>(null);
  const activeClickPingsRef = useRef<{ mesh: THREE.Group; birthTime: number; duration: number }[]>([]);

  // Camera Zoom & Dynamic Focus Controls
  const targetCameraPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 22.0, 15.8));
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 1.7));
  const currentLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 1.7));
  const zoomDistanceRef = useRef<number>(27.0);
  const inspectingUnitRef = useRef<BoardUnit | null>(null);
  const isFollowingTacticianLocalRef = useRef<boolean>(isFollowingTactician);

  useEffect(() => {
    isFollowingTacticianLocalRef.current = isFollowingTactician;
  }, [isFollowingTactician]);

  // Mesh registries
  const unitMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const unitMixersRef = useRef<Map<string, THREE.AnimationMixer>>(new Map());
  const hexMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const benchHexMeshesRef = useRef<THREE.Mesh[]>([]);
  const enemyBenchHexMeshesRef = useRef<THREE.Mesh[]>([]);
  const floatingDamageTextsRef = useRef<{ mesh: THREE.Sprite; birthTime: number; startY: number }[]>([]);
  const activeProjectilesRef = useRef<{ mesh: THREE.Mesh; p: ProjectileEvent; birthTime: number }[]>([]);
  const activeVfxRef = useRef<{ mesh: THREE.Mesh; vfx: VisualEffectEvent; birthTime: number }[]>([]);
  const debugLinesGroupRef = useRef<THREE.Group | null>(null);
  const flamesRef = useRef<{ mesh: THREE.Mesh; light: THREE.PointLight; baseIntensity: number; phase: number }[]>([]);

  // Dragging & Interaction State
  const [draggedUnit, setDraggedUnit] = useState<BoardUnit | null>(null);
  const draggedUnitRef = useRef<BoardUnit | null>(null);
  const dragPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.2, 0));
  const dragHighlightMeshRef = useRef<THREE.Group | null>(null);

  const [hoveredHex, setHoveredHex] = useState<{ row: number; col: number } | null>(null);
  const [hoveredBenchIdx, setHoveredBenchIdx] = useState<number | null>(null);
  const [hoveredTargetUnit, setHoveredTargetUnit] = useState<BoardUnit | null>(null);
  const [isOverSellZone, setIsOverSellZone] = useState<boolean>(false);

  // Debug stats callback ref
  const onDebugStatsUpdateRef = useRef(onDebugStatsUpdate);
  useEffect(() => {
    onDebugStatsUpdateRef.current = onDebugStatsUpdate;
  }, [onDebugStatsUpdate]);
  const lastFpsTimeRef = useRef(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    lastFpsTimeRef.current = performance.now();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // --- 1. Scene & Camera Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1424);
    scene.fog = new THREE.Fog(0x0e1424, 45, 95);
    sceneRef.current = scene;

    // Adjusted camera perspective so opponent top bench and ally bottom bench are completely visible and clear of HUDs
    const camera = new THREE.PerspectiveCamera(39, width / height, 0.1, 1000);
    camera.position.set(0, 22.0, 15.8);
    camera.lookAt(0, 0, 1.7);
    cameraRef.current = camera;

    // --- 2. Renderer ---
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- 3. Lighting ---
    // Radiant Sky & Ground Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0xfff7ed, 0x1e3a8a, 1.4);
    scene.add(hemiLight);

    // Crisp Directional Sunlight with soft shadows
    const dirLight = new THREE.DirectionalLight(0xfffaea, 2.2);
    dirLight.position.set(12, 24, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0004;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -16;
    dirLight.shadow.camera.right = 16;
    dirLight.shadow.camera.top = 16;
    dirLight.shadow.camera.bottom = -16;
    scene.add(dirLight);

    // Celestial Cyan Rim Light
    const cyanRim = new THREE.DirectionalLight(0x38bdf8, 1.3);
    cyanRim.position.set(-16, 12, -14);
    scene.add(cyanRim);

    // Warm Amber/Gold Rim Light
    const goldRim = new THREE.DirectionalLight(0xf59e0b, 1.0);
    goldRim.position.set(16, 8, -10);
    scene.add(goldRim);

    // Ambient fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Central magical arena glow
    const centerPointLight = new THREE.PointLight(0x38bdf8, 1.5, 24);
    centerPointLight.position.set(0, 3, 0);
    scene.add(centerPointLight);

    // --- 4. Environment: Floating Island Platform & Stone Ground ---
    // Outer floating stone foundation
    const islandGeo = new THREE.CylinderGeometry(16.5, 17.8, 3.2, 36);
    const islandMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.3,
    });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.set(0, -1.65, 0.0);
    island.receiveShadow = true;
    scene.add(island);

    // Arena Central Grass / Earth Ground Platform
    const arenaGroundGeo = new THREE.BoxGeometry(14.2, 0.3, 16.2);
    const arenaGroundMat = new THREE.MeshStandardMaterial({
      color: 0x1e3833, // Vibrant TFT enchanted emerald stone / grass
      roughness: 0.55,
      metalness: 0.25,
    });
    const arenaGround = new THREE.Mesh(arenaGroundGeo, arenaGroundMat);
    arenaGround.position.set(0, -0.15, 0.0);
    arenaGround.receiveShadow = true;
    scene.add(arenaGround);

    // Top Stone Platform for Opponent Bench
    const topStoneGeo = new THREE.BoxGeometry(13.4, 0.22, 1.9);
    const stoneBenchMat = new THREE.MeshStandardMaterial({
      color: 0x1e2638,
      roughness: 0.65,
      metalness: 0.35,
    });
    const topStone = new THREE.Mesh(topStoneGeo, stoneBenchMat);
    topStone.position.set(0, -0.02, -6.7);
    topStone.receiveShadow = true;
    scene.add(topStone);

    // Bottom Stone Platform for Allied Bench
    const bottomStoneGeo = new THREE.BoxGeometry(13.4, 0.22, 1.9);
    const bottomStone = new THREE.Mesh(bottomStoneGeo, stoneBenchMat.clone());
    bottomStone.position.set(0, -0.02, 6.7);
    bottomStone.receiveShadow = true;
    scene.add(bottomStone);

    // Island Glowing Rim
    const rimGeo = new THREE.TorusGeometry(16.6, 0.15, 16, 64);
    const rimMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, -0.05, 0.0);
    scene.add(rim);

    // --- 4 corner Stone Braziers with Animated Burning Fire (matching screenshot) ---
    const brazierPositions = [
      { x: -7.2, z: -7.4 },
      { x: 7.2, z: -7.4 },
      { x: -7.2, z: 7.4 },
      { x: 7.2, z: 7.4 },
    ];
    const brazierGeo = new THREE.CylinderGeometry(0.45, 0.65, 1.1, 8);
    const brazierMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const flameList: { mesh: THREE.Mesh; light: THREE.PointLight; baseIntensity: number; phase: number }[] = [];

    brazierPositions.forEach((pos, idx) => {
      const bMesh = new THREE.Mesh(brazierGeo, brazierMat);
      bMesh.position.set(pos.x, 0.5, pos.z);
      bMesh.castShadow = true;
      scene.add(bMesh);

      // Fire Bowl
      const bowlGeo = new THREE.CylinderGeometry(0.6, 0.35, 0.35, 8);
      const bowlMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
      const bowl = new THREE.Mesh(bowlGeo, bowlMat);
      bowl.position.set(pos.x, 1.1, pos.z);
      scene.add(bowl);

      // Flame Mesh
      const flameGeo = new THREE.ConeGeometry(0.3, 0.75, 8);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.9 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(pos.x, 1.45, pos.z);
      scene.add(flame);

      // Flame point light
      const fLight = new THREE.PointLight(0xf59e0b, 1.6, 10);
      fLight.position.set(pos.x, 1.6, pos.z);
      scene.add(fLight);

      flameList.push({ mesh: flame, light: fLight, baseIntensity: 1.6, phase: idx * 1.5 });
    });
    flamesRef.current = flameList;

    // --- Side Interest Gold Pots & Rocks (Left & Right side like TFT screenshot) ---
    // Left side interest pots
    for (let p = 0; p < 4; p++) {
      const potGeo = new THREE.DodecahedronGeometry(0.38 + p * 0.04);
      const potMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.85,
        roughness: 0.25,
      });
      const pot = new THREE.Mesh(potGeo, potMat);
      pot.position.set(-6.8 + (p % 2) * 0.5, 0.3, -1.0 + p * 1.2);
      pot.rotation.set(0.2 * p, 0.4 * p, 0);
      pot.castShadow = true;
      scene.add(pot);
    }

    // --- 5. Build Hex Grid Meshes (8 rows x 7 cols) ---
    const hexGeo = new THREE.CylinderGeometry(0.96, 0.96, 0.15, 6);
    const allyMat = new THREE.MeshStandardMaterial({
      color: 0x162234,
      roughness: 0.35,
      metalness: 0.45,
    });
    const enemyMat = new THREE.MeshStandardMaterial({
      color: 0x241624,
      roughness: 0.4,
      metalness: 0.45,
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
        mesh.userData = { row: r, col: c, q: axial.q, rAxial: axial.r, isBoardHex: true };

        // Hex Border Outline
        const edges = new THREE.EdgesGeometry(hexGeo);
        const lineMat = new THREE.LineBasicMaterial({
          color: isAllySide ? 0x00e5ff : 0xf43f5e,
          transparent: true,
          opacity: isAllySide ? 0.75 : 0.65,
        });
        const line = new THREE.LineSegments(edges, lineMat);
        mesh.add(line);

        scene.add(mesh);
        hexMap.set(`${axial.q},${axial.r}`, mesh);
      }
    }
    hexMeshesRef.current = hexMap;

    // Midfield Dividing Glowing Line
    const dividerGeo = new THREE.BoxGeometry(11.5, 0.05, 0.08);
    const dividerMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });
    const divider = new THREE.Mesh(dividerGeo, dividerMat);
    divider.position.set(0, 0.09, 0.0);
    scene.add(divider);

    // --- 6. Build Allied Bench Hex Meshes (Bottom 9 slots, z = 5.8) ---
    const benchGeo = new THREE.CylinderGeometry(0.88, 0.88, 0.15, 6);
    const allyBenchMat = new THREE.MeshStandardMaterial({
      color: 0x162238,
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

      // Bench cyan glowing rim
      const bEdges = new THREE.EdgesGeometry(benchGeo);
      const bLine = new THREE.LineSegments(
        bEdges,
        new THREE.LineBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.9 })
      );
      bMesh.add(bLine);

      // Inner pedestal ring
      const innerRingGeo = new THREE.RingGeometry(0.4, 0.62, 6);
      const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
      const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.y = 0.08;
      bMesh.add(innerRing);

      scene.add(bMesh);
      benchList.push(bMesh);
    }
    benchHexMeshesRef.current = benchList;

    // --- 7. Build Opponent Bench Hex Meshes (Top 9 slots, z = -5.8) ---
    const enemyBenchMat = new THREE.MeshStandardMaterial({
      color: 0x241620,
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

      // Opponent bench crimson glowing rim
      const ebEdges = new THREE.EdgesGeometry(benchGeo);
      const ebLine = new THREE.LineSegments(
        ebEdges,
        new THREE.LineBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.75 })
      );
      ebMesh.add(ebLine);

      // Inner ruby ring
      const innerRingGeo = new THREE.RingGeometry(0.4, 0.62, 6);
      const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide, transparent: true, opacity: 0.45 });
      const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.y = 0.08;
      ebMesh.add(innerRing);

      scene.add(ebMesh);
      enemyBenchList.push(ebMesh);
    }
    enemyBenchHexMeshesRef.current = enemyBenchList;

    // --- Active Tile Drag Highlight Indicator ---
    const dragHlGroup = new THREE.Group();
    const hlGeo = new THREE.RingGeometry(0.72, 0.96, 6);
    const hlMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const hlRing = new THREE.Mesh(hlGeo, hlMat);
    hlRing.rotation.x = -Math.PI / 2;
    hlRing.name = 'hl_ring';
    dragHlGroup.add(hlRing);

    const innerHlGeo = new THREE.CircleGeometry(0.7, 6);
    const innerHlMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
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
    dragHighlightMeshRef.current = dragHlGroup;

    // Debug lines group
    const debugGroup = new THREE.Group();
    scene.add(debugGroup);
    debugLinesGroupRef.current = debugGroup;

    // --- 7. Animation Loop ---
    let animationId: number;
    let lastTime = performance.now();
    const startTime = performance.now();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const currentTime = performance.now();
      const delta = Math.min(0.1, (currentTime - lastTime) / 1000);
      const elapsed = (currentTime - startTime) / 1000;
      lastTime = currentTime;

      // Track FPS & stats
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsTimeRef.current >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current));
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
        if (onDebugStatsUpdateRef.current && rendererRef.current) {
          onDebugStatsUpdateRef.current({
            fps,
            drawCalls: rendererRef.current.info.render.calls,
            triangles: rendererRef.current.info.render.triangles,
          });
        }
      }

      // Animate Flames on Braziers
      flamesRef.current.forEach((f) => {
        const flicker = Math.sin(elapsed * 8 + f.phase) * 0.15 + Math.cos(elapsed * 12 + f.phase) * 0.1;
        f.mesh.scale.set(1 + flicker * 0.3, 1 + flicker * 0.5, 1 + flicker * 0.3);
        f.light.intensity = f.baseIntensity + flicker * 0.4;
      });

      // Animate Drag Indicator Ring
      if (dragHighlightMeshRef.current && dragHighlightMeshRef.current.visible) {
        const ring = dragHighlightMeshRef.current.getObjectByName('hl_ring');
        if (ring) {
          ring.rotation.z += delta * 1.5;
        }
      }

      // Animate Units (Smooth continuous position interpolation towards target hex/bench, bobbing, rotating)
      unitMeshesRef.current.forEach((group) => {
        const meshObj = group.userData.unit as BoardUnit;
        if (!meshObj) return;

        // If being dragged by player, follow dragPosRef with elevated height
        if (meshObj.instanceId === draggedUnitRef.current?.instanceId) {
          group.position.x = THREE.MathUtils.lerp(group.position.x, dragPosRef.current.x, 0.45);
          group.position.z = THREE.MathUtils.lerp(group.position.z, dragPosRef.current.z, 0.45);
          group.position.y = THREE.MathUtils.lerp(group.position.y, 1.25, 0.35);
          group.scale.set(1.15, 1.15, 1.15);
          return;
        }

        let targetPos = { x: 0, y: 0.2, z: 0 };
        if (meshObj.benchIndex !== null) {
          targetPos = meshObj.team === 'enemy'
            ? enemyBenchIndexToWorld3D(meshObj.benchIndex)
            : benchIndexToWorld3D(meshObj.benchIndex);
        } else if (meshObj.gridPosition) {
          targetPos = axialToWorld3D(meshObj.gridPosition, 0.2);
        }

        // Smooth continuous lerp directly to target hex center with delta-scaled factor
        group.position.x = THREE.MathUtils.lerp(group.position.x, targetPos.x, Math.min(1, delta * 14));
        group.position.z = THREE.MathUtils.lerp(group.position.z, targetPos.z, Math.min(1, delta * 14));

        // Smooth rotation towards enemy side or target
        const targetRot = meshObj.team === 'enemy' ? Math.PI : 0;
        group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetRot, Math.min(1, delta * 10));

        // Idle breathing bob on y
        const baseOffsetY = meshObj.state === 'MOVING' ? 0.35 : 0.2;
        const bob = Math.sin(elapsed * 3.5 + Number(group.id)) * 0.04;
        group.position.y = THREE.MathUtils.lerp(group.position.y, baseOffsetY + bob, Math.min(1, delta * 12));
        group.scale.set(1.0, 1.0, 1.0);

        // Pulse selected ring
        const selectRing = group.getObjectByName('select_ring');
        if (selectRing) {
          selectRing.rotation.z += delta * 2;
        }

        // Star 3 golden aura spin
        const aura = group.getObjectByName('star3_aura');
        if (aura) {
          aura.rotation.y += delta * 1.5;
        }
      });

      // Animate floating damage numbers
      for (let i = floatingDamageTextsRef.current.length - 1; i >= 0; i--) {
        const item = floatingDamageTextsRef.current[i];
        const age = (now - item.birthTime) / 1000;
        if (age > 1.2) {
          scene.remove(item.mesh);
          floatingDamageTextsRef.current.splice(i, 1);
        } else {
          item.mesh.position.y = item.startY + age * 1.5;
          (item.mesh.material as THREE.SpriteMaterial).opacity = 1 - age / 1.2;
        }
      }

      // Animate Active Projectiles
      for (let i = activeProjectilesRef.current.length - 1; i >= 0; i--) {
        const proj = activeProjectilesRef.current[i];
        const age = (now - proj.birthTime) / 1000;
        proj.p.progress += delta * (proj.p.speed || 8);

        if (proj.p.progress >= 1 || age > 1.0) {
          scene.remove(proj.mesh);
          activeProjectilesRef.current.splice(i, 1);
        } else {
          const t = Math.min(1, proj.p.progress);
          proj.mesh.position.lerpVectors(
            new THREE.Vector3(proj.p.sourceX, proj.p.sourceY, proj.p.sourceZ),
            new THREE.Vector3(proj.p.targetX, proj.p.targetY, proj.p.targetZ),
            t
          );
          // Arch upward
          proj.mesh.position.y += Math.sin(t * Math.PI) * 0.6;
        }
      }

      // Animate VFX rings
      for (let i = activeVfxRef.current.length - 1; i >= 0; i--) {
        const v = activeVfxRef.current[i];
        const age = (now - v.birthTime) / 1000;
        if (age > v.vfx.duration) {
          scene.remove(v.mesh);
          activeVfxRef.current.splice(i, 1);
        } else {
          const scale = 1 + (age / v.vfx.duration) * (v.vfx.radius || 1.5);
          v.mesh.scale.set(scale, scale, scale);
          (v.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - age / v.vfx.duration;
        }
      }

      // Animate 3D character animation mixers
      unitMixersRef.current.forEach((mixer) => {
        mixer.update(delta);
      });

      // --- Camera Smooth Interpolation & Dynamic Following ---
      if (isFollowingTacticianLocalRef.current && playerLegendEntityRef.current) {
        const pPos = playerLegendEntityRef.current.currentPos;
        targetLookAtRef.current.set(pPos.x, 0.8, pPos.z);
        targetCameraPosRef.current.set(pPos.x, 8.5, pPos.z + 7.5);
      }

      camera.position.lerp(targetCameraPosRef.current, Math.min(1, delta * 6.5));
      currentLookAtRef.current.lerp(targetLookAtRef.current, Math.min(1, delta * 6.5));
      camera.lookAt(currentLookAtRef.current);

      // --- Animate Little Legend Tacticians (Player & Opponent) ---
      const animateTactician = (tactician: LittleLegendEntity | null, isPlayer: boolean) => {
        if (!tactician) return;
        const avatar = tactician.group.getObjectByName('tactician_avatar');
        const rim = tactician.group.getObjectByName('tactician_rim');

        if (rim) {
          rim.rotation.z += delta * 1.5;
        }

        // Emote timers & speech bubble lifecycle
        if (tactician.stateTimer > 0) {
          tactician.stateTimer -= delta;
          if (tactician.stateTimer <= 0) {
            tactician.state = 'IDLE';
            if (tactician.bubbleSprite) {
              tactician.group.remove(tactician.bubbleSprite);
              tactician.bubbleSprite = null;
            }
          }
        }

        // Movement towards targetPos
        if (tactician.targetPos) {
          const dx = tactician.targetPos.x - tactician.currentPos.x;
          const dz = tactician.targetPos.z - tactician.currentPos.z;
          const dist = Math.hypot(dx, dz);

          if (dist < 0.15) {
            tactician.currentPos.copy(tactician.targetPos);
            tactician.targetPos = null;
            if (tactician.state === 'RUNNING') {
              tactician.state = 'IDLE';
            }
          } else {
            tactician.state = 'RUNNING';
            const targetAngle = Math.atan2(dx, dz);
            // Smooth rotation towards travel direction
            tactician.facingAngle = THREE.MathUtils.lerp(
              tactician.facingAngle,
              targetAngle,
              Math.min(1, delta * 14)
            );

            // Advance position
            const moveStep = Math.min(dist, tactician.speed * delta);
            tactician.currentPos.x += (dx / dist) * moveStep;
            tactician.currentPos.z += (dz / dist) * moveStep;
          }
        }

        // Apply position and rotation to Three.js Group
        tactician.group.position.set(
          tactician.currentPos.x,
          tactician.currentPos.y,
          tactician.currentPos.z
        );
        tactician.group.rotation.y = tactician.facingAngle;

        // Animations based on state
        if (avatar) {
          if (tactician.state === 'RUNNING') {
            const runBounce = Math.abs(Math.sin(elapsed * 16)) * 0.22;
            const runTilt = Math.sin(elapsed * 16) * 0.14;
            avatar.position.y = runBounce;
            avatar.rotation.z = runTilt;
            avatar.rotation.x = 0.15; // Lean forward
          } else if (tactician.state === 'DANCE') {
            tactician.group.rotation.y += delta * 9;
            avatar.position.y = Math.abs(Math.sin(elapsed * 12)) * 0.28;
            avatar.rotation.z = Math.sin(elapsed * 12) * 0.2;
            avatar.rotation.x = 0;
          } else if (tactician.state === 'TAUNT') {
            avatar.position.y = Math.abs(Math.sin(elapsed * 9)) * 0.45;
            avatar.rotation.z = (Math.random() - 0.5) * 0.3;
            avatar.rotation.x = -0.2;
          } else if (tactician.state === 'CHEER' || tactician.state === 'LAUGH') {
            avatar.position.y = Math.abs(Math.sin(elapsed * 14)) * 0.35;
            avatar.rotation.z = Math.sin(elapsed * 14) * 0.18;
            avatar.rotation.x = 0;
          } else {
            // Idle breathing
            const idleBob = Math.sin(elapsed * 3.2 + (isPlayer ? 0 : 2)) * 0.06;
            avatar.position.y = idleBob;
            avatar.rotation.z = 0;
            avatar.rotation.x = 0;
          }
        }
      };

      animateTactician(playerLegendEntityRef.current, true);
      animateTactician(opponentLegendEntityRef.current, false);

      // Animate active click pings
      for (let i = activeClickPingsRef.current.length - 1; i >= 0; i--) {
        const ping = activeClickPingsRef.current[i];
        const age = (now - ping.birthTime) / 1000;
        if (age > ping.duration) {
          scene.remove(ping.mesh);
          activeClickPingsRef.current.splice(i, 1);
        } else {
          const t = age / ping.duration;
          const scale = 1 + t * 0.8;
          ping.mesh.scale.set(scale, 1, scale);
          const ring = ping.mesh.getObjectByName('ping_ring') as THREE.Mesh;
          if (ring && ring.material) {
            (ring.material as THREE.MeshBasicMaterial).opacity = 1 - t;
          }
          const core = ping.mesh.getObjectByName('ping_core') as THREE.Mesh;
          if (core && core.material) {
            (core.material as THREE.MeshBasicMaterial).opacity = 1 - t * 0.8;
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // --- Synchronize 3D Units with Game State ---
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const enemyBenchList: BoardUnit[] = (enemyBenchUnits || [])
      .filter((u): u is BoardUnit => u !== null)
      .map((u) => ({
        ...u,
        team: 'enemy' as const,
      }));

    // Units to render: during combat, use active combat units from engine + bench; during planning, use board + bench + enemy bench
    const displayUnits: BoardUnit[] = isCombatPhase && combatEngine
      ? [...combatEngine.allies, ...combatEngine.enemies, ...benchUnits.filter((u): u is BoardUnit => u !== null), ...enemyBenchList]
      : [...boardUnits, ...benchUnits.filter((u): u is BoardUnit => u !== null), ...enemyBenchList];

    const currentIds = new Set(displayUnits.map((u) => u.instanceId));

    // Remove old unit meshes
    unitMeshesRef.current.forEach((group, id) => {
      if (!currentIds.has(id)) {
        scene.remove(group);
        unitMeshesRef.current.delete(id);
      }
    });

    // Create or update unit meshes
    for (const unit of displayUnits) {
      let group = unitMeshesRef.current.get(unit.instanceId);

      // If unit starLevel changed, remove and recreate with new scale & aura
      if (group && group.userData.unit && (group.userData.unit as BoardUnit).starLevel !== unit.starLevel) {
        scene.remove(group);
        unitMeshesRef.current.delete(unit.instanceId);
        group = undefined;
      }

      if (!group) {
        group = createUnitGroup(unit, unitMixersRef.current);
        scene.add(group);
        unitMeshesRef.current.set(unit.instanceId, group);
      }

      // Update unit position
      if (unit.instanceId !== draggedUnitRef.current?.instanceId) {
        let targetPos = { x: 0, y: 0.2, z: 0 };
        if (unit.benchIndex !== null) {
          targetPos = unit.team === 'enemy'
            ? enemyBenchIndexToWorld3D(unit.benchIndex)
            : benchIndexToWorld3D(unit.benchIndex);
        } else if (unit.gridPosition) {
          targetPos = axialToWorld3D(unit.gridPosition, 0.2);
        }

        // Smooth position lerp
        group.position.x = THREE.MathUtils.lerp(group.position.x, targetPos.x, 0.35);
        group.position.z = THREE.MathUtils.lerp(group.position.z, targetPos.z, 0.35);
        group.scale.set(1.0, 1.0, 1.0);
      }

      // Rotate towards enemy side (or target)
      if (unit.team === 'enemy') {
        group.rotation.y = Math.PI;
      } else {
        group.rotation.y = 0;
      }

      group.userData.unit = unit;

      // Update healthbar & manabar sprite
      updateUnitHealthSprite(group, unit);

      // Update selection indicator
      let selectRing = group.getObjectByName('select_ring');
      const isSelected = unit.instanceId === selectedUnitId;
      if (isSelected && !selectRing) {
        const rGeo = new THREE.RingGeometry(0.75, 0.85, 32);
        const rMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
        selectRing = new THREE.Mesh(rGeo, rMat);
        selectRing.name = 'select_ring';
        selectRing.rotation.x = Math.PI / 2;
        selectRing.position.y = -0.15;
        group.add(selectRing);
      } else if (!isSelected && selectRing) {
        group.remove(selectRing);
      }
    }
  }, [boardUnits, benchUnits, enemyBenchUnits, combatEngine, isCombatPhase, selectedUnitId]);

  // --- Little Legends (Tacticians) Lifecycle & Instantiation ---
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 1. Player Little Legend
    if (playerLegendEntityRef.current) {
      scene.remove(playerLegendEntityRef.current.group);
    }
    const playerStartPos = new THREE.Vector3(-6.2, 0.05, 5.4);
    const { group: playerGroup, legendData: playerLegendData } = LittleLegendManager.createLittleLegendGroup(
      playerLegendId,
      true,
      playerName,
      (mixer) => {
        unitMixersRef.current.set('player_legend_mixer', mixer);
      }
    );
    playerGroup.position.copy(playerStartPos);
    scene.add(playerGroup);

    playerLegendEntityRef.current = {
      id: 'player_legend',
      isPlayer: true,
      name: playerName,
      legendData: playerLegendData,
      group: playerGroup,
      currentPos: playerStartPos.clone(),
      targetPos: null,
      facingAngle: -Math.PI / 4,
      state: 'IDLE',
      stateTimer: 0,
      speed: 9.0,
      dustTimer: 0,
    };

    // 2. Opponent Little Legend
    if (opponentLegendEntityRef.current) {
      scene.remove(opponentLegendEntityRef.current.group);
    }
    const oppStartPos = new THREE.Vector3(6.2, 0.05, -5.4);
    const { group: oppGroup, legendData: oppLegendData } = LittleLegendManager.createLittleLegendGroup(
      opponentLegendId,
      false,
      opponentName,
      (mixer) => {
        unitMixersRef.current.set('opp_legend_mixer', mixer);
      }
    );
    oppGroup.position.copy(oppStartPos);
    scene.add(oppGroup);

    opponentLegendEntityRef.current = {
      id: 'opp_legend',
      isPlayer: false,
      name: opponentName,
      legendData: oppLegendData,
      group: oppGroup,
      currentPos: oppStartPos.clone(),
      targetPos: null,
      facingAngle: (3 * Math.PI) / 4,
      state: 'IDLE',
      stateTimer: 0,
      speed: 9.0,
      dustTimer: 0,
    };
  }, [playerLegendId, opponentLegendId, playerName, opponentName]);

  // Update Camera Target based on zoom distance and focus center
  const updateCameraTarget = () => {
    if (inspectingUnitRef.current) {
      // Focus on unit
      const unit = inspectingUnitRef.current;
      let pos = { x: 0, y: 0.2, z: 0 };
      if (unit.benchIndex !== null) {
        pos = unit.team === 'enemy' ? enemyBenchIndexToWorld3D(unit.benchIndex) : benchIndexToWorld3D(unit.benchIndex);
      } else if (unit.gridPosition) {
        pos = axialToWorld3D(unit.gridPosition, 0.2);
      }
      targetLookAtRef.current.set(pos.x, 0.8, pos.z);
      const ratio = zoomDistanceRef.current / 27.0;
      targetCameraPosRef.current.set(pos.x, 5.5 * ratio, pos.z + 5.2 * ratio);
    } else if (isFollowingTacticianLocalRef.current && playerLegendEntityRef.current) {
      // Focus on Little Legend
      const pPos = playerLegendEntityRef.current.currentPos;
      targetLookAtRef.current.set(pPos.x, 0.8, pPos.z);
      const ratio = zoomDistanceRef.current / 27.0;
      targetCameraPosRef.current.set(pPos.x, 8.5 * ratio, pPos.z + 7.5 * ratio);
    } else {
      // Default board overview
      const ratio = zoomDistanceRef.current / 27.0;
      targetLookAtRef.current.set(0, 0, 1.7);
      targetCameraPosRef.current.set(0, 22.0 * ratio, 15.8 * ratio);
    }
  };

  // Connect External Camera & Emote Action Refs
  useEffect(() => {
    if (onTriggerEmoteRef) {
      onTriggerEmoteRef.current = (emote: 'DANCE' | 'TAUNT' | 'CHEER' | 'LAUGH') => {
        const tactician = playerLegendEntityRef.current;
        if (!tactician) return;
        tactician.state = emote;
        tactician.stateTimer = 2.8;

        if (tactician.bubbleSprite) {
          tactician.group.remove(tactician.bubbleSprite);
        }
        const bubble = LittleLegendManager.createEmoteSprite(emote);
        bubble.position.set(0, 2.6, 0);
        tactician.group.add(bubble);
        tactician.bubbleSprite = bubble;
      };
    }
  }, [onTriggerEmoteRef]);

  useEffect(() => {
    if (onZoomInRef) {
      onZoomInRef.current = () => {
        zoomDistanceRef.current = Math.max(7.0, zoomDistanceRef.current - 3.5);
        updateCameraTarget();
      };
    }
  }, [onZoomInRef]);

  useEffect(() => {
    if (onZoomOutRef) {
      onZoomOutRef.current = () => {
        zoomDistanceRef.current = Math.min(34.0, zoomDistanceRef.current + 3.5);
        updateCameraTarget();
      };
    }
  }, [onZoomOutRef]);

  useEffect(() => {
    if (onResetCameraRef) {
      onResetCameraRef.current = () => {
        zoomDistanceRef.current = 27.0;
        targetLookAtRef.current.set(0, 0, 1.7);
        targetCameraPosRef.current.set(0, 22.0, 15.8);
        inspectingUnitRef.current = null;
        isFollowingTacticianLocalRef.current = false;
        if (setIsInspectingChampion) setIsInspectingChampion(false);
        if (setIsFollowingTactician) setIsFollowingTactician(false);
      };
    }
  }, [onResetCameraRef, setIsInspectingChampion, setIsFollowingTactician]);

  useEffect(() => {
    if (onToggleFollowTacticianRef) {
      onToggleFollowTacticianRef.current = () => {
        const next = !isFollowingTacticianLocalRef.current;
        isFollowingTacticianLocalRef.current = next;
        if (setIsFollowingTactician) setIsFollowingTactician(next);
        if (next) {
          inspectingUnitRef.current = null;
          if (setIsInspectingChampion) setIsInspectingChampion(false);
        } else {
          updateCameraTarget();
        }
      };
    }
  }, [onToggleFollowTacticianRef, setIsFollowingTactician, setIsInspectingChampion]);

  useEffect(() => {
    if (onInspectUnitRef) {
      onInspectUnitRef.current = (unit: BoardUnit) => {
        inspectingUnitRef.current = unit;
        isFollowingTacticianLocalRef.current = false;
        if (setIsInspectingChampion) setIsInspectingChampion(true);
        if (setIsFollowingTactician) setIsFollowingTactician(false);
        updateCameraTarget();
      };
    }
  }, [onInspectUnitRef, setIsInspectingChampion, setIsFollowingTactician]);

  // Native wheel event listener on container for smooth non-passive zooming
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.015;
      zoomDistanceRef.current = Math.max(7.0, Math.min(34.0, zoomDistanceRef.current + zoomDelta));
      updateCameraTarget();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  // --- Collect & Render Combat Events (Damage numbers, projectiles, vfx) ---
  useEffect(() => {
    if (!isCombatPhase || !combatEngine || !sceneRef.current) return;
    const scene = sceneRef.current;
    const now = performance.now();

    // Damage Events
    for (const dmg of combatEngine.damageEvents) {
      const sprite = createDamageSprite(dmg.amount, dmg.damageType, dmg.isCrit);
      sprite.position.set(dmg.x, dmg.y, dmg.z);
      scene.add(sprite);
      floatingDamageTextsRef.current.push({
        mesh: sprite,
        birthTime: now,
        startY: dmg.y,
      });
    }

    // Projectile Events
    for (const proj of combatEngine.projectileEvents) {
      const projMesh = createProjectileMesh(proj.color);
      projMesh.position.set(proj.sourceX, proj.sourceY, proj.sourceZ);
      scene.add(projMesh);
      activeProjectilesRef.current.push({
        mesh: projMesh,
        p: proj,
        birthTime: now,
      });
    }

    // VFX Events
    for (const vfx of combatEngine.vfxEvents) {
      const vfxMesh = createVfxMesh(vfx.color, vfx.radius);
      vfxMesh.position.set(vfx.x, vfx.y + 0.1, vfx.z);
      scene.add(vfxMesh);
      activeVfxRef.current.push({
        mesh: vfxMesh,
        vfx,
        birthTime: now,
      });
    }
  }, [combatEngine, combatEngine?.damageEvents, combatEngine?.projectileEvents, combatEngine?.vfxEvents, isCombatPhase]);

  // --- Raycast & Mouse Handling ---
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    // 1. Right-Click: Direct Little Legend Walk Order with Golden/Cyan Ping
    if (e.button === 2) {
      e.preventDefault();
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hitPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        // Clamp inside arena bounds
        hitPoint.x = Math.max(-9.5, Math.min(9.5, hitPoint.x));
        hitPoint.z = Math.max(-8.5, Math.min(8.5, hitPoint.z));

        const tactician = playerLegendEntityRef.current;
        if (tactician) {
          tactician.targetPos = hitPoint.clone();
          tactician.state = 'RUNNING';

          // Spawn animated click ping
          const pingMesh = LittleLegendManager.createMoveClickPingMesh(0x00f0ff);
          pingMesh.position.set(hitPoint.x, 0.05, hitPoint.z);
          sceneRef.current.add(pingMesh);
          activeClickPingsRef.current.push({
            mesh: pingMesh,
            birthTime: performance.now(),
            duration: 0.8,
          });
        }
      }
      return;
    }

    // 2. Raycast unit meshes
    const unitMeshObjects: THREE.Object3D[] = [];
    unitMeshesRef.current.forEach((g) => {
      g.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          unitMeshObjects.push(child);
        }
      });
    });

    const intersects = raycaster.intersectObjects(unitMeshObjects, true);

    if (intersects.length > 0) {
      let topObj: THREE.Object3D | null = intersects[0].object;
      while (topObj && !topObj.userData.unit && topObj.parent) {
        topObj = topObj.parent;
      }

      if (topObj && topObj.userData.unit) {
        const unit = topObj.userData.unit as BoardUnit;
        onSelectUnit(unit);

        // Double click: Zoom in and Inspect Champion in 3D
        if (e.detail >= 2) {
          inspectingUnitRef.current = unit;
          isFollowingTacticianLocalRef.current = false;
          if (setIsInspectingChampion) setIsInspectingChampion(true);
          if (setIsFollowingTactician) setIsFollowingTactician(false);
          updateCameraTarget();
          return;
        }

        if (!isCombatPhase && unit.team !== 'enemy') {
          setDraggedUnit(unit);
          draggedUnitRef.current = unit;

          // Set initial drag pos from clicked object
          const currentGroup = unitMeshesRef.current.get(unit.instanceId);
          if (currentGroup) {
            dragPosRef.current.set(currentGroup.position.x, 1.25, currentGroup.position.z);
          }

          if (e.currentTarget && e.currentTarget.setPointerCapture) {
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {}
          }
        }
        return;
      }
    }

    // 3. Raycast Hexes or Bench when clicking directly without dragging
    const hexObjects = Array.from(hexMeshesRef.current.values());
    const benchObjects = benchHexMeshesRef.current;
    const groundHits = raycaster.intersectObjects([...hexObjects, ...benchObjects]);

    if (groundHits.length > 0) {
      const hit = groundHits[0].object;
      const activeUnitId = selectedUnitId;

      if (hit.userData.isBoardHex) {
        if (activeUnitId && !isCombatPhase) {
          if (hit.userData.row >= 4) {
            onMoveUnit(activeUnitId, hit.userData.row, hit.userData.col);
          }
        }
      } else if (hit.userData.isBenchHex) {
        if (activeUnitId && !isCombatPhase) {
          onMoveToBench(activeUnitId, hit.userData.benchIndex);
        }
      }
    } else {
      // Clicked on background ground: Walk Little Legend there!
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hitPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        hitPoint.x = Math.max(-9.5, Math.min(9.5, hitPoint.x));
        hitPoint.z = Math.max(-8.5, Math.min(8.5, hitPoint.z));

        const tactician = playerLegendEntityRef.current;
        if (tactician) {
          tactician.targetPos = hitPoint.clone();
          tactician.state = 'RUNNING';

          const pingMesh = LittleLegendManager.createMoveClickPingMesh(0xfacc15);
          pingMesh.position.set(hitPoint.x, 0.05, hitPoint.z);
          sceneRef.current.add(pingMesh);
          activeClickPingsRef.current.push({
            mesh: pingMesh,
            birthTime: performance.now(),
            duration: 0.8,
          });
        }
      }
      onSelectUnit(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rendererRef.current || !cameraRef.current) return;
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    // Check if dragging near bottom screen (Shop / Sell area)
    const isOverBottom = e.clientY > window.innerHeight - 150;
    setIsOverSellZone(isOverBottom && draggedUnitRef.current !== null);

    // Project ray onto the ground plane y = 0
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    const hasGroundHit = raycaster.ray.intersectPlane(groundPlane, hitPoint);

    if (draggedUnitRef.current && hasGroundHit) {
      dragPosRef.current.set(hitPoint.x, 1.25, hitPoint.z);
    }

    if (isOverBottom && draggedUnitRef.current) {
      setHoveredHex(null);
      setHoveredBenchIdx(null);
      setHoveredTargetUnit(null);
      if (dragHighlightMeshRef.current) {
        dragHighlightMeshRef.current.visible = false;
      }
      return;
    }

    if (hasGroundHit) {
      // Find nearest board hex (allied or enemy) or bench pedestal
      let bestDist = Infinity;
      let bestHex: { row: number; col: number; isAlly: boolean; pos: { x: number; y: number; z: number } } | null = null;
      let bestBench: { benchIdx: number; pos: { x: number; y: number; z: number } } | null = null;

      // 1. Check all 8 rows x 7 cols board hexes
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          const axial = rowColToAxial(r, c);
          const pos = axialToWorld3D(axial, 0.12);
          const dist = Math.hypot(hitPoint.x - pos.x, hitPoint.z - pos.z);
          if (dist < bestDist) {
            bestDist = dist;
            bestHex = { row: r, col: c, isAlly: r >= 4, pos };
            bestBench = null;
          }
        }
      }

      // 2. Check all 9 bench slots
      for (let b = 0; b < 9; b++) {
        const bPos = benchIndexToWorld3D(b);
        const dist = Math.hypot(hitPoint.x - bPos.x, hitPoint.z - bPos.z);
        if (dist < bestDist) {
          bestDist = dist;
          bestBench = { benchIdx: b, pos: bPos };
          bestHex = null;
        }
      }

      // Snap radius threshold: 1.4 units
      if (bestDist < 1.4) {
        if (bestHex) {
          setHoveredHex({ row: bestHex.row, col: bestHex.col });
          setHoveredBenchIdx(null);

          const axial = rowColToAxial(bestHex.row, bestHex.col);
          const existingUnit = boardUnits.find(
            (u) => u.gridPosition && u.gridPosition.q === axial.q && u.gridPosition.r === axial.r
          ) || null;
          setHoveredTargetUnit(existingUnit);

          if (dragHighlightMeshRef.current) {
            dragHighlightMeshRef.current.position.set(bestHex.pos.x, 0.12, bestHex.pos.z);
            dragHighlightMeshRef.current.visible = true;

            const color = bestHex.isAlly
              ? (existingUnit ? 0xa855f7 : 0xf59e0b) // Purple for swap, Gold for ally
              : 0xef4444; // Bright Red for enemy area (forbidden)

            const ringMesh = dragHighlightMeshRef.current.getObjectByName('hl_ring') as THREE.Mesh;
            const innerMesh = dragHighlightMeshRef.current.getObjectByName('hl_inner') as THREE.Mesh;
            if (ringMesh && ringMesh.material) {
              (ringMesh.material as THREE.MeshBasicMaterial).color.setHex(color);
            }
            if (innerMesh && innerMesh.material) {
              (innerMesh.material as THREE.MeshBasicMaterial).color.setHex(color);
            }
          }
        } else if (bestBench) {
          setHoveredBenchIdx(bestBench.benchIdx);
          setHoveredHex(null);

          const existingBenchUnit = benchUnits[bestBench.benchIdx] || null;
          setHoveredTargetUnit(existingBenchUnit);

          if (dragHighlightMeshRef.current) {
            dragHighlightMeshRef.current.position.set(bestBench.pos.x, 0.12, bestBench.pos.z);
            dragHighlightMeshRef.current.visible = true;

            const color = existingBenchUnit ? 0xa855f7 : 0x38bdf8; // Purple for swap, Cyan for bench
            const ringMesh = dragHighlightMeshRef.current.getObjectByName('hl_ring') as THREE.Mesh;
            const innerMesh = dragHighlightMeshRef.current.getObjectByName('hl_inner') as THREE.Mesh;
            if (ringMesh && ringMesh.material) {
              (ringMesh.material as THREE.MeshBasicMaterial).color.setHex(color);
            }
            if (innerMesh && innerMesh.material) {
              (innerMesh.material as THREE.MeshBasicMaterial).color.setHex(color);
            }
          }
        }
      } else {
        setHoveredHex(null);
        setHoveredBenchIdx(null);
        setHoveredTargetUnit(null);
        if (dragHighlightMeshRef.current && !draggedUnitRef.current) {
          dragHighlightMeshRef.current.visible = false;
        }
      }
    } else {
      setHoveredHex(null);
      setHoveredBenchIdx(null);
      setHoveredTargetUnit(null);
      if (dragHighlightMeshRef.current && !draggedUnitRef.current) {
        dragHighlightMeshRef.current.visible = false;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggedUnitRef.current) {
      const activeUnit = draggedUnitRef.current;

      if (isOverSellZone && onSellUnit) {
        // Sold via dragging to shop area
        onSellUnit(activeUnit);
      } else if (hoveredHex && hoveredHex.row >= 4) {
        // Only allow placement in allied territory (row >= 4)
        onMoveUnit(activeUnit.instanceId, hoveredHex.row, hoveredHex.col);
      } else if (hoveredBenchIdx !== null) {
        // Move to bench slot
        onMoveToBench(activeUnit.instanceId, hoveredBenchIdx);
      }
      // If dropped over enemy area (row < 4) or outside, it does nothing and unit smoothly snaps back to its original slot!

      if (e.currentTarget && e.currentTarget.releasePointerCapture) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
      }

      setDraggedUnit(null);
      draggedUnitRef.current = null;
      setHoveredTargetUnit(null);
      setIsOverSellZone(false);

      if (dragHighlightMeshRef.current) {
        dragHighlightMeshRef.current.visible = false;
      }
    }
  };

  // HTML5 Drag & Drop from HUD cards
  const handleHtmlDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!rendererRef.current || !cameraRef.current) return;
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      let bestDist = Infinity;
      let bestHex: { row: number; col: number; pos: { x: number; y: number; z: number } } | null = null;
      for (let r = 4; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          const axial = rowColToAxial(r, c);
          const pos = axialToWorld3D(axial, 0.12);
          const dist = Math.hypot(hitPoint.x - pos.x, hitPoint.z - pos.z);
          if (dist < bestDist) {
            bestDist = dist;
            bestHex = { row: r, col: c, pos };
          }
        }
      }
      if (bestHex && bestDist < 1.6) {
        setHoveredHex({ row: bestHex.row, col: bestHex.col });
        if (dragHighlightMeshRef.current) {
          dragHighlightMeshRef.current.position.set(bestHex.pos.x, 0.12, bestHex.pos.z);
          dragHighlightMeshRef.current.visible = true;
          const ringMesh = dragHighlightMeshRef.current.getObjectByName('hl_ring') as THREE.Mesh;
          if (ringMesh && ringMesh.material) {
            (ringMesh.material as THREE.MeshBasicMaterial).color.setHex(0xf59e0b);
          }
        }
      }
    }
  };

  const handleHtmlDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const unitId = e.dataTransfer.getData('text/plain');
    if (unitId && hoveredHex && hoveredHex.row >= 4) {
      onMoveUnit(unitId, hoveredHex.row, hoveredHex.col);
    }
    setHoveredHex(null);
    if (dragHighlightMeshRef.current) {
      dragHighlightMeshRef.current.visible = false;
    }
  };

  const draggedChampData = draggedUnit ? CHAMPIONS_DATA[draggedUnit.championId] : null;
  const sellRefund = draggedUnit && draggedChampData
    ? draggedChampData.cost * (draggedUnit.starLevel === 3 ? 9 : draggedUnit.starLevel === 2 ? 3 : 1)
    : 1;

  return (
    <div
      ref={containerRef}
      id="three-arena-container"
      className={`relative w-full h-full select-none overflow-hidden ${
        draggedUnit ? 'cursor-grabbing' : 'cursor-default'
      }`}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDragOver={handleHtmlDragOver}
      onDrop={handleHtmlDrop}
    >
      {/* Visual Cursor Drag & Swap Hint Floating Banner */}
      {draggedUnit && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-full bg-slate-900/90 text-white font-bold text-xs uppercase tracking-wider backdrop-blur-md shadow-2xl border border-amber-400/80 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
            <span className="text-amber-300">
              {draggedChampData?.name} (★{draggedUnit.starLevel})
            </span>
          </div>
          <span className="text-slate-400 text-[10px]">➜</span>
          {isOverSellZone ? (
            <span className="text-rose-400 font-extrabold flex items-center gap-1">
              💰 Soltar aquí para VENDER (+{sellRefund} Oro)
            </span>
          ) : hoveredHex && hoveredHex.row >= 4 ? (
            <span className="text-emerald-300">
              {hoveredTargetUnit ? `🔄 Intercambiar con ${CHAMPIONS_DATA[hoveredTargetUnit.championId]?.name}` : `Colocar en Fila ${hoveredHex.row - 3}, Col ${hoveredHex.col + 1}`}
            </span>
          ) : hoveredHex && hoveredHex.row < 4 ? (
            <span className="text-rose-400">⚠️ Zona enemiga no permitida</span>
          ) : hoveredBenchIdx !== null ? (
            <span className="text-cyan-300">
              {hoveredTargetUnit ? `🔄 Intercambiar en Banca slot B${hoveredBenchIdx + 1}` : `Mover a Banca slot B${hoveredBenchIdx + 1}`}
            </span>
          ) : (
            <span className="text-slate-400">Arrastra hacia el tablero, la banca o la tienda para vender</span>
          )}
        </div>
      )}
    </div>
  );
};

// --- Helper: Create 3D Champion Group ---
function createUnitGroup(
  unit: BoardUnit,
  unitMixersMap?: Map<string, THREE.AnimationMixer>
): THREE.Group {
  const base = CHAMPIONS_DATA[unit.championId];
  const group = new THREE.Group();
  group.name = `unit_${unit.instanceId}`;
  group.userData = { unit };

  // Set initial 3D position immediately according to bench or board coordinates
  if (unit.benchIndex !== null) {
    const pos = unit.team === 'enemy'
      ? enemyBenchIndexToWorld3D(unit.benchIndex)
      : benchIndexToWorld3D(unit.benchIndex);
    group.position.set(pos.x, pos.y, pos.z);
  } else if (unit.gridPosition) {
    const pos = axialToWorld3D(unit.gridPosition, 0.2);
    group.position.set(pos.x, pos.y, pos.z);
  }

  const starScale = unit.starLevel === 3 ? 1.35 : unit.starLevel === 2 ? 1.15 : 1.0;
  const isAlly = unit.team === 'ally';
  const unitColor = new THREE.Color(base ? base.color : isAlly ? 0x3b82f6 : 0xef4444);

  // Subtle Team Pedestal Ring on Floor
  const pedestalGeo = new THREE.CylinderGeometry(0.75 * starScale, 0.85 * starScale, 0.08, 24);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: isAlly ? 0x0f172a : 0x1e1b4b,
    roughness: 0.7,
    metalness: 0.3,
  });
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.name = 'unit_pedestal';
  pedestal.position.y = 0.04;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  const teamRingGeo = new THREE.RingGeometry(0.76 * starScale, 0.86 * starScale, 32);
  const teamRingMat = new THREE.MeshBasicMaterial({
    color: isAlly ? 0x00e5ff : 0xf43f5e,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  const teamRing = new THREE.Mesh(teamRingGeo, teamRingMat);
  teamRing.rotation.x = Math.PI / 2;
  teamRing.position.y = 0.09;
  group.add(teamRing);

  // Fallback / Placeholder Avatar Group (while 3D model loads or if not available)
  const fallbackAvatar = new THREE.Group();
  fallbackAvatar.name = 'fallback_avatar';

  let bodyGeo: THREE.BufferGeometry;
  if (base?.modelType === 'golem' || base?.modelType === 'warrior') {
    bodyGeo = new THREE.BoxGeometry(0.9 * starScale, 1.35 * starScale, 0.9 * starScale);
  } else if (base?.modelType === 'mage') {
    bodyGeo = new THREE.ConeGeometry(0.6 * starScale, 1.5 * starScale, 8);
  } else if (base?.modelType === 'dragon') {
    bodyGeo = new THREE.DodecahedronGeometry(0.85 * starScale);
  } else {
    bodyGeo = new THREE.CylinderGeometry(0.5 * starScale, 0.65 * starScale, 1.35 * starScale, 12);
  }

  const bodyMat = new THREE.MeshStandardMaterial({
    color: unitColor,
    roughness: 0.3,
    metalness: 0.6,
    emissive: isAlly ? 0x000000 : 0x220000,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = 0.72 * starScale;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  fallbackAvatar.add(bodyMesh);

  // Head
  const headGeo = new THREE.SphereGeometry(0.38 * starScale, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({
    color: base?.accentColor || 0xffffff,
    roughness: 0.2,
    metalness: 0.4,
  });
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.y = 1.55 * starScale;
  headMesh.castShadow = true;
  fallbackAvatar.add(headMesh);

  group.add(fallbackAvatar);

  // Asynchronously load 3D GLTF model from champs-3d library
  championModelManager
    .loadModel(unit.championId)
    .then((template) => {
      if (!template) return;
      // Check if group is still attached to the same unit instance
      if (group.userData.unit?.instanceId !== unit.instanceId) return;

      // Remove fallback placeholder avatar
      const existingFallback = group.getObjectByName('fallback_avatar');
      if (existingFallback) {
        group.remove(existingFallback);
      }

      // Instantiate authentic 3D champion model
      const { group: modelGroup, mixer } = championModelManager.instantiate(
        template,
        unit.starLevel
      );
      modelGroup.name = 'champion_3d_model';
      group.add(modelGroup);

      if (mixer && unitMixersMap) {
        unitMixersMap.set(unit.instanceId, mixer);
      }
    })
    .catch((err) => {
      console.warn(`Could not attach 3D model for ${unit.championId}:`, err);
    });

  // 3-Star Golden Aura
  if (unit.starLevel === 3) {
    const auraGeo = new THREE.RingGeometry(0.92, 1.15, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.name = 'star3_aura';
    aura.rotation.x = Math.PI / 2;
    aura.position.y = 0.06;
    group.add(aura);
  }

  // Healthbar Sprite above head - positioned proportionally above the taller 3D champion model
  const hpSprite = createHealthbarSprite(unit);
  hpSprite.name = 'healthbar_sprite';
  hpSprite.position.y = 2.45 * starScale;
  hpSprite.scale.set(1.5, 0.38, 1);
  group.add(hpSprite);

  return group;
}

// --- Helper: Render Dynamic Canvas Sprite for Health & Mana Bar ---
function createHealthbarSprite(unit: BoardUnit): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 46;
  const ctx = canvas.getContext('2d')!;

  drawHealthbarOnCanvas(ctx, unit);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.userData = {
    canvas,
    ctx,
    texture,
    lastState: `${unit.currentHealth}_${unit.shield}_${unit.currentMana}_${unit.starLevel}_${unit.items?.length || 0}`,
  };
  return sprite;
}

function updateUnitHealthSprite(group: THREE.Group, unit: BoardUnit) {
  const hpSprite = group.getObjectByName('healthbar_sprite') as THREE.Sprite;
  if (!hpSprite || !hpSprite.userData) return;

  const { ctx, canvas, texture } = hpSprite.userData;
  if (!ctx || !canvas || !texture) return;

  const currentState = `${unit.currentHealth}_${unit.shield}_${unit.currentMana}_${unit.starLevel}_${unit.items?.length || 0}`;
  if (hpSprite.userData.lastState === currentState) return;
  hpSprite.userData.lastState = currentState;

  drawHealthbarOnCanvas(ctx, unit);
  texture.needsUpdate = true;
}

function drawHealthbarOnCanvas(ctx: CanvasRenderingContext2D, unit: BoardUnit) {
  ctx.clearRect(0, 0, 180, 46);

  // Background box
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.roundRect(4, 4, 172, 38, 4);
  ctx.fill();
  ctx.stroke();

  // Health Bar
  const hpPercent = Math.max(0, Math.min(1, unit.currentHealth / Math.max(1, unit.maxHealth)));
  ctx.fillStyle = unit.team === 'ally' ? '#22c55e' : '#ef4444';
  ctx.fillRect(8, 8, 164 * hpPercent, 14);

  // Shield Overlay
  if (unit.shield > 0) {
    const shieldPercent = Math.min(1, unit.shield / Math.max(1, unit.maxHealth));
    ctx.fillStyle = 'rgba(250, 204, 21, 0.7)';
    ctx.fillRect(8, 8, 164 * shieldPercent, 14);
  }

  // Mana Bar
  const manaPercent = Math.max(0, Math.min(1, unit.currentMana / Math.max(1, unit.maxMana)));
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(8, 26, 164 * manaPercent, 8);

  // Stars indicator
  ctx.fillStyle = unit.starLevel === 3 ? '#facc15' : unit.starLevel === 2 ? '#e2e8f0' : '#d97706';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  const starsText = unit.starLevel === 3 ? '★★★' : unit.starLevel === 2 ? '★★' : '★';
  ctx.fillText(starsText, 10, 20);

  // Item dots
  if (unit.items && unit.items.length > 0) {
    ctx.fillStyle = '#fbbf24';
    for (let i = 0; i < unit.items.length; i++) {
      ctx.beginPath();
      ctx.arc(140 + i * 12, 15, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// --- Helper: Floating Damage Number Sprite ---
function createDamageSprite(amount: number, type: string, isCrit: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  let color = '#ffffff';
  if (type === 'physical') color = '#fb923c';
  else if (type === 'magic') color = '#c084fc';
  else if (type === 'true') color = '#fef08a';

  if (isCrit) color = '#ef4444';

  ctx.fillStyle = color;
  ctx.font = isCrit ? 'bold 36px sans-serif' : 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 6;
  ctx.fillText(`${amount}${isCrit ? '!' : ''}`, 64, 44);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.9, 0.45, 1);
  return sprite;
}

// --- Helper: Projectile Mesh ---
function createProjectileMesh(colorHex: string): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.18, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) });
  return new THREE.Mesh(geo, mat);
}

// --- Helper: VFX Mesh ---
function createVfxMesh(colorHex: string, radius: number = 1.5): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.1, radius, 32);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(colorHex),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}
