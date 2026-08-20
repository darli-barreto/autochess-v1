'use client';

import React, { useState } from 'react';
import { LITTLE_LEGENDS, LittleLegendData } from '@/data/littleLegends';

interface LittleLegendEmoteBarProps {
  currentLegendId?: string;
  onSelectLegend: (legendId: string) => void;
  onTriggerEmote: (emote: 'DANCE' | 'TAUNT' | 'CHEER' | 'LAUGH') => void;
}

export const LittleLegendEmoteBar: React.FC<LittleLegendEmoteBarProps> = ({
  currentLegendId = 'river_sprite',
  onSelectLegend,
  onTriggerEmote,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentLegend = LITTLE_LEGENDS.find((l) => l.id === currentLegendId) || LITTLE_LEGENDS[0];

  return (
    <>
      {/* Floating Tactician Action Bar */}
      <div className="flex items-center gap-1 bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 rounded-xl p-1.5 text-xs">
        {/* Tactician Avatar & Selector Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900/90 hover:to-blue-900/90 border border-cyan-400/40 transition-all text-cyan-200 font-bold group cursor-pointer"
          title="Personalizar Minileyenda / Estratega"
        >
          <span className="text-base group-hover:scale-125 transition-transform">
            {currentLegend.icon}
          </span>
          <span className="hidden sm:inline text-[11px] max-w-[90px] truncate">
            {currentLegend.name}
          </span>
          <span className="text-[9px] text-cyan-400/70 border border-cyan-400/30 rounded px-1">
            CAMBIAR
          </span>
        </button>

        <div className="w-[1px] h-6 bg-slate-800 mx-0.5" />

        {/* Emote Trigger Buttons */}
        <button
          onClick={() => onTriggerEmote('DANCE')}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-900/90 hover:bg-cyan-900/60 border border-slate-700/60 hover:border-cyan-400/60 text-slate-200 hover:text-cyan-300 transition-all cursor-pointer"
          title="Bailar con tu Minileyenda (Tecla 1)"
        >
          <span>🎵</span>
          <span className="hidden md:inline font-medium text-[11px]">Bailar</span>
        </button>

        <button
          onClick={() => onTriggerEmote('TAUNT')}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-900/90 hover:bg-rose-900/60 border border-slate-700/60 hover:border-rose-400/60 text-slate-200 hover:text-rose-300 transition-all cursor-pointer"
          title="Burlarse (Tecla 2)"
        >
          <span>💥</span>
          <span className="hidden md:inline font-medium text-[11px]">Burlarse</span>
        </button>

        <button
          onClick={() => onTriggerEmote('CHEER')}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-900/90 hover:bg-amber-900/60 border border-slate-700/60 hover:border-amber-400/60 text-slate-200 hover:text-amber-300 transition-all cursor-pointer"
          title="Festejar (Tecla 3)"
        >
          <span>❤️</span>
          <span className="hidden md:inline font-medium text-[11px]">Festejar</span>
        </button>

        <button
          onClick={() => onTriggerEmote('LAUGH')}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-900/90 hover:bg-emerald-900/60 border border-slate-700/60 hover:border-emerald-400/60 text-slate-200 hover:text-emerald-300 transition-all cursor-pointer"
          title="Reír (Tecla 4)"
        >
          <span>😆</span>
          <span className="hidden md:inline font-medium text-[11px]">Reír</span>
        </button>
      </div>

      {/* Little Legend Customizer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900/95 border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl shadow-cyan-950/60">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 rounded-xl bg-cyan-950/80 border border-cyan-400/40">
                  👑
                </span>
                <div>
                  <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-amber-200 to-yellow-400 uppercase tracking-wider">
                    Santuario de Minileyendas
                  </h2>
                  <p className="text-xs text-slate-400">
                    Selecciona a tu estratega para recorrer el tablero y reaccionar a tus victorias
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Grid of Little Legends */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 my-5 max-h-[60vh] overflow-y-auto pr-1">
              {LITTLE_LEGENDS.map((legend) => {
                const isSelected = legend.id === currentLegendId;
                const rarityColors: Record<string, string> = {
                  common: 'border-slate-600 text-slate-300',
                  rare: 'border-blue-500/60 text-blue-300',
                  epic: 'border-purple-500/60 text-purple-300',
                  legendary: 'border-amber-500/60 text-amber-300',
                  mythic: 'border-rose-500/60 text-rose-300',
                };

                return (
                  <button
                    key={legend.id}
                    onClick={() => {
                      onSelectLegend(legend.id);
                      setIsModalOpen(false);
                    }}
                    className={`relative p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-b from-cyan-950/90 to-blue-900/80 border-cyan-400 shadow-lg shadow-cyan-500/30 scale-[1.02]'
                        : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 hover:border-cyan-500/40'
                    }`}
                  >
                    {/* Top row: Icon & Rarity */}
                    <div className="flex items-start justify-between">
                      <span className="text-3xl filter drop-shadow-md">{legend.icon}</span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          rarityColors[legend.rarity] || 'border-slate-600'
                        }`}
                      >
                        {legend.rarity}
                      </span>
                    </div>

                    {/* Name & Title */}
                    <div className="mt-3">
                      <h4 className="font-bold text-sm text-slate-100">{legend.name}</h4>
                      <p className="text-[11px] text-cyan-400/90">{legend.title}</p>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {legend.description}
                      </p>
                    </div>

                    {/* Selection status */}
                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      {isSelected ? (
                        <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                          ✓ EQUIPADO
                        </span>
                      ) : (
                        <span className="text-slate-400 group-hover:text-cyan-300">
                          Click para equipar
                        </span>
                      )}
                      {legend.modelId && (
                        <span className="text-[9px] bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                          3D Model
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="text-cyan-400 font-bold">Consejo:</span> Haz click derecho en
                cualquier parte del tablero para hacer caminar a tu Minileyenda.
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase text-xs transition-colors cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
