'use client';

import React from 'react';
import { BoardUnit } from '@/types/game';
import { CHAMPIONS_DATA } from '@/data/champions';
import { axialToRowCol } from '@/engine/hexMath';

interface DebugOverlayProps {
  isOpen: boolean;
  selectedUnit: BoardUnit | null;
  fps: number;
  drawCalls: number;
  triangles: number;
  activeEntityCount: number;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  isOpen,
  selectedUnit,
  fps,
  drawCalls,
  triangles,
  activeEntityCount,
}) => {
  if (!isOpen) return null;

  const base = selectedUnit ? CHAMPIONS_DATA[selectedUnit.championId] : null;
  const rowCol = selectedUnit?.gridPosition ? axialToRowCol(selectedUnit.gridPosition) : null;

  return (
    <div className="pointer-events-none fixed top-16 left-4 z-40 w-80 rounded-xl border border-emerald-500/80 bg-slate-950/90 p-3 font-mono text-xs text-emerald-400 backdrop-blur-md shadow-2xl space-y-2">
      <div className="flex items-center justify-between border-b border-emerald-900/60 pb-1.5 font-bold">
        <span>DEBUG INSPECTOR (F3)</span>
        <span className="text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded text-emerald-300">ACTIVE</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>FPS: <span className="font-bold text-white">{fps}</span></div>
        <div>Draw Calls: <span className="font-bold text-white">{drawCalls}</span></div>
        <div>Triangles: <span className="font-bold text-white">{triangles.toLocaleString()}</span></div>
        <div>Entidades: <span className="font-bold text-white">{activeEntityCount}</span></div>
        <div>Tick Rate: <span className="font-bold text-white">30 Hz</span></div>
        <div>Ping Simulado: <span className="font-bold text-white">24 ms</span></div>
      </div>

      {selectedUnit ? (
        <div className="border-t border-emerald-900/60 pt-2 space-y-1 text-[11px]">
          <div className="font-bold text-amber-300">
            [Ficha: #{selectedUnit.instanceId.slice(-4)}] {base?.name} (★{selectedUnit.starLevel})
          </div>
          <div>Equipo: <span className="text-white">{selectedUnit.team.toUpperCase()}</span></div>
          <div>Estado FSM: <span className="text-white font-bold">{selectedUnit.state}</span></div>
          {selectedUnit.gridPosition && (
            <div>
              Axial: <span className="text-white">({selectedUnit.gridPosition.q}, {selectedUnit.gridPosition.r})</span> | Fila/Col: <span className="text-white">({rowCol?.row}, {rowCol?.col})</span>
            </div>
          )}
          <div>
            Vida: <span className="text-white">{selectedUnit.currentHealth} / {selectedUnit.maxHealth}</span> (Shield: {selectedUnit.shield})
          </div>
          <div>
            Maná: <span className="text-white">{selectedUnit.currentMana} / {selectedUnit.maxMana}</span>
          </div>
          <div>
            Objetos ({selectedUnit.items.length}/3): <span className="text-white">{selectedUnit.items.join(', ') || 'Ninguno'}</span>
          </div>
          <div>
            Daño Acumulado: <span className="text-amber-300">{selectedUnit.totalDamageDealt}</span> | Kills: <span className="text-rose-300">{selectedUnit.kills}</span>
          </div>
        </div>
      ) : (
        <div className="border-t border-emerald-900/60 pt-2 text-[10px] text-slate-400">
          Haz clic en cualquier ficha del tablero o banca para inspeccionar sus variables internas de simulación.
        </div>
      )}
    </div>
  );
};
