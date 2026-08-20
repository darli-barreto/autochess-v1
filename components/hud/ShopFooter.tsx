'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PlayerState, BoardUnit } from '@/types/game';
import { CHAMPIONS_DATA } from '@/data/champions';
import { TRAITS_DATA } from '@/data/traits';
import { GoldStreakBadge } from './GoldStreakBadge';
import { Lock, Unlock, Trash2 } from 'lucide-react';

interface ShopFooterProps {
  player: PlayerState;
  spectatedPlayer: PlayerState;
  selectedUnit: BoardUnit | null;
  onBuyChampion: (shopIdx: number) => void;
  onRollShop: () => void;
  onBuyXp: () => void;
  onToggleLockShop: () => void;
  onSellSelectedUnit: () => void;
  onSellUnitById?: (unitId: string) => void;
}

const COST_STYLES: Record<number, {
  outerBorder: string;
  bottomBg: string;
  gemBg: string;
  gemBorder: string;
  crestBorder: string;
  accentGradient: string;
}> = {
  1: {
    outerBorder: 'border-[#5e6d7a]',
    bottomBg: 'bg-[#2b333f]',
    gemBg: 'bg-slate-300',
    gemBorder: 'border-slate-200',
    crestBorder: 'border-[#6b7c8d]',
    accentGradient: 'from-slate-700/50 via-slate-800/80 to-[#12161f]',
  },
  2: {
    outerBorder: 'border-[#15803d]',
    bottomBg: 'bg-[#14532d]',
    gemBg: 'bg-emerald-400',
    gemBorder: 'border-emerald-200',
    crestBorder: 'border-[#16a34a]',
    accentGradient: 'from-emerald-900/50 via-slate-900/80 to-[#0c1f17]',
  },
  3: {
    outerBorder: 'border-[#2563eb]',
    bottomBg: 'bg-[#1e40af]',
    gemBg: 'bg-blue-400',
    gemBorder: 'border-blue-200',
    crestBorder: 'border-[#3b82f6]',
    accentGradient: 'from-blue-900/50 via-slate-900/80 to-[#0e172a]',
  },
  4: {
    outerBorder: 'border-[#a21caf]',
    bottomBg: 'bg-[#701a75]',
    gemBg: 'bg-fuchsia-400',
    gemBorder: 'border-fuchsia-200',
    crestBorder: 'border-[#c026d3]',
    accentGradient: 'from-fuchsia-950/60 via-purple-950/80 to-[#180b20]',
  },
  5: {
    outerBorder: 'border-[#d97706]',
    bottomBg: 'bg-[#78350f]',
    gemBg: 'bg-amber-400',
    gemBorder: 'border-amber-200',
    crestBorder: 'border-[#f59e0b]',
    accentGradient: 'from-amber-950/60 via-yellow-950/80 to-[#1f1307]',
  },
};

export const ShopFooter: React.FC<ShopFooterProps> = ({
  player,
  spectatedPlayer,
  selectedUnit: _selectedUnit,
  onBuyChampion,
  onRollShop,
  onBuyXp,
  onToggleLockShop,
  onSellSelectedUnit: _onSellSelectedUnit,
  onSellUnitById,
}) => {
  const [isDragOverShop, setIsDragOverShop] = useState(false);

  // Helper to count copies of a champion currently owned (on board and bench)
  const getChampionTotalCopies = (champId: string, starLevel: number = 1) => {
    const boardMatches = spectatedPlayer.board.filter((u) => u.championId === champId && u.starLevel === starLevel).length;
    const benchMatches = spectatedPlayer.bench.filter((u) => u && u.championId === champId && u.starLevel === starLevel).length;
    return boardMatches + benchMatches;
  };

  const occupiedBenchCount = spectatedPlayer.bench.filter((u) => u !== null).length;
  const isBenchFull = occupiedBenchCount >= 9;

  return (
    <footer
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOverShop(true);
      }}
      onDragLeave={() => setIsDragOverShop(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOverShop(false);
        const unitId = e.dataTransfer.getData('text/plain');
        if (unitId && onSellUnitById) {
          onSellUnitById(unitId);
        }
      }}
      className="pointer-events-auto relative h-40 w-[75%] mx-auto bg-gradient-to-b from-[#0e1218] via-[#090d13] to-[#06090d] border-t-2 border-x-2 border-[#C4A15B] flex items-stretch px-3.5 gap-3 z-20 shadow-[0_-12px_36px_rgba(0,0,0,0.8)]"
    >
      {/* ================= GOLD & STREAK & LEVEL FLOATING BADGE ================= */}
      <GoldStreakBadge player={player} onToggleLockShop={onToggleLockShop} />

      {/* Dynamic Drag-To-Sell Overlay */}
      {isDragOverShop && (
        <div className="absolute inset-0 bg-gradient-to-r from-rose-950/95 via-amber-950/95 to-rose-950/95 border-2 border-dashed border-amber-400 rounded-xl flex items-center justify-center gap-4 backdrop-blur-md z-40 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse">
          <div className="w-12 h-12 rounded-full bg-rose-900/80 border border-rose-400 flex items-center justify-center text-rose-200 shadow-lg">
            <Trash2 className="w-6 h-6 text-amber-300" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-base font-black text-amber-300 uppercase tracking-widest">
              Soltar aquí para Vender (Tecla [F])
            </span>
            <span className="text-xs text-rose-200 font-medium">
              Reembolsa el costo de la ficha inmediatamente
            </span>
          </div>
        </div>
      )}

      {/* Left: Action Buttons (Refresh & Buy XP stacked, matching TFT layout) */}
      <div className="flex items-center border-r border-[#3d3322] pr-3 shrink-0 my-auto">
        {/* The Two Stacked Action Buttons */}
        <div className="flex flex-col gap-[1.5] w-44">
          {/* ================= REFRESH BUTTON (TOP) ================= */}
          <button
            onClick={onRollShop}
            disabled={player.gold < 2}
            title="Rolear tienda (Tecla D)"
            className={`group relative h-[56px] w-full rounded-[2px] border-[1.5px] border-[#785a28] bg-gradient-to-r from-[#1d1912] via-[#14120e] to-[#0d0c0a] px-3 flex items-center justify-between transition-all duration-150 cursor-pointer overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.8)] ${
              player.gold < 2
                ? 'opacity-40 grayscale cursor-not-allowed border-[#45371c]'
                : 'hover:border-[#c89b3c] hover:brightness-110 active:scale-[0.98]'
            }`}
          >
            {/* Subtle diagonal ambient light overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/[0.04] via-transparent to-black/40 pointer-events-none" />

            {/* Left text info */}
            <div className="flex flex-col items-start text-left z-10 select-none">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-bold text-[#f0e6d2] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Refresh
                </span>
                <kbd className="text-[8px] bg-black/60 text-amber-300/80 px-1 py-0.2 rounded border border-amber-500/30 font-mono font-bold leading-none">
                  D
                </kbd>
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                {/* Gold Coin */}
                <div className="w-3 h-3 rounded-full bg-gradient-to-b from-[#ffd575] via-[#e5a83b] to-[#8c5a14] border border-[#ffeaa7]/80 shadow-[0_0_4px_rgba(229,168,59,0.5)] flex items-center justify-center shrink-0">
                  <div className="w-1 h-1 rounded-full border border-amber-950/70" />
                </div>
                <span className="text-[13px] font-black text-[#f0e6d2] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  2
                </span>
              </div>
            </div>

            {/* Right golden circular arrow icon */}
            <div className="relative z-10 flex items-center justify-center pr-1 transition-transform duration-200 group-hover:rotate-45">
              <svg
                viewBox="0 0 24 24"
                className="w-8 h-8 text-[#c89b3c] drop-shadow-[0_0_6px_rgba(200,155,60,0.6)]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-2.636-6.364l2.122-2.122" />
                <path d="M21 3v6h-6" />
              </svg>
            </div>
          </button>

          {/* ================= BUY XP BUTTON (BOTTOM) ================= */}
          <button
            onClick={onBuyXp}
            disabled={player.gold < 4 || player.level >= 9}
            title="Comprar XP (Tecla F)"
            className={`group relative h-[56px] w-full rounded-[2px] border-[1.5px] border-[#1e6f92] bg-gradient-to-r from-[#0e1f29] via-[#09151d] to-[#050d13] px-3 flex items-center justify-between transition-all duration-150 cursor-pointer overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.8)] ${
              player.gold < 4 || player.level >= 9
                ? 'opacity-40 grayscale cursor-not-allowed border-[#164357]'
                : 'hover:border-[#38bdf8] hover:brightness-110 active:scale-[0.98]'
            }`}
          >
            {/* Subtle diagonal ambient light overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/[0.04] via-transparent to-black/40 pointer-events-none" />

            {/* Left text info */}
            <div className="flex flex-col items-start text-left z-10 select-none">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-bold text-[#f0e6d2] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Buy XP
                </span>
                <kbd className="text-[8px] bg-black/60 text-cyan-300/80 px-1 py-0.2 rounded border border-cyan-500/30 font-mono font-bold leading-none">
                  F
                </kbd>
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                {/* Gold Coin */}
                <div className="w-3 h-3 rounded-full bg-gradient-to-b from-[#ffd575] via-[#e5a83b] to-[#8c5a14] border border-[#ffeaa7]/80 shadow-[0_0_4px_rgba(229,168,59,0.5)] flex items-center justify-center shrink-0">
                  <div className="w-1 h-1 rounded-full border border-amber-950/70" />
                </div>
                <span className="text-[13px] font-black text-[#f0e6d2] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {player.level >= 9 ? 'Max' : '4'}
                </span>
              </div>

              {/* Progress text */}
              <div className="text-[9px] text-[#6b8ea6] font-semibold leading-none mt-1">
                {player.level >= 9 ? 'Max' : `XP ${player.currentXp}/${player.requiredXp}`}
              </div>
            </div>

            {/* Right cyan double chevron icon */}
            <div className="relative z-10 flex items-center justify-center pr-3 transition-transform duration-150 group-hover:-translate-y-0.5">
              <svg
                viewBox="0 0 24 24"
                className="w-7 h-7 text-[#00d2ff] drop-shadow-[0_0_8px_rgba(0,210,255,0.7)]"
                fill="currentColor"
              >
                <path d="M12 4.2l-6.5 5.8 1.6 1.6L12 7.3l4.9 4.3 1.6-1.6z" />
                <path d="M12 11.2l-6.5 5.8 1.6 1.6L12 14.3l4.9 4.3 1.6-1.6z" />
              </svg>
            </div>

            {/* Bottom-right corner Level Badge matching the screenshot */}
            <div className="absolute bottom-0 right-0 bg-[#09151e] border-t border-l border-[#1e6f92] px-1.5 py-0.5 text-[10px] font-black text-[#6cb8dc] leading-none select-none">
              {player.level}
            </div>
          </button>
        </div>
      </div>

      {/* Center: 5 Champion Shop Cards (TFT Exact Layout) */}
      <div className="flex-1 grid grid-cols-5 gap-3 py-2.5">
        {player.shop.map((champId, idx) => {
          if (!champId) {
            return (
              <div
                key={idx}
                className="bg-slate-900/50 rounded-sm border border-dashed border-white/10 flex items-center justify-center text-xs text-slate-500 select-none"
              >
                Vendido
              </div>
            );
          }

          const champ = CHAMPIONS_DATA[champId];
          if (!champ) return null;
          const canAfford = player.gold >= champ.cost;
          const copiesOwned = getChampionTotalCopies(champId, 1);
          const canFitInBench = !isBenchFull;
          const style = COST_STYLES[champ.cost] || COST_STYLES[1];

          return (
            <div
              key={idx}
              onClick={() => canAfford && canFitInBench && onBuyChampion(idx)}
              className={`group relative flex flex-col h-full border-2 ${style.outerBorder} bg-[#0c1017] overflow-hidden select-none transition-all duration-150 cursor-pointer shadow-lg ${
                canAfford && canFitInBench
                  ? 'hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(0,0,0,0.8)]'
                  : 'opacity-40 cursor-not-allowed'
              }`}
            >
              {/* Top Ornamental Crest with Tier Jewel */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center justify-center">
                <div className={`w-10 h-2.5 bg-[#12161f] border-b-2 border-x ${style.crestBorder} rounded-b-md flex items-center justify-center shadow-md`}>
                  <div className={`w-2.5 h-1.5 ${style.gemBg} ${style.gemBorder} border rounded-sm transform rotate-45 shadow-[0_0_4px_rgba(255,255,255,0.6)]`} />
                </div>
              </div>

              {/* Owned Copies Badge (Top-Right) */}
              {copiesOwned > 0 && (
                <div className="absolute top-1.5 right-1.5 z-20 bg-black/80 border border-amber-400/80 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold text-amber-300 shadow-md">
                  {copiesOwned}/3 ★
                </div>
              )}

              {/* Artwork / Splash Canvas Area with Real Background Image */}
              <div className={`relative flex-1 bg-gradient-to-b ${style.accentGradient} flex flex-col justify-end p-2 overflow-hidden`}>
                {/* Champion Splash Background Image */}
                {champ.image && (
                  <Image
                    src={champ.image}
                    alt={champ.name}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 20vw, 200px"
                    className="object-cover object-top opacity-95 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                )}

                {/* Subtle Vignette & Gradient Overlays for High Contrast Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c1017] via-black/25 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent pointer-events-none" />

                {/* Visual Ambient Glow on hover */}
                <div
                  className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"
                  style={{ backgroundColor: champ.color || '#3b82f6' }}
                />

                {/* Traits Badges (Stacked on the Left over the Artwork) */}
                <div className="relative z-10 flex flex-col gap-1 items-start mb-0.5">
                  {champ.traits.map((t) => {
                    const trait = TRAITS_DATA[t];
                    return (
                      <div
                        key={t}
                        className="flex items-center gap-1.5 bg-[#0a0d14]/90 backdrop-blur-md px-1.5 py-0.5 rounded-sm text-[10px] text-slate-200 border border-white/20 shadow-md"
                      >
                        {/* Trait Icon Hexagon/Disc */}
                        <div
                          className="relative w-3.5 h-3.5 rounded-sm flex items-center justify-center overflow-hidden shrink-0 shadow-sm bg-black/60"
                          style={{ borderColor: trait?.color || '#94a3b8' }}
                        >
                          {trait?.image ? (
                            <Image
                              src={trait.image}
                              alt={trait.name || t}
                              width={14}
                              height={14}
                              unoptimized
                              className="object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div
                              className="w-full h-full rounded-full flex items-center justify-center text-[8px] font-black text-slate-950"
                              style={{ backgroundColor: trait?.color || '#94a3b8' }}
                            >
                              {trait?.name?.slice(0, 1) || t.slice(0, 1)}
                            </div>
                          )}
                        </div>
                        {/* Trait Name */}
                        <span className="font-semibold tracking-tight text-slate-100 text-[10px] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                          {trait?.name || t}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Solid Bar (Champion Name on Left, Coin + Cost on Right) */}
              <div className={`h-7 px-2 flex items-center justify-between ${style.bottomBg} border-t border-black/40 shrink-0 z-10`}>
                <span className="text-xs font-bold text-white tracking-wide truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {champ.name}
                </span>

                <div className="flex items-center gap-1 shrink-0 ml-1">
                  {/* Gold Coin */}
                  <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-[#ffd700] via-[#e5a93b] to-[#b37d14] border border-[#ffe066] shadow-[0_0_4px_rgba(234,179,8,0.7)] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full border border-[#855806]/80" />
                  </div>
                  {/* Cost Value */}
                  <span className="text-xs font-bold text-white font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {champ.cost}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </footer>
  );
};
