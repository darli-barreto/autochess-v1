// --- ARCHIVO: src/engine/littleLegendModelLoader.ts ---

import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface LoadedLegendInstance {
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  actions: Map<string, THREE.AnimationAction>;
  currentAction: THREE.AnimationAction | null;
  playAnimation: (actionName: string, duration?: number) => void;
}

class LittleLegendModelLoader {
  private loader = new GLTFLoader();
  private cache = new Map<string, Promise<GLTF>>();

  /**
   * Carga el archivo .glb desde la carpeta public/minileyendas/
   */
  public async loadGLB(filename: string): Promise<GLTF> {
    const url = `/minileyendas/${filename}`;

    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    const loadPromise = new Promise<GLTF>((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          resolve(gltf);
        },
        undefined,
        (err) => {
          console.warn(`[LittleLegendLoader] No se pudo cargar ${url}:`, err);
          reject(err);
        }
      );
    });

    this.cache.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Instancia una copia del modelo 3D con soporte de animaciones y sombras
   */
  public instantiate(gltf: GLTF, customScale: number = 1.0, offsetY: number = 0): LoadedLegendInstance {
    // Clonar correctamente las mallas y huesos
    const root = SkeletonUtils.clone(gltf.scene) as THREE.Group;
    root.scale.set(customScale, customScale, customScale);
    root.position.y = offsetY;

    // Habilitar sombras y asegurar materiales
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.side = THREE.FrontSide;
        }
      }
    });

    let mixer: THREE.AnimationMixer | null = null;
    const actions = new Map<string, THREE.AnimationAction>();
    let currentAction: THREE.AnimationAction | null = null;

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(root);

      gltf.animations.forEach((clip) => {
        const action = mixer!.clipAction(clip);
        const nameLower = clip.name.toLowerCase();

        // Normalizar nombres de animación
        actions.set(nameLower, action);

        // Mapear alias comunes de animaciones TFT / LoL
        if (nameLower.includes('idle') || nameLower.includes('default')) actions.set('idle', action);
        if (nameLower.includes('run') || nameLower.includes('walk') || nameLower.includes('move')) actions.set('run', action);
        if (nameLower.includes('dance') || nameLower.includes('emote1') || nameLower.includes('joke1')) actions.set('dance', action);
        if (nameLower.includes('taunt') || nameLower.includes('emote2') || nameLower.includes('joke2')) actions.set('taunt', action);
        if (nameLower.includes('laugh') || nameLower.includes('cheer') || nameLower.includes('emote3')) actions.set('laugh', action);
        if (nameLower.includes('victory') || nameLower.includes('win')) actions.set('victory', action);
      });

      // Si no encontró "idle" explícito, usar la primera animación disponible
      if (!actions.has('idle') && gltf.animations[0]) {
        actions.set('idle', mixer.clipAction(gltf.animations[0]));
      }
    }

    const instance: LoadedLegendInstance = {
      group: root,
      mixer,
      actions,
      currentAction: null,
      playAnimation: (actionName: string, duration: number = 0.3) => {
        if (!mixer) return;
        const lower = actionName.toLowerCase();
        let targetAction = actions.get(lower);

        // Si no existe esa animación específica, retroceder a idle
        if (!targetAction && actions.has('idle')) {
          targetAction = actions.get('idle');
        }

        if (targetAction && instance.currentAction !== targetAction) {
          if (instance.currentAction) {
            instance.currentAction.fadeOut(duration);
          }
          targetAction.reset().fadeIn(duration).play();
          instance.currentAction = targetAction;
        }
      },
    };

    // Comenzar con Idle
    instance.playAnimation('idle');

    return instance;
  }
}

export const littleLegendModelLoader = new LittleLegendModelLoader();