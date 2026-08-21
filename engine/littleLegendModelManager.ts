// --- ARCHIVO: engine/littleLegendModelManager.ts ---

import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface LoadedLegendTemplate {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  baseScale: number;
  offsetY: number;
  detectedClips: Record<string, string>;
}

export interface Legend3DInstance {
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  actions: Map<string, THREE.AnimationAction>;
  currentAction: THREE.AnimationAction | null;
  currentActionName: string;
  playAnimation: (name: string, fadeDuration?: number) => void;
}

class LittleLegendModelManager {
  private loader: GLTFLoader | null = null;
  private dracoLoader: DRACOLoader | null = null;
  private templates: Map<string, LoadedLegendTemplate> = new Map();
  private loadingPromises: Map<string, Promise<LoadedLegendTemplate | null>> = new Map();
  private isInitialized = false;

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    this.loader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    this.loader.setDRACOLoader(this.dracoLoader);
  }

  public getModelUrl(modelFileName: string): string {
    if (modelFileName.startsWith('/') || modelFileName.startsWith('http')) {
      return modelFileName;
    }
    const cleanFile = modelFileName.endsWith('.glb') ? modelFileName : `${modelFileName}.glb`;
    return `/minileyendas/${cleanFile}`;
  }

  /**
   * Selector exacto de clips para modelos Chibi / TFT
   */
  private findBestClip(
    clips: THREE.AnimationClip[],
    type: 'idle' | 'run' | 'dance' | 'taunt' | 'laugh' | 'cheer' | 'victory'
  ): THREE.AnimationClip | undefined {
    if (!clips || clips.length === 0) return undefined;

    const list = clips.map((c) => ({
      clip: c,
      name: c.name.toLowerCase().trim(),
    }));

    if (type === 'idle') {
      const exactIdle = list.find((c) => c.name === 'idle_base');
      if (exactIdle) return exactIdle.clip;

      const idleMatch = list.find((c) => /^(idle_base|idle01|idle1|stand_base)$/i.test(c.name));
      if (idleMatch) return idleMatch.clip;

      const anyIdle = list.find((c) => c.name.startsWith('idle') && !/to_run|trans/i.test(c.name));
      if (anyIdle) return anyIdle.clip;

      return clips[0];
    }

    if (type === 'run') {
      const exactRunBase = list.find((c) => c.name === 'run_base');
      if (exactRunBase) return exactRunBase.clip;

      const exactRunHaste = list.find((c) => c.name === 'run_haste');
      if (exactRunHaste) return exactRunHaste.clip;

      const anyRun = list.find((c) => /^(run_base|run_haste|run_loop|run)$/i.test(c.name));
      if (anyRun) return anyRun.clip;

      const genericRun = list.find((c) => /run|walk|jog/i.test(c.name) && !/to_idle/i.test(c.name));
      if (genericRun) return genericRun.clip;
    }

    if (type === 'taunt') {
      const taunt = list.find((c) => /taunt/i.test(c.name));
      if (taunt) return taunt.clip;
    }

    if (type === 'laugh') {
      const laugh = list.find((c) => /joke|laugh/i.test(c.name));
      if (laugh) return laugh.clip;
    }

    if (type === 'dance') {
      const dance = list.find((c) => /dance|interact|cast_animation/i.test(c.name));
      if (dance) return dance.clip;
    }

    if (type === 'cheer' || type === 'victory') {
      const cheer = list.find((c) => /recall|celebration|victory|win|cast_cycle/i.test(c.name));
      if (cheer) return cheer.clip;
      return this.findBestClip(clips, 'dance');
    }

    return undefined;
  }

  public async loadModel(modelFileName: string): Promise<LoadedLegendTemplate | null> {
    this.init();
    const cleanKey = modelFileName.toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (this.templates.has(cleanKey)) {
      return this.templates.get(cleanKey)!;
    }

    if (this.loadingPromises.has(cleanKey)) {
      return this.loadingPromises.get(cleanKey)!;
    }

    const promise = (async () => {
      if (!this.loader) return null;
      const url = this.getModelUrl(modelFileName);

      try {
        const gltf = await new Promise<GLTF>((resolve, reject) => {
          this.loader!.load(url, resolve, undefined, reject);
        });

        const scene = gltf.scene;

        // Respetar los materiales originales del GLTF (evita romper transparencias faciales)
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;
          }
        });

        const bbox = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const center = new THREE.Vector3();
        bbox.getCenter(center);

        scene.position.x = -center.x;
        scene.position.z = -center.z;
        scene.position.y = -bbox.min.y;

        const maxDim = Math.max(size.x, size.y, size.z, 0.01);
        const targetHeight = 1.5;
        const baseScale = targetHeight / (size.y > 0.1 ? size.y : maxDim);

        const detectedClips: Record<string, string> = {};
        const animList = gltf.animations || [];

        const idleClip = this.findBestClip(animList, 'idle');
        const runClip = this.findBestClip(animList, 'run');
        const danceClip = this.findBestClip(animList, 'dance');
        const tauntClip = this.findBestClip(animList, 'taunt');
        const laughClip = this.findBestClip(animList, 'laugh');
        const cheerClip = this.findBestClip(animList, 'cheer');

        if (idleClip) detectedClips.idle = idleClip.name;
        if (runClip) detectedClips.run = runClip.name;
        if (danceClip) detectedClips.dance = danceClip.name;
        if (tauntClip) detectedClips.taunt = tauntClip.name;
        if (laughClip) detectedClips.laugh = laughClip.name;
        if (cheerClip) detectedClips.cheer = cheerClip.name;

        console.log(`✨ [Minileyenda 3D: ${modelFileName}] Clips listos:`, detectedClips);

        const template: LoadedLegendTemplate = {
          scene,
          animations: animList,
          baseScale,
          offsetY: 0,
          detectedClips,
        };

        this.templates.set(cleanKey, template);
        return template;
      } catch (err) {
        console.warn(`[LittleLegendModelManager] Error cargando "${modelFileName}":`, err);
        return null;
      }
    })();

    this.loadingPromises.set(cleanKey, promise);
    return promise;
  }

  public instantiate(
    template: LoadedLegendTemplate,
    customScaleMult = 1.0
  ): Legend3DInstance {
    const clonedScene = skeletonClone(template.scene) as THREE.Group;
    const totalScale = template.baseScale * customScaleMult;

    const wrapperGroup = new THREE.Group();
    clonedScene.scale.set(totalScale, totalScale, totalScale);
    wrapperGroup.add(clonedScene);

    let mixer: THREE.AnimationMixer | null = null;
    const actions = new Map<string, THREE.AnimationAction>();

    if (template.animations && template.animations.length > 0) {
      mixer = new THREE.AnimationMixer(clonedScene);

      // Registrar todos los clips sin alterar sus datos
      template.animations.forEach((clip) => {
        const action = mixer!.clipAction(clip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        actions.set(clip.name, action);
        actions.set(clip.name.toLowerCase(), action);
      });

      const types: ('idle' | 'run' | 'dance' | 'taunt' | 'laugh' | 'cheer' | 'victory')[] = [
        'idle',
        'run',
        'dance',
        'taunt',
        'laugh',
        'cheer',
        'victory',
      ];

      types.forEach((t) => {
        const best = this.findBestClip(template.animations, t);
        if (best) {
          const action = mixer!.clipAction(best);
          action.setLoop(THREE.LoopRepeat, Infinity);
          actions.set(t, action);
        }
      });
    }

    const instance: Legend3DInstance = {
      group: wrapperGroup,
      mixer,
      actions,
      currentAction: null,
      currentActionName: '',
      playAnimation: (name: string, fadeDuration = 0.15) => {
        if (!mixer) return;
        const lowerName = name.toLowerCase();
        const targetAction = actions.get(lowerName) || actions.get('idle');
        if (!targetAction) return;

        if (instance.currentAction === targetAction && targetAction.isRunning()) {
          return;
        }

        const prevAction = instance.currentAction;
        instance.currentAction = targetAction;
        instance.currentActionName = lowerName;

        targetAction.reset();
        targetAction.setEffectiveTimeScale(1);
        targetAction.setEffectiveWeight(1);

        if (prevAction && prevAction !== targetAction) {
          prevAction.fadeOut(fadeDuration);
          targetAction.fadeIn(fadeDuration).play();
        } else {
          mixer.stopAllAction();
          targetAction.play();
        }
      },
    };

    // Iniciar limpiamente en Idle_Base
    if (mixer) {
      mixer.stopAllAction();
    }
    instance.playAnimation('idle', 0.01);

    return instance;
  }
}

export const littleLegendModelManager = new LittleLegendModelManager();