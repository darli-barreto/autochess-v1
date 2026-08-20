'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PlayerState } from '@/types/game';
import { CHAMPIONS_DATA } from '@/data/champions';
import { Swords, Users, AlertCircle, Minus } from 'lucide-react';

interface ScoreboardSidebarProps {
  allPlayers: PlayerState[];
  spectatedPlayer: PlayerState;
  onSpectatePlayer: (playerId: string) => void;
}

// Curated avatar list for tacticians matching TFT colorful Little Legends
const TACTICIAN_AVATARS = [
  '/tft-champs/Teemo.webp',
  '/tft-champs/Gnar.webp',
  '/tft-champs/Lillia.webp',
  '/tft-champs/KogMaw.webp',
  '/tft-champs/Veigar.webp',
  '/tft-champs/Rakan.webp',
  '/tft-champs/Ahri.webp',
  '/tft-champs/Sett.webp',
];

export const ScoreboardSidebar: React.FC<ScoreboardSidebarProps> = ({
  allPlayers,
  spectatedPlayer,
  onSpectatePlayer,
}) => {
  const [activeTab, setActiveTab] = useState<'scoreboard' | 'dps'>('scoreboard');

  // Sort players by health descending (active first, then eliminated)
  const sortedPlayers = [...allPlayers].sort((a, b) => {
    if (a.isEliminated && !b.isEliminated) return 1;
    if (!a.isEliminated && b.isEliminated) return -1;
    return b.health - a.health;
  });

  return (
    <aside className="pointer-events-auto relative flex flex-col items-end z-10 select-none py-2 pr-1.5 min-w-[210px] max-w-[240px]">
      {/* ================= TOP TABS (DPS / PLAYERS) ================= */}
      <div className="flex flex-col bg-[#0c1820] border-2 border-[#C4A15B] rounded-t-sm overflow-hidden shadow-lg mb-2 mr-2">
        {/* DPS Meter Tab */}
        <button
          onClick={() => setActiveTab('dps')}
          title="DPS Meter / Estadísticas de Daño"
          className={`p-1.5 flex items-center justify-center transition cursor-pointer border-b border-[#C4A15B]/40 ${
            activeTab === 'dps'
              ? 'bg-[#1a3848] text-[#00d2ff] shadow-[inset_0_0_8px_rgba(0,210,255,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Swords className="w-4 h-4" />
        </button>

        {/* Lobby Players Tab */}
        <button
          onClick={() => setActiveTab('scoreboard')}
          title="Tabla de Jugadores / Salud de Estrategas"
          className={`p-1.5 flex items-center justify-center transition cursor-pointer ${
            activeTab === 'scoreboard'
              ? 'bg-[#1a3848] text-[#f5d565] shadow-[inset_0_0_8px_rgba(245,213,101,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
        </button>
      </div>

      {/* ================= TAB 1: SCOREBOARD (TFT TACTICIAN HEALTH RAIL) ================= */}
      {activeTab === 'scoreboard' ? (
        <div className="relative flex flex-col gap-2.5 w-full items-end pr-1.5 py-1">
          {/* Vertical Golden Guide Rail behind avatars */}
          <div className="absolute right-[22px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-[#f5d565] via-[#a67c2e] to-[#453210] shadow-[0_0_6px_rgba(245,213,101,0.35)] pointer-events-none" />

          {sortedPlayers.map((player, idx) => {
            const isSpectated = spectatedPlayer.id === player.id;
            const avatarSrc = TACTICIAN_AVATARS[idx % TACTICIAN_AVATARS.length];
            const isHotStreak = player.streak >= 3;
            const isWinStreak = player.streak > 0;

            // Border ring color based on health / status
            let ringColor = 'border-[#4a5568]';
            let ringGlow = '';
            if (isSpectated) {
              ringColor = 'border-[#d946ef] ring-2 ring-[#ffd700]';
              ringGlow = 'shadow-[0_0_16px_rgba(217,70,239,0.7)]';
            } else if (isHotStreak) {
              ringColor = 'border-[#f59e0b] ring-2 ring-amber-500/80';
              ringGlow = 'shadow-[0_0_14px_rgba(245,158,11,0.8)]';
            } else if (player.health > 75) {
              ringColor = 'border-[#ffd700]';
            } else if (player.health > 50) {
              ringColor = 'border-[#38bdf8]';
            } else if (player.health > 25) {
              ringColor = 'border-[#fb923c]';
            } else {
              ringColor = 'border-[#f43f5e]';
            }

            return (
              <div
                key={player.id}
                onClick={() => onSpectatePlayer(player.id)}
                title={`Click para observar a ${player.name} (${player.health} HP)`}
                className={`group relative flex items-center justify-end gap-1.5 select-none cursor-pointer transition-all duration-150 ${
                  player.isEliminated ? 'opacity-30 grayscale' : 'hover:scale-[1.03]'
                }`}
              >
                {/* Left: Status Icon + Player Name */}
                <div className="flex flex-col items-end mr-1">
                  {/* Status Indicator Icon (Scout Alert or Combat Indicator) */}
                  <div className="flex items-center gap-1">
                    {idx % 2 === 0 ? (
                      <div className="w-3.5 h-3.5 rounded-full bg-[#121820] border border-slate-600/80 flex items-center justify-center text-[8px] text-slate-400 group-hover:border-amber-400 group-hover:text-amber-300">
                        <AlertCircle className="w-2.5 h-2.5" />
                      </div>
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full bg-[#1c1214] border border-rose-900/80 flex items-center justify-center text-[8px] text-rose-400">
                        <Minus className="w-2 h-2" />
                      </div>
                    )}
                  </div>

                  {/* Player Name */}
                  <span
                    className={`text-[11px] font-sans font-bold leading-tight max-w-[90px] truncate text-right ${
                      player.isHuman
                        ? 'text-[#f5d565]'
                        : isSpectated
                        ? 'text-white'
                        : 'text-[#d6d3d1] group-hover:text-white'
                    }`}
                  >
                    {player.name}
                  </span>

                  {/* Crossed swords indicator if actively fighting */}
                  {isWinStreak && (
                    <span className="text-[9px] text-sky-400 flex items-center gap-0.5 mt-0.5">
                      <Swords className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                {/* Center: HP Badge Box */}
                {isSpectated ? (
                  // Large Highlighted HP Frame for Spectated Player
                  <div className="relative z-10 flex items-center justify-center bg-gradient-to-r from-[#1b150c] to-[#0e1219] border-2 border-[#f5d565] px-2.5 py-0.5 rounded-l-md shadow-[0_0_12px_rgba(245,213,101,0.4)] min-w-[44px] h-[30px]">
                    <span className="text-[16px] font-black text-white tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                      {player.health}
                    </span>
                  </div>
                ) : (
                  // Standard HP Pill for Other Players
                  <div className="relative z-10 flex items-center justify-center bg-[#10141d]/95 border border-[#C4A15B]/70 px-1.5 py-0.5 rounded-l-[3px] shadow-md min-w-[32px] h-[24px]">
                    <span className="text-[12px] font-bold text-[#f5efe6] font-sans leading-none">
                      {player.health}
                    </span>
                  </div>
                )}

                {/* Right: Circular Tactician Avatar */}
                <div
                  className={`relative rounded-full shrink-0 flex items-center justify-center overflow-visible z-20 transition-all ${
                    isSpectated ? 'w-12 h-12' : 'w-9 h-9'
                  }`}
                >
                  {/* Fiery hot streak aura animation */}
                  {isHotStreak && (
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-500 via-orange-600 to-yellow-300 opacity-75 blur-[3px] animate-pulse -z-10 pointer-events-none" />
                  )}

                  {/* Tactician Portrait Image */}
                  <div
                    className={`relative w-full h-full rounded-full overflow-hidden border-2 ${ringColor} ${ringGlow} bg-[#0a0f16]`}
                  >
                    <Image
                      src={avatarSrc}
                      alt={player.name}
                      fill
                      unoptimized
                      className="object-cover object-top scale-110"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // ================= TAB 2: DPS METER =================
        <div className="flex flex-col gap-1.5 w-full bg-[#0c1219]/95 border border-[#C4A15B]/40 rounded-lg p-2.5 shadow-2xl backdrop-blur-md text-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1">
            <span className="text-[10px] font-bold text-[#f5d565] uppercase tracking-wider">
              DPS — {spectatedPlayer.name}
            </span>
            <span className="text-[9px] text-slate-400 font-mono">Total Damage</span>
          </div>

          {spectatedPlayer.board.length === 0 ? (
            <div className="text-slate-500 text-center py-4 text-xs">Sin unidades en el campo</div>
          ) : (
            spectatedPlayer.board.map((unit) => {
              const base = CHAMPIONS_DATA[unit.championId];
              return (
                <div
                  key={unit.instanceId}
                  className="flex flex-col gap-0.5 bg-[#141923] p-1.5 rounded border border-white/5"
                >
                  <div className="flex justify-between font-bold text-[11px]">
                    <span className="text-slate-200 truncate max-w-[120px]">
                      {base?.name} <span className="text-amber-400 font-mono">★{unit.starLevel}</span>
                    </span>
                    <span className="text-[#00d2ff] font-mono">{unit.totalDamageDealt}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#090d14] rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-[#00d2ff] transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (unit.totalDamageDealt / 2500) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </aside>
  );
};

