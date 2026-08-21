// --- EN: src/engine/littleLegendManager.ts ---

import * as THREE from 'three';
import { LittleLegendData, getLittleLegendById } from '@/data/littleLegends';
import { littleLegendModelManager, Legend3DInstance } from './littleLegendModelManager';

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
}

export class LittleLegendManager {
  public static createLittleLegendGroup(
    legendId: string,
    isPlayer: boolean,
    playerName: string,
    onLoaded?: (instance: Legend3DInstance) => void
  ): { group: THREE.Group; legendData: LittleLegendData } {
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

    // 3. Cargar el GLB real desde public/minileyendas/
    const targetFile = legendData.modelFile || `${legendData.id}.glb`;
    littleLegendModelManager
      .loadModel(targetFile)
      .then((template) => {
        if (!template) return;

        // Remover placeholder
        const existingPlaceholder = avatarGroup.getObjectByName('tactician_placeholder');
        if (existingPlaceholder) {
          avatarGroup.remove(existingPlaceholder);
        }

        // Instanciar modelo 3D con animaciones
        const legend3d = littleLegendModelManager.instantiate(
          template,
          legendData.scale || 1.0
        );
        legend3d.group.name = 'tactician_3d_model';
        avatarGroup.add(legend3d.group);

        // 🟢 Pasar directamente la instancia legend3d
        if (onLoaded) {
          onLoaded(legend3d);
        }
      })
      .catch((err) => {
        console.warn(`[LittleLegendManager] Fallback a modelo básico para "${legendData.name}":`, err);
      });

    // 4. Nameplate superior
    const nameplate = this.createNameplateSprite(playerName, isPlayer, legendData);
    nameplate.name = 'tactician_nameplate';
    nameplate.position.y = 2.05;
    nameplate.scale.set(2.4, 0.6, 1);
    group.add(nameplate);

    return { group, legendData };
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

  public static createNameplateSprite(
    playerName: string,
    isPlayer: boolean,
    legend: LittleLegendData
  ): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = isPlayer ? 'rgba(8, 20, 44, 0.88)' : 'rgba(40, 10, 20, 0.88)';
    ctx.strokeStyle = isPlayer ? '#00e5ff' : '#f43f5e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 48, 24);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(isPlayer ? `👑 ${legend.icon}` : `⚔️ ${legend.icon}`, 20, 32);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    const truncatedName = playerName.length > 14 ? playerName.slice(0, 13) + '…' : playerName;
    ctx.fillText(truncatedName, 68, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    return new THREE.Sprite(material);
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