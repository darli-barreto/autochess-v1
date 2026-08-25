// src/engine/littleLegendManager.ts

import * as THREE from 'three';
import { LittleLegendData, getLittleLegendById } from '@/data/littleLegends';
import { littleLegendModelManager, Legend3DInstance } from './littleLegendModelManager';

// ============================================================================
// 🎛️ PANEL DE CONTROL: PLACA MINIMALISTA DEL ESTRATEGA (ESTILO OFICIAL TFT)
// ============================================================================
export const TACTICIAN_NAMEPLATE_CONFIG = {
  // 1. 📐 Resolución interna del Canvas HD
  canvas: {
    width: 320,
    height: 120,
  },

  // 2. 🔤 Nombre del Estratega (Flotando arriba centrado)
  name: {
    x: 188,               // Posición X (centrado en el canvas de 320)
    y: 20,                // Posición Y
    fontSize: 40,         // Tamaño de letra
    color: '#ffffff',     // Color blanco nítido
    outlineColor: '#000000', // Borde negro exterior para máxima legibilidad
    outlineWidth: 3,      // Grosor del borde negro
  },

  // 3. 🔢 Caja de Nivel (Recuadro Izquierdo)
  levelBox: {
    x: 16,                // Posición X
    y: 35,                // Posición Y
    width: 60,            // Ancho del recuadro
    height: 60,           // Alto del recuadro
    radius: 5,            // Esquinas redondeadas
    bgColor: '#0e141a',   // Fondo oscuro
    playerBorderColor: '#384756',   // Borde metálico para el jugador
    opponentBorderColor: '#522b35', // Borde para el rival
    borderWidth: 2.5,     // Grosor del borde
    fontSize: 35,         // Tamaño del número de nivel
    color: '#ffffff',     // Color del número
  },

  // 4. 💚 Barra de Vida (Rectángulo Derecho)
  hpBar: {
    x: 78,                // Posición X (pegado a la caja de nivel)
    y: 50,                // Posición Y
    width: 240,           // Ancho de la barra
    height: 35,           // Alto de la barra
    radius: 4,            // Redondeo de esquinas
    emptyBgColor: '#080d13', // Fondo oscuro de vida vacía
    playerBorderColor: '#384756',   // Borde metálico de la barra
    opponentBorderColor: '#522b35',
    borderWidth: 2,

    // Relleno de vida (degradado suave superior/inferior)
    colorHighTop: '#22c55e',      // Verde claro superior (> 50% HP)
    colorHighBottom: '#15803d',   // Verde oscuro inferior
    colorMediumTop: '#f59e0b',    // Amarillo (> 25% HP)
    colorMediumBottom: '#b45309',
    colorLowTop: '#ef4444',       // Rojo crítico (< 25% HP)
    colorLowBottom: '#991b1b',
  },

  // 5. 🌍 Tamaño y Posición en el Mundo 3D (Sobre la Minileyenda)
  world3D: {
    baseOffsetY: 1.95,    // ⬆️ Altura sobre la cabeza
    scaleX: 1.45,         // ↔️ Ancho en 3D
    scaleY: 0.435,        // ↕️ Alto en 3D (proporción 320x96)
  },
};

export interface LittleLegendEntity {
  id: string;
  isPlayer: boolean;
  name: string;
  legendData: LittleLegendData;
  group: THREE.Group;
  currentPos: THREE.Vector3;
  targetPos: THREE.Vector3 | null;
  facingAngle: number;
  state: 'IDLE' | 'RUNNING' | 'DANCE' | 'TAUNT' | 'CHEER' | 'LAUGH' | 'VICTORY';
  stateTimer: number;
  speed: number;
  dustTimer: number;
  bubbleSprite?: THREE.Sprite | null;
  model3D?: Legend3DInstance | null;
  nameplateSprite?: THREE.Sprite | null;
  currentHealth: number;
  maxHealth: number;
  level: number;
}

export class LittleLegendManager {
  public static createLittleLegendGroup(
    legendId: string,
    isPlayer: boolean,
    playerName: string,
    initialHealth: number = 100,
    initialLevel: number = 1,
    onLoaded?: (instance: Legend3DInstance) => void
  ): { group: THREE.Group; legendData: LittleLegendData; nameplateSprite: THREE.Sprite } {
    const legendData = getLittleLegendById(legendId);
    const group = new THREE.Group();
    group.name = `tactician_${isPlayer ? 'player' : 'opponent'}`;

    // 1. Pedestal de suelo
    const pedestalGeo = new THREE.CylinderGeometry(0.65, 0.75, 0.08, 24);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: isPlayer ? 0x0f2438 : 0x2e1220,
      roughness: 0.4,
      metalness: 0.6,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.name = 'tactician_pedestal';
    pedestal.position.y = 0.04;
    pedestal.receiveShadow = true;
    group.add(pedestal);

    // Anillo luminoso
    const rimGeo = new THREE.RingGeometry(0.62, 0.76, 32);
    const rimMat = new THREE.MeshBasicMaterial({
      color: isPlayer ? 0x00f0ff : 0xf43f5e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.name = 'tactician_rim';
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.085;
    group.add(rim);

    // 2. Avatar Container
    const avatarGroup = new THREE.Group();
    avatarGroup.name = 'tactician_avatar';
    group.add(avatarGroup);

    // Placeholder procedural mientras descarga el .glb
    const placeholder = legendData.proceduralType === 'pengu'
      ? this.buildProceduralPengu(legendData, isPlayer)
      : this.buildProceduralSprite(legendData, isPlayer);
    placeholder.name = 'tactician_placeholder';
    avatarGroup.add(placeholder);

    // 3. Cargar el GLB real
    const targetFile = legendData.modelFile || `${legendData.id}.glb`;
    littleLegendModelManager
      .loadModel(targetFile)
      .then((template) => {
        if (!template) return;

        const existingPlaceholder = avatarGroup.getObjectByName('tactician_placeholder');
        if (existingPlaceholder) {
          avatarGroup.remove(existingPlaceholder);
        }

        const legend3d = littleLegendModelManager.instantiate(
          template,
          legendData.scale || 1.0
        );
        legend3d.group.name = 'tactician_3d_model';
        avatarGroup.add(legend3d.group);

        if (onLoaded) {
          onLoaded(legend3d);
        }
      })
      .catch((err) => {
        console.warn(`[LittleLegendManager] Fallback a modelo básico para "${legendData.name}":`, err);
      });

    // 4. ✨ Placa de Nombre y Vida estilo TFT Minimalista
    const nameplateSprite = this.createTacticianNameplateSprite(
      playerName,
      isPlayer,
      legendData,
      initialHealth,
      100,
      initialLevel
    );
    nameplateSprite.name = 'tactician_nameplate';
    nameplateSprite.position.y = TACTICIAN_NAMEPLATE_CONFIG.world3D.baseOffsetY;
    nameplateSprite.scale.set(
      TACTICIAN_NAMEPLATE_CONFIG.world3D.scaleX,
      TACTICIAN_NAMEPLATE_CONFIG.world3D.scaleY,
      1
    );
    group.add(nameplateSprite);

    return { group, legendData, nameplateSprite };
  }

  // --- 🎨 Dibujado de la Placa Exacta de TFT ---
  public static drawTacticianNameplate(
    ctx: CanvasRenderingContext2D,
    playerName: string,
    isPlayer: boolean,
    _legend: LittleLegendData,
    health: number,
    maxHealth: number = 100,
    level: number = 1
  ) {
    const conf = TACTICIAN_NAMEPLATE_CONFIG;
    const { width: W, height: H } = conf.canvas;

    ctx.clearRect(0, 0, W, H);

    // 1. NOMBRE DEL ESTRATEGA (Flotando arriba)
    const { x: nx, y: ny, fontSize: nSize, color: nColor, outlineColor: nOutline, outlineWidth: nOutW } = conf.name;
    const truncatedName = playerName.length > 16 ? playerName.slice(0, 15) + '…' : playerName;

    ctx.font = `bold ${nSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Borde negro exterior
    ctx.strokeStyle = nOutline;
    ctx.lineWidth = nOutW;
    ctx.strokeText(truncatedName, nx, ny);

    // Relleno blanco
    ctx.fillStyle = nColor;
    ctx.fillText(truncatedName, nx, ny);

    // 2. RECUADRO DE NIVEL (Izquierda)
    const { x: lx, y: ly, width: lw, height: lh, radius: lr, bgColor: lBg, borderWidth: lBw, fontSize: lSize, color: lColor } = conf.levelBox;
    const lBorder = isPlayer ? conf.levelBox.playerBorderColor : conf.levelBox.opponentBorderColor;

    ctx.fillStyle = lBg;
    ctx.beginPath();
    ctx.roundRect(lx, ly, lw, lh, lr);
    ctx.fill();

    ctx.strokeStyle = lBorder;
    ctx.lineWidth = lBw;
    ctx.stroke();

    // Número de Nivel
    ctx.font = `bold ${lSize}px sans-serif`;
    ctx.fillStyle = lColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${level}`, lx + lw / 2, ly + lh / 2 + 1);

    // 3. BARRA DE VIDA (Derecha)
    const { x: hx, y: hy, width: hw, height: hh, radius: hr, emptyBgColor: hBg, borderWidth: hBw } = conf.hpBar;
    const hBorder = isPlayer ? conf.hpBar.playerBorderColor : conf.hpBar.opponentBorderColor;

    ctx.fillStyle = hBg;
    ctx.beginPath();
    ctx.roundRect(hx, hy, hw, hh, hr);
    ctx.fill();

    ctx.strokeStyle = hBorder;
    ctx.lineWidth = hBw;
    ctx.stroke();

    // Relleno Dinámico de Vida
    const safeHp = Math.max(0, Math.min(maxHealth, health));
    const hpPct = safeHp / maxHealth;

    if (hpPct > 0) {
      const fillW = Math.max(4, hw * hpPct);

      const hpGrad = ctx.createLinearGradient(0, hy, 0, hy + hh);
      if (hpPct > 0.5) {
        hpGrad.addColorStop(0, conf.hpBar.colorHighTop);
        hpGrad.addColorStop(1, conf.hpBar.colorHighBottom);
      } else if (hpPct > 0.25) {
        hpGrad.addColorStop(0, conf.hpBar.colorMediumTop);
        hpGrad.addColorStop(1, conf.hpBar.colorMediumBottom);
      } else {
        hpGrad.addColorStop(0, conf.hpBar.colorLowTop);
        hpGrad.addColorStop(1, conf.hpBar.colorLowBottom);
      }

      ctx.fillStyle = hpGrad;
      ctx.beginPath();
      ctx.roundRect(hx + 1, hy + 1, fillW - 2, hh - 2, Math.max(1, hr - 1));
      ctx.fill();

      // Brillo tenue en la parte superior
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(hx + 1, hy + 1, fillW - 2, Math.floor(hh / 3));
    }
  }

  // --- 📦 Creación y Gestión del Sprite Three.js ---
  public static createTacticianNameplateSprite(
    playerName: string,
    isPlayer: boolean,
    legend: LittleLegendData,
    health: number = 100,
    maxHealth: number = 100,
    level: number = 1
  ): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = TACTICIAN_NAMEPLATE_CONFIG.canvas.width;
    canvas.height = TACTICIAN_NAMEPLATE_CONFIG.canvas.height;
    const ctx = canvas.getContext('2d')!;

    this.drawTacticianNameplate(ctx, playerName, isPlayer, legend, health, maxHealth, level);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      toneMapped: false,
      depthTest: false,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 9999;
    sprite.userData = {
      canvas,
      ctx,
      texture,
      playerName,
      isPlayer,
      legend,
      health,
      maxHealth,
      level,
    };

    return sprite;
  }

  public static updateTacticianHealth(
    sprite: THREE.Sprite,
    newHealth: number,
    newLevel?: number
  ) {
    if (!sprite || !sprite.userData) return;
    const data = sprite.userData;

    if (data.health === newHealth && (newLevel === undefined || data.level === newLevel)) {
      return;
    }

    data.health = newHealth;
    if (newLevel !== undefined) data.level = newLevel;

    this.drawTacticianNameplate(
      data.ctx,
      data.playerName,
      data.isPlayer,
      data.legend,
      data.health,
      data.maxHealth,
      data.level
    );
    data.texture.needsUpdate = true;
  }

  // --- Procedural Fallbacks ---
  private static buildProceduralSprite(legend: LittleLegendData, isPlayer: boolean): THREE.Group {
    const spriteGroup = new THREE.Group();
    const bodyGeo = new THREE.SphereGeometry(0.48, 20, 20);
    bodyGeo.scale(1.0, 1.15, 0.95);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: legend.color,
      roughness: 0.15,
      metalness: 0.3,
      emissive: isPlayer ? 0x0284c7 : 0x9f1239,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.92,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.name = 'sprite_body';
    body.position.y = 0.65;
    body.castShadow = true;
    spriteGroup.add(body);

    const eyeGeo = new THREE.SphereGeometry(0.07, 10, 10);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.16, 0.72, 0.42);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.16, 0.72, 0.42);
    spriteGroup.add(leftEye, rightEye);

    return spriteGroup;
  }

  private static buildProceduralPengu(legend: LittleLegendData, isPlayer: boolean): THREE.Group {
    const penguGroup = new THREE.Group();
    const bodyGeo = new THREE.SphereGeometry(0.46, 18, 18);
    bodyGeo.scale(1.0, 1.2, 0.95);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.62;
    body.castShadow = true;
    penguGroup.add(body);

    const bellyGeo = new THREE.SphereGeometry(0.38, 16, 16);
    bellyGeo.scale(0.85, 1.0, 0.6);
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, 0.58, 0.22);
    penguGroup.add(belly);

    return penguGroup;
  }

  public static createMoveClickPingMesh(color: number = 0x00f0ff): THREE.Group {
    const group = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(0.2, 0.45, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    ring.name = 'ping_ring';
    group.add(ring);

    const coreGeo = new THREE.RingGeometry(0.02, 0.12, 4);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.rotation.x = -Math.PI / 2;
    core.rotation.z = Math.PI / 4;
    core.position.y = 0.06;
    core.name = 'ping_core';
    group.add(core);

    return group;
  }

  public static createEmoteSprite(emoteType: 'DANCE' | 'TAUNT' | 'CHEER' | 'LAUGH' | 'VICTORY'): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 60, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let emoji = '🎵';
    if (emoteType === 'TAUNT') emoji = '💥';
    if (emoteType === 'CHEER') emoji = '❤️';
    if (emoteType === 'LAUGH') emoji = '😆';
    if (emoteType === 'VICTORY') emoji = '🏆';

    ctx.fillText(emoji, 64, 60);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.1, 1.1, 1);
    return sprite;
  }
}