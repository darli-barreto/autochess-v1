// src/components/arena/ArenaDragOverlay.tsx

import React from 'react';
import { BoardUnit } from '@/types/game';
import { CHAMPIONS_DATA } from '@/data/champions';

interface ArenaDragOverlayProps {
  draggedUnit: BoardUnit | null;
  isOverSellZone: boolean;
  hoveredHex: { row: number; col: number } | null;
  hoveredBenchIdx: number | null;
  hoveredTargetUnit: BoardUnit | null;
}

export const ArenaDragOverlay: React.FC<ArenaDragOverlayProps> = ({
  draggedUnit,
  isOverSellZone,
  hoveredHex,
  hoveredBenchIdx,
  hoveredTargetUnit,
}) => {
  if (!draggedUnit) return null;

  const draggedChampData = CHAMPIONS_DATA[draggedUnit.championId];
  const sellRefund = draggedChampData
    ? draggedChampData.cost * (draggedUnit.starLevel === 3 ? 9 : draggedUnit.starLevel === 2 ? 3 : 1)
    : 1;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-full bg-slate-900/90 text-white font-bold text-xs uppercase tracking-wider backdrop-blur-md shadow-2xl border border-amber-400/80 flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
        <span className="text-amber-300">
          {draggedChampData?.name} (★{draggedUnit.starLevel})
        </span>
      </div>
      <span className="text-slate-400 text-[10px]">➜</span>
      {isOverSellZone ? (
        <span className="text-rose-400 font-extrabold flex items-center gap-1">
          💰 Soltar aquí para VENDER (+{sellRefund} Oro)
        </span>
      ) : hoveredHex && hoveredHex.row >= 4 ? (
        <span className="text-emerald-300">
          {hoveredTargetUnit
            ? `🔄 Intercambiar con ${CHAMPIONS_DATA[hoveredTargetUnit.championId]?.name}`
            : `Colocar en Fila ${hoveredHex.row - 3}, Col ${hoveredHex.col + 1}`}
        </span>
      ) : hoveredHex && hoveredHex.row < 4 ? (
        <span className="text-rose-400">⚠️ Zona enemiga no permitida</span>
      ) : hoveredBenchIdx !== null ? (
        <span className="text-cyan-300">
          {hoveredTargetUnit
            ? `🔄 Intercambiar en Banca slot B${hoveredBenchIdx + 1}`
            : `Mover a Banca slot B${hoveredBenchIdx + 1}`}
        </span>
      ) : (
        <span className="text-slate-400">
          Arrastra hacia el tablero, la banca o la tienda para vender
        </span>
      )}
    </div>
  );
};