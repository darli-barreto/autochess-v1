import { BoardUnit, TraitId } from '@/types/game';
import { CombatEngine } from './combatEngine';

export interface SimulationReport {
  totalRuns: number;
  allyWins: number;
  enemyWins: number;
  draws: number;
  allyWinrate: number;
  enemyWinrate: number;
  avgDurationSec: number;
  stalledCombats: number;
  executionTimeMs: number;
  topDpsChampions: {
    championId: string;
    team: 'ally' | 'enemy';
    avgDamage: number;
    avgDps: number;
  }[];
}

export function runHeadlessBatchSimulations(
  teamA: BoardUnit[],
  teamB: BoardUnit[],
  traitsA: Record<TraitId, number> = {} as any,
  traitsB: Record<TraitId, number> = {} as any,
  iterations = 100
): SimulationReport {
  const startTime = performance.now();
  let allyWins = 0;
  let enemyWins = 0;
  let draws = 0;
  let totalDuration = 0;
  let stalledCount = 0;

  const damageAccumulator: Record<string, { totalDmg: number; team: 'ally' | 'enemy'; count: number }> = {};

  const dt = 0.033; // 30Hz

  for (let i = 0; i < iterations; i++) {
    const engine = new CombatEngine(teamA, teamB, traitsA, traitsB);
    let simTime = 0;

    while (!engine.isOver && simTime < 40) {
      engine.step(dt);
      simTime += dt;
    }

    if (simTime >= 40) {
      stalledCount++;
    }

    totalDuration += simTime;

    if (engine.winner === 'ally') {
      allyWins++;
    } else if (engine.winner === 'enemy') {
      enemyWins++;
    } else {
      draws++;
    }

    // Accumulate DPS
    const allUnits = [...engine.allies, ...engine.enemies];
    for (const unit of allUnits) {
      const key = `${unit.team}_${unit.championId}`;
      if (!damageAccumulator[key]) {
        damageAccumulator[key] = { totalDmg: 0, team: unit.team, count: 0 };
      }
      damageAccumulator[key].totalDmg += unit.totalDamageDealt;
      damageAccumulator[key].count++;
    }
  }

  const endTime = performance.now();
  const avgDuration = totalDuration / iterations;

  const topDpsChampions = Object.entries(damageAccumulator).map(([key, data]) => {
    const championId = key.split('_')[1];
    const avgDamage = Math.round(data.totalDmg / iterations);
    const avgDps = Math.round(avgDamage / Math.max(1, avgDuration));
    return {
      championId,
      team: data.team,
      avgDamage,
      avgDps,
    };
  }).sort((a, b) => b.avgDamage - a.avgDamage);

  return {
    totalRuns: iterations,
    allyWins,
    enemyWins,
    draws,
    allyWinrate: Math.round((allyWins / iterations) * 100),
    enemyWinrate: Math.round((enemyWins / iterations) * 100),
    avgDurationSec: Math.round(avgDuration * 10) / 10,
    stalledCombats: stalledCount,
    executionTimeMs: Math.round(endTime - startTime),
    topDpsChampions,
  };
}
