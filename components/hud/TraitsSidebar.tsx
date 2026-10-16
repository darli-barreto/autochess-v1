// src/components/hud/TraitsSidebar.tsx

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PlayerState, BoardUnit, TraitId, ItemData } from '@/types/game';
import { CHAMPIONS_DATA } from '@/data/champions';
import { ALL_ITEMS } from '@/data/items';
import { TRAITS_DATA } from '@/data/traits';

interface TraitsSidebarProps {
  player: PlayerState;
  spectatedPlayer: PlayerState;
  selectedUnit: BoardUnit | null;
  onEquipItem: (itemBenchIdx: number, unitId: string) => void;
}

type TraitTier = 'unique' | 'prismatic' | 'gold' | 'silver' | 'bronze' | 'inactive';

interface CalculatedTrait {
  traitId: string;
  name: string;
  count: number;
  tier: TraitTier;
  activeThresholdCount: number | null;
  nextThresholdCount: number;
  allThresholds: number[];
  traitData: (typeof TRAITS_DATA)[string];
}

// ============================================================================
// 🎛️ CONFIGURACIÓN DE LÍMITES VISUALES
// ============================================================================
export const TRAITS_SIDEBAR_CONFIG = {
  // Cantidad máxima de sinergias visibles antes de mostrar el botón "+N" (ej: 7 u 8)
  maxVisibleTraits: 7,
};

export const TraitsSidebar: React.FC<TraitsSidebarProps> = ({
  player,
  spectatedPlayer,
  selectedUnit,
  onEquipItem,
}) => {
  const [hoveredTrait, setHoveredTrait] = useState<TraitId | null>(null);
  const [hoveredItemIdx, setHoveredItemIdx] = useState<number | null>(null);
  const [selectedItemBenchIdx, setSelectedItemBenchIdx] = useState<number | null>(null);
  const [isTraitsExpanded, setIsTraitsExpanded] = useState<boolean>(false);

  const getItemDesc = (item: ItemData): string => {
    if ('isCompleted' in item && item.isCompleted) {
      return item.passive?.description || 'Objeto completado.';
    }
    return 'description' in item ? (item as { description: string }).description : 'Componente básico.';
  };

  // --- 1. CÁLCULO DE SINERGIAS DEL JUGADOR ESPECTADO ---
  const activeTraitsCounts: Record<string, number> = {};
  const seenChamps = new Set<string>();

  spectatedPlayer.board.forEach((u) => {
    if (seenChamps.has(u.championId)) return;
    seenChamps.add(u.championId);
    const base = CHAMPIONS_DATA[u.championId];
    if (base) {
      base.traits.forEach((t) => {
        activeTraitsCounts[t] = (activeTraitsCounts[t] || 0) + 1;
      });
    }
  });

  const allCalculatedTraits: CalculatedTrait[] = Object.entries(activeTraitsCounts)
    .map(([traitId, count]) => {
      const traitData = TRAITS_DATA[traitId];
      if (!traitData) return null;

      const thresholds = traitData.thresholds || [];
      const thresholdCounts = thresholds.map((t) => t.count);
      const activeTh = [...thresholds].reverse().find((th) => count >= th.count);
      const nextTh = thresholds.find((th) => count < th.count) || thresholds[thresholds.length - 1];

      let tier: TraitTier = 'inactive';
      if (activeTh) {
        if (thresholds.length === 1 && thresholds[0].count === 1) {
          tier = 'unique';
        } else {
          tier = (activeTh.tier as TraitTier) || 'bronze';
        }
      }

      return {
        traitId,
        name: traitData.name,
        count,
        tier,
        activeThresholdCount: activeTh ? activeTh.count : null,
        nextThresholdCount: nextTh ? nextTh.count : (thresholds[0]?.count ?? 2),
        allThresholds: thresholdCounts,
        traitData,
      };
    })
    .filter((t): t is CalculatedTrait => t !== null);

  // Ordenar por nivel de mayor a menor
  const tierWeight: Record<TraitTier, number> = {
    unique: 6,
    prismatic: 5,
    gold: 4,
    silver: 3,
    bronze: 2,
    inactive: 1,
  };

  const sortedTraits = [...allCalculatedTraits].sort((a, b) => {
    if (tierWeight[b.tier] !== tierWeight[a.tier]) {
      return tierWeight[b.tier] - tierWeight[a.tier];
    }
    return b.count - a.count;
  });

  // --- 2. LÓGICA DINÁMICA DE "+N" PARA SINERGIAS ---
  const maxVisibleTraits = TRAITS_SIDEBAR_CONFIG.maxVisibleTraits;
  const hasTraitOverflow = sortedTraits.length > maxVisibleTraits;
  const hiddenTraitsCount = sortedTraits.length - maxVisibleTraits;
  const displayedTraits = isTraitsExpanded ? sortedTraits : sortedTraits.slice(0, maxVisibleTraits);

  // --- 3. LÓGICA DINÁMICA DE "+N" PARA OBJETOS ---
  const visibleItemSlots = player.itemBench.slice(0, 10);
  const overflowItems = player.itemBench.slice(10).filter((id): id is string => id !== null);
  const overflowItemCount = overflowItems.length;

  // Renderizado de Hexágonos SVG
  const renderHexagon = (tier: TraitTier, image?: string, name?: string) => {
    let gradId = 'hex-inactive';
    let strokeColor = '#3a4454';
    let innerStrokeColor = '#1f2530';

    if (tier === 'unique') {
      gradId = 'hex-unique';
      strokeColor = '#ff9838';
      innerStrokeColor = '#9a3412';
    } else if (tier === 'prismatic') {
      gradId = 'hex-prismatic';
      strokeColor = '#38bdf8';
      innerStrokeColor = '#a855f7';
    } else if (tier === 'gold') {
      gradId = 'hex-gold';
      strokeColor = '#f5d565';
      innerStrokeColor = '#7d5311';
    } else if (tier === 'silver') {
      gradId = 'hex-silver';
      strokeColor = '#c2dfe6';
      innerStrokeColor = '#3b545e';
    } else if (tier === 'bronze') {
      gradId = 'hex-bronze';
      strokeColor = '#df9c69';
      innerStrokeColor = '#59290f';
    }

    return (
      <div className="relative w-[34px] h-[38px] flex items-center justify-center shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        <svg viewBox="0 0 34 38" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="hex-unique" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff782e" />
              <stop offset="50%" stopColor="#e64a19" />
              <stop offset="100%" stopColor="#871c00" />
            </linearGradient>

            <linearGradient id="hex-prismatic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>

            <linearGradient id="hex-gold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fae17d" />
              <stop offset="45%" stopColor="#d19c2a" />
              <stop offset="100%" stopColor="#87530c" />
            </linearGradient>

            <linearGradient id="hex-silver" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#eef6f8" />
              <stop offset="45%" stopColor="#8fa7b2" />
              <stop offset="100%" stopColor="#455d67" />
            </linearGradient>

            <linearGradient id="hex-bronze" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#df9c69" />
              <stop offset="45%" stopColor="#965428" />
              <stop offset="100%" stopColor="#4f2409" />
            </linearGradient>

            <linearGradient id="hex-inactive" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#252d38" />
              <stop offset="100%" stopColor="#12161f" />
            </linearGradient>
          </defs>

          <polygon
            points="17,1.5 32.5,9.5 32.5,28.5 17,36.5 1.5,28.5 1.5,9.5"
            fill={`url(#${gradId})`}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          <polygon
            points="17,4 29.5,11 29.5,27 17,34 4.5,27 4.5,11"
            fill="none"
            stroke={innerStrokeColor}
            strokeWidth="1"
            opacity="0.8"
          />
        </svg>

        <div className="relative z-10 w-[20px] h-[20px] flex items-center justify-center pointer-events-none">
          {image ? (
            <Image
              src={image}
              alt={name || 'Trait'}
              width={18}
              height={18}
              unoptimized
              className="w-[18px] h-[18px] object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span
              className={`text-[10px] font-black uppercase ${
                tier !== 'inactive' ? 'text-black' : 'text-slate-400'
              }`}
            >
              {name?.slice(0, 1) || 'T'}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Render de cada fila de Sinergia
  const renderTraitRow = (trait: CalculatedTrait) => {
    const isActive = trait.tier !== 'inactive';

    return (
      <div
        key={trait.traitId}
        onMouseEnter={() => setHoveredTrait(trait.traitId as TraitId)}
        onMouseLeave={() => setHoveredTrait(null)}
        className="group relative flex items-center gap-1.5 select-none cursor-pointer transition-all duration-100"
      >
        {renderHexagon(trait.tier, trait.traitData.image, trait.name)}

        {isActive && (
          <div className="flex items-center justify-center min-w-[24px] h-[32px] px-1 bg-[#10171e]/95 border border-white/10 rounded-[3px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]">
            <span className="text-[14px] font-black text-white font-sans tracking-tight leading-none">
              {trait.count}
            </span>
          </div>
        )}

        <div
          className={`flex flex-col justify-center px-2.5 py-1 bg-[#121b22]/90 group-hover:bg-[#192530] border border-white/5 rounded-r-[4px] shadow-lg transition-colors ${
            isActive ? 'min-w-[105px]' : 'min-w-[134px]'
          }`}
        >
          <span
            className={`text-[12px] font-bold font-sans leading-tight truncate ${
              isActive ? 'text-[#f1eff4]' : 'text-[#8796a5]'
            }`}
          >
            {trait.name}
          </span>

          <div className="flex items-center gap-1 text-[11px] font-sans leading-tight mt-0.5">
            {isActive ? (
              trait.allThresholds.length === 1 && trait.allThresholds[0] === 1 ? (
                <span className="text-white font-bold text-[10px]">1</span>
              ) : (
                trait.allThresholds.map((thCount, idx) => {
                  const isCurrentActive =
                    trait.count >= thCount &&
                    (idx === trait.allThresholds.length - 1 || trait.count < trait.allThresholds[idx + 1]);

                  return (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-[#4e5d6d] text-[9px]">›</span>}
                      <span
                        className={`${
                          isCurrentActive
                            ? 'text-white font-bold drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]'
                            : 'text-[#627385] font-medium'
                        }`}
                      >
                        {thCount}
                      </span>
                    </React.Fragment>
                  );
                })
              )
            ) : (
              <span className="text-[#64748b] text-[11px] font-medium">
                {trait.count} <span className="text-[#3b4754]">/</span> {trait.nextThresholdCount}
              </span>
            )}
          </div>
        </div>

        {hoveredTrait === trait.traitId && (
          <div className="absolute left-full top-0 ml-2 z-50 w-72 rounded-lg border border-slate-700 bg-slate-950/95 p-3 shadow-2xl text-xs text-slate-200 backdrop-blur-md pointer-events-none">
            <div className="flex items-center gap-2.5 mb-2 border-b border-slate-800 pb-2">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                {renderHexagon(trait.tier, trait.traitData.image, trait.name)}
              </div>
              <div>
                <div className="font-bold text-sm text-[#f5d565] leading-tight">{trait.name}</div>
                <div className="text-[10px] text-slate-400">
                  {trait.count} {trait.count === 1 ? 'unidad en el tablero' : 'unidades en el tablero'}
                </div>
              </div>
            </div>
            <p className="text-slate-300 mb-2 leading-relaxed text-[11px]">
              {trait.traitData.description}
            </p>
            <div className="space-y-1 border-t border-slate-800 pt-2">
              {trait.traitData.thresholds.map((th, idx) => {
                const isThActive = trait.count >= th.count;
                return (
                  <div
                    key={idx}
                    className={`text-[11px] px-1.5 py-0.5 rounded transition ${
                      isThActive
                        ? 'font-bold text-amber-300 bg-amber-950/40 border border-amber-500/40'
                        : 'text-slate-500'
                    }`}
                  >
                    ({th.count}) {th.description}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="pointer-events-auto flex items-start gap-2 z-10 select-none h-full max-h-[85vh] pl-2 py-1 overflow-visible">
      {/* ========================================================================= */}
      {/* 🎒 1. BANCA DE ÍTEMS VERTICAL (10 RANURAS + "+N" SI HAY DESBORDE)         */}
      {/* ========================================================================= */}
      <div className="flex flex-col items-center bg-[#071318]/95 border-2 border-[#163842] rounded-t-sm rounded-b-[18px] p-1.5 shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-md relative">
        <div className="absolute -top-1 left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-[#00e5ff]/50 to-transparent pointer-events-none" />

        {/* Las 10 Ranuras Principales de Objetos */}
        <div className="flex flex-col gap-1.5">
          {visibleItemSlots.map((itemId, idx) => {
            const item = itemId ? ALL_ITEMS[itemId] : null;
            const isSelected = selectedItemBenchIdx === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredItemIdx(idx)}
                onMouseLeave={() => setHoveredItemIdx(null)}
                onClick={() => {
                  if (item && selectedUnit) {
                    onEquipItem(idx, selectedUnit.instanceId);
                    setSelectedItemBenchIdx(null);
                  } else if (item) {
                    setSelectedItemBenchIdx(isSelected ? null : idx);
                  }
                }}
                className={`w-[34px] h-[34px] bg-[#04080c] border rounded-[2px] transition-all duration-150 flex items-center justify-center relative cursor-pointer ${
                  item
                    ? isSelected
                      ? 'border-amber-400 bg-amber-950 scale-105 shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                      : 'border-[#1b3440] hover:border-[#00e5ff] hover:scale-105 hover:shadow-md'
                    : 'border-[#0f1d24] opacity-75'
                }`}
              >
                {item ? (
                  item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={28}
                      height={28}
                      unoptimized
                      className="w-[28px] h-[28px] object-contain rounded-[1px]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className="text-[10px] font-black flex items-center justify-center font-mono"
                      style={{ color: item.color || '#38bdf8' }}
                    >
                      {item.name.substring(0, 2).toUpperCase()}
                    </div>
                  )
                ) : null}

                {hoveredItemIdx === idx && item && (
                  <div className="absolute left-full top-0 ml-2 z-50 w-64 rounded-lg border border-slate-700 bg-slate-950/95 p-2.5 shadow-2xl text-xs text-slate-200 backdrop-blur-md pointer-events-none">
                    <div className="font-bold text-amber-300 text-sm mb-1">{item.name}</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed mb-1.5">
                      {getItemDesc(item)}
                    </p>
                    {selectedUnit && (
                      <div className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded text-center">
                        ¡Haz clic para equipar en {CHAMPIONS_DATA[selectedUnit.championId]?.name || 'campeón'}!
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 🌟 BOTÓN DINÁMICO "+N" EN ÍTEMS (Solo aparece si hay más de 10 objetos en cola) */}
        {overflowItemCount > 0 && (
          <div className="mt-2 w-full flex items-center justify-center" title={`${overflowItemCount} objetos en espera`}>
            <div className="flex items-center justify-center w-[30px] h-[20px] bg-[#0c242c] border border-[#00e5ff]/60 rounded-[3px] shadow-[0_0_8px_rgba(0,229,255,0.4)]">
              <span className="text-[11px] font-bold font-mono text-[#00e5ff]">+{overflowItemCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🔮 2. LISTA DE SINERGIAS CON BOTÓN DINÁMICO "+N"                         */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-1 flex flex-col gap-1.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-amber-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-amber-500/40 [&::-webkit-scrollbar-thumb]:rounded">
        {sortedTraits.length === 0 ? (
          <div className="bg-[#0b141c]/80 p-2.5 rounded border border-white/5 text-[11px] text-slate-400 text-center backdrop-blur-sm">
            Coloca unidades en el tablero para activar sinergias
          </div>
        ) : (
          <>
            {/* Lista de Sinergias (filtradas a 7 o completas si se expande) */}
            {displayedTraits.map(renderTraitRow)}

            {/* 🌟 BOTÓN DINÁMICO "+N" EN SINERGIAS (Aparece al haber más de 7 sinergias) */}
            {hasTraitOverflow && (
              <button
                onClick={() => setIsTraitsExpanded(!isTraitsExpanded)}
                className="mt-1 flex items-center justify-center gap-1 py-1 px-3 bg-[#0c242c] hover:bg-[#123844] border border-[#00e5ff]/50 hover:border-[#00e5ff] rounded-[4px] shadow-[0_0_8px_rgba(0,229,255,0.3)] transition-all cursor-pointer group"
                title={isTraitsExpanded ? 'Colapsar sinergias' : `Mostrar ${hiddenTraitsCount} sinergias más`}
              >
                <span className="text-[11px] font-black font-mono text-[#00e5ff] group-hover:text-white transition-colors">
                  {isTraitsExpanded ? '▴ Ocultar' : `+${hiddenTraitsCount}`}
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </aside>
  );
};