// src/components/arena/arenaEnvironment.ts

import * as THREE from 'three';
import type { WowArena } from './wowArenas';
import { ARENA_CONFIG } from './arenaConfig';

export interface FlameEntity {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  baseIntensity: number;
  phase: number;
}

export function setupArenaLights(scene: THREE.Scene) {
  const rig = new THREE.Group();
  rig.name = 'arena-light-rig';
  const { hemi, sun, cyanRim, goldRim, ambient, centerGlow } = ARENA_CONFIG.lights;

  // 1. Hemisphere Light
  const hemiLight = new THREE.HemisphereLight(hemi.skyColor, hemi.groundColor, hemi.intensity);
  rig.add(hemiLight);

  // 2. Directional Sun Light
  const dirLight = new THREE.DirectionalLight(sun.color, sun.intensity);
  dirLight.position.copy(sun.position);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = sun.shadowMapSize;
  dirLight.shadow.mapSize.height = sun.shadowMapSize;
  dirLight.shadow.bias = sun.shadowBias;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 60;
  dirLight.shadow.camera.left = -16;
  dirLight.shadow.camera.right = 16;
  dirLight.shadow.camera.top = 16;
  dirLight.shadow.camera.bottom = -16;
  rig.add(dirLight);

  // 3. Rim Lights
  const cRim = new THREE.DirectionalLight(cyanRim.color, cyanRim.intensity);
  cRim.position.copy(cyanRim.position);
  rig.add(cRim);

  const gRim = new THREE.DirectionalLight(goldRim.color, goldRim.intensity);
  gRim.position.copy(goldRim.position);
  rig.add(gRim);

  // 4. Ambient Fill Light
  const ambLight = new THREE.AmbientLight(ambient.color, ambient.intensity);
  rig.add(ambLight);

  // 5. Center Point Glow
  const cPointLight = new THREE.PointLight(centerGlow.color, centerGlow.intensity, centerGlow.distance);
  cPointLight.position.copy(centerGlow.position);
  rig.add(cPointLight);
  const names = ['hemisphere', 'sun', 'cyan-rim', 'gold-rim', 'ambient', 'center'];
  rig.children.forEach((object, index) => {
    object.name = names[index];
    object.userData.baseIntensity = (object as THREE.Light).intensity;
  });
  scene.add(rig);
}

/** Diamond uses the same AgX display transform as its Blender preview.
 * Less omnidirectional fill preserves stone contrast instead of washing it out.
 */
export function applyArenaAppearance(scene: THREE.Scene, renderer: THREE.WebGLRenderer, rank: WowArena) {
  const diamond = rank === 'Diamante';
  renderer.toneMapping = diamond ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = diamond ? 1.0 : 1.35;
  const intensities: Record<string, number> = {
    hemisphere: 0.65, sun: 2.0, 'cyan-rim': 0.45, 'gold-rim': 0.15, ambient: 0.18, center: 0,
  };
  scene.getObjectByName('arena-light-rig')?.children.forEach(object => {
    const light = object as THREE.Light;
    light.intensity = diamond ? intensities[light.name] : light.userData.baseIntensity;
    if (light instanceof THREE.DirectionalLight && light.name === 'sun') {
      light.shadow.normalBias = diamond ? 0.025 : 0;
    }
  });
}

export function setupArenaEnvironment(scene: THREE.Scene): FlameEntity[] {
  const env = ARENA_CONFIG.environment;

  // Isla flotante exterior
 

  // Suelo central de combate
  const groundGeo = new THREE.BoxGeometry(env.ground.width, env.ground.height, env.ground.depth);
  const groundMat = new THREE.MeshStandardMaterial({
    color: env.ground.color,
    roughness: env.ground.roughness,
    metalness: env.ground.metalness,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(0, env.ground.posY, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  // Plataformas de piedra para las bancas
  
  // Brazeros con fuego animado
  const flames: FlameEntity[] = [];
  const bConf = ARENA_CONFIG.braziers;
  const brazierGeo = new THREE.CylinderGeometry(0.45, 0.65, 1.1, 8);
  const brazierMat = new THREE.MeshStandardMaterial({ color: bConf.baseColor, roughness: 0.8 });

  bConf.positions.forEach((pos, idx) => {
    const bMesh = new THREE.Mesh(brazierGeo, brazierMat);
    bMesh.position.set(pos.x, 0.5, pos.z);
    bMesh.castShadow = true;
    scene.add(bMesh);

    // Cuenco de fuego
    const bowlGeo = new THREE.CylinderGeometry(0.6, 0.35, 0.35, 8);
    const bowlMat = new THREE.MeshStandardMaterial({ color: bConf.bowlColor, roughness: 0.6 });
    const bowl = new THREE.Mesh(bowlGeo, bowlMat);
    bowl.position.set(pos.x, 1.1, pos.z);
    scene.add(bowl);

    // Malla de la llama
    const flameGeo = new THREE.ConeGeometry(0.3, 0.75, 8);
    const flameMat = new THREE.MeshBasicMaterial({
      color: bConf.flameColor,
      transparent: true,
      opacity: 0.9,
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(pos.x, 1.45, pos.z);
    scene.add(flame);

    // Luz puntual de la llama
    const fLight = new THREE.PointLight(bConf.flameColor, bConf.lightIntensity, bConf.lightDistance);
    fLight.position.set(pos.x, 1.6, pos.z);
    scene.add(fLight);

    flames.push({
      mesh: flame,
      light: fLight,
      baseIntensity: bConf.lightIntensity,
      phase: idx * 1.5,
    });
  });

  return flames;
}