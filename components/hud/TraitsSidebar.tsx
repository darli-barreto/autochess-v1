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

type TraitTier = 'prismatic' | 'gold' | 'silver' | 'bronze' | 'inactive';

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

export const TraitsSidebar: React.FC<TraitsSidebarProps> = ({
  player,
  spectatedPlayer,
  selectedUnit,
  onEquipItem,
}) => {
  const [hoveredTrait, setHoveredTrait] = useState<TraitId | null>(null);
  const [selectedItemBenchIdx, setSelectedItemBenchIdx] = useState<number | null>(null);

  const getItemDesc = (item: ItemData): string => {
    if ('isCompleted' in item && item.isCompleted) {
      return item.passive.description;
    }
    return 'description' in item ? (item as { description: string }).description : '';
  };

  // Trait calculation for spectated player
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

  // Build structured trait list
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
        tier = (activeTh.tier as TraitTier) || 'bronze';
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

  // Group traits: Gold/Prismatic, Silver/Bronze, Inactive
  const goldTraits = allCalculatedTraits.filter(
    (t) => t.tier === 'gold' || t.tier === 'prismatic'
  ).sort((a, b) => b.count - a.count);

  const silverBronzeTraits = allCalculatedTraits.filter(
    (t) => t.tier === 'silver' || t.tier === 'bronze'
  ).sort((a, b) => {
    if (a.tier === 'silver' && b.tier !== 'silver') return -1;
    if (b.tier === 'silver' && a.tier !== 'silver') return 1;
    return b.count - a.count;
  });

  const inactiveTraits = allCalculatedTraits.filter(
    (t) => t.tier === 'inactive'
  ).sort((a, b) => b.count - a.count);

  const renderHexagon = (tier: TraitTier, image?: string, name?: string) => {
    // Colors & Gradients for Hexagon based on Tier
    let gradId = 'hex-inactive';
    let strokeColor = '#3a4454';
    let innerStrokeColor = '#1f2530';
    let isMetallic = false;

    if (tier === 'gold' || tier === 'prismatic') {
      gradId = 'hex-gold';
      strokeColor = '#f5d565';
      innerStrokeColor = '#7d5311';
      isMetallic = true;
    } else if (tier === 'silver') {
      gradId = 'hex-silver';
      strokeColor = '#c2dfe6';
      innerStrokeColor = '#3b545e';
      isMetallic = true;
    } else if (tier === 'bronze') {
      gradId = 'hex-bronze';
      strokeColor = '#d99762';
      innerStrokeColor = '#59290f';
      isMetallic = true;
    }

    return (
      <div className="relative w-[34px] h-[38px] flex items-center justify-center shrink-0">
        <svg viewBox="0 0 34 38" className="absolute inset-0 w-full h-full drop-shadow-md">
          <defs>
            {/* Gold Gradient */}
            <linearGradient id="hex-gold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fae17d" />
              <stop offset="45%" stopColor="#d19c2a" />
              <stop offset="100%" stopColor="#87530c" />
            </linearGradient>
            {/* Silver Gradient */}
            <linearGradient id="hex-silver" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#eef6f8" />
              <stop offset="45%" stopColor="#8fa7b2" />
              <stop offset="100%" stopColor="#455d67" />
            </linearGradient>
            {/* Bronze Gradient */}
            <linearGradient id="hex-bronze" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#df9c69" />
              <stop offset="45%" stopColor="#965428" />
              <stop offset="100%" stopColor="#4f2409" />
            </linearGradient>
            {/* Inactive Gradient */}
            <linearGradient id="hex-inactive" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#222834" />
              <stop offset="100%" stopColor="#12161f" />
            </linearGradient>
          </defs>

          {/* Base Hexagon */}
          <polygon
            points="17,1.5 32.5,9.5 32.5,28.5 17,36.5 1.5,28.5 1.5,9.5"
            fill={`url(#${gradId})`}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Inner Inset Hexagon outline for bevel 3D look */}
          <polygon
            points="17,4 29.5,11 29.5,27 17,34 4.5,27 4.5,11"
            fill="none"
            stroke={innerStrokeColor}
            strokeWidth="1"
            opacity="0.7"
          />
        </svg>

        {/* Trait Icon inside Hexagon */}
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
                isMetallic ? 'text-black' : 'text-slate-400'
              }`}
            >
              {name?.slice(0, 1) || 'T'}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderTraitRow = (trait: CalculatedTrait) => {
    const isActive = trait.tier !== 'inactive';

    return (
      <div
        key={trait.traitId}
        onMouseEnter={() => setHoveredTrait(trait.traitId as TraitId)}
        onMouseLeave={() => setHoveredTrait(null)}
        className="group relative flex items-center gap-1.5 select-none cursor-pointer transition-all duration-100"
      >
        {/* Left: Hexagon Emblem */}
        {renderHexagon(trait.tier, trait.traitData.image, trait.name)}

        {/* Center: Count Box (Only for Active Traits) */}
        {isActive && (
          <div className="flex items-center justify-center min-w-[24px] h-[30px] px-1.5 bg-[#1b2029]/95 rounded-[3px] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <span className="text-[14px] font-black text-white font-sans tracking-tight leading-none">
              {trait.count}
            </span>
          </div>
        )}

        {/* Right: Info Pill (Name & Breakpoints/Progress) */}
        <div className="flex flex-col justify-center px-2 py-0.5 bg-[#141821]/90 group-hover:bg-[#1c2230]/95 border border-white/5 rounded-r-[3px] min-w-[96px] h-[34px] shadow-md transition-colors">
          {/* Trait Name */}
          <span className="text-[12px] font-semibold text-[#f1eff4] font-sans leading-tight truncate">
            {trait.name}
          </span>

          {/* Breakpoints / Progress */}
          <div className="flex items-center gap-1 text-[11px] font-sans leading-tight mt-0.5">
            {isActive ? (
              // Active Breakpoints list (e.g., 2 › 4 › 6)
              trait.allThresholds.map((thCount, idx) => {
                const isCurrentActive = trait.count >= thCount && 
                  (idx === trait.allThresholds.length - 1 || trait.count < trait.allThresholds[idx + 1]);

                return (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="text-[#555d6e] text-[9px]">›</span>}
                    <span
                      className={`${
                        isCurrentActive
                          ? 'text-white font-bold drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]'
                          : 'text-[#7e8799] font-medium'
                      }`}
                    >
                      {thCount}
                    </span>
                  </React.Fragment>
                );
              })
            ) : (
              // Inactive progress (e.g., 2 / 3)
              <span className="text-[#838c9e] text-[11px] font-medium">
                {trait.count} <span className="text-[#4e5564]">/</span> {trait.nextThresholdCount}
              </span>
            )}
          </div>
        </div>

        {/* Trait Tooltip */}
        {hoveredTrait === trait.traitId && (
          <div className="absolute left-full top-0 ml-2 z-50 w-72 rounded-lg border border-slate-700 bg-slate-950/95 p-3 shadow-2xl text-xs text-slate-200 backdrop-blur-md">
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

  const renderDiamondSeparator = (key: string) => (
    <div key={key} className="flex items-center pl-3 py-1 my-0.5">
      <div className="w-1.5 h-1.5 rotate-45 border border-[#c4a15b]/80 bg-[#0c1219] shadow-[0_0_4px_rgba(196,161,91,0.4)]" />
    </div>
  );

  return (
    <aside className="pointer-events-auto w-56 flex flex-col gap-2 z-10 select-none h-full max-h-full pl-2 py-2 overflow-hidden">
      {/* 1. Independent Scrollable Traits Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-1 flex flex-col gap-1.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-amber-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-amber-500/40 [&::-webkit-scrollbar-thumb]:rounded">
        {allCalculatedTraits.length === 0 ? (
          <div className="bg-slate-900/60 p-2.5 rounded border border-white/5 text-[11px] text-slate-400 text-center backdrop-blur-sm">
            Coloca unidades para activar sinergias
          </div>
        ) : (
          <>
            {/* Gold / Prismatic Traits */}
            {goldTraits.map(renderTraitRow)}

            {/* Separator between Gold and Silver/Bronze if both exist */}
            {goldTraits.length > 0 && silverBronzeTraits.length > 0 && renderDiamondSeparator('sep-gold-silver')}

            {/* Silver & Bronze Traits */}
            {silverBronzeTraits.map(renderTraitRow)}

            {/* Separator between Active and Inactive Traits if both exist */}
            {(goldTraits.length > 0 || silverBronzeTraits.length > 0) &&
              inactiveTraits.length > 0 &&
              renderDiamondSeparator('sep-active-inactive')}

            {/* Inactive Traits */}
            {inactiveTraits.map(renderTraitRow)}
          </>
        )}
      </div>

      {/* 2. Independent Fixed Item Bench */}
      <div className="shrink-0 p-2.5 bg-[#0e1218]/90 rounded border border-[#C4A15B]/30 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] text-[#c4a15b] uppercase font-bold tracking-wider">Item Bench</p>
          {selectedUnit && (
            <span className="text-[9px] text-amber-400 font-bold animate-pulse">Click para equipar</span>
          )}
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {player.itemBench.map((itemId, idx) => {
            const item = itemId ? ALL_ITEMS[itemId] : null;
            const isSelected = selectedItemBenchIdx === idx;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (item && selectedUnit) {
                    onEquipItem(idx, selectedUnit.instanceId);
                    setSelectedItemBenchIdx(null);
                  } else if (item) {
                    setSelectedItemBenchIdx(isSelected ? null : idx);
                  }
                }}
                title={item ? `${item.name}: ${getItemDesc(item)}` : 'Espacio vacío'}
                className={`aspect-square bg-[#141923] rounded-[2px] border transition flex items-center justify-center relative cursor-pointer ${
                  item
                    ? isSelected
                    ? 'border-amber-400 bg-amber-950 scale-105 shadow-md'
                    : 'border-white/20 hover:border-amber-400 hover:scale-105'
                    : 'border-white/5 opacity-40'
                }`}
              >
                {item && (
                  <div
                    className="text-[10px] font-bold flex items-center justify-center"
                    style={{ color: item.color }}
                  >
                    {item.name.substring(0, 2)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

