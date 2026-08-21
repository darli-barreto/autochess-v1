// --- ARCHIVO: src/components/hud/LittleLegendEmoteBar.tsx ---

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { LITTLE_LEGENDS, LittleLegendData } from '@/data/littleLegends';
import { littleLegendModelManager, Legend3DInstance } from '@/engine/littleLegendModelManager';
import { 
  Sparkles, 
  X, 
  Check, 
  Music, 
  Flame, 
  Heart, 
  Smile, 
  RotateCw,
  Play
} from 'lucide-react';
import { MdOutlineInsertEmoticon } from "react-icons/md";


interface LittleLegendEmoteBarProps {
  currentLegendId?: string;
  onSelectLegend: (legendId: string) => void;
  onTriggerEmote: (emote: 'DANCE' | 'TAUNT' | 'CHEER' | 'LAUGH') => void;
}

export const LittleLegendEmoteBar: React.FC<LittleLegendEmoteBarProps> = ({
  currentLegendId = 'prestige_chibi_spirit_blossom_ahri',
  onSelectLegend,
  onTriggerEmote,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewLegendId, setPreviewLegendId] = useState<string>(currentLegendId);
  const [activePreviewEmote, setActivePreviewEmote] = useState<'idle' | 'run' | 'dance' | 'taunt' | 'laugh'>('idle');

  // Sincronizar el preview con la leyenda seleccionada al abrir el modal
  useEffect(() => {
    if (isModalOpen) {
      setPreviewLegendId(currentLegendId);
      setActivePreviewEmote('idle');
    }
  }, [isModalOpen, currentLegendId]);

  const currentLegend = useMemo(() => {
    return LITTLE_LEGENDS.find((l) => l.id === currentLegendId) || LITTLE_LEGENDS[0];
  }, [currentLegendId]);

  const previewLegend = useMemo(() => {
    return LITTLE_LEGENDS.find((l) => l.id === previewLegendId) || currentLegend;
  }, [previewLegendId, currentLegend]);

  // Estilos de color por rareza
  const getRarityStyle = (rarity: string) => {
    switch (rarity) {
      case 'mythic':
        return {
          badge: 'bg-rose-500/20 text-amber-300 border-amber-400/50',
          border: 'border-[#1d5153ff]',
          glow: 'from-amber-500/10 via-rose-500/10 to-transparent',
          text: 'text-amber-300',
        };
      case 'legendary':
        return {
          badge: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
          border: 'border-amber-500/70',
          glow: 'from-amber-500/10 to-transparent',
          text: 'text-amber-400',
        };
      case 'epic':
        return {
          badge: 'bg-purple-500/20 text-purple-300 border-purple-400/50',
          border: 'border-purple-500/70',
          glow: 'from-purple-500/10 to-transparent',
          text: 'text-purple-300',
        };
      default:
        return {
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50',
          border: 'border-cyan-500/60',
          glow: 'from-cyan-500/10 to-transparent',
          text: 'text-cyan-300',
        };
    }
  };

  return (
    <>
      {/* ================= BARRA DE ACCIÓN FLOTANTE ================= */}
      <div >
        {/* Selector de Minileyenda activa */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-slate-900 via-cyan-950/60 to-slate-900 hover:from-cyan-950 hover:to-blue-950 border border-cyan-400/40 hover:border-cyan-300 transition-all text-cyan-100 font-bold group cursor-pointer shadow-md"
          title="Cambiar Minileyenda 3D"
        >
            <MdOutlineInsertEmoticon />
        </button>
      </div>

      {/* ================= MODAL MINIMALISTA CON VISOR 3D ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#162021ff] border-3 border-[#715b31ff] max-w-4xl w-full p-5 shadow-2xl shadow-cyan-950/80 flex flex-col max-h-[58vh] overflow-hidden text-slate-100">
            
            {/* Header Minimalista */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase tracking-wider text-white">
                  Santuario de Estrategas
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 bg-[#162021ff] hover:bg-[#715b31ff] text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo en 2 Columnas (Lista Compacta + Visor 3D) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-4 flex-1 min-h-[320px] overflow-hidden">
              
              {/* Columna Izquierda: Grid Minimalista de Minileyendas */}
              <div className="md:col-span-6 flex flex-col gap-2 overflow-y-auto pr-1">
                {LITTLE_LEGENDS.map((legend) => {
                  const isEquipped = legend.id === currentLegendId;
                  const isPreviewed = legend.id === previewLegendId;
                  const rarityStyle = getRarityStyle(legend.rarity);

                  return (
                    <button
                      key={legend.id}
                      onClick={() => {
                        setPreviewLegendId(legend.id);
                        setActivePreviewEmote('idle');
                      }}
                      className={`relative p-2.5 border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                        isPreviewed
                          ? `bg-[#040808ff] ${rarityStyle.border} `
                          : 'bg-[#162021ff] hover:bg-slate-800/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-white leading-snug">
                              {legend.name}
                            </h4>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{legend.title}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isEquipped && (
                          <span className="px-2 py-0.5 bg-[#04869E] text-[10px] font-black flex items-center gap-1">
                            EQUIPADO
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Columna Derecha: Escenario y Visor 3D en Vivo */}
              <div className="md:col-span-6 bg-black p-4 flex flex-col items-center justify-between relative overflow-hidden">
                
                {/* Info superior del modelo */}
                <div className="w-full flex items-center justify-center z-10">
                  <div className="flex items-center space-x-3 justify-center">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${getRarityStyle(previewLegend.rarity).badge}`}>
                      {previewLegend.rarity}
                    </span>
                    <h3 className="font-black text-sm text-white mt-1">
                      {previewLegend.name}
                    </h3>
                  </div>
                </div>

                {/* Canvas 3D de previsualización */}
                <div className="w-full h-56 relative flex items-center justify-center">
                  <LittleLegend3DStage 
                    legend={previewLegend} 
                    currentEmote={activePreviewEmote} 
                  />
                </div>

                {/* Controles de prueba de animaciones */}
                <div className="w-full flex items-center justify-center gap-1.5 z-10 my-2">
                  {[
                    { id: 'idle', label: 'Reposo' },
                    { id: 'run', label: 'Correr' },
                    { id: 'dance', label: 'Bailar' },
                    { id: 'taunt', label: 'Provocar' },
                    { id: 'laugh', label: 'Reír' },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setActivePreviewEmote(btn.id as any)}
                      className={`px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                        activePreviewEmote === btn.id
                          ? 'bg-[#04869E] border-2 border-[#715b31ff] font-black shadow'
                          : 'bg-[#162021ff] border-2 border-[#715b31ff] hover:text-white'
                      }`}
                    >
                      {btn.label}
                    </button>
                    
                  ))}
                  <div className=" z-10 ">
                  {currentLegendId === previewLegend.id ? (
                    <button
                      disabled
                      className="px-2.5 py-1 text-[10px] font-bold transition-all bg-[#04869E] border-2 border-[#715b31ff] uppercase text-xs tracking-wider flex items-center justify-center gap-2 cursor-default"
                    >
                     Equipado
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onSelectLegend(previewLegend.id);
                        setIsModalOpen(false);
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold transition-all bg-[#162021ff] border-2 border-[#715b31ff] uppercase text-xs tracking-wider flex items-center justify-center gap-2 cursor-default"
                    >
                     Equipar
                    </button>
                  )}
                </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// --- COMPONENTE INTERNO: Escenario 3D en Vivo para el Modal ---
const LittleLegend3DStage: React.FC<{
  legend: LittleLegendData;
  currentEmote: 'idle' | 'run' | 'dance' | 'taunt' | 'laugh';
}> = ({ legend, currentEmote }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const legend3dRef = useRef<Legend3DInstance | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 220;

    // 1. Escena y Cámara
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 3.2);
    camera.lookAt(0, 0.5, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // 3. Luces
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.8);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(3, 5, 4);
    scene.add(dirLight);

    const rimLight = new THREE.PointLight(legend.accentColor || 0x38bdf8, 2.0, 10);
    rimLight.position.set(-2, 2, -2);
    scene.add(rimLight);

    // 4. Pedestal Brillante
    const pedestalGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.08, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.8,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.04;
    scene.add(pedestal);

    const ringGeo = new THREE.RingGeometry(0.82, 0.96, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: legend.color || 0x00f0ff,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // 5. Cargar Modelo 3D
    const targetFile = legend.modelFile || `${legend.id}.glb`;
    let isCancelled = false;

    littleLegendModelManager.loadModel(targetFile).then((template) => {
      if (isCancelled || !template) return;
      const instance = littleLegendModelManager.instantiate(template, legend.scale || 1.0);
      instance.group.position.set(0, 0, 0);
      scene.add(instance.group);
      legend3dRef.current = instance;
      instance.playAnimation(currentEmote, 0.1);
    });

    // 6. Loop de Animación & Control de Arrastre
    let animationId: number;
    let lastTime = performance.now();
    let isDragging = false;
    let prevMouseX = 0;
    let rotationVelocity = 0.4; // Auto-rotación suave

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (legend3dRef.current) {
        if (legend3dRef.current.mixer) {
          legend3dRef.current.mixer.update(delta);
        }
        if (!isDragging) {
          legend3dRef.current.group.rotation.y += delta * rotationVelocity;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Eventos de Mouse para girar el modelo 3D
    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !legend3dRef.current) return;
      const deltaX = e.clientX - prevMouseX;
      prevMouseX = e.clientX;
      legend3dRef.current.group.rotation.y += deltaX * 0.015;
    };
    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animationId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [legend]);

  // Cambiar animación activa en el preview
  useEffect(() => {
    if (legend3dRef.current) {
      legend3dRef.current.playAnimation(currentEmote, 0.15);
    }
  }, [currentEmote]);

  return <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />;
};