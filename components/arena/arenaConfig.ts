// src/components/arena/arenaConfig.ts

import * as THREE from "three";

export const ARENA_CONFIG = {
  // Configuración de la Cámara
  camera: {
    fov: 32,
    near: 0.1,
    far: 1000,
    defaultPosition: new THREE.Vector3(0, 16.9, 20.0),
    defaultLookAt: new THREE.Vector3(0, 0, 1.2),
    zoom: {
      default: 27.0,
      min: 7.0,
      max: 34.0,
      step: 3.5,
      wheelSpeed: 0.015,
    },
    tacticianFollow: {
      lookAtOffsetY: 0.8,
      camOffsetY: 8.5,
      camOffsetZ: 7.5,
    },
    inspectUnit: {
      lookAtOffsetY: 0.8,
      camOffsetY: 5.5,
      camOffsetZ: 5.2,
    },
  },

  champions: {
    baseHeight: 1.2, // 📏 Altura base calibrada al tamaño del hexágono

    // 🌟 MULTIPLICADORES CON CONTRASTE VISUAL REAL:
    starScales: {
      1: 1.0, // Base estándar
      2: 1.25, // +25% (Notorio)
      3: 1.5, // +50% (Grande + Aura Dorada)
      4: 1.75, // +75% (Colosal + Aura Prismática)
    } as Record<number, number>,

    healthbarBaseOffsetY: 1.55, // Altura de la barra de vida calibrada
    pedestalRadius: 0.48, // Radio del pedestal para que no desborde el hexágono
  },

  // Colores de la Escena y Niebla
  scene: {

    enableFog: false,
    fogColor: 0,
    fogNear: 45,
    fogFar: 95,
  },

  // Iluminación
  lights: {
    hemi: {
      skyColor: 0xfff7ed,
      groundColor: 0x1e3a8a,
      intensity: 1.4,
    },
    sun: {
      color: 0xfffaea,
      intensity: 2.2,
      position: new THREE.Vector3(12, 24, 14),
      shadowMapSize: 1024,
      shadowBias: -0.0004,
    },
    cyanRim: {
      color: 0x1e3a8a,
      intensity: 1.3,
      position: new THREE.Vector3(-16, 12, -14),
    },
    goldRim: {
      color: 0xf59e0b,
      intensity: 1.0,
      position: new THREE.Vector3(16, 8, -10),
    },
    ambient: {
      color: 0xffffff,
      intensity: 0.7,
    },
    centerGlow: {
      color: 0x38bdf8,
      intensity: 1.5,
      distance: 24,
      position: new THREE.Vector3(0, 3, 0),
    },
  },

  // Plataformas e Islas
  environment: {
    island: {
      topRadius: 16.5,
      bottomRadius: 17.8,
      height: 3.2,
      segments: 36,
      color: 0xf59e0b,
      roughness: 0.7,
      metalness: 0.3,
      posY: -1.65,
    },
    ground: {
      width: 0,
      height: 0.3,
      depth: 12.2,
      color: 0xf59e0b,
      roughness: 0.55,
      metalness: 0.25,
      posY: -0.15,
    },
    stoneBenches: {
      width: 13.4,
      height: 0.22,
      depth: 1.9,
      color: 0xf59e0b,
      roughness: 0.65,
      metalness: 0.35,
      topZ: -6.7,
      bottomZ: 6.7,
      posY: -0.02,
    },
  },

  // Brazeros con fuego
  braziers: {
    positions: [
      { x: -7.2, z: -7.4 },
      { x: 7.2, z: -7.4 },
      { x: -7.2, z: 7.4 },
      { x: 7.2, z: 7.4 },
    ],
    baseColor: 0x334155,
    bowlColor: 0x1e293b,
    flameColor: 0xf59e0b,
    lightIntensity: 1.6,
    lightDistance: 10,
  },

  // Cuadrícula de Hexágonos
  hexGrid: {
    radius: 0.7,
    height: 0.015,
    spacingX: 2.2,
    spacingZ: 1.13,
    offsetX: 0.6,
    offsetZ: 0.7,
    ally: {
      color: 0x241624,
      outlineColor: 0x00e5ff,
      outlineOpacity: 0.4,
      roughness: 0.6,
      metalness: 0.5,
    },
    enemy: {
      color: 0x241624,
      outlineColor: 0xf43f5e,
      outlineOpacity: 0.6,
      roughness: 0.4,
      metalness: 0.45,
    },
  },

  // Bancas
  benches: {
    radius: 0,
    height: 0,
    ally: {
      spacing: 1.65,
      radius: 0.85,
      z: 6.2,
      xOffset: 0.46,
      y: 0.1,
      height: 3.05,
      color: 0xf59e,
      outlineColor: 0xf59e,
      innerRingColor: 0xf59e,
    },
    enemy: {
      spacing: 1.65,
      radius: 0.85,
      xOffset: 0.7,
      z: -5,
      color: 0x241620,
      outlineColor: 0xf43f5e,
      innerRingColor: 0xf43f5e,
    },
  },

  // Resaltado de arrastre
  dragHighlight: {
    outerRadius: 0.74,
    innerRadius: 0,
    colorAlly: 0xf59e,
    colorSwap: 0xf59e,
    colorBench: 0x00d2ff,
    colorEnemyForbidden: 0xef4444,
  },
};
