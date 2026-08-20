'use client';

import React from 'react';
import { AugmentData } from '@/types/game';
import { Sparkles } from 'lucide-react';

interface AugmentModalProps {
  augmentOptions: AugmentData[];
  onSelectAugment: (augment: AugmentData) => void;
}

export const AugmentModal: React.FC<AugmentModalProps> = ({
  augmentOptions,
  onSelectAugment,
}) => {
  if (!augmentOptions || augmentOptions.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="flex flex-col items-center max-w-3xl w-full rounded-2xl border border-amber-500/50 bg-[#0b0c14] p-6 shadow-2xl text-center">
        <h2 className="text-2xl font-black uppercase tracking-wider text-amber-400 mb-1">
          Select an Augment
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Empower your team with a permanent tactical bonus throughout the match.
        </p>

        <div className="grid grid-cols-3 gap-4 w-full">
          {augmentOptions.map((aug) => (
            <div
              key={aug.id}
              onClick={() => onSelectAugment(aug)}
              className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition cursor-pointer hover:scale-105 hover:shadow-2xl ${
                aug.tier === 'prismatic'
                  ? 'border-amber-400 bg-amber-950/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : aug.tier === 'gold'
                  ? 'border-yellow-500/80 bg-slate-800/90'
                  : 'border-slate-700 bg-slate-900/90'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    Tier {aug.tier}
                  </span>
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="font-bold text-sm text-white mb-2">{aug.name}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{aug.description}</p>
              </div>

              <button className="mt-4 w-full rounded bg-amber-500 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-950 transition group-hover:bg-amber-400">
                Choose Augment
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
