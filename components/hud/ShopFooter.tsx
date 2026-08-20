"use client";

import React, { useState } from "react";
import Image from "next/image";
import { PlayerState, BoardUnit } from "@/types/game";
import { CHAMPIONS_DATA } from "@/data/champions";
import { TRAITS_DATA } from "@/data/traits";
import { GoldStreakBadge } from "./GoldStreakBadge";
import { Lock, Unlock, Trash2 } from "lucide-react";
import { SHOP_PROBABILITIES } from "@/engine/gameManager";
import { IoMdRefresh } from "react-icons/io";
import { FaUnlockKeyhole } from "react-icons/fa6";


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

const COST_STYLES: Record<
  number,
  {
    outerBorder: string;
    bottomBg: string;
    gemBg: string;
    gemBorder: string;
    crestBorder: string;
    accentGradient: string;
  }
> = {
  1: {
    outerBorder: "border-[#6C6F7B]",
    bottomBg: "bg-[#434559]",
    gemBg: "bg-slate-300",
    gemBorder: "border-slate-200",
    crestBorder: "border-[#6b7c8d]",
    accentGradient: "from-slate-700/50 via-slate-800/80 to-[#12161f]",
  },
  2: {
    outerBorder: "border-[#15803d]",
    bottomBg: "bg-[#14532d]",
    gemBg: "bg-emerald-400",
    gemBorder: "border-emerald-200",
    crestBorder: "border-[#16a34a]",
    accentGradient: "from-emerald-900/50 via-slate-900/80 to-[#0c1f17]",
  },
  3: {
    outerBorder: "border-[#2563eb]",
    bottomBg: "bg-[#1e40af]",
    gemBg: "bg-blue-400",
    gemBorder: "border-blue-200",
    crestBorder: "border-[#3b82f6]",
    accentGradient: "from-blue-900/50 via-slate-900/80 to-[#0e172a]",
  },
  4: {
    outerBorder: "border-[#a21caf]",
    bottomBg: "bg-[#701a75]",
    gemBg: "bg-fuchsia-400",
    gemBorder: "border-fuchsia-200",
    crestBorder: "border-[#c026d3]",
    accentGradient: "from-fuchsia-950/60 via-purple-950/80 to-[#180b20]",
  },
  5: {
    outerBorder: "border-[#f59e0b]",
    bottomBg: "bg-[#d97706]",
    gemBg: "bg-amber-400",
    gemBorder: "border-amber-200",
    crestBorder: "border-[#f59e0b]",
    accentGradient: "from-amber-950/60 via-yellow-950/80 to-[#1f1307]",
  },
};

const PROBABILITY_COLORS = [
  "text-slate-500",
  "text-emerald-600",
  "text-sky-600",
  "text-fuchsia-600",
  "text-amber-500",
];

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
    const boardMatches = spectatedPlayer.board.filter(
      (u) => u.championId === champId && u.starLevel === starLevel,
    ).length;
    const benchMatches = spectatedPlayer.bench.filter(
      (u) => u && u.championId === champId && u.starLevel === starLevel,
    ).length;
    return boardMatches + benchMatches;
  };

  const occupiedBenchCount = spectatedPlayer.bench.filter(
    (u) => u !== null,
  ).length;
  const isBenchFull = occupiedBenchCount >= 9;
  const level = Math.min(9, Math.max(1, player.level));
  const shopProbabilities = SHOP_PROBABILITIES[level] || SHOP_PROBABILITIES[1];
  const xpProgress =
    player.level >= 9
      ? 100
      : Math.min(
          100,
          Math.round((player.currentXp / Math.max(1, player.requiredXp)) * 100),
        );

  return (
    <>
      {/* ================= LEVEL, XP & SHOP ODDS ================= */}
      <div className="flex justify-between w-[70%] mx-auto h-9  ">
        <div className="flex h-full space-x-3 bg-[url('/p1.png')] w-120  ">
          <div className="flex-col w-[37%] mx-1">
            <div className="flex items-center mx-2 mt-1 justify-between">
              <span className="text-lg font-serif font-semibold text-[#f0e6d2] tracking-wide">
                Lvl. {player.level}
              </span>
              <span className="min-w-10.5 text-right text-xs font-mono">
                {player.level >= 9
                  ? "MAX"
                  : `${player.currentXp}/${player.requiredXp}`}
              </span>
            </div>

            <div className="relative z-50 mx-2 h-2 w-full overflow-hidden border border-[#1d3d50] bg-[#07121b]">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-sky-200 transition-[width] duration-300"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
          <div className="flex w-[63%] items-center justify-between ">
          <div className="flex px-2  gap-8 h-7 self-end rounded-r-full">
            {shopProbabilities.map((probability, index) => (
              <div
                key={index}
                className={`flex items-center gap-5 w-[20px] text-[12px] ${PROBABILITY_COLORS[index]}`}
              >
                <span className="h-1.5 w-1.5" />
                <span>{Math.round(probability * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
        </div>
        
        <div className="flex w-18 items-center justify-center bg-[url('/lock.png')]">
          <FaUnlockKeyhole className="text-[#715b31ff] w-3 h-3" />
        </div>
      </div>
      <footer
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setIsDragOverShop(true);
        }}
        onDragLeave={() => setIsDragOverShop(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOverShop(false);
          const unitId = e.dataTransfer.getData("text/plain");
          if (unitId && onSellUnitById) {
            onSellUnitById(unitId);
          }
        }}
        className="pointer-events-auto relative h-34 w-[70%] mx-auto bg-[#162021ff] border-x-3 border-[#715b31ff] flex flex-col px-1 gap-1 z-20"
      >
        <div className="absolute top-0 left-1/2 z-30 h-[3px] w-[85.7%] -translate-x-[41.5%] bg-[#715b31ff]" />

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
        <div className="flex min-h-0 flex-1 items-stretch gap-3">
          <div className="flex items-center shrink-0 my-1 border p-1 border-[#0F2222]">
            {/* The Two Stacked Action Buttons */}
            <div className="flex flex-col gap-2 w-46">
              {/* ================= BUY XP BUTTON (BOTTOM) ================= */}
              <button
                onClick={onBuyXp}
                disabled={player.gold < 4 || player.level >= 9}
                title="Comprar XP (Tecla F)"
                className={`group relative h-[56px] w-full font-serif border-[1.5px] border-[#1e6f92] bg-gradient-to-r from-[#0e1f29] via-[#09151d] to-[#050d13] px-3 flex items-center justify-between transition-all duration-150 cursor-pointer overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.8)] ${
                  player.gold < 4 || player.level >= 9
                    ? "opacity-40 grayscale cursor-not-allowed border-[#164357]"
                    : "hover:border-[#38bdf8] hover:brightness-110 active:scale-[0.98]"
                }`}
              >
                {/* Subtle diagonal ambient light overlay */}
                <div className="absolute inset-0 bg-[#17242C] pointer-events-none" />

                {/* Left text info */}
                <div className="flex flex-col items-start text-left z-10 select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold tracking-wide ]">
                      Buy XP
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    {/* Gold Coin */}
                    <img src="./gold.webp" alt="coin" className="w-3 h-3" />
                    <span className="text-[13px] font-black leading-none ">
                      {player.level >= 9 ? "Max" : "4"}
                    </span>
                  </div>
                </div>

                {/* Right cyan double chevron icon */}
                <div className="relative z-10 flex items-center justify-center pr-3 transition-transform duration-150 group-hover:-translate-y-0.5">
                  <img src="./buy.svg" alt="coin" className="w-8 h-8" />
                </div>
              </button>

              {/* ================= REFRESH BUTTON (TOP) ================= */}
              <button
                onClick={onRollShop}
                disabled={player.gold < 2}
                title="Rolear tienda (Tecla D)"
                className={`group relative h-[56px] w-full rounded-[2px] border-[1.5px] font-serif border-[#785a28] bg-[#1E1F18] px-3 flex items-center justify-between transition-all duration-150 cursor-pointer overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.8)] ${
                  player.gold < 2
                    ? "opacity-40 grayscale cursor-not-allowed border-[#45371c]"
                    : "hover:border-[#c89b3c] hover:brightness-110 active:scale-[0.98]"
                }`}
              >
                {/* Subtle diagonal ambient light overlay */}
                <div className="absolute inset-0  via-transparent pointer-events-none" />

                {/* Left text info */}
                <div className="flex flex-col items-start text-left z-10 select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold tracking-wide">
                      Refresh
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    {/* Gold Coin */}
                    <img src="./gold.webp" alt="coin" className="w-3 h-3" />
                    <span className="text-[13px] font-black leading-none">
                      2
                    </span>
                  </div>
                </div>

                {/* Right golden circular arrow icon */}
                <div className="relative z-10 flex items-center justify-center pr-1 transition-transform duration-200 group-hover:rotate-45">
                  <IoMdRefresh className="w-11 h-11 text-amber-100" />
                </div>
              </button>
            </div>
          </div>

          {/* Center: 5 Champion Shop Cards (TFT Exact Layout) */}
          <div className="flex-1 grid grid-cols-5 gap-2 py-2 min-w-0">
            {player.shop.map((champId, idx) => {
              if (!champId) {
                return (
                  <div
                    key={idx}
                    className="bg-[#040807] border border-white/10 flex items-center justify-center text-xs text-slate-500 select-none"
                  >
                    <div className="border border-[#0D1E1B] bg-[#080F0D] w-[87%] h-[75%]"></div>
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
                  onClick={() =>
                    canAfford && canFitInBench && onBuyChampion(idx)
                  }
                  className={`group relative flex flex-col h-full border ${style.outerBorder} overflow-hidden select-none transition-all duration-150 cursor-pointer ${
                    canAfford && canFitInBench
                      ? "hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(0,0,0,0.8)]"
                      : "opacity-40 cursor-not-allowed"
                  }`}
                >
                 
                  {/* Artwork / Splash Canvas Area with Real Background Image */}
                  <div
                    className={`relative flex-1 bg-gradient-to-b ${style.accentGradient} flex flex-col justify-end p-1 overflow-hidden`}
                  >
                    {/* Champion Splash Background Image */}
                    {champ.image && (
                      <Image
                        src={champ.image}
                        alt={champ.name}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 20vw, 200px"
                        className="object-cover object-top opacity-95 group-hover:scale-105  group-hover:opacity-100 transition-all duration-300 pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                    )}

                    {/* Subtle Vignette & Gradient Overlays for High Contrast Readability */}
                    

                    {/* Visual Ambient Glow on hover */}
                    <div
                      className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"
                      style={{ backgroundColor: champ.color || "#3b82f6" }}
                    />

                    {/* Traits Badges (Stacked on the Left over the Artwork) */}
                    <div className="relative z-10 flex flex-col gap-1 items-start mb-0.5">
                      {champ.traits.map((t) => {
                        const trait = TRAITS_DATA[t];
                        return (
                          <div
                            key={t}
                            className="flex items-center gap-1.5  rounded-sm text-[10px]"
                          >
                            {/* Trait Icon Hexagon/Disc */}
                            <div
                              className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden bg-[#3E3E3E] shadow-sm [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0_50%)]"
                              style={{ borderColor: trait?.color || "#94a3b8" }}
                            >
                              {trait?.image ? (
                                <Image
                                  src={trait.image}
                                  alt={trait.name || t}
                                  width={12}
                                  height={12}
                                  unoptimized
                                  className="object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div
                                  className="w-full h-full rounded-full flex items-center justify-center text-[8px] font-black text-slate-950"
                                  style={{
                                    backgroundColor: trait?.color || "#94a3b8",
                                  }}
                                >
                                  {trait?.name?.slice(0, 1) || t.slice(0, 1)}
                                </div>
                              )}
                            </div>
                            {/* Trait Name */}
                            <span className=" text-xs">
                              {trait?.name || t}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Solid Bar (Champion Name on Left, Coin + Cost on Right) */}
                  <div
                    className={`h-7 px-2 flex items-center justify-between ${style.bottomBg} border-t border-black/40 shrink-0 z-10`}
                  >
                    <span className="text-xs font-bold text-white">
                      {champ.name}
                    </span>

                    <div className="flex items-center gap-2 shrink-0 ml-1">
                      {/* Gold Coin */}
                      <img src="./gold.webp" alt="coin" className="w-3 h-3" />
                      {/* Cost Value */}
                      <span className="text-xs font-bold font-serif text-white">
                        {champ.cost}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </footer>
    </>
  );
};
