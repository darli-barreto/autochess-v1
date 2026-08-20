import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

interface LoadedModelTemplate {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  baseScale: number;
  offsetY: number;
}

class ChampionModelManager {
  private loader: GLTFLoader | null = null;
  private dracoLoader: DRACOLoader | null = null;
  private templates: Map<string, LoadedModelTemplate> = new Map();
  private loadingPromises: Map<string, Promise<LoadedModelTemplate | null>> = new Map();
  private availableModels: Record<string, string> = {};
  private isInitialized = false;

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    this.loader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    this.loader.setDRACOLoader(this.dracoLoader);

    // Fetch list of available models from API
    this.refreshAvailableModels();
  }

  public async refreshAvailableModels(): Promise<Record<string, string>> {
    try {
      const res = await fetch('/api/champions-3d/available');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.models) {
          this.availableModels = data.models;
          return this.availableModels;
        }
      }
    } catch (err) {
      console.warn('Could not fetch 3D models index:', err);
    }
    return this.availableModels;
  }

  public has3DModel(championId: string): boolean {
    const cleanId = championId.toLowerCase().replace(/[^a-z0-9]/g, '');
    return Boolean(this.availableModels[cleanId] || this.templates.has(cleanId));
  }

  public getModelUrl(championId: string): string {
    const cleanId = championId.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (this.availableModels[cleanId]) {
      return this.availableModels[cleanId];
    }
    // Fallback direct URL candidates
    return `/api/champions-3d/${encodeURIComponent(cleanId)}_(tft_set_18).glb`;
  }

  public async loadModel(championId: string): Promise<LoadedModelTemplate | null> {
    this.init();
    const cleanId = championId.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (this.templates.has(cleanId)) {
      return this.templates.get(cleanId)!;
    }

    if (this.loadingPromises.has(cleanId)) {
      return this.loadingPromises.get(cleanId)!;
    }

    const promise = (async () => {
      if (!this.loader) return null;

      const url = this.getModelUrl(cleanId);
      try {
        const gltf = await new Promise<GLTF>((resolve, reject) => {
          this.loader!.load(url, resolve, undefined, (err) => {
            // Try alternate path if first failed
            const fallbackUrl = `/champs-3d/${cleanId}_(tft_set_18).glb`;
            this.loader!.load(fallbackUrl, resolve, undefined, reject);
          });
        });

        // Normalize model geometry, bounding box and materials
        const scene = gltf.scene;
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;

            if (child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((mat) => {
                mat.side = THREE.FrontSide;
                mat.depthWrite = true;
                if ('roughness' in mat) {
                  mat.roughness = Math.max(0.15, Math.min(0.6, (mat.roughness ?? 0.35)));
                }
                if ('metalness' in mat) {
                  mat.metalness = Math.min(0.4, (mat.metalness ?? 0.15));
                }
                if ('envMapIntensity' in mat) {
                  mat.envMapIntensity = 1.6;
                }
              });
            }
          }
        });

        // Compute Bounding Box to scale to ~2.1 units prominent TFT size
        const bbox = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const center = new THREE.Vector3();
        bbox.getCenter(center);

        // Center horizontally
        scene.position.x = -center.x;
        scene.position.z = -center.z;
        scene.position.y = -bbox.min.y;

        const maxDim = Math.max(size.x, size.y, size.z, 0.01);
        const targetHeight = 2.1;
        const baseScale = targetHeight / (size.y > 0.1 ? size.y : maxDim);

        const template: LoadedModelTemplate = {
          scene,
          animations: gltf.animations || [],
          baseScale,
          offsetY: 0,
        };

        this.templates.set(cleanId, template);
        return template;
      } catch (err) {
        console.warn(`[ChampionModelManager] No 3D model found or failed to load for "${championId}":`, err);
        return null;
      }
    })();

    this.loadingPromises.set(cleanId, promise);
    return promise;
  }

  public instantiate(
    template: LoadedModelTemplate,
    starLevel: number = 1,
    customScaleMult?: number
  ): { group: THREE.Group; mixer: THREE.AnimationMixer | null } {
    const clonedScene = skeletonClone(template.scene) as THREE.Group;
    const starMult = customScaleMult !== undefined
      ? customScaleMult
      : (starLevel === 3 ? 1.35 : starLevel === 2 ? 1.15 : 1.0);
    const totalScale = template.baseScale * starMult;

    const wrapperGroup = new THREE.Group();
    clonedScene.scale.set(totalScale, totalScale, totalScale);
    wrapperGroup.add(clonedScene);

    let mixer: THREE.AnimationMixer | null = null;
    if (template.animations && template.animations.length > 0) {
      mixer = new THREE.AnimationMixer(clonedScene);
      // Look for idle or run/walk animation or play first available animation
      const idleClip =
        template.animations.find((clip) => /idle|stand|wait/i.test(clip.name)) ||
        template.animations[0];

      if (idleClip) {
        const action = mixer.clipAction(idleClip);
        action.play();
      }
    }

    return { group: wrapperGroup, mixer };
  }
}

export const championModelManager = new ChampionModelManager();
