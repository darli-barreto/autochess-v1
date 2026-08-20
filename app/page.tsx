'use client';

import React, { useEffect, useRef, useState, useCallback, useSyncExternalStore } from 'react';
import { GameManager } from '@/engine/gameManager';
import { BoardUnit, PlayerState, RoundPhase, AugmentData } from '@/types/game';
import { CombatEngine } from '@/engine/combatEngine';
import { rowColToAxial } from '@/engine/hexMath';
import { ThreeArena } from '@/components/ThreeArena';
import { GameHUD } from '@/components/GameHUD';
import { HeadlessSandboxModal } from '@/components/HeadlessSandboxModal';
import { DebugOverlay } from '@/components/DebugOverlay';

interface GameStateSnapshot {
  gm: GameManager;
  humanPlayer: PlayerState;
  spectatedPlayer: PlayerState;
  allPlayers: PlayerState[];
  roundPhase: RoundPhase;
  phaseTimer: number;
  stage: number;
  round: number;
  augmentOptions: AugmentData[];
  activeCombatEngine: CombatEngine | null;
}

const emptySubscribe = () => () => {};

export default function AutoBattlerPage() {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Initialize game manager instance in React state
  const [gameState, setGameState] = useState<GameStateSnapshot>(() => {
    const instance = new GameManager();
    return {
      gm: instance,
      humanPlayer: { ...instance.getHumanPlayer() },
      spectatedPlayer: { ...instance.getSpectatedPlayer() },
      allPlayers: [...instance.players],
      roundPhase: instance.roundPhase,
      phaseTimer: instance.phaseTimer,
      stage: instance.currentStage,
      round: instance.currentRound,
      augmentOptions: instance.augmentOptions,
      activeCombatEngine: null,
    };
  });

  const gmRef = useRef<GameManager>(gameState.gm);
  useEffect(() => {
    gmRef.current = gameState.gm;
  }, [gameState.gm]);

  const [gameSpeed, setGameSpeed] = useState<number>(1);
  const [selectedUnit, setSelectedUnit] = useState<BoardUnit | null>(null);
  const selectedUnitRef = useRef<BoardUnit | null>(selectedUnit);
  useEffect(() => {
    selectedUnitRef.current = selectedUnit;
  }, [selectedUnit]);

  // Modals & Debug
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugStats, setDebugStats] = useState({ fps: 60, drawCalls: 42, triangles: 38400 });

  // Little Legend & Camera Ref Hooks
  const triggerEmoteRef = useRef<((emote: 'DANCE' | 'TAUNT' | 'CHEER' | 'LAUGH') => void) | null>(null);
  const zoomInRef = useRef<(() => void) | null>(null);
  const zoomOutRef = useRef<(() => void) | null>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);
  const toggleFollowTacticianRef = useRef<(() => void) | null>(null);
  const inspectUnitRef = useRef<((unit: BoardUnit) => void) | null>(null);

  const [isFollowingTactician, setIsFollowingTactician] = useState(false);
  const [isInspectingChampion, setIsInspectingChampion] = useState(false);

  const handleSelectLittleLegend = useCallback((legendId: string) => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    gm.setPlayerLittleLegend(human.id, legendId);
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, littleLegendId: legendId },
      spectatedPlayer: prev.spectatedPlayer.id === human.id ? { ...prev.spectatedPlayer, littleLegendId: legendId } : prev.spectatedPlayer,
    }));
  }, []);

  // Key Listener for F3 (Debug Inspector)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3' || e.key === '~' || e.key === '`') {
        e.preventDefault();
        setShowDebug((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Main 30Hz High-Performance Simulation Loop with Decoupled React UI State Updates
  useEffect(() => {
    let lastSimTime = performance.now();
    let lastUiSyncTime = performance.now();
    let animId: number;

    const gameLoop = (currentTime: number) => {
      animId = requestAnimationFrame(gameLoop);
      const dt = Math.min(0.1, (currentTime - lastSimTime) / 1000);
      lastSimTime = currentTime;

      const gm = gmRef.current;
      gm.update(dt);

      const isCombat = gm.roundPhase === 'COMBAT';
      const uiSyncInterval = isCombat ? 40 : 120; // 25 FPS UI sync in combat, 8 FPS in planning

      if (currentTime - lastUiSyncTime >= uiSyncInterval) {
        lastUiSyncTime = currentTime;
        const human = gm.getHumanPlayer();
        const spectated = gm.getSpectatedPlayer();
        const activeEngine = gm.activeCombatEngines.get(spectated.id) || null;

        setGameState({
          gm,
          humanPlayer: { ...human, board: [...human.board], bench: [...human.bench], shop: [...human.shop], itemBench: [...human.itemBench] },
          spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench], shop: [...spectated.shop], itemBench: [...spectated.itemBench] },
          allPlayers: [...gm.players],
          roundPhase: gm.roundPhase,
          phaseTimer: gm.phaseTimer,
          stage: gm.currentStage,
          round: gm.currentRound,
          augmentOptions: gm.augmentOptions,
          activeCombatEngine: activeEngine,
        });

        // Keep selected unit in sync without triggering full loop re-instantiation
        const currentSel = selectedUnitRef.current;
        if (currentSel) {
          const found =
            spectated.board.find((u) => u.instanceId === currentSel.instanceId) ||
            spectated.bench.find((u) => u && u.instanceId === currentSel.instanceId);
          if (found) {
            setSelectedUnit({ ...found });
          }
        }
      }
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // --- Handlers ---
  const handleBuyChampion = useCallback((shopIdx: number) => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    const success = gm.buyChampion(human, shopIdx);
    if (success) {
      const spectated = gm.getSpectatedPlayer();
      setGameState((prev) => ({
        ...prev,
        humanPlayer: { ...human, board: [...human.board], bench: [...human.bench], shop: [...human.shop], itemBench: [...human.itemBench] },
        spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench], shop: [...spectated.shop], itemBench: [...spectated.itemBench] },
      }));
    }
  }, []);

  const handleRollShop = useCallback(() => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    gm.rollShop(human, false);
    const spectated = gm.getSpectatedPlayer();
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, board: [...human.board], bench: [...human.bench], shop: [...human.shop] },
      spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench], shop: [...spectated.shop] },
    }));
  }, []);

  const handleBuyXp = useCallback(() => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    gm.buyXp(human);
    const spectated = gm.getSpectatedPlayer();
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, board: [...human.board], bench: [...human.bench], shop: [...human.shop] },
      spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench], shop: [...spectated.shop] },
    }));
  }, []);

  const handleToggleLockShop = useCallback(() => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    gm.toggleLockShop(human);
    const spectated = gm.getSpectatedPlayer();
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, board: [...human.board], bench: [...human.bench], shop: [...human.shop] },
      spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench], shop: [...spectated.shop] },
    }));
  }, []);

  // Global Keyboard Shortcuts (D = Reroll Shop, F or E = Sell Selected Champion)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys if typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleRollShop();
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'e' || e.key === 'E') {
        if (selectedUnit) {
          e.preventDefault();
          const gm = gmRef.current;
          const human = gm.getHumanPlayer();
          gm.sellChampion(human, selectedUnit);
          setSelectedUnit(null);
          const spectated = gm.getSpectatedPlayer();
          setGameState((prev) => ({
            ...prev,
            humanPlayer: { ...human, board: [...human.board], bench: [...human.bench], shop: [...human.shop] },
            spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench], shop: [...spectated.shop] },
          }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRollShop, selectedUnit]);

  const handleMoveUnit = useCallback((unitId: string, row: number, col: number) => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    gm.moveUnitToBoard(human, unitId, row, col);
    const spectated = gm.getSpectatedPlayer();
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, board: [...human.board], bench: [...human.bench], shop: [...human.shop] },
      spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench], shop: [...spectated.shop] },
    }));
  }, []);

  const handleMoveToBench = useCallback((unitId: string, benchIndex?: number) => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    gm.moveUnitToBench(human, unitId, benchIndex);
    const spectated = gm.getSpectatedPlayer();
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, board: [...human.board], bench: [...human.bench], shop: [...human.shop] },
      spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench], shop: [...spectated.shop] },
    }));
  }, []);

  const handleDeployUnit = useCallback((unitId: string, row?: number, col?: number) => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    if (row !== undefined && col !== undefined) {
      gm.moveUnitToBoard(human, unitId, row, col);
      const spectated = gm.getSpectatedPlayer();
      setGameState((prev) => ({
        ...prev,
        humanPlayer: { ...human, board: [...human.board], bench: [...human.bench], shop: [...human.shop] },
        spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench], shop: [...spectated.shop] },
      }));
      return;
    }
    // Find first available ally hex (rows 7 down to 4, cols 3, 2, 4, 1, 5, 0, 6)
    const colOrder = [3, 2, 4, 1, 5, 0, 6];
    for (let r = 7; r >= 4; r--) {
      for (const c of colOrder) {
        const axial = rowColToAxial(r, c);
        const isOccupied = human.board.some(
          (u) => u.gridPosition && u.gridPosition.q === axial.q && u.gridPosition.r === axial.r
        );
        if (!isOccupied) {
          gm.moveUnitToBoard(human, unitId, r, c);
          const spectated = gm.getSpectatedPlayer();
          setGameState((prev) => ({
            ...prev,
            humanPlayer: { ...human, board: [...human.board], bench: [...human.bench], shop: [...human.shop] },
            spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench], shop: [...spectated.shop] },
          }));
          return;
        }
      }
    }
  }, []);

  const handleSellSelectedUnit = useCallback(() => {
    if (!selectedUnit) return;
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    gm.sellChampion(human, selectedUnit);
    setSelectedUnit(null);
    const spectated = gm.getSpectatedPlayer();
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, board: [...human.board], bench: [...human.bench], shop: [...human.shop] },
      spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench], shop: [...spectated.shop] },
    }));
  }, [selectedUnit]);

  const handleSellUnit = useCallback((unit: BoardUnit) => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    gm.sellChampion(human, unit);
    setSelectedUnit(null);
    const spectated = gm.getSpectatedPlayer();
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, board: [...human.board], bench: [...human.bench], shop: [...human.shop] },
      spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench], shop: [...spectated.shop] },
    }));
  }, []);

  const handleSellUnitById = useCallback((unitId: string) => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    gm.sellChampionById(human, unitId);
    setSelectedUnit(null);
    const spectated = gm.getSpectatedPlayer();
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, board: [...human.board], bench: [...human.bench], shop: [...human.shop] },
      spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench], shop: [...spectated.shop] },
    }));
  }, []);

  const handleEquipItem = useCallback((itemBenchIdx: number, unitId: string) => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    gm.equipItem(human, itemBenchIdx, unitId);
    const spectated = gm.getSpectatedPlayer();
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, board: [...human.board], bench: [...human.bench], shop: [...human.shop], itemBench: [...human.itemBench] },
      spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench], shop: [...spectated.shop], itemBench: [...spectated.itemBench] },
    }));
  }, []);

  const handleSelectAugment = useCallback((augment: AugmentData) => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    gm.selectAugment(human, augment);
    const spectated = gm.getSpectatedPlayer();
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, board: [...human.board], bench: [...human.bench] },
      spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench] },
      roundPhase: gm.roundPhase,
      augmentOptions: gm.augmentOptions,
    }));
  }, []);

  const handleSpectatePlayer = useCallback((playerId: string) => {
    const gm = gmRef.current;
    gm.setSpectatingPlayer(playerId);
    setSelectedUnit(null);
    const human = gm.getHumanPlayer();
    const spectated = gm.getSpectatedPlayer();
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, board: [...human.board], bench: [...human.bench] },
      spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench] },
    }));
  }, []);

  const handleSetGameSpeed = useCallback((speed: number) => {
    const gm = gmRef.current;
    gm.setGameSpeed(speed);
    setGameSpeed(speed);
  }, []);

  const handleForceStartCombat = useCallback(() => {
    const gm = gmRef.current;
    gm.forceStartCombat();
  }, []);

  const handleTogglePauseTimer = useCallback(() => {
    const gm = gmRef.current;
    gm.togglePauseTimer();
  }, []);

  const handleAddGold = useCallback((amount = 10) => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    gm.addGold(human, amount);
    const spectated = gm.getSpectatedPlayer();
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, board: [...human.board], bench: [...human.bench] },
      spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench] },
    }));
  }, []);

  const handleAddXp = useCallback((amount = 4) => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    gm.addXp(human, amount);
    const spectated = gm.getSpectatedPlayer();
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, board: [...human.board], bench: [...human.bench] },
      spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench] },
    }));
  }, []);

  const handleClearBoard = useCallback(() => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    gm.clearBoard(human);
    const spectated = gm.getSpectatedPlayer();
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, board: [...human.board], bench: [...human.bench] },
      spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench] },
    }));
  }, []);

  const handleSpawnChampion = useCallback((champId: string) => {
    const gm = gmRef.current;
    const human = gm.getHumanPlayer();
    gm.spawnChampion(human, champId);
    const spectated = gm.getSpectatedPlayer();
    setGameState((prev) => ({
      ...prev,
      humanPlayer: { ...human, board: [...human.board], bench: [...human.bench] },
      spectatedPlayer: { ...spectated, board: [...spectated.board], bench: [...spectated.bench] },
    }));
  }, []);

  const {
    humanPlayer,
    spectatedPlayer,
    allPlayers,
    roundPhase,
    phaseTimer,
    stage,
    round,
    augmentOptions,
    activeCombatEngine,
  } = gameState;

  if (!isMounted) {
    return (
      <main className="relative h-screen w-screen overflow-hidden bg-[#0b0c14] text-slate-200 font-sans flex flex-col items-center justify-center select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Project TFT Engine</span>
          <span className="text-[10px] text-slate-500 font-mono">Iniciando simulador 30Hz...</span>
        </div>
      </main>
    );
  }

  const opponentPlayer =
    (spectatedPlayer.currentOpponentId
      ? allPlayers.find((p) => p.id === spectatedPlayer.currentOpponentId)
      : allPlayers.find((p) => p.id !== spectatedPlayer.id && !p.isEliminated)) || null;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#0b0c14] text-slate-200 font-sans select-none">
      {/* 3D Three.js Battlefield */}
      <ThreeArena
        boardUnits={spectatedPlayer.board}
        benchUnits={spectatedPlayer.bench}
        enemyBenchUnits={opponentPlayer?.bench || []}
        combatEngine={activeCombatEngine}
        isCombatPhase={roundPhase === 'COMBAT'}
        selectedUnitId={selectedUnit ? selectedUnit.instanceId : null}
        playerLegendId={spectatedPlayer.littleLegendId || 'river_sprite'}
        opponentLegendId={opponentPlayer?.littleLegendId || 'pengu_knight'}
        playerName={spectatedPlayer.name}
        opponentName={opponentPlayer?.name || 'Oponente'}
        onSelectUnit={setSelectedUnit}
        onMoveUnit={handleMoveUnit}
        onMoveToBench={handleMoveToBench}
        onSellUnit={handleSellUnit}
        showDebugOverlay={showDebug}
        onDebugStatsUpdate={setDebugStats}
        onTriggerEmoteRef={triggerEmoteRef}
        onZoomInRef={zoomInRef}
        onZoomOutRef={zoomOutRef}
        onResetCameraRef={resetCameraRef}
        onToggleFollowTacticianRef={toggleFollowTacticianRef}
        onInspectUnitRef={inspectUnitRef}
        setIsFollowingTactician={setIsFollowingTactician}
        setIsInspectingChampion={setIsInspectingChampion}
      />

      {/* Svelte/Next.js Responsive HUD Overlay */}
      <GameHUD
        player={humanPlayer}
        spectatedPlayer={spectatedPlayer}
        allPlayers={allPlayers}
        roundPhase={roundPhase}
        phaseTimer={phaseTimer}
        stage={stage}
        round={round}
        gameSpeed={gameSpeed}
        onSetGameSpeed={handleSetGameSpeed}
        onBuyChampion={handleBuyChampion}
        onRollShop={handleRollShop}
        onBuyXp={handleBuyXp}
        onToggleLockShop={handleToggleLockShop}
        onSelectAugment={handleSelectAugment}
        augmentOptions={augmentOptions}
        onSpectatePlayer={handleSpectatePlayer}
        selectedUnit={selectedUnit}
        onSelectUnit={setSelectedUnit}
        onMoveUnitToBoard={handleDeployUnit}
        onMoveUnitToBench={handleMoveToBench}
        onSellSelectedUnit={handleSellSelectedUnit}
        onSellUnitById={handleSellUnitById}
        onEquipItem={handleEquipItem}
        onOpenSandbox={() => setIsSandboxOpen(true)}
        onToggleDebug={() => setShowDebug((prev) => !prev)}
        showDebug={showDebug}
        onForceStartCombat={handleForceStartCombat}
        onTogglePauseTimer={handleTogglePauseTimer}
        isTimerPaused={gameState.gm.isTimerPaused}
        onAddGold={handleAddGold}
        onAddXp={handleAddXp}
        onClearBoard={handleClearBoard}
        onSpawnChampion={handleSpawnChampion}
        onSelectLittleLegend={handleSelectLittleLegend}
        onTriggerEmote={(emote) => triggerEmoteRef.current?.(emote)}
        onZoomIn={() => zoomInRef.current?.()}
        onZoomOut={() => zoomOutRef.current?.()}
        onResetCamera={() => resetCameraRef.current?.()}
        onToggleFollowTactician={() => toggleFollowTacticianRef.current?.()}
        onInspectSelectedUnit={() => {
          if (selectedUnit) inspectUnitRef.current?.(selectedUnit);
        }}
        isFollowingTactician={isFollowingTactician}
        isInspectingChampion={isInspectingChampion}
      />

      {/* F3 Debug Inspector */}
      <DebugOverlay
        isOpen={showDebug}
        selectedUnit={selectedUnit}
        fps={debugStats.fps}
        drawCalls={debugStats.drawCalls}
        triangles={debugStats.triangles}
        activeEntityCount={
          spectatedPlayer.board.length +
          spectatedPlayer.bench.filter((u) => u !== null).length
        }
      />

      {/* Headless Sandbox Balance CLI Modal */}
      <HeadlessSandboxModal
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
        currentAllies={humanPlayer.board}
        currentEnemies={allPlayers[1]?.board || []}
      />
    </main>
  );
}
