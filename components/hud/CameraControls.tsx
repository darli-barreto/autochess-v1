'use client';

import React from 'react';

interface CameraControlsProps {
  zoomLevel: number; // 0 (zoomed in) to 1 (zoomed out)
  isFollowingTactician: boolean;
  isInspectingChampion: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCamera: () => void;
  onToggleFollowTactician: () => void;
  onInspectSelectedUnit?: () => void;
  hasSelectedUnit: boolean;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  zoomLevel,
  isFollowingTactician,
  isInspectingChampion,
  onZoomIn,
  onZoomOut,
  onResetCamera,
  onToggleFollowTactician,
  onInspectSelectedUnit,
  hasSelectedUnit,
}) => {
  return (
    <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 rounded-xl p-1.5 shadow-xl shadow-cyan-950/40 text-xs select-none">
      {/* Zoom In Button */}
      <button
        onClick={onZoomIn}
        className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-cyan-950 border border-slate-700/70 hover:border-cyan-400 text-slate-200 hover:text-cyan-300 font-black flex items-center justify-center transition-all cursor-pointer"
        title="Acercar Zoom (Rueda del ratón hacia arriba)"
      >
        <span className="text-sm">🔍+</span>
      </button>

      {/* Zoom Out Button */}
      <button
        onClick={onZoomOut}
        className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-cyan-950 border border-slate-700/70 hover:border-cyan-400 text-slate-200 hover:text-cyan-300 font-black flex items-center justify-center transition-all cursor-pointer"
        title="Alejar Zoom (Rueda del ratón hacia abajo)"
      >
        <span className="text-sm">🔍-</span>
      </button>

      <div className="w-[1px] h-6 bg-slate-800 mx-0.5" />

      {/* Inspect Selected Champion Button */}
      <button
        onClick={onInspectSelectedUnit}
        disabled={!hasSelectedUnit}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-bold transition-all ${
          isInspectingChampion
            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/20'
            : hasSelectedUnit
            ? 'bg-slate-900 hover:bg-amber-950/60 border-slate-700 hover:border-amber-400/60 text-slate-200 hover:text-amber-300 cursor-pointer'
            : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
        }`}
        title="Enfocar e Inspeccionar Campeón seleccionado en 3D (Tecla Z o Doble Click)"
      >
        <span>🎯</span>
        <span className="hidden sm:inline text-[11px]">
          {isInspectingChampion ? 'Enfocado' : 'Enfocar Ficha'}
        </span>
      </button>

      {/* Follow Little Legend Button */}
      <button
        onClick={onToggleFollowTactician}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
          isFollowingTactician
            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20'
            : 'bg-slate-900 hover:bg-cyan-950/60 border-slate-700 hover:border-cyan-400/60 text-slate-200 hover:text-cyan-300'
        }`}
        title="La cámara sigue automáticamente a tu Minileyenda mientras camina"
      >
        <span>🐣</span>
        <span className="hidden sm:inline text-[11px]">
          {isFollowingTactician ? 'Siguiendo' : 'Seguir Minileyenda'}
        </span>
      </button>

      <div className="w-[1px] h-6 bg-slate-800 mx-0.5" />

      {/* Reset Camera to Default Overview */}
      <button
        onClick={onResetCamera}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-all cursor-pointer"
        title="Centrar Vista del Tablero (Barra Espaciadora o ESC)"
      >
        <span>🏠</span>
        <span className="hidden md:inline text-[11px] font-medium">Centrar Vista</span>
      </button>
    </div>
  );
};
