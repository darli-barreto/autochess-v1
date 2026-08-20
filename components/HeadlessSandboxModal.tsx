'use client';

import React, { useState } from 'react';
import { BoardUnit, TraitId } from '@/types/game';
import { CHAMPIONS_DATA } from '@/data/champions';
import { runHeadlessBatchSimulations, SimulationReport } from '@/engine/headlessSimulator';
import { Terminal, Play, CheckCircle, AlertTriangle, X, Shield, Sparkles } from 'lucide-react';

interface HeadlessSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAllies: BoardUnit[];
  currentEnemies: BoardUnit[];
}

export const HeadlessSandboxModal: React.FC<HeadlessSandboxModalProps> = ({
  isOpen,
  onClose,
  currentAllies,
  currentEnemies,
}) => {
  const [iterations, setIterations] = useState<number>(100);
  const [report, setReport] = useState<SimulationReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const handleRunSimulations = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results = runHeadlessBatchSimulations(
        currentAllies,
        currentEnemies,
        {} as any,
        {} as any,
        iterations
      );
      setReport(results);
      setIsRunning(false);
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="flex flex-col max-w-3xl w-full max-h-[90vh] rounded-2xl border border-purple-500/60 bg-slate-900 p-5 shadow-2xl text-slate-100 font-sans overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-black tracking-wide text-purple-300 uppercase">
              Simulador Headless Sandbox (Balance CLI)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="flex items-center justify-between gap-4 bg-slate-950/80 rounded-xl p-3 border border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400">Iteraciones por Lote:</span>
            <div className="flex gap-1.5">
              {[50, 100, 500, 1000].map((count) => (
                <button
                  key={count}
                  onClick={() => setIterations(count)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    iterations === count
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleRunSimulations}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg transition disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            <span>{isRunning ? 'Simulando...' : `Ejecutar ${iterations} Combates`}</span>
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {!report ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Sparkles className="h-10 w-10 text-purple-500/50 mb-2" />
              <p className="text-sm">
                Presiona &quot;Ejecutar Combates&quot; para simular {iterations} combates en milisegundos con el motor determinista de 30Hz.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-xl border border-sky-600/40 bg-sky-950/40 p-3 text-center">
                  <div className="text-xs text-sky-400 font-bold">Victoria Aliada</div>
                  <div className="text-2xl font-black text-sky-200">{report.allyWinrate}%</div>
                  <div className="text-[10px] text-slate-400">{report.allyWins} de {report.totalRuns}</div>
                </div>

                <div className="rounded-xl border border-rose-600/40 bg-rose-950/40 p-3 text-center">
                  <div className="text-xs text-rose-400 font-bold">Victoria Rival</div>
                  <div className="text-2xl font-black text-rose-200">{report.enemyWinrate}%</div>
                  <div className="text-[10px] text-slate-400">{report.enemyWins} de {report.totalRuns}</div>
                </div>

                <div className="rounded-xl border border-emerald-600/40 bg-emerald-950/40 p-3 text-center">
                  <div className="text-xs text-emerald-400 font-bold">Duración Promedio</div>
                  <div className="text-2xl font-black text-emerald-200">{report.avgDurationSec}s</div>
                  <div className="text-[10px] text-slate-400">Tiempo de ronda</div>
                </div>

                <div className="rounded-xl border border-purple-600/40 bg-purple-950/40 p-3 text-center">
                  <div className="text-xs text-purple-400 font-bold">Tiempo de Ejecución</div>
                  <div className="text-2xl font-black text-purple-200">{report.executionTimeMs}ms</div>
                  <div className="text-[10px] text-slate-400">Cálculo determinista</div>
                </div>
              </div>

              {/* Top DPS Metrics Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <h3 className="text-xs font-black uppercase text-slate-300 mb-2">
                  Desglose de Daño y Rendimiento por Campeón (DPS Promedio)
                </h3>
                <div className="space-y-1.5 text-xs">
                  {report.topDpsChampions.map((item, idx) => {
                    const champ = CHAMPIONS_DATA[item.championId];
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              item.team === 'ally' ? 'bg-sky-950 text-sky-400' : 'bg-rose-950 text-rose-400'
                            }`}
                          >
                            {item.team === 'ally' ? 'Aliado' : 'Rival'}
                          </span>
                          <span className="font-bold text-white">{champ?.name || item.championId}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-slate-400">Daño Promedio: <strong className="text-amber-300">{item.avgDamage}</strong></span>
                          <span className="text-slate-400">DPS: <strong className="text-purple-300">{item.avgDps}/s</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
