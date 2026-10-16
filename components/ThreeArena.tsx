// components/ThreeArena.tsx

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  BoardUnit,
  DamageNumberEvent,
  ProjectileEvent,
  VisualEffectEvent,
} from "@/types/game";
import {
  axialToWorld3D,
  rowColToAxial,
} from "@/engine/hexMath";
import { CombatEngine } from "@/engine/combatEngine";
import {
  LittleLegendManager,
  LittleLegendEntity,
} from "@/engine/littleLegendManager";

// Módulos refactorizados
import { ARENA_CONFIG } from "./arena/arenaConfig";
import { createDiamondCosmos } from "./arena/diamondCosmos";
import { setupArenaLights, applyArenaAppearance } from "./arena/arenaEnvironment";
import {
  createBoardHexes,
  createAllyBenchHexes,
  createEnemyBenchHexes,
  createDragHighlightMesh,
  setPlacementGridVisible,
  findPlacementTarget,
  showPlacementTarget,
  type PlacementTarget,
} from "./arena/arenaGrids";
import {
  createUnitGroup,
  updateUnitHealthSprite,
  createDamageSprite,
  createProjectileMesh,
  createVfxMesh,
} from "./arena/unitMeshFactory";
import { WOW_ARENAS, WowArena, loadWowArena, disposeArena } from "./arena/wowArenas";
import { getArenaBenchPosition, getArenaCamera, getArenaTacticianPosition } from "./arena/wowArenaLayout";
import { ArenaDragOverlay } from "./arena/ArenaDragOverlay";

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
  onDebugStatsUpdate?: (stats: {
    fps: number;
    drawCalls: number;
    triangles: number;
  }) => void;
  onTriggerEmoteRef?: React.MutableRefObject<
    ((emote: "DANCE" | "TAUNT" | "CHEER" | "LAUGH") => void) | null
  >;
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
  playerLegendId = "river_sprite",
  opponentLegendId = "chibi_battle_bat_xayah",
  playerName = "Estratega",
  opponentName = "Rival",
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
  const [arenaRank, setArenaRank] = useState<WowArena>('Diamante');
  const activeArenaRankRef = useRef<WowArena>('Diamante');
  const benchIndexToWorld3D = useCallback((index: number) => getArenaBenchPosition(activeArenaRankRef.current, index), []);
  const enemyBenchIndexToWorld3D = useCallback((index: number) => getArenaBenchPosition(activeArenaRankRef.current, index, true), []);
  const [arenaStatus, setArenaStatus] = useState('Cargando arena…');
  const [arenaRetry, setArenaRetry] = useState(0);
  const arenaModelRef = useRef<THREE.Group | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Entidades de Minileyendas
  const playerLegendEntityRef = useRef<LittleLegendEntity | null>(null);
  const opponentLegendEntityRef = useRef<LittleLegendEntity | null>(null);
  const activeClickPingsRef = useRef<
    { mesh: THREE.Group; birthTime: number; duration: number }[]
  >([]);

  // Control de Cámara
  const targetCameraPosRef = useRef<THREE.Vector3>(
    ARENA_CONFIG.camera.defaultPosition.clone(),
  );
  const targetLookAtRef = useRef<THREE.Vector3>(
    ARENA_CONFIG.camera.defaultLookAt.clone(),
  );
  const currentLookAtRef = useRef<THREE.Vector3>(
    ARENA_CONFIG.camera.defaultLookAt.clone(),
  );
  const zoomDistanceRef = useRef<number>(ARENA_CONFIG.camera.zoom.default);
  const inspectingUnitRef = useRef<BoardUnit | null>(null);
  const isFollowingTacticianLocalRef = useRef<boolean>(isFollowingTactician);

  useEffect(() => {
    isFollowingTacticianLocalRef.current = isFollowingTactician;
  }, [isFollowingTactician]);

  // Registro de Mallas y Animaciones
  const unitMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const unitMixersRef = useRef<Map<string, THREE.AnimationMixer>>(new Map());
  const hexMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const benchHexMeshesRef = useRef<THREE.Mesh[]>([]);
  const enemyBenchHexMeshesRef = useRef<THREE.Mesh[]>([]);
  const floatingDamageTextsRef = useRef<
    { mesh: THREE.Sprite; birthTime: number; startY: number }[]
  >([]);
  const activeProjectilesRef = useRef<
    { mesh: THREE.Mesh; p: ProjectileEvent; birthTime: number }[]
  >([]);
  const activeVfxRef = useRef<
    { mesh: THREE.Mesh; vfx: VisualEffectEvent; birthTime: number }[]
  >([]);
  const debugLinesGroupRef = useRef<THREE.Group | null>(null);

  // Estado de Arrastre e Interacción
  const [draggedUnit, setDraggedUnit] = useState<BoardUnit | null>(null);
  const draggedUnitRef = useRef<BoardUnit | null>(null);
  const dragPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.2, 0));
  const placementTargetRef = useRef<PlacementTarget | null>(null);
  const dragHighlightMeshRef = useRef<THREE.Group | null>(null);

  const [hoveredHex, setHoveredHex] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [hoveredBenchIdx, setHoveredBenchIdx] = useState<number | null>(null);
  const [hoveredTargetUnit, setHoveredTargetUnit] = useState<BoardUnit | null>(
    null,
  );
  const [isOverSellZone, setIsOverSellZone] = useState<boolean>(false);

  // Callback de estadísticas de depuración
  const onDebugStatsUpdateRef = useRef(onDebugStatsUpdate);
  useEffect(() => {
    onDebugStatsUpdateRef.current = onDebugStatsUpdate;
  }, [onDebugStatsUpdate]);
  const lastFpsTimeRef = useRef(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    lastFpsTimeRef.current = performance.now();
  }, []);

  // --- 1. Inicialización de Three.js ---
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Escena y Cámara
    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0x101820);

    // Niebla opcional
    if (ARENA_CONFIG.scene.enableFog) {
      scene.fog = new THREE.Fog(
        ARENA_CONFIG.scene.fogColor,
        ARENA_CONFIG.scene.fogNear,
        ARENA_CONFIG.scene.fogFar,
      );
    }
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      ARENA_CONFIG.camera.fov,
      width / height,
      ARENA_CONFIG.camera.near,
      ARENA_CONFIG.camera.far,
    );
    camera.position.copy(ARENA_CONFIG.camera.defaultPosition);
    camera.lookAt(ARENA_CONFIG.camera.defaultLookAt);
    cameraRef.current = camera;

    // Renderizador WebGL
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      stencil: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Construcción del Mundo mediante Módulos
    setupArenaLights(scene);
    const cosmos = createDiamondCosmos(scene);
    applyArenaAppearance(scene, renderer, activeArenaRankRef.current);

    hexMeshesRef.current = createBoardHexes(scene);
    benchHexMeshesRef.current = createAllyBenchHexes(scene);
    enemyBenchHexMeshesRef.current = createEnemyBenchHexes(scene);
    dragHighlightMeshRef.current = createDragHighlightMesh(scene);

    const debugGroup = new THREE.Group();
    scene.add(debugGroup);
    debugLinesGroupRef.current = debugGroup;

    // --- Bucle de Animación ---
    let animationId: number;
    let lastTime = performance.now();
    const startTime = performance.now();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const currentTime = performance.now();
      const delta = Math.min(0.1, (currentTime - lastTime) / 1000);
      const elapsed = (currentTime - startTime) / 1000;
      lastTime = currentTime;
      cosmos.update(elapsed, activeArenaRankRef.current === "Diamante", renderer.getPixelRatio());

      // Métricas de Rendimiento (FPS)
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsTimeRef.current >= 1000) {
        const fps = Math.round(
          (frameCountRef.current * 1000) / (now - lastFpsTimeRef.current),
        );
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

      // Animación de Llamas en Brazeros

      // Animación de Anillo de Arrastre
      // if (dragHighlightMeshRef.current && dragHighlightMeshRef.current.visible) {
      //   const ring = dragHighlightMeshRef.current.getObjectByName("hl_ring");
      //   if (ring) ring.rotation.z += delta * 1.5;
      // }

      // Animación de Unidades (Lerp Suave, Flotación, Rotación)
      unitMeshesRef.current.forEach((group) => {
        const meshObj = group.userData.unit as BoardUnit;
        if (!meshObj) return;

        if (meshObj.instanceId === draggedUnitRef.current?.instanceId) {
          group.position.x = THREE.MathUtils.lerp(
            group.position.x,
            dragPosRef.current.x,
            0.45,
          );
          group.position.z = THREE.MathUtils.lerp(
            group.position.z,
            dragPosRef.current.z,
            0.45,
          );
          group.position.y = THREE.MathUtils.lerp(group.position.y, 1.25, 0.35);
          group.scale.set(1.15, 1.15, 1.15);
          return;
        }

        let targetPos = { x: 0, y: 0.2, z: 0 };
        if (meshObj.benchIndex !== null) {
          targetPos =
            meshObj.team === "enemy"
              ? enemyBenchIndexToWorld3D(meshObj.benchIndex)
              : benchIndexToWorld3D(meshObj.benchIndex);
        } else if (meshObj.gridPosition) {
          targetPos = axialToWorld3D(meshObj.gridPosition, 0.2);
        }

        group.position.x = THREE.MathUtils.lerp(
          group.position.x,
          targetPos.x,
          Math.min(1, delta * 14),
        );
        group.position.z = THREE.MathUtils.lerp(
          group.position.z,
          targetPos.z,
          Math.min(1, delta * 14),
        );

        const targetRot = meshObj.team === "enemy" ? Math.PI : 0;
        group.rotation.y = THREE.MathUtils.lerp(
          group.rotation.y,
          targetRot,
          Math.min(1, delta * 10),
        );

        const baseOffsetY = meshObj.state === "MOVING" ? 0.35 : 0.2;
        const bob = Math.sin(elapsed * 3.5 + Number(group.id)) * 0.04;
        group.position.y = THREE.MathUtils.lerp(
          group.position.y,
          baseOffsetY + bob,
          Math.min(1, delta * 12),
        );
        group.scale.set(1.0, 1.0, 1.0);

        const selectRing = group.getObjectByName("select_ring");
        if (selectRing) selectRing.rotation.z += delta * 2;

        const aura = group.getObjectByName("star3_aura");
        if (aura) aura.rotation.y += delta * 1.5;
      });

      // Animación de Textos de Daño Flotante
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

      // Animación de Proyectiles
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
            t,
          );
          proj.mesh.position.y += Math.sin(t * Math.PI) * 0.6;
        }
      }

      // Animación de VFX
      for (let i = activeVfxRef.current.length - 1; i >= 0; i--) {
        const v = activeVfxRef.current[i];
        const age = (now - v.birthTime) / 1000;
        if (age > v.vfx.duration) {
          scene.remove(v.mesh);
          activeVfxRef.current.splice(i, 1);
        } else {
          const scale = 1 + (age / v.vfx.duration) * (v.vfx.radius || 1.5);
          v.mesh.scale.set(scale, scale, scale);
          (v.mesh.material as THREE.MeshBasicMaterial).opacity =
            1 - age / v.vfx.duration;
        }
      }

      // Actualizar AnimationMixers 3D
      unitMixersRef.current.forEach((mixer) => mixer.update(delta));

      // Interpolación de Cámara
      if (
        isFollowingTacticianLocalRef.current &&
        playerLegendEntityRef.current
      ) {
        const pPos = playerLegendEntityRef.current.currentPos;
        const camConf = ARENA_CONFIG.camera.tacticianFollow;
        targetLookAtRef.current.set(pPos.x, camConf.lookAtOffsetY, pPos.z);
        targetCameraPosRef.current.set(
          pPos.x,
          camConf.camOffsetY,
          pPos.z + camConf.camOffsetZ,
        );
      }

      camera.position.lerp(
        targetCameraPosRef.current,
        Math.min(1, delta * 6.5),
      );
      currentLookAtRef.current.lerp(
        targetLookAtRef.current,
        Math.min(1, delta * 6.5),
      );
      camera.lookAt(currentLookAtRef.current);

      // Animación de Minileyendas
      const animateTactician = (
        tactician: LittleLegendEntity | null,
        isPlayer: boolean,
      ) => {
        if (!tactician || !tactician.group) return;

        const avatar = tactician.group.getObjectByName("tactician_avatar");
        const rim = tactician.group.getObjectByName("tactician_rim");
        if (rim) rim.rotation.z += delta * 1.5;

        if (tactician.stateTimer > 0) {
          tactician.stateTimer -= delta;
          if (tactician.stateTimer <= 0) {
            tactician.state = "IDLE";
            tactician.model3D?.playAnimation("idle", 0.2);
            if (tactician.bubbleSprite) {
              tactician.group.remove(tactician.bubbleSprite);
              tactician.bubbleSprite = null;
            }
          }
        }

        if (tactician.targetPos) {
          const dx = tactician.targetPos.x - tactician.currentPos.x;
          const dz = tactician.targetPos.z - tactician.currentPos.z;
          const dist = Math.hypot(dx, dz);

          if (dist < 0.2) {
            tactician.currentPos.copy(tactician.targetPos);
            tactician.targetPos = null;
            tactician.state = "IDLE";
            tactician.model3D?.playAnimation("idle", 0.2);
          } else {
            tactician.state = "RUNNING";
            if (tactician.model3D?.currentActionName !== "run") {
              tactician.model3D?.playAnimation("run", 0.12);
            }

            const targetAngle = Math.atan2(dx, dz);
            tactician.facingAngle = THREE.MathUtils.lerp(
              tactician.facingAngle,
              targetAngle,
              Math.min(1, delta * 14),
            );

            const moveStep = Math.min(dist, tactician.speed * delta);
            tactician.currentPos.x += (dx / dist) * moveStep;
            tactician.currentPos.z += (dz / dist) * moveStep;
          }
        } else if (tactician.state === "IDLE" && tactician.stateTimer <= 0) {
          if (tactician.model3D?.currentActionName !== "idle") {
            tactician.model3D?.playAnimation("idle", 0.2);
          }
        }

        tactician.group.position.set(
          tactician.currentPos.x,
          tactician.currentPos.y,
          tactician.currentPos.z,
        );
        tactician.group.rotation.y = tactician.facingAngle;

        if (avatar && !tactician.model3D) {
          if (tactician.state === "RUNNING") {
            avatar.position.y = Math.abs(Math.sin(elapsed * 16)) * 0.22;
            avatar.rotation.z = Math.sin(elapsed * 16) * 0.14;
            avatar.rotation.x = 0.15;
          } else if (tactician.state === "DANCE") {
            tactician.group.rotation.y += delta * 9;
            avatar.position.y = Math.abs(Math.sin(elapsed * 12)) * 0.28;
            avatar.rotation.z = Math.sin(elapsed * 12) * 0.2;
            avatar.rotation.x = 0;
          } else if (tactician.state === "TAUNT") {
            avatar.position.y = Math.abs(Math.sin(elapsed * 9)) * 0.45;
            avatar.rotation.z = (Math.random() - 0.5) * 0.3;
            avatar.rotation.x = -0.2;
          } else if (
            tactician.state === "CHEER" ||
            tactician.state === "LAUGH"
          ) {
            avatar.position.y = Math.abs(Math.sin(elapsed * 14)) * 0.35;
            avatar.rotation.z = Math.sin(elapsed * 14) * 0.18;
            avatar.rotation.x = 0;
          } else {
            avatar.position.y =
              Math.sin(elapsed * 3.2 + (isPlayer ? 0 : 2)) * 0.06;
            avatar.rotation.z = 0;
            avatar.rotation.x = 0;
          }
        }
      };

      animateTactician(playerLegendEntityRef.current, true);
      animateTactician(opponentLegendEntityRef.current, false);

      // Pings de Movimiento
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
          const ring = ping.mesh.getObjectByName("ping_ring") as THREE.Mesh;
          if (ring && ring.material)
            (ring.material as THREE.MeshBasicMaterial).opacity = 1 - t;
          const core = ping.mesh.getObjectByName("ping_core") as THREE.Mesh;
          if (core && core.material)
            (core.material as THREE.MeshBasicMaterial).opacity = 1 - t * 0.8;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      cosmos.dispose();
      renderer.dispose();
    };
  }, [benchIndexToWorld3D, enemyBenchIndexToWorld3D]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let cancelled = false;
    loadWowArena(arenaRank).then(model => {
      if (cancelled) {
        disposeArena(model);
        return;
      }
      if (arenaModelRef.current) disposeArena(arenaModelRef.current);
      arenaModelRef.current = model;
      scene.add(model);
      activeArenaRankRef.current = arenaRank;
      if (rendererRef.current) applyArenaAppearance(scene, rendererRef.current, arenaRank);
      // Commit scenery, interaction targets and camera together after loading.
      const retiredBenchGeometries = new Set<THREE.BufferGeometry>();
      const benchGeometry = new THREE.BoxGeometry(1.52, 0.015, 1.3);
      for (const [enemy, meshes] of [[false, benchHexMeshesRef.current], [true, enemyBenchHexMeshesRef.current]] as const) {
        meshes.forEach((mesh, index) => {
          const pos = getArenaBenchPosition(arenaRank, index, enemy);
          mesh.position.set(pos.x, pos.y, pos.z);
          retiredBenchGeometries.add(mesh.geometry);
          mesh.geometry = benchGeometry;
          const material = mesh.material as THREE.MeshStandardMaterial;
          material.transparent = true;
          material.opacity = 0;
          material.depthWrite = false;
          material.colorWrite = false;
        });
      }
      retiredBenchGeometries.forEach(geometry => geometry.dispose());
      for (const [enemy, entity] of [[false, playerLegendEntityRef.current], [true, opponentLegendEntityRef.current]] as const) {
        if (!entity) continue;
        const pos = getArenaTacticianPosition(arenaRank, enemy);
        entity.currentPos.copy(pos);
        entity.group.position.copy(pos);
        entity.targetPos = null;
      }
      const view = getArenaCamera(arenaRank);
      targetCameraPosRef.current.copy(view.defaultPosition);
      targetLookAtRef.current.copy(view.defaultLookAt);
      zoomDistanceRef.current = ARENA_CONFIG.camera.zoom.default;
      inspectingUnitRef.current = null;
      isFollowingTacticianLocalRef.current = false;
      setIsFollowingTactician?.(false);
      setIsInspectingChampion?.(false);
      setArenaStatus('');
    }).catch(error => {
      if (cancelled) return;
      console.error('No se pudo cargar la arena', error);
      setArenaStatus('No se pudo cargar la arena. Inténtalo de nuevo.');
    });
    return () => { cancelled = true; };
  }, [arenaRank, arenaRetry, setIsFollowingTactician, setIsInspectingChampion]);

  useEffect(() => () => {
    if (arenaModelRef.current) disposeArena(arenaModelRef.current);
    arenaModelRef.current = null;
  }, []);

  // --- 2. Sincronización de Unidades con el Estado del Juego ---
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const enemyBenchList: BoardUnit[] = (enemyBenchUnits || [])
      .filter((u): u is BoardUnit => u !== null)
      .map((u) => ({ ...u, team: "enemy" as const }));

    const displayUnits: BoardUnit[] =
      isCombatPhase && combatEngine
        ? [
            ...combatEngine.allies,
            ...combatEngine.enemies,
            ...benchUnits.filter((u): u is BoardUnit => u !== null),
            ...enemyBenchList,
          ]
        : [
            ...boardUnits,
            ...benchUnits.filter((u): u is BoardUnit => u !== null),
            ...enemyBenchList,
          ];

    const currentIds = new Set(displayUnits.map((u) => u.instanceId));

    unitMeshesRef.current.forEach((group, id) => {
      if (!currentIds.has(id)) {
        scene.remove(group);
        unitMeshesRef.current.delete(id);
      }
    });

    for (const unit of displayUnits) {
      let group = unitMeshesRef.current.get(unit.instanceId);

      // ✅ FIX: Comparamos contra el valor primitivo guardado para detectar fusiones a 2★/3★
      if (
        group &&
        group.userData.lastRenderedStarLevel !== undefined &&
        group.userData.lastRenderedStarLevel !== unit.starLevel
      ) {
        scene.remove(group);
        unitMeshesRef.current.delete(unit.instanceId);
        group = undefined;
      }

      if (!group) {
        group = createUnitGroup(unit, unitMixersRef.current);
        group.userData.lastRenderedStarLevel = unit.starLevel; // Registrar nivel de estrellas
        scene.add(group);
        unitMeshesRef.current.set(unit.instanceId, group);
      }

      if (unit.instanceId !== draggedUnitRef.current?.instanceId) {
        let targetPos = { x: 0, y: 0.2, z: 0 };
        if (unit.benchIndex !== null) {
          targetPos =
            unit.team === "enemy"
              ? enemyBenchIndexToWorld3D(unit.benchIndex)
              : benchIndexToWorld3D(unit.benchIndex);
        } else if (unit.gridPosition) {
          targetPos = axialToWorld3D(unit.gridPosition, 0.2);
        }

        group.position.x = THREE.MathUtils.lerp(
          group.position.x,
          targetPos.x,
          0.35,
        );
        group.position.z = THREE.MathUtils.lerp(
          group.position.z,
          targetPos.z,
          0.35,
        );
        group.scale.set(1.0, 1.0, 1.0);
      }

      group.rotation.y = unit.team === "enemy" ? Math.PI : 0;
      group.userData.unit = unit;
      group.userData.lastRenderedStarLevel = unit.starLevel;

      updateUnitHealthSprite(group, unit);

      let selectRing = group.getObjectByName("select_ring");
      const isSelected = unit.instanceId === selectedUnitId;
      if (isSelected && !selectRing) {
        const rGeo = new THREE.RingGeometry(0.55, 0.65, 32);
        const rMat = new THREE.MeshBasicMaterial({
          color: 0xfacc15,
          side: THREE.DoubleSide,
        });
        selectRing = new THREE.Mesh(rGeo, rMat);
        selectRing.name = "select_ring";
        selectRing.rotation.x = Math.PI / 2;
        selectRing.position.y = -0.15;
        group.add(selectRing);
      } else if (!isSelected && selectRing) {
        group.remove(selectRing);
      }
    }
  }, [
    benchIndexToWorld3D,
    enemyBenchIndexToWorld3D,
    boardUnits,
    benchUnits,
    enemyBenchUnits,
    combatEngine,
    isCombatPhase,
    selectedUnitId,
  ]);

  // --- 3. Instanciación de Minileyendas (Estrategas) ---
   useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Estratega del Jugador
    if (playerLegendEntityRef.current) {
      scene.remove(playerLegendEntityRef.current.group);
    }
    const playerStartPos = getArenaTacticianPosition(activeArenaRankRef.current);
    const { group: playerGroup, legendData: playerLegendData, nameplateSprite: playerHpSprite } =
      LittleLegendManager.createLittleLegendGroup(
        playerLegendId,
        true,
        playerName,
        100, // Vida inicial del jugador
        1,   // Nivel inicial
        (legend3d) => {
          if (legend3d.mixer)
            unitMixersRef.current.set("player_legend_mixer", legend3d.mixer);
          if (playerLegendEntityRef.current)
            playerLegendEntityRef.current.model3D = legend3d;
        },
      );
    playerGroup.position.copy(playerStartPos);
    scene.add(playerGroup);

    playerLegendEntityRef.current = {
      id: "player_legend",
      isPlayer: true,
      name: playerName,
      legendData: playerLegendData,
      group: playerGroup,
      currentPos: playerStartPos.clone(),
      targetPos: null,
      facingAngle: -Math.PI / 4,
      state: "IDLE",
      stateTimer: 0,
      speed: 9.0,
      dustTimer: 0,
      model3D: null,
      nameplateSprite: playerHpSprite,
      currentHealth: 100,
      maxHealth: 100,
      level: 1,
    };

    // Estratega del Rival
    if (opponentLegendEntityRef.current) {
      scene.remove(opponentLegendEntityRef.current.group);
    }
    const oppStartPos = getArenaTacticianPosition(activeArenaRankRef.current, true);
    const { group: oppGroup, legendData: oppLegendData, nameplateSprite: oppHpSprite } =
      LittleLegendManager.createLittleLegendGroup(
        opponentLegendId,
        false,
        opponentName,
        100, // Vida inicial del rival
        1,
        (legend3d) => {
          if (legend3d.mixer)
            unitMixersRef.current.set("opp_legend_mixer", legend3d.mixer);
          if (opponentLegendEntityRef.current)
            opponentLegendEntityRef.current.model3D = legend3d;
        },
      );
    oppGroup.position.copy(oppStartPos);
    scene.add(oppGroup);

    opponentLegendEntityRef.current = {
      id: "opp_legend",
      isPlayer: false,
      name: opponentName,
      legendData: oppLegendData,
      group: oppGroup,
      currentPos: oppStartPos.clone(),
      targetPos: null,
      facingAngle: (3 * Math.PI) / 4,
      state: "IDLE",
      stateTimer: 0,
      speed: 9.0,
      dustTimer: 0,
      model3D: null,
      nameplateSprite: oppHpSprite,
      currentHealth: 100,
      maxHealth: 100,
      level: 1,
    };
  }, [playerLegendId, opponentLegendId, playerName, opponentName]);

  // Actualizar Posición y Objetivo de la Cámara
  const updateCameraTarget = useCallback(() => {
    const ratio = zoomDistanceRef.current / ARENA_CONFIG.camera.zoom.default;

    if (inspectingUnitRef.current) {
      const unit = inspectingUnitRef.current;
      let pos = { x: 0, y: 0.2, z: 0 };
      if (unit.benchIndex !== null) {
        pos =
          unit.team === "enemy"
            ? enemyBenchIndexToWorld3D(unit.benchIndex)
            : benchIndexToWorld3D(unit.benchIndex);
      } else if (unit.gridPosition) {
        pos = axialToWorld3D(unit.gridPosition, 0.2);
      }
      const insp = ARENA_CONFIG.camera.inspectUnit;
      targetLookAtRef.current.set(pos.x, insp.lookAtOffsetY, pos.z);
      targetCameraPosRef.current.set(
        pos.x,
        insp.camOffsetY * ratio,
        pos.z + insp.camOffsetZ * ratio,
      );
    } else if (
      isFollowingTacticianLocalRef.current &&
      playerLegendEntityRef.current
    ) {
      const pPos = playerLegendEntityRef.current.currentPos;
      const tact = ARENA_CONFIG.camera.tacticianFollow;
      targetLookAtRef.current.set(pPos.x, tact.lookAtOffsetY, pPos.z);
      targetCameraPosRef.current.set(
        pPos.x,
        tact.camOffsetY * ratio,
        pPos.z + tact.camOffsetZ * ratio,
      );
    } else {
      const def = getArenaCamera(activeArenaRankRef.current);
      targetLookAtRef.current.copy(def.defaultLookAt);
      targetCameraPosRef.current.set(
        def.defaultPosition.x,
        def.defaultPosition.y * ratio,
        def.defaultPosition.z * ratio,
      );
    }
  }, [benchIndexToWorld3D, enemyBenchIndexToWorld3D]);

  // Conexión de Refs de Emotes y Zoom
  useEffect(() => {
    if (onTriggerEmoteRef) {
      onTriggerEmoteRef.current = (
        emote: "DANCE" | "TAUNT" | "CHEER" | "LAUGH",
      ) => {
        const tactician = playerLegendEntityRef.current;
        if (!tactician) return;
        tactician.state = emote;
        tactician.stateTimer = 2.8;
        tactician.model3D?.playAnimation(emote.toLowerCase());

        if (tactician.bubbleSprite)
          tactician.group.remove(tactician.bubbleSprite);
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
        zoomDistanceRef.current = Math.max(
          ARENA_CONFIG.camera.zoom.min,
          zoomDistanceRef.current - ARENA_CONFIG.camera.zoom.step,
        );
        updateCameraTarget();
      };
    }
  }, [onZoomInRef, updateCameraTarget]);

  useEffect(() => {
    if (onZoomOutRef) {
      onZoomOutRef.current = () => {
        zoomDistanceRef.current = Math.min(
          ARENA_CONFIG.camera.zoom.max,
          zoomDistanceRef.current + ARENA_CONFIG.camera.zoom.step,
        );
        updateCameraTarget();
      };
    }
  }, [onZoomOutRef, updateCameraTarget]);

  useEffect(() => {
    if (onResetCameraRef) {
      onResetCameraRef.current = () => {
        zoomDistanceRef.current = ARENA_CONFIG.camera.zoom.default;
        const view = getArenaCamera(activeArenaRankRef.current);
        targetLookAtRef.current.copy(view.defaultLookAt);
        targetCameraPosRef.current.copy(view.defaultPosition);
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
  }, [
    onToggleFollowTacticianRef,
    updateCameraTarget,
    setIsFollowingTactician,
    setIsInspectingChampion,
  ]);

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
  }, [onInspectUnitRef, setIsInspectingChampion, setIsFollowingTactician, updateCameraTarget]);

  // Listener nativo del scroll del ratón
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * ARENA_CONFIG.camera.zoom.wheelSpeed;
      zoomDistanceRef.current = Math.max(
        ARENA_CONFIG.camera.zoom.min,
        Math.min(
          ARENA_CONFIG.camera.zoom.max,
          zoomDistanceRef.current + zoomDelta,
        ),
      );
      updateCameraTarget();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [updateCameraTarget]);

  // --- 4. Eventos de Combate (Daño, Proyectiles, VFX) ---
  useEffect(() => {
    if (!isCombatPhase || !combatEngine || !sceneRef.current) return;
    const scene = sceneRef.current;
    const now = performance.now();

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

    for (const vfx of combatEngine.vfxEvents) {
      const vfxMesh = createVfxMesh(vfx.color, vfx.radius);
      vfxMesh.position.set(vfx.x, vfx.y + 0.1, vfx.z);
      scene.add(vfxMesh);
      activeVfxRef.current.push({ mesh: vfxMesh, vfx, birthTime: now });
    }
  }, [
    combatEngine,
    combatEngine?.damageEvents,
    combatEngine?.projectileEvents,
    combatEngine?.vfxEvents,
    isCombatPhase,
  ]);

  // --- 5. Manejo de Puntero y Raycasting ---
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    // Clic Derecho: Orden de movimiento a la Minileyenda
    if (e.button === 2) {
      e.preventDefault();
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hitPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        hitPoint.x = Math.max(-9.5, Math.min(9.5, hitPoint.x));
        hitPoint.z = Math.max(-8.5, Math.min(8.5, hitPoint.z));

        const tactician = playerLegendEntityRef.current;
        if (tactician) {
          tactician.targetPos = hitPoint.clone();
          tactician.state = "RUNNING";
          tactician.model3D?.playAnimation("run", 0.12);

          const pingMesh =
            LittleLegendManager.createMoveClickPingMesh(0x00f0ff);
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

    // Raycast sobre Unidades
    const unitMeshObjects: THREE.Object3D[] = [];
    unitMeshesRef.current.forEach((g) => {
      g.traverse((child) => {
        if (child instanceof THREE.Mesh) unitMeshObjects.push(child);
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

        if (e.detail >= 2) {
          inspectingUnitRef.current = unit;
          isFollowingTacticianLocalRef.current = false;
          if (setIsInspectingChampion) setIsInspectingChampion(true);
          if (setIsFollowingTactician) setIsFollowingTactician(false);
          updateCameraTarget();
          return;
        }

        if (!isCombatPhase && unit.team !== "enemy") {
          placementTargetRef.current = null;
          setDraggedUnit(unit);
          draggedUnitRef.current = unit;

          const currentGroup = unitMeshesRef.current.get(unit.instanceId);
          if (currentGroup) {
            dragPosRef.current.set(
              currentGroup.position.x,
              1.25,
              currentGroup.position.z,
            );
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

    // Raycast sobre Hexágonos y Banca
    const hexObjects = Array.from(hexMeshesRef.current.values());
    const benchObjects = benchHexMeshesRef.current;
    const groundHits = raycaster.intersectObjects([
      ...hexObjects,
      ...benchObjects,
    ]);

    if (groundHits.length > 0) {
      const hit = groundHits[0].object;
      const activeUnitId = selectedUnitId;

      if (hit.userData.isBoardHex) {
        if (activeUnitId && !isCombatPhase && hit.userData.row >= 4) {
          onMoveUnit(activeUnitId, hit.userData.row, hit.userData.col);
        }
      } else if (hit.userData.isBenchHex) {
        if (activeUnitId && !isCombatPhase) {
          onMoveToBench(activeUnitId, hit.userData.benchIndex);
        }
      }
    } else {
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hitPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        hitPoint.x = Math.max(-9.5, Math.min(9.5, hitPoint.x));
        hitPoint.z = Math.max(-8.5, Math.min(8.5, hitPoint.z));

        const tactician = playerLegendEntityRef.current;
        if (tactician) {
          tactician.targetPos = hitPoint.clone();
          tactician.state = "RUNNING";

          const pingMesh =
            LittleLegendManager.createMoveClickPingMesh(0xfacc15);
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

  const clearPlacementPreview = useCallback(() => {
    placementTargetRef.current = null;
    setHoveredHex(null);
    setHoveredBenchIdx(null);
    setHoveredTargetUnit(null);
    setPlacementGridVisible(hexMeshesRef.current, benchHexMeshesRef.current, false);
    if (dragHighlightMeshRef.current) showPlacementTarget(dragHighlightMeshRef.current, null);
  }, []);

  const cancelPlacement = useCallback(() => {
    draggedUnitRef.current = null;
    setDraggedUnit(null);
    setIsOverSellZone(false);
    clearPlacementPreview();
  }, [clearPlacementPreview]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') cancelPlacement(); };
    window.addEventListener('blur', cancelPlacement);
    window.addEventListener('dragend', cancelPlacement);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('blur', cancelPlacement);
      window.removeEventListener('dragend', cancelPlacement);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [cancelPlacement]);

  useEffect(() => {
    if (isCombatPhase) {
      placementTargetRef.current = null;
      setPlacementGridVisible(hexMeshesRef.current, benchHexMeshesRef.current, false);
      if (dragHighlightMeshRef.current) showPlacementTarget(dragHighlightMeshRef.current, null);
    }
  }, [isCombatPhase]);

  const previewPlacement = (clientX: number, clientY: number) => {
    if (!rendererRef.current || !cameraRef.current || isCombatPhase) {
      clearPlacementPreview();
      return;
    }
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const point = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), cameraRef.current);
    if (!raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), point)) {
      clearPlacementPreview();
      return;
    }
    if (draggedUnitRef.current) dragPosRef.current.set(point.x, 1.25, point.z);
    const overShop = clientY > window.innerHeight - 150;
    setIsOverSellZone(overShop && draggedUnitRef.current !== null);
    const target = overShop ? null : findPlacementTarget(point, benchIndexToWorld3D);
    if (!target) { clearPlacementPreview(); return; }
    placementTargetRef.current = target;
    setPlacementGridVisible(hexMeshesRef.current, benchHexMeshesRef.current, true);
    setHoveredHex(target.kind === 'board' ? { row: target.row, col: target.col } : null);
    setHoveredBenchIdx(target.kind === 'bench' ? target.index : null);
    if (target.kind === 'bench') setHoveredTargetUnit(benchUnits[target.index] ?? null);
    else {
      const axial = rowColToAxial(target.row, target.col);
      setHoveredTargetUnit(boardUnits.find(unit => unit.gridPosition?.q === axial.q && unit.gridPosition.r === axial.r) ?? null);
    }
    if (dragHighlightMeshRef.current) showPlacementTarget(dragHighlightMeshRef.current, target);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggedUnitRef.current) return;
    previewPlacement(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const unit = draggedUnitRef.current;
    const target = placementTargetRef.current;
    if (unit && !isCombatPhase) {
      if (isOverSellZone && onSellUnit) onSellUnit(unit);
      else if (target?.kind === 'board') onMoveUnit(unit.instanceId, target.row, target.col);
      else if (target?.kind === 'bench') onMoveToBench(unit.instanceId, target.index);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    cancelPlacement();
  };

  const handleHtmlDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (isCombatPhase || !event.dataTransfer.types.includes('text/plain')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    previewPlacement(event.clientX, event.clientY);
  };

  const handleHtmlDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const unitId = event.dataTransfer.getData('text/plain');
    const target = placementTargetRef.current;
    if (unitId && !isCombatPhase) {
      if (target?.kind === 'board') onMoveUnit(unitId, target.row, target.col);
      else if (target?.kind === 'bench') onMoveToBench(unitId, target.index);
    }
    cancelPlacement();
  };

  return (
    <div
      ref={containerRef}
      id="three-arena-container"
      className={`relative w-full h-full select-none overflow-hidden ${
        draggedUnit ? "cursor-grabbing" : "cursor-default"
      }`}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancelPlacement}
      onPointerLeave={clearPlacementPreview}
      onDragLeave={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) clearPlacementPreview();
      }}
      onDragOver={handleHtmlDragOver}
      onDrop={handleHtmlDrop}
    >
      <div
        className="absolute bottom-44 left-4 z-10 rounded-lg border border-amber-300/30 bg-slate-950/90 p-3 text-xs text-slate-100 shadow-lg"
        onPointerDown={event => event.stopPropagation()}
        onPointerMove={event => event.stopPropagation()}
        onPointerUp={event => event.stopPropagation()}
        onWheel={event => event.stopPropagation()}
      >
        <label htmlFor="wow-arena" className="mb-1 block font-semibold text-amber-200">Arena de WoW</label>
        <select id="wow-arena" value={arenaRank} className="rounded border border-slate-600 bg-slate-900 px-2 py-1"
          onChange={event => {
            setArenaStatus('Cargando arena…');
            setArenaRank(event.target.value as WowArena);
          }}>
          {WOW_ARENAS.map(rank => <option key={rank} value={rank}>{rank === 'GranMaestro' ? 'Gran Maestro' : rank}</option>)}
        </select>
        {arenaStatus && <p role="status" className="mt-2 max-w-52">{arenaStatus}</p>}
        {arenaStatus.startsWith('No se pudo') && <button className="mt-2 underline" onClick={() => {
          setArenaStatus('Cargando arena…');
          setArenaRetry(value => value + 1);
        }}>Reintentar</button>}
      </div>
      {/* Banner de Arrastre Flotante */}
      <ArenaDragOverlay
        draggedUnit={draggedUnit}
        isOverSellZone={isOverSellZone}
        hoveredHex={hoveredHex}
        hoveredBenchIdx={hoveredBenchIdx}
        hoveredTargetUnit={hoveredTargetUnit}
      />
    </div>
  );
};
