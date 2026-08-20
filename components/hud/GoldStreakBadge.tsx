"use client";

import React from "react";
import { PlayerState } from "@/types/game";
import { Flame, Lock, Unlock } from "lucide-react";

interface GoldStreakBadgeProps {
  player: PlayerState;
  onToggleLockShop?: () => void;
}

export const GoldStreakBadge: React.FC<GoldStreakBadgeProps> = ({
  player,
  onToggleLockShop,
}) => {
  const streakCount = Math.abs(player.streak) || 0;
  const isWinStreak = player.streak > 0;
  const isLossStreak = player.streak < 0;

  return (
    <>
      {/* ================= GOLD & STREAK TRAPEZOID HEADER (TOP CENTER) ================= */}
      <div className="absolute -top-[37px] left-[50%] -translate-x-1/2 z-30 flex items-center pointer-events-auto select-none">
        <div className="relative flex items-center gap-4  ">
          {/* Subtle top gold sheen */}
          <div className="absolute top-0 inset-x-4 h-[1px] pointer-events-none" />

          {/* Left: Gold Icon + Number */}
          <div
            className="flex w-39 h-10 items-center justify-center gap-2.5 bg-[url('/goldbg.png')] bg-cover bg-center bg-no-repeat"
            title={`Oro actual: ${player.gold}`}
          >
            {/* Gold Pouch / Coin Icon */}
            <img src="./gold.webp" alt="coin" className="w-4 h-4" />
            {/* Gold Amount */}
            <span className="text-base font-bold text-[#f5efe6] tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              {player.gold}
            </span>
          </div>

          {/* Divider */}

          {/* Right: Streak Pill Badge (Flame Icon + Number) */}
          <div
            className={`flex w-14 h-6 items-center justify-center bg-cover bg-[url('/racha.png')]  ${
              isWinStreak
                ? " border-sky-500/80 shadow-[0_0_8px_rgba(56,189,248,0.35)]"
                : isLossStreak
                  ? " border-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.35)]"
                  : " border-slate-700/80"
            }`}
            title={
              isWinStreak
                ? `Racha de ${streakCount} victorias (+${streakCount >= 5 ? 3 : streakCount >= 4 ? 2 : 1}g extra)`
                : isLossStreak
                  ? `Racha de ${streakCount} derrotas (+${streakCount >= 5 ? 3 : streakCount >= 4 ? 2 : 1}g extra)`
                  : "Sin racha activa (+0g extra)"
            }
          >
            <Flame
              className={` h-3.5 ${
                isWinStreak
                  ? "text-[#00d2ff] fill-[#00d2ff]/40 drop-shadow-[0_0_4px_rgba(0,210,255,0.9)] animate-pulse"
                  : isLossStreak
                    ? "text-[#ff4655] fill-[#ff4655]/40 drop-shadow-[0_0_4px_rgba(255,70,85,0.9)] animate-pulse"
                    : "text-slate-500 fill-slate-500/20"
              }`}
            />
            <span className="text-[14px] mx-[13px] font-bold font-sans">
              {streakCount}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
