'use client';

import React, { useState } from 'react';
import { PlayerState } from '@/types/game';
import { CHAMPIONS_DATA } from '@/data/champions';
import {
  Sparkles,
  Eye,
  Terminal,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface HUDHeaderProps {
  player: PlayerState;
  spectatedPlayer: PlayerState;
  gameSpeed: number;
  onSetGameSpeed: (speed: number) => void;
  onSpectatePlayer: (playerId: string) => void;
  onOpenSandbox: () => void;
  onToggleDebug: () => void;
  showDebug: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onAddGold?: (amount: number) => void;
  onAddXp?: (amount: number) => void;
  onClearBoard?: () => void;
  onSpawnChampion?: (champId: string) => void;
}

export const HUDHeader: React.FC<HUDHeaderProps> = ({
  player,
  spectatedPlayer,
  gameSpeed,
  onSetGameSpeed,
  onSpectatePlayer,
  onOpenSandbox,
  onToggleDebug,
  showDebug,
  isMuted,
  onToggleMute,
  onAddGold,
  onAddXp,
  onClearBoard,
  onSpawnChampion,
}) => {
  const [selectedSpawnChamp, setSelectedSpawnChamp] = useState<string>('ahri');

  return (
    <header className="pointer-events-auto h-12 bg-black/60 border-b border-white/10 flex items-center justify-between px-6 z-20 backdrop-blur-md shadow-md">
      {/* Left: Mode Badge & Description */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-cyan-500/20 border border-amber-400/40 px-3 py-1 rounded-lg">
          <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
          <span className="text-xs uppercase font-extrabold tracking-wider text-amber-300">
            Modo Tablero & Desplazamiento
          </span>
        </div>

        <span className="text-[11px] text-slate-400 hidden xl:inline">
          Arrastra piezas libremente entre el tablero y la banca de 9 espacios.
        </span>
      </div>

      {/* Center: Sandbox Quick Tools (Add Gold, Add XP, Clear Board, Spawn Champion) */}
      <div className="flex items-center gap-2">
        {onAddGold && (
          <button
            onClick={() => onAddGold(10)}
            title="Añadir +10 de Oro"
            className="flex items-center gap-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-400 text-amber-300 px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer"
          >
            <span>+10G Oro</span>
          </button>
        )}

        {onAddXp && (
          <button
            onClick={() => onAddXp(4)}
            title="Añadir +4 XP (Subir Nivel y Capacidad de Fichas)"
            className="flex items-center gap-1 bg-blue-950/80 hover:bg-blue-900 border border-blue-400 text-blue-300 px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer"
          >
            <span>+4 XP (Lvl {player.level})</span>
          </button>
        )}

        {onClearBoard && (
          <button
            onClick={onClearBoard}
            title="Regresar todas las fichas del tablero a la banca"
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer"
          >
            <span>Limpiar Tablero</span>
          </button>
        )}

        {/* Quick Champion Spawner */}
        {onSpawnChampion && (
          <div className="flex items-center gap-1 bg-slate-900/90 border border-purple-500/40 rounded px-1.5 py-0.5">
            <span className="text-[10px] text-purple-300 font-bold">Añadir:</span>
            <select
              value={selectedSpawnChamp}
              onChange={(e) => setSelectedSpawnChamp(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs font-bold rounded px-1.5 py-0.5 border border-white/10 outline-none cursor-pointer"
            >
              {Object.values(CHAMPIONS_DATA).map((champ) => (
                <option key={champ.id} value={champ.id}>
                  {champ.name} ({champ.cost}G)
                </option>
              ))}
            </select>
            <button
              onClick={() => onSpawnChampion(selectedSpawnChamp)}
              title="Añadir copia a la banca para probar fusiones a 2★ y 3★"
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-2 py-0.5 rounded transition cursor-pointer"
            >
              + Ficha
            </button>
          </div>
        )}
      </div>

      {/* Center: Spectator Notification or Realm Info */}
      {!spectatedPlayer.isHuman ? (
        <div className="flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-xs text-amber-300">
          <Eye className="h-3.5 w-3.5" />
          <span>Espectando a: <strong>{spectatedPlayer.name}</strong></span>
          <button
            onClick={() => onSpectatePlayer(player.id)}
            className="ml-2 underline font-bold hover:text-white"
          >
            Volver a mi tablero
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/80 px-4 py-1 rounded border border-white/5 flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-blue-400 rounded-sm shadow-[0_0_8px_rgba(96,165,250,0.6)]"></div>
          <span className="text-xs font-bold text-slate-200">World of Warcraft · Arena</span>
        </div>
      )}

      {/* Right: Controls (Speed, CLI, Debug F3, Mute) */}
      <div className="flex items-center gap-2">
        {/* Speed Selector */}
        <div className="flex items-center bg-slate-800/80 rounded border border-white/10 p-0.5">
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => onSetGameSpeed(s)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                gameSpeed === s ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Sandbox CLI */}
        <button
          onClick={onOpenSandbox}
          title="Abrir Simulador Headless CLI (1000 combates)"
          className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 px-3 py-1 rounded border border-white/10 text-xs font-bold text-purple-300 transition"
        >
          <Terminal className="h-3.5 w-3.5 text-purple-400" />
          <span>Sandbox</span>
        </button>

        {/* Debug F3 */}
        <button
          onClick={onToggleDebug}
          title="Alternar Inspector de Rendimiento (F3)"
          className={`flex items-center gap-1 px-3 py-1 rounded border text-xs font-bold transition ${
            showDebug
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
              : 'bg-slate-800/80 border-white/10 text-slate-400 hover:text-white'
          }`}
        >
          <span>F3</span>
        </button>

        {/* Mute Button */}
        <button
          onClick={onToggleMute}
          className="bg-slate-800/80 hover:bg-slate-700 p-1.5 rounded border border-white/10 text-slate-300 hover:text-white transition"
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
        </button>
      </div>
    </header>
  );
};
