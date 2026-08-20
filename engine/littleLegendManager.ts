import * as THREE from 'three';
import { championModelManager } from './championModelManager';
import { LittleLegendData, getLittleLegendById } from '@/data/littleLegends';

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
  mixer?: THREE.AnimationMixer | null;
}

export class LittleLegendManager {
  // Create 3D Group for a Little Legend
  public static createLittleLegendGroup(
    legendId: string,
    isPlayer: boolean,
    playerName: string,
    onMixerCreated?: (mixer: THREE.AnimationMixer) => void
  ): { group: THREE.Group; legendData: LittleLegendData } {
    const legendData = getLittleLegendById(legendId);
    const group = new THREE.Group();
    group.name = `tactician_${isPlayer ? 'player' : 'opponent'}`;

    // 1. Glowing Pedestal on floor
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

    // Glowing Rim Ring
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

    // 2. Avatar / Body: Procedural or GLTF 3D Model
    const avatarGroup = new THREE.Group();
    avatarGroup.name = 'tactician_avatar';

    if (legendData.modelId && championModelManager.has3DModel(legendData.modelId)) {
      // Build placeholder while 3D model loads
      const placeholder = this.buildProceduralSprite(legendData, isPlayer);
      placeholder.name = 'tactician_placeholder';
      avatarGroup.add(placeholder);

      // Async load 3D GLB
      championModelManager
        .loadModel(legendData.modelId)
        .then((template) => {
          if (!template) return;
          const existingPlaceholder = avatarGroup.getObjectByName('tactician_placeholder');
          if (existingPlaceholder) {
            avatarGroup.remove(existingPlaceholder);
          }
          const { group: modelGroup, mixer } = championModelManager.instantiate(template, 1, 0.65);
          modelGroup.name = 'tactician_3d_model';
          avatarGroup.add(modelGroup);
          if (mixer && onMixerCreated) {
            onMixerCreated(mixer);
          }
        })
        .catch((err) => {
          console.warn('Could not load Little Legend 3D model:', err);
        });
    } else if (legendData.proceduralType === 'pengu') {
      avatarGroup.add(this.buildProceduralPengu(legendData, isPlayer));
    } else {
      // Default: River Sprite
      avatarGroup.add(this.buildProceduralSprite(legendData, isPlayer));
    }

    group.add(avatarGroup);

    // 3. Nameplate Banner Overhead
    const nameplate = this.createNameplateSprite(playerName, isPlayer, legendData);
    nameplate.name = 'tactician_nameplate';
    nameplate.position.y = 1.95;
    nameplate.scale.set(2.4, 0.6, 1);
    group.add(nameplate);

    return { group, legendData };
  }

  // --- Procedural River Sprite Builder ---
  private static buildProceduralSprite(legend: LittleLegendData, isPlayer: boolean): THREE.Group {
    const spriteGroup = new THREE.Group();

    // Translucent Teardrop / Water Pearl Body
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

    // Cute Dark Eyes
    const eyeGeo = new THREE.SphereGeometry(0.07, 10, 10);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.16, 0.72, 0.42);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.16, 0.72, 0.42);
    spriteGroup.add(leftEye, rightEye);

    // Eye Specular Glints
    const glintGeo = new THREE.SphereGeometry(0.024, 6, 6);
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftGlint = new THREE.Mesh(glintGeo, glintMat);
    leftGlint.position.set(-0.14, 0.74, 0.47);
    const rightGlint = new THREE.Mesh(glintGeo, glintMat);
    rightGlint.position.set(0.18, 0.74, 0.47);
    spriteGroup.add(leftGlint, rightGlint);

    // Cute Antenna / Whiskers with Glowing Star/Pearl
    const stalkGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.35, 8);
    const stalkMat = new THREE.MeshStandardMaterial({ color: legend.accentColor, roughness: 0.3 });
    const stalk = new THREE.Mesh(stalkGeo, stalkMat);
    stalk.position.set(0, 1.25, 0);
    stalk.rotation.z = 0.1;
    spriteGroup.add(stalk);

    const pearlGeo = new THREE.SphereGeometry(0.1, 12, 12);
    const pearlMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const pearl = new THREE.Mesh(pearlGeo, pearlMat);
    pearl.name = 'sprite_pearl';
    pearl.position.set(0.04, 1.45, 0);
    spriteGroup.add(pearl);

    // Tiny Hovering Water Wings / Fins
    const wingGeo = new THREE.ConeGeometry(0.18, 0.45, 6);
    wingGeo.rotateZ(Math.PI / 2);
    const wingMat = new THREE.MeshStandardMaterial({
      color: legend.accentColor,
      transparent: true,
      opacity: 0.8,
    });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.name = 'sprite_left_wing';
    leftWing.position.set(-0.48, 0.62, 0);
    leftWing.rotation.z = -0.3;
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.name = 'sprite_right_wing';
    rightWing.position.set(0.48, 0.62, 0);
    rightWing.rotation.z = 0.3;
    spriteGroup.add(leftWing, rightWing);

    return spriteGroup;
  }

  // --- Procedural Pengu Knight Builder ---
  private static buildProceduralPengu(legend: LittleLegendData, isPlayer: boolean): THREE.Group {
    const penguGroup = new THREE.Group();

    // Blue/Dark body
    const bodyGeo = new THREE.SphereGeometry(0.46, 18, 18);
    bodyGeo.scale(1.0, 1.2, 0.95);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.62;
    body.castShadow = true;
    penguGroup.add(body);

    // White belly
    const bellyGeo = new THREE.SphereGeometry(0.38, 16, 16);
    bellyGeo.scale(0.85, 1.0, 0.6);
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, 0.58, 0.22);
    penguGroup.add(belly);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.14, 0.78, 0.4);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.14, 0.78, 0.4);
    penguGroup.add(leftEye, rightEye);

    // Yellow beak
    const beakGeo = new THREE.ConeGeometry(0.09, 0.2, 8);
    beakGeo.rotateX(Math.PI / 2);
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0, 0.72, 0.46);
    penguGroup.add(beak);

    // Knight Feather Hat / Crown
    const crownGeo = new THREE.CylinderGeometry(0.24, 0.3, 0.16, 12);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6, roughness: 0.2 });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(0, 1.16, 0);
    penguGroup.add(crown);

    const featherGeo = new THREE.ConeGeometry(0.06, 0.4, 6);
    featherGeo.rotateZ(-0.4);
    const featherMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const feather = new THREE.Mesh(featherGeo, featherMat);
    feather.position.set(0.15, 1.35, 0);
    penguGroup.add(feather);

    // Tiny Wooden Sword on back
    const swordGeo = new THREE.BoxGeometry(0.08, 0.55, 0.04);
    const swordMat = new THREE.MeshStandardMaterial({ color: 0x92400e });
    const sword = new THREE.Mesh(swordGeo, swordMat);
    sword.position.set(0.22, 0.75, -0.38);
    sword.rotation.z = -0.4;
    penguGroup.add(sword);

    return penguGroup;
  }

  // --- Dynamic Overhead Nameplate Banner Sprite ---
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

    // Background pill
    ctx.fillStyle = isPlayer ? 'rgba(8, 20, 44, 0.88)' : 'rgba(40, 10, 20, 0.88)';
    ctx.strokeStyle = isPlayer ? '#00e5ff' : '#f43f5e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 48, 24);
    ctx.fill();
    ctx.stroke();

    // Icon + Crown
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(isPlayer ? `👑 ${legend.icon}` : `⚔️ ${legend.icon}`, 20, 32);

    // Player Name
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    const truncatedName = playerName.length > 14 ? playerName.slice(0, 13) + '…' : playerName;
    ctx.fillText(truncatedName, 68, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    return new THREE.Sprite(material);
  }

  // --- Ground Click Move Ping Reticle (Expanding Golden/Cyan Rings) ---
  public static createMoveClickPingMesh(color: number = 0x00f0ff): THREE.Group {
    const group = new THREE.Group();

    // Outer Expanding Ring
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

    // Center Core Diamond
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

    // 4 Directional Chevron Pointer Arrows
    for (let i = 0; i < 4; i++) {
      const arrowGeo = new THREE.ConeGeometry(0.08, 0.22, 3);
      const arrowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      const angle = (i * Math.PI) / 2;
      arrow.position.set(Math.sin(angle) * 0.7, 0.06, Math.cos(angle) * 0.7);
      arrow.rotation.x = Math.PI / 2;
      arrow.rotation.z = -angle;
      arrow.name = `ping_arrow_${i}`;
      group.add(arrow);
    }

    return group;
  }

  // --- Emote Balloon Sprite ---
  public static createEmoteSprite(emoteType: 'DANCE' | 'TAUNT' | 'CHEER' | 'LAUGH' | 'VICTORY'): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Bubble circle
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 60, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Emoji
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
