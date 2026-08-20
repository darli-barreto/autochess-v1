'use client';

import React from 'react';
import { PlayerState } from '@/types/game';
import { Flame, Lock, Unlock } from 'lucide-react';

interface GoldStreakBadgeProps {
  player: PlayerState;
  onToggleLockShop?: () => void;
}

export const GoldStreakBadge: React.FC<GoldStreakBadgeProps> = ({ player, onToggleLockShop }) => {
  const streakCount = Math.abs(player.streak) || 0;
  const isWinStreak = player.streak > 0;
  const isLossStreak = player.streak < 0;

  return (
    <>
      {/* ================= GOLD & STREAK TRAPEZOID HEADER (TOP CENTER) ================= */}
      <div className="absolute -top-[38px] left-1/2 -translate-x-1/2 z-30 flex items-center pointer-events-auto select-none">
        <div className="relative flex items-center gap-4 bg-gradient-to-b from-[#111620] via-[#0a0f16] to-[#060a0e] px-7 py-1 shadow-[0_-4px_16px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.15)] border-t-2 border-x-2 border-[#C4A15B] rounded-t-md">
          {/* Subtle top gold sheen */}
          <div className="absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-[#ffe89c] to-transparent pointer-events-none" />

          {/* Left: Gold Icon + Number */}
          <div className="flex items-center gap-2" title={`Oro actual: ${player.gold}`}>
            {/* Gold Pouch / Coin Icon */}
            <div className="relative w-4 h-4 rounded-full bg-gradient-to-b from-[#ffe57f] via-[#e5a83b] to-[#8c5a14] border border-[#fff2a8] shadow-[0_0_6px_rgba(245,158,11,0.6)] flex items-center justify-center shrink-0">
              <div className="w-1.5 h-1.5 rounded-full border border-amber-950/80" />
            </div>
            {/* Gold Amount */}
            <span className="text-[17px] font-black text-[#f5efe6] tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              {player.gold}
            </span>

            {/* Interest Indicator Dots */}
            <div
              className="flex items-center gap-0.5 ml-1"
              title={`Interés acumulado: +${Math.min(5, Math.floor(player.gold / 10))} de oro al final de la ronda`}
            >
              {[1, 2, 3, 4, 5].map((tier) => (
                <span
                  key={tier}
                  className={`w-1 h-1 rounded-full transition-all ${
                    player.gold >= tier * 10
                      ? 'bg-amber-300 shadow-[0_0_3px_rgba(245,158,11,0.9)]'
                      : 'bg-slate-700/40'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="w-[1px] h-4 bg-gradient-to-b from-transparent via-[#C4A15B]/40 to-transparent" />

          {/* Right: Streak Pill Badge (Flame Icon + Number) */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border transition-all ${
              isWinStreak
                ? 'bg-[#061828] border-sky-500/80 shadow-[0_0_8px_rgba(56,189,248,0.35)]'
                : isLossStreak
                ? 'bg-[#220a10] border-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.35)]'
                : 'bg-[#0a0d14] border-slate-700/80'
            }`}
            title={
              isWinStreak
                ? `Racha de ${streakCount} victorias (+${streakCount >= 5 ? 3 : streakCount >= 4 ? 2 : 1}g extra)`
                : isLossStreak
                ? `Racha de ${streakCount} derrotas (+${streakCount >= 5 ? 3 : streakCount >= 4 ? 2 : 1}g extra)`
                : 'Sin racha activa (+0g extra)'
            }
          >
            <Flame
              className={`w-3.5 h-3.5 ${
                isWinStreak
                  ? 'text-[#00d2ff] fill-[#00d2ff]/40 drop-shadow-[0_0_4px_rgba(0,210,255,0.9)] animate-pulse'
                  : isLossStreak
                  ? 'text-[#ff4655] fill-[#ff4655]/40 drop-shadow-[0_0_4px_rgba(255,70,85,0.9)] animate-pulse'
                  : 'text-slate-500 fill-slate-500/20'
              }`}
            />
            <span className="text-xs font-bold text-[#f5efe6] tracking-wide font-sans">
              {streakCount}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
