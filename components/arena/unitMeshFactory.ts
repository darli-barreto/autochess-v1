// src/components/arena/unitMeshFactory.ts

import * as THREE from 'three';
import { BoardUnit } from '@/types/game';
import { CHAMPIONS_DATA } from '@/data/champions';
import { axialToWorld3D, benchIndexToWorld3D, enemyBenchIndexToWorld3D } from '@/engine/hexMath';
import { championModelManager } from '@/engine/championModelManager';

export function createUnitGroup(
  unit: BoardUnit,
  unitMixersMap?: Map<string, THREE.AnimationMixer>
): THREE.Group {
  const base = CHAMPIONS_DATA[unit.championId];
  const group = new THREE.Group();
  group.name = `unit_${unit.instanceId}`;
  group.userData = { unit };

  // Posición inicial 3D
  if (unit.benchIndex !== null) {
    const pos =
      unit.team === 'enemy'
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

  // Pedestal del equipo
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

  // Placeholder procedural (mientras se descarga el modelo 3D)
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

  // Carga asíncrona del modelo 3D GLTF
  championModelManager
    .loadModel(unit.championId)
    .then((template) => {
      if (!template) return;
      if (group.userData.unit?.instanceId !== unit.instanceId) return;

      const existingFallback = group.getObjectByName('fallback_avatar');
      if (existingFallback) {
        group.remove(existingFallback);
      }

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

  // Aura dorada para 3 estrellas
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

  // Sprite de barra de vida y maná
  const hpSprite = createHealthbarSprite(unit);
  hpSprite.name = 'healthbar_sprite';
  hpSprite.position.y = 2.45 * starScale;
  hpSprite.scale.set(1.5, 0.38, 1);
  group.add(hpSprite);

  return group;
}

export function createHealthbarSprite(unit: BoardUnit): THREE.Sprite {
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

export function updateUnitHealthSprite(group: THREE.Group, unit: BoardUnit) {
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

export function drawHealthbarOnCanvas(ctx: CanvasRenderingContext2D, unit: BoardUnit) {
  ctx.clearRect(0, 0, 180, 46);

  // Marco de fondo
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.roundRect(4, 4, 172, 38, 4);
  ctx.fill();
  ctx.stroke();

  // Barra de Vida
  const hpPercent = Math.max(0, Math.min(1, unit.currentHealth / Math.max(1, unit.maxHealth)));
  ctx.fillStyle = unit.team === 'ally' ? '#22c55e' : '#ef4444';
  ctx.fillRect(8, 8, 164 * hpPercent, 14);

  // Escudo
  if (unit.shield > 0) {
    const shieldPercent = Math.min(1, unit.shield / Math.max(1, unit.maxHealth));
    ctx.fillStyle = 'rgba(250, 204, 21, 0.7)';
    ctx.fillRect(8, 8, 164 * shieldPercent, 14);
  }

  // Barra de Maná
  const manaPercent = Math.max(0, Math.min(1, unit.currentMana / Math.max(1, unit.maxMana)));
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(8, 26, 164 * manaPercent, 8);

  // Indicador de Estrellas
  ctx.fillStyle = unit.starLevel === 3 ? '#facc15' : unit.starLevel === 2 ? '#e2e8f0' : '#d97706';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  const starsText = unit.starLevel === 3 ? '★★★' : unit.starLevel === 2 ? '★★' : '★';
  ctx.fillText(starsText, 10, 20);

  // Ítems (Puntos indicadores)
  if (unit.items && unit.items.length > 0) {
    ctx.fillStyle = '#fbbf24';
    for (let i = 0; i < unit.items.length; i++) {
      ctx.beginPath();
      ctx.arc(140 + i * 12, 15, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function createDamageSprite(amount: number, type: string, isCrit: boolean): THREE.Sprite {
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

export function createProjectileMesh(colorHex: string): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.18, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) });
  return new THREE.Mesh(geo, mat);
}

export function createVfxMesh(colorHex: string, radius: number = 1.5): THREE.Mesh {
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