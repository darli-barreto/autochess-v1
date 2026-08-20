'use client';

import React, { useState } from 'react';
import {
  PlayerState,
  BoardUnit,
  RoundPhase,
  AugmentData,
} from '@/types/game';
import { soundEngine } from '@/engine/audioEngine';
import { HUDHeader } from './hud/HUDHeader';
import { TraitsSidebar } from './hud/TraitsSidebar';
import { ScoreboardSidebar } from './hud/ScoreboardSidebar';
import { ShopFooter } from './hud/ShopFooter';
import { AugmentModal } from './hud/AugmentModal';
import { LittleLegendEmoteBar } from './hud/LittleLegendEmoteBar';
import { CameraControls } from './hud/CameraControls';

interface GameHUDProps {
  player: PlayerState;
  spectatedPlayer: PlayerState;
  allPlayers: PlayerState[];
  roundPhase: RoundPhase;
  phaseTimer: number;
  stage: number;
  round: number;
  gameSpeed: number;
  onSetGameSpeed: (speed: number) => void;
  onBuyChampion: (shopIdx: number) => void;
  onRollShop: () => void;
  onBuyXp: () => void;
  onToggleLockShop: () => void;
  onSelectAugment: (augment: AugmentData) => void;
  augmentOptions: AugmentData[];
  onSpectatePlayer: (playerId: string) => void;
  selectedUnit: BoardUnit | null;
  onSellSelectedUnit: () => void;
  onEquipItem: (itemBenchIdx: number, unitId: string) => void;
  onOpenSandbox: () => void;
  onToggleDebug: () => void;
  showDebug: boolean;
  onSelectUnit?: (unit: BoardUnit | null) => void;
  onMoveUnitToBoard?: (unitId: string, row?: number, col?: number) => void;
  onMoveUnitToBench?: (unitId: string, benchIdx?: number) => void;
  onSellUnitById?: (unitId: string) => void;
  onForceStartCombat?: () => void;
  onTogglePauseTimer?: () => void;
  isTimerPaused?: boolean;
  onAddGold?: (amount: number) => void;
  onAddXp?: (amount: number) => void;
  onClearBoard?: () => void;
  onSpawnChampion?: (champId: string) => void;
  // Little Legend & Camera Bindings
  onSelectLittleLegend?: (legendId: string) => void;
  onTriggerEmote?: (emote: 'DANCE' | 'TAUNT' | 'CHEER' | 'LAUGH') => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetCamera?: () => void;
  onToggleFollowTactician?: () => void;
  onInspectSelectedUnit?: () => void;
  isFollowingTactician?: boolean;
  isInspectingChampion?: boolean;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  player,
  spectatedPlayer,
  allPlayers,
  roundPhase,
  phaseTimer: _phaseTimer,
  stage: _stage,
  round: _round,
  gameSpeed,
  onSetGameSpeed,
  onBuyChampion,
  onRollShop,
  onBuyXp,
  onToggleLockShop,
  onSelectAugment,
  augmentOptions,
  onSpectatePlayer,
  selectedUnit,
  onSellSelectedUnit,
  onEquipItem,
  onOpenSandbox,
  onToggleDebug,
  showDebug,
  onSellUnitById,
  onAddGold,
  onAddXp,
  onClearBoard,
  onSpawnChampion,
  onSelectLittleLegend,
  onTriggerEmote,
  onZoomIn,
  onZoomOut,
  onResetCamera,
  onToggleFollowTactician,
  onInspectSelectedUnit,
  isFollowingTactician = false,
  isInspectingChampion = false,
}) => {
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMuted(next);
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between select-none overflow-hidden font-sans text-slate-200">
      {/* ================= 1. HEADER (SANDBOX TOOLS, SPEED, STATS, MUTE) ================= */}
      <HUDHeader
        player={player}
        spectatedPlayer={spectatedPlayer}
        gameSpeed={gameSpeed}
        onSetGameSpeed={onSetGameSpeed}
        onSpectatePlayer={onSpectatePlayer}
        onOpenSandbox={onOpenSandbox}
        onToggleDebug={onToggleDebug}
        showDebug={showDebug}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onAddGold={onAddGold}
        onAddXp={onAddXp}
        onClearBoard={onClearBoard}
        onSpawnChampion={onSpawnChampion}
      />

      {/* ================= 2. MAIN CENTER AREA (TRAITS & SCOREBOARD) ================= */}
      <div className="flex-1 flex overflow-hidden relative pointer-events-none">
        {/* Left: Active Synergy Traits & Item Bench */}
        <TraitsSidebar
          player={player}
          spectatedPlayer={spectatedPlayer}
          selectedUnit={selectedUnit}
          onEquipItem={onEquipItem}
        />

        {/* Floating Quick Camera & Little Legend Controls Bar */}
        <div className="absolute top-2 right-56 z-20 pointer-events-auto hidden md:flex items-center gap-2">
          <CameraControls
            zoomLevel={0.5}
            isFollowingTactician={isFollowingTactician}
            isInspectingChampion={isInspectingChampion}
            onZoomIn={() => onZoomIn?.()}
            onZoomOut={() => onZoomOut?.()}
            onResetCamera={() => onResetCamera?.()}
            onToggleFollowTactician={() => onToggleFollowTactician?.()}
            onInspectSelectedUnit={() => onInspectSelectedUnit?.()}
            hasSelectedUnit={selectedUnit !== null}
          />
        </div>

        {/* Right: 8-Player Scoreboard & DPS Meter */}
        <div className="flex-1" />

        <ScoreboardSidebar
          allPlayers={allPlayers}
          spectatedPlayer={spectatedPlayer}
          onSpectatePlayer={onSpectatePlayer}
        />
      </div>

      {/* Floating Little Legend Emote & Skin Bar directly above Shop */}
      <div className="px-4 pb-1.5 flex items-center justify-between pointer-events-none z-20">
        <div className="pointer-events-auto">
          <LittleLegendEmoteBar
            currentLegendId={spectatedPlayer.littleLegendId || 'river_sprite'}
            onSelectLegend={(legendId) => onSelectLittleLegend?.(legendId)}
            onTriggerEmote={(emote) => onTriggerEmote?.(emote)}
          />
        </div>

        <div className="pointer-events-auto md:hidden">
          <CameraControls
            zoomLevel={0.5}
            isFollowingTactician={isFollowingTactician}
            isInspectingChampion={isInspectingChampion}
            onZoomIn={() => onZoomIn?.()}
            onZoomOut={() => onZoomOut?.()}
            onResetCamera={() => onResetCamera?.()}
            onToggleFollowTactician={() => onToggleFollowTactician?.()}
            onInspectSelectedUnit={() => onInspectSelectedUnit?.()}
            hasSelectedUnit={selectedUnit !== null}
          />
        </div>
      </div>

      {/* ================= 3. FOOTER / SHOP (GOLD, STREAK, CARDS, ACTIONS) ================= */}
      <ShopFooter
        player={player}
        spectatedPlayer={spectatedPlayer}
        selectedUnit={selectedUnit}
        onBuyChampion={onBuyChampion}
        onRollShop={onRollShop}
        onBuyXp={onBuyXp}
        onToggleLockShop={onToggleLockShop}
        onSellSelectedUnit={onSellSelectedUnit}
        onSellUnitById={onSellUnitById}
      />

      {/* ================= 4. AUGMENT SELECTION MODAL ================= */}
      {roundPhase === 'AUGMENT_SELECT' && augmentOptions.length > 0 && (
        <AugmentModal
          augmentOptions={augmentOptions}
          onSelectAugment={onSelectAugment}
        />
      )}
    </div>
  );
};
