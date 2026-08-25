// src/components/arena/unitMeshFactory.ts

import * as THREE from 'three';
import { BoardUnit } from '@/types/game';
import { CHAMPIONS_DATA } from '@/data/champions';
import { axialToWorld3D, benchIndexToWorld3D, enemyBenchIndexToWorld3D } from '@/engine/hexMath';
import { championModelManager } from '@/engine/championModelManager';
import { ARENA_CONFIG } from './arenaConfig';

// ============================================================================
// 🎛️ PANEL DE CONTROL MODULAR POR NIVEL DE ESTRELLA (1★, 2★, 3★)
// ============================================================================
export const HEALTHBAR_CONFIG = {
  // 1. 📐 Resolución interna del Canvas (Proporción 512x100)
  canvas: {
    width: 512,
    height: 100,
  },

  // 2. 🌍 TAMAÑO Y ALTURA EN EL MUNDO 3D
  world3D: {
    baseOffsetY: 1.60, // Altura base sobre la cabeza
    scaleX: 1.50,      // Ancho base 3D
    scaleY: 0.293,     // Alto base 3D (Proporción exacta con 512x100)
    // Multiplicador de tamaño de la barra según la estrella
    scaleMultiplier: {
      1: 1.0,   // 1★: Tamaño normal
      2: 1.12,  // 2★: +12% más grande
      3: 1.25,  // 3★: +25% más grande
      4: 1.35,  // 4★: +35% más grande
    } as Record<number, number>,
  },

  // 3. 🌟 AJUSTES INDEPENDIENTES PARA CADA ESTRELLA (1★, 2★, 3★)
  levels: {
    // ==================== 🥉 NIVEL 1 (BRONCE) ====================
    1: {
      frameImage: '/barlevels/1.png',
      drawOnTop: true,
      frame: { x: 0, y: 0, width: 512, height: 100 },
      hp: {
        x: 90,            // Tus valores calibrados
        y: 18,
        width: 408,
        height: 40,
        radius: 4,
        allyColor: '#10b981',
        enemyColor: '#ef4444',
        emptyBgColor: '#090e17',
        shieldColor: 'rgba(250, 204, 21, 0.9)',
        segmentHp: 100,
        dividerColor: '#000000',
        dividerWidth: 8,
      },
      mana: {
        x: 92,
        y: 74,
        width: 408,
        height: 12,
        radius: 3,
        color: '#00d2ff',
      },
      items: { show: true, startX: 370, y: 52, radius: 6, spacing: 18, color: '#facc15' },
    },

    // ==================== 🥈 NIVEL 2 (PLATA) ====================
    2: {
      frameImage: '/barlevels/2.png',
      drawOnTop: true,
      frame: { x: 0, y: 0, width: 512, height: 100 },
      hp: {
        x: 117,            // 👈 Calibra aquí la vida para el marco de 2 estrellas
        y: 18,
        width: 382,
        height: 40,
        radius: 4,
        allyColor: '#10b981',
        enemyColor: '#ef4444',
        emptyBgColor: '#090e17',
        shieldColor: 'rgba(250, 204, 21, 0.9)',
        segmentHp: 100,
        dividerColor: '#000000',
        dividerWidth: 8,
      },
      mana: {
        x: 117,            // 👈 Calibra aquí el maná para el marco de 2 estrellas
        y: 65,
        width: 408,
        height: 10,
        radius: 3,
        color: '#00d2ff',
      },
      items: { show: true, startX: 370, y: 52, radius: 6, spacing: 18, color: '#facc15' },
    },

    // ==================== 🥇 NIVEL 3 (ORO) ====================
    3: {
      frameImage: '/barlevels/3.png',
      drawOnTop: true,
      frame: { x: 0, y: 0, width: 412, height: 100 },
      hp: {
        x: 72,            // 👈 Calibra aquí la vida para el marco de 3 estrellas
        y: 25,
        width: 330,
        height: 30,
        radius: 4,
        allyColor: '#10b981',
        enemyColor: '#ef4444',
        emptyBgColor: '#090e17',
        shieldColor: 'rgba(250, 204, 21, 0.9)',
        segmentHp: 100,
        dividerColor: '#000000',
        dividerWidth: 8,
      },
      mana: {
        x: 152,            // 👈 Calibra aquí el maná para el marco de 3 estrellas
        y: 65,
        width: 408,
        height: 10,
        radius: 3,
        color: '#00d2ff',
      },
      items: { show: true, startX: 370, y: 52, radius: 6, spacing: 18, color: '#facc15' },
    },
  },
};

// Helper para obtener la configuración según las estrellas del campeón
export function getLevelConfig(starLevel: number) {
  const star = Math.min(3, Math.max(1, starLevel)) as 1 | 2 | 3;
  return HEALTHBAR_CONFIG.levels[star] || HEALTHBAR_CONFIG.levels[1];
}

// ============================================================================
// 🖼️ CARGA Y CACHÉ DE LAS IMÁGENES PNG (1★, 2★, 3★)
// ============================================================================
const cachedFrameImages: Map<number, HTMLImageElement> = new Map();
const activeHealthSprites: Set<THREE.Sprite> = new Set();

function getOrLoadFrameImage(starLevel: number): HTMLImageElement | null {
  if (typeof window === 'undefined') return null;

  const star = Math.min(3, Math.max(1, starLevel)) as 1 | 2 | 3;
  if (cachedFrameImages.has(star)) {
    return cachedFrameImages.get(star)!;
  }

  const lvlConf = getLevelConfig(star);
  const primaryPath = lvlConf.frameImage;

  const fallbackCandidates = [
    primaryPath,
    `/barlevels/level${star}.png`,
    `/barlevels/level_${star}.png`,
    `/barlevels/star${star}.png`,
    `/barlevels/bar${star}.png`,
    `/barlevels/${star}.PNG`,
  ];

  const img = new Image();
  img.crossOrigin = 'anonymous';

  let candidateIdx = 0;
  img.onerror = () => {
    candidateIdx++;
    if (candidateIdx < fallbackCandidates.length) {
      img.src = fallbackCandidates[candidateIdx];
    } else {
      console.warn(`[Healthbar] No se pudo encontrar imagen para nivel ${star} en public/barlevels/`);
    }
  };

  img.onload = () => {
    activeHealthSprites.forEach((sprite) => {
      if (sprite.userData && sprite.userData.unit) {
        drawHealthbarOnCanvas(sprite.userData.ctx, sprite.userData.unit);
        sprite.userData.texture.needsUpdate = true;
      }
    });
  };

  img.src = fallbackCandidates[0];
  cachedFrameImages.set(star, img);
  return img;
}

if (typeof window !== 'undefined') {
  [1, 2, 3].forEach((lvl) => getOrLoadFrameImage(lvl));
}

// ============================================================================
// 🎨 RENDERIZADO DEL CANVAS 2D POR ESTRELLAS
// ============================================================================
export function drawHealthbarOnCanvas(ctx: CanvasRenderingContext2D, unit: BoardUnit) {
  const star = Math.min(3, Math.max(1, unit.starLevel)) as 1 | 2 | 3;
  const lvlConf = getLevelConfig(star);
  const { canvas: cConf } = HEALTHBAR_CONFIG;
  const { frame: fConf, hp: hpConf, mana: manaConf, items: itemConf } = lvlConf;

  const frameImg = getOrLoadFrameImage(star);
  ctx.clearRect(0, 0, cConf.width, cConf.height);

  const isImageReady = frameImg && frameImg.complete && frameImg.naturalWidth > 0;

  // Si drawOnTop es false, dibuja el marco de fondo
  if (isImageReady && !fConf.drawOnTop) {
    ctx.drawImage(frameImg, fConf.x, fConf.y, fConf.width, fConf.height);
  }

  // --- 1. FONDO DE LA RANURA DE VIDA ---
  ctx.fillStyle = hpConf.emptyBgColor;
  ctx.beginPath();
  ctx.roundRect(hpConf.x, hpConf.y, hpConf.width, hpConf.height, hpConf.radius);
  ctx.fill();

  const maxMana = unit.maxMana || 100;
  const currentMana = unit.currentMana ?? 0;
  const maxHp = unit.maxHealth || 600;
  const currentHp = unit.currentHealth ?? maxHp;

  // --- 2. RELLENO DE VIDA ---
  const hpPercent = Math.max(0, Math.min(1, currentHp / Math.max(1, maxHp)));
  if (hpPercent > 0) {
    ctx.fillStyle = unit.team === 'ally' ? hpConf.allyColor : hpConf.enemyColor;
    const currentHpWidth = Math.max(4, hpConf.width * hpPercent);
    ctx.beginPath();
    ctx.roundRect(hpConf.x, hpConf.y, currentHpWidth, hpConf.height, hpConf.radius);
    ctx.fill();
  }

  // --- 3. RELLENO DE ESCUDO ---
  if (unit.shield && unit.shield > 0) {
    const shieldPercent = Math.min(1, unit.shield / Math.max(1, maxHp));
    ctx.fillStyle = hpConf.shieldColor;
    const shieldWidth = Math.min(hpConf.width, hpConf.width * shieldPercent);
    ctx.beginPath();
    ctx.roundRect(hpConf.x, hpConf.y, shieldWidth, hpConf.height, hpConf.radius);
    ctx.fill();
  }

  // --- 4. DIVISORES CADA 100 DE VIDA ---
  if (hpConf.segmentHp && hpConf.segmentHp > 0 && maxHp > hpConf.segmentHp) {
    const totalSegments = Math.floor(maxHp / hpConf.segmentHp);
    ctx.fillStyle = hpConf.dividerColor;

    for (let i = 1; i <= totalSegments; i++) {
      const segmentValue = i * hpConf.segmentHp;
      if (segmentValue >= maxHp) break;

      const tickX = hpConf.x + (segmentValue / maxHp) * hpConf.width;
      ctx.fillRect(
        Math.round(tickX - hpConf.dividerWidth / 2),
        hpConf.y,
        hpConf.dividerWidth,
        hpConf.height
      );
    }
  }

  // --- 5. RELLENO DE MANÁ ---
  if (maxMana > 0 && currentMana > 0) {
    const manaPercent = Math.max(0, Math.min(1, currentMana / maxMana));
    ctx.fillStyle = manaConf.color;
    const currentManaWidth = Math.max(4, manaConf.width * manaPercent);
    ctx.beginPath();
    ctx.roundRect(manaConf.x, manaConf.y, currentManaWidth, manaConf.height, manaConf.radius);
    ctx.fill();
  }

  // Si drawOnTop es true, estampa el marco PNG por encima
  if (isImageReady && fConf.drawOnTop) {
    ctx.drawImage(frameImg, fConf.x, fConf.y, fConf.width, fConf.height);
  }

  // --- 6. ÍTEMS ---
  if (itemConf.show && unit.items && unit.items.length > 0) {
    ctx.fillStyle = itemConf.color;
    for (let i = 0; i < unit.items.length; i++) {
      ctx.beginPath();
      ctx.arc(itemConf.startX + i * itemConf.spacing, itemConf.y, itemConf.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ============================================================================
// 📦 CREACIÓN DE SPRITES THREE.JS EN ALTA FIDELIDAD
// ============================================================================
export function createHealthbarSprite(unit: BoardUnit): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = HEALTHBAR_CONFIG.canvas.width;
  canvas.height = HEALTHBAR_CONFIG.canvas.height;
  const ctx = canvas.getContext('2d')!;

  drawHealthbarOnCanvas(ctx, unit);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;

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
    unit,
    lastState: `${unit.currentHealth}_${unit.shield}_${unit.currentMana}_${unit.starLevel}_${unit.items?.length || 0}`,
  };

  activeHealthSprites.add(sprite);
  return sprite;
}

export function updateUnitHealthSprite(group: THREE.Group, unit: BoardUnit) {
  const hpSprite = group.getObjectByName('healthbar_sprite') as THREE.Sprite;
  if (!hpSprite || !hpSprite.userData) return;

  const { ctx, canvas, texture } = hpSprite.userData;
  if (!ctx || !canvas || !texture) return;

  hpSprite.userData.unit = unit;

  const currentState = `${unit.currentHealth}_${unit.shield}_${unit.currentMana}_${unit.starLevel}_${unit.items?.length || 0}`;
  if (hpSprite.userData.lastState === currentState) return;
  hpSprite.userData.lastState = currentState;

  drawHealthbarOnCanvas(ctx, unit);
  texture.needsUpdate = true;
}

// ============================================================================
// 🏆 FACTORÍA DE UNIDADES 3D
// ============================================================================
export function getChampionScale(starLevel: number): number {
  return ARENA_CONFIG?.champions?.starScales?.[starLevel] ?? 
    (starLevel >= 4 ? 2.20 : starLevel === 3 ? 1.70 : starLevel === 2 ? 1.25 : 0.85);
}

export function createUnitGroup(
  unit: BoardUnit,
  unitMixersMap?: Map<string, THREE.AnimationMixer>
): THREE.Group {
  const base = CHAMPIONS_DATA[unit.championId];
  const group = new THREE.Group();
  group.name = `unit_${unit.instanceId}`;
  group.userData = { 
    unit,
    lastRenderedStarLevel: unit.starLevel 
  };

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

  const starScale = getChampionScale(unit.starLevel);
  const isAlly = unit.team === 'ally';
  const unitColor = new THREE.Color(base ? base.color : isAlly ? 0x3b82f6 : 0xef4444);

  // Pedestal del suelo
  const pedRadius = (ARENA_CONFIG?.champions?.pedestalRadius ?? 0.48) * starScale;
  const pedestalGeo = new THREE.CylinderGeometry(pedRadius, pedRadius + 0.06, 0.06, 24);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: isAlly ? 0x0f172a : 0x1e1b4b,
    roughness: 0.7,
    metalness: 0.3,
  });
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.name = 'unit_pedestal';
  pedestal.position.y = 0.03;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  const teamRingGeo = new THREE.RingGeometry(pedRadius + 0.01, pedRadius + 0.07, 32);
  const teamRingMat = new THREE.MeshBasicMaterial({
    color: isAlly ? 0x00e5ff : 0xf43f5e,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  const teamRing = new THREE.Mesh(teamRingGeo, teamRingMat);
  teamRing.rotation.x = Math.PI / 2;
  teamRing.position.y = 0.065;
  group.add(teamRing);

  // Avatar Placeholder
  const fallbackAvatar = new THREE.Group();
  fallbackAvatar.name = 'fallback_avatar';

  let bodyGeo: THREE.BufferGeometry;
  if (base?.modelType === 'golem' || base?.modelType === 'warrior') {
    bodyGeo = new THREE.BoxGeometry(0.6 * starScale, 0.9 * starScale, 0.6 * starScale);
  } else if (base?.modelType === 'mage') {
    bodyGeo = new THREE.ConeGeometry(0.45 * starScale, 1.0 * starScale, 8);
  } else if (base?.modelType === 'dragon') {
    bodyGeo = new THREE.DodecahedronGeometry(0.6 * starScale);
  } else {
    bodyGeo = new THREE.CylinderGeometry(0.35 * starScale, 0.45 * starScale, 0.95 * starScale, 12);
  }

  const bodyMat = new THREE.MeshStandardMaterial({
    color: unitColor,
    roughness: 0.3,
    metalness: 0.6,
    emissive: isAlly ? 0x000000 : 0x220000,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = 0.5 * starScale;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  fallbackAvatar.add(bodyMesh);

  const headGeo = new THREE.SphereGeometry(0.28 * starScale, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({
    color: base?.accentColor || 0xffffff,
    roughness: 0.2,
    metalness: 0.4,
  });
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.y = 1.05 * starScale;
  headMesh.castShadow = true;
  fallbackAvatar.add(headMesh);
  group.add(fallbackAvatar);

  // Carga del modelo 3D GLTF
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

  // Auras 3★ y 4★
  if (unit.starLevel === 3) {
    const auraGeo = new THREE.RingGeometry(pedRadius + 0.08, pedRadius + 0.22, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.name = 'star3_aura';
    aura.rotation.x = Math.PI / 2;
    aura.position.y = 0.05;
    group.add(aura);
  } else if (unit.starLevel >= 4) {
    const auraGeo = new THREE.RingGeometry(pedRadius + 0.1, pedRadius + 0.28, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.name = 'star4_aura';
    aura.rotation.x = Math.PI / 2;
    aura.position.y = 0.05;
    group.add(aura);
  }

  // ✨ Creación del Sprite 3D con Escala Proporcional y Estable
  const hpSprite = createHealthbarSprite(unit);
  hpSprite.name = 'healthbar_sprite';
  const baseHpY = HEALTHBAR_CONFIG.world3D.baseOffsetY;
  const starMult = HEALTHBAR_CONFIG.world3D.scaleMultiplier[unit.starLevel] || 1.0;

  hpSprite.position.y = baseHpY * starScale;
  hpSprite.scale.set(
    HEALTHBAR_CONFIG.world3D.scaleX * starMult,
    HEALTHBAR_CONFIG.world3D.scaleY * starMult,
    1
  );
  group.add(hpSprite);

  return group;
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