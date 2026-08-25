import {
  PlayerState,
  BoardUnit,
  RoundInfo,
  RoundPhase,
  TraitId,
  AugmentData,
} from '@/types/game';
import { CHAMPIONS_DATA } from '@/data/champions';
import { BASIC_COMPONENTS, COMPLETED_ITEMS, getRecipeResult } from '@/data/items';
import { TRAITS_DATA } from '@/data/traits';
import { AUGMENTS_DATA } from '@/data/augments';
import { rowColToAxial, axialToRowCol } from './hexMath';
import { CombatEngine } from './combatEngine';
import { soundEngine } from './audioEngine';

export const LEVEL_XP_REQUIREMENTS: Record<number, number> = {
  1: 2,
  2: 2,
  3: 6,
  4: 10,
  5: 20,
  6: 36,
  7: 56,
  8: 80,
  9: 999, // Max level
};

export const SHOP_PROBABILITIES: Record<number, [number, number, number, number, number]> = {
  1: [1.0, 0.0, 0.0, 0.0, 0.0],
  2: [1.0, 0.0, 0.0, 0.0, 0.0],
  3: [0.75, 0.25, 0.0, 0.0, 0.0],
  4: [0.55, 0.3, 0.15, 0.0, 0.0],
  5: [0.45, 0.33, 0.2, 0.02, 0.0],
  6: [0.25, 0.4, 0.3, 0.05, 0.0],
  7: [0.19, 0.3, 0.35, 0.15, 0.01],
  8: [0.18, 0.25, 0.36, 0.18, 0.03],
  9: [0.1, 0.2, 0.25, 0.35, 0.1],
};

const BOT_NAMES = [
  'arcane_jinx_unbound',
  'awakened_ao_shin',
  'chibi_aatrox',
  'birthday_fluttercake',
  'chibi_battle_bat_xayah',
  'chibi_battle_bat_xayah',
  'chibi_battle_bat_xayah',
];

const BOT_AVATARS = [
  'https://picsum.photos/seed/bot1/120/120',
  'https://picsum.photos/seed/bot2/120/120',
  'https://picsum.photos/seed/bot3/120/120',
  'https://picsum.photos/seed/bot4/120/120',
  'https://picsum.photos/seed/bot5/120/120',
  'https://picsum.photos/seed/bot6/120/120',
  'https://picsum.photos/seed/bot7/120/120',
];

export class GameManager {
  public players: PlayerState[] = [];
  public humanPlayerId: string = 'player_human';
  public spectatingPlayerId: string = 'player_human';
  public currentStage: number = 1;
  public currentRound: number = 1;
  public roundPhase: RoundPhase = 'PLANNING';
  public phaseTimer: number = 999; // Sandbox testing mode: no rush
  public isTimerPaused: boolean = true;
  public activeCombatEngines: Map<string, CombatEngine> = new Map(); // key = matchId
  public sharedPool: Record<string, number> = {};
  public augmentOptions: AugmentData[] = [];
  public carouselUnits: { championId: string; item: string }[] = [];
  public gameSpeed: number = 1; // 1x, 2x, 4x

  constructor() {
    this.initSharedPool();
    this.initPlayers();
    this.startPlanningPhase();
  }

  private initSharedPool() {
    this.sharedPool = {};
    const poolCounts: Record<number, number> = {
      1: 29,
      2: 22,
      3: 18,
      4: 12,
      5: 10,
    };

    for (const [id, champ] of Object.entries(CHAMPIONS_DATA)) {
      this.sharedPool[id] = poolCounts[champ.cost] || 20;
    }
  }

  private initPlayers() {
    this.players = [];

    // Human player (Sandbox Board Testing Mode)
    const human: PlayerState = {
      id: this.humanPlayerId,
      name: 'Fyzen',
      isHuman: true,
      avatar: 'https://picsum.photos/seed/player1/120/120',
      littleLegendId: 'prestige_chibi_spirit_blossom_ahri',
      health: 100,
      level: 8,
      currentXp: 0,
      requiredXp: LEVEL_XP_REQUIREMENTS[8] || 80,
      gold: 50,
      streak: 0,
      interestEarned: 5,
      board: [],
      bench: Array(9).fill(null),
      itemBench: Array(10).fill(null),
      shop: Array(5).fill(null),
      isShopLocked: false,
      augments: [],
      currentOpponentId: null,
      isEliminated: false,
      placement: 1,
      lastRoundWon: false,
    };

    // Starter champions on board to test moving and dragging right away
    const starterChamp1 = this.createBoardUnit('ahri', human.id, 1, 4, 3);
    const starterChamp2 = this.createBoardUnit('malphite', human.id, 1, 5, 2);
    const starterChamp3 = this.createBoardUnit('caitlyn', human.id, 1, 6, 3);
    human.board.push(starterChamp1, starterChamp2, starterChamp3);

    // Bench starts completely empty as requested
    // (no default bench units)

    // Assortment of item components in item bench for testing fusion and equips
    human.itemBench[0] = 'bf_sword';
    human.itemBench[1] = 'recurve_bow';
    human.itemBench[2] = 'needlessly_large_rod';
    human.itemBench[3] = 'tear_of_the_goddess';
    human.itemBench[4] = 'chain_vest';
    human.itemBench[5] = 'giants_belt';
    human.itemBench[6] = 'sparring_gloves';

    this.players.push(human);

    const BOT_LEGENDS = [
      'chibi_battle_bat_xayah',
      'arcane_jinx_unbound',
      'chibi_aatrox',
      'prestige_chibi_spirit_blossom_ahri',
      'chibi_battle_bat_xayah',
      'arcane_jinx_unbound',
      'chibi_aatrox',
    ];

    // 7 Bot players
    for (let i = 0; i < 7; i++) {
      const botId = `bot_${i + 1}`;
      const bot: PlayerState = {
        id: botId,
        name: BOT_NAMES[i],
        isHuman: false,
        avatar: BOT_AVATARS[i],
        littleLegendId: BOT_LEGENDS[i % BOT_LEGENDS.length],
        health: 100,
        level: 1,
        currentXp: 0,
        requiredXp: LEVEL_XP_REQUIREMENTS[1],
        gold: 10,
        streak: 0,
        interestEarned: 0,
        board: [],
        bench: Array(9).fill(null),
        itemBench: Array(10).fill(null),
        shop: Array(5).fill(null),
        isShopLocked: false,
        augments: [],
        currentOpponentId: null,
        isEliminated: false,
        placement: i + 2,
        lastRoundWon: false,
      };

      // Random bot starter
      const starterKeys = ['ahri', 'caitlyn', 'gnar', 'khazix', 'sivir', 'warwick', 'zyra'];
      const pick = starterKeys[i % starterKeys.length];
      const botStarter = this.createBoardUnit(pick, botId, 1, 4, 3);
      bot.board.push(botStarter);
      bot.itemBench[0] = 'bf_sword';
      bot.itemBench[1] = 'chain_vest';

      this.players.push(bot);
    }
  }

  public getHumanPlayer(): PlayerState {
    return this.players.find((p) => p.id === this.humanPlayerId) || this.players[0];
  }

  public getSpectatedPlayer(): PlayerState {
    return this.players.find((p) => p.id === this.spectatingPlayerId) || this.getHumanPlayer();
  }

  public setSpectatingPlayer(playerId: string) {
    this.spectatingPlayerId = playerId;
  }

  public createBoardUnit(
    championId: string,
    ownerId: string,
    starLevel: 1 | 2 | 3 = 1,
    row: number = 4,
    col: number = 3
  ): BoardUnit {
    const base = CHAMPIONS_DATA[championId];
    const starIdx = (starLevel - 1) as 0 | 1 | 2;
    const maxHp = base ? base.stats.health[starIdx] : 600;

    return {
      instanceId: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      championId,
      starLevel,
      items: [],
      gridPosition: rowColToAxial(row, col),
      benchIndex: null,
      currentHealth: maxHp,
      maxHealth: maxHp,
      currentMana: base ? base.stats.startingMana : 0,
      maxMana: base ? base.stats.maxMana : 100,
      shield: 0,
      ownerId,
      team: 'ally',
      state: 'IDLE',
      targetInstanceId: null,
      currentPath: [],
      attackCooldown: 0,
      castingTimer: 0,
      stunTimer: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      totalHealing: 0,
      kills: 0,
    };
  }

  /**
   * Roll shop for a player using tier probability matrix
   */
  public rollShop(player: PlayerState, isFree = false) {
    if (!isFree && player.gold < 2) return;
    if (!isFree) {
      player.gold -= 2;
      if (player.isHuman) soundEngine.playReroll();
    }

    const level = Math.min(9, Math.max(1, player.level));
    const probs = SHOP_PROBABILITIES[level] || [1, 0, 0, 0, 0];

    const newShop: (string | null)[] = [];

    for (let slot = 0; slot < 5; slot++) {
      const rand = Math.random();
      let selectedTier = 1;
      let cumProb = 0;

      for (let t = 0; t < 5; t++) {
        cumProb += probs[t];
        if (rand <= cumProb) {
          selectedTier = t + 1;
          break;
        }
      }

      // Filter available champions in pool for this tier
      const candidates = Object.keys(CHAMPIONS_DATA).filter(
        (cid) => CHAMPIONS_DATA[cid].cost === selectedTier && (this.sharedPool[cid] || 0) > 0
      );

      if (candidates.length > 0) {
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        newShop.push(picked);
      } else {
        // Fallback to any available
        const fallback = Object.keys(CHAMPIONS_DATA).filter((cid) => (this.sharedPool[cid] || 0) > 0);
        newShop.push(fallback.length > 0 ? fallback[Math.floor(Math.random() * fallback.length)] : 'ahri');
      }
    }

    player.shop = newShop;
  }

  /**
   * Buy champion from shop
   */
  public buyChampion(player: PlayerState, shopIndex: number): boolean {
    const champId = player.shop[shopIndex];
    if (!champId) return false;

    const base = CHAMPIONS_DATA[champId];
    if (!base || player.gold < base.cost) return false;

    // Check if there is space on bench
    const freeBenchIdx = player.bench.findIndex((slot) => slot === null);
    if (freeBenchIdx === -1) return false;

    // Deduct gold & pool
    player.gold -= base.cost;
    this.sharedPool[champId] = Math.max(0, (this.sharedPool[champId] || 1) - 1);
    player.shop[shopIndex] = null;

    // Create unit on bench
    const newUnit: BoardUnit = {
      instanceId: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      championId: champId,
      starLevel: 1,
      items: [],
      gridPosition: null,
      benchIndex: freeBenchIdx,
      currentHealth: base.stats.health[0],
      maxHealth: base.stats.health[0],
      currentMana: base.stats.startingMana,
      maxMana: base.stats.maxMana,
      shield: 0,
      ownerId: player.id,
      team: 'ally',
      state: 'IDLE',
      targetInstanceId: null,
      currentPath: [],
      attackCooldown: 0,
      castingTimer: 0,
      stunTimer: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      totalHealing: 0,
      kills: 0,
    };

    player.bench[freeBenchIdx] = newUnit;

    if (player.isHuman) soundEngine.playBuy();

    // Check for 3-star / 2-star Auto-fusion
    this.checkUnitFusions(player, champId);

    return true;
  }

  /**
   * Sell champion
   */
  public sellChampion(player: PlayerState, unit: BoardUnit): boolean {
    const base = CHAMPIONS_DATA[unit.championId];
    if (!base) return false;

    // Gold refund: cost * stars^1.5 approx
    const refund = base.cost * (unit.starLevel === 3 ? 9 : unit.starLevel === 2 ? 3 : 1);
    player.gold += refund;

    // Return to pool
    this.sharedPool[unit.championId] = (this.sharedPool[unit.championId] || 0) + (unit.starLevel === 3 ? 9 : unit.starLevel === 2 ? 3 : 1);

    // Return items to item bench
    for (const itemId of unit.items) {
      const emptySlot = player.itemBench.findIndex((slot) => slot === null);
      if (emptySlot !== -1) {
        player.itemBench[emptySlot] = itemId;
      }
    }

    // Remove unit
    if (unit.benchIndex !== null) {
      player.bench[unit.benchIndex] = null;
    } else {
      player.board = player.board.filter((u) => u.instanceId !== unit.instanceId);
    }

    if (player.isHuman) soundEngine.playSell();

    return true;
  }

  /**
   * Sell champion by instance ID
   */
  public sellChampionById(player: PlayerState, unitId: string): boolean {
    const unit =
      player.board.find((u) => u.instanceId === unitId) ||
      player.bench.find((u) => u && u.instanceId === unitId);
    if (!unit) return false;
    return this.sellChampion(player, unit);
  }

  /**
   * Buy XP
   */
  public buyXp(player: PlayerState): boolean {
    if (player.gold < 4 || player.level >= 9) return false;

    player.gold -= 4;
    player.currentXp += 4;

    while (player.currentXp >= player.requiredXp && player.level < 9) {
      player.currentXp -= player.requiredXp;
      player.level += 1;
      player.requiredXp = LEVEL_XP_REQUIREMENTS[player.level] || 999;
      if (player.isHuman) soundEngine.playLevelUp();
    }

    return true;
  }

  /**
   * Check 3-fusion auto merge
   */
  public checkUnitFusions(player: PlayerState, champId: string) {
    const allUnits = [...player.board, ...player.bench.filter((u): u is BoardUnit => u !== null)].filter(
      (u) => u.championId === champId
    );

    // Check 1-star -> 2-star
    const oneStars = allUnits.filter((u) => u.starLevel === 1);
    if (oneStars.length >= 3) {
      const [u1, u2, u3] = oneStars;
      // Target unit to upgrade (prefer board unit, else u1)
      const target = player.board.find((u) => u.instanceId === u1.instanceId || u.instanceId === u2.instanceId || u.instanceId === u3.instanceId) || u1;

      // Consolidate items
      const combinedItems = Array.from(new Set([...u1.items, ...u2.items, ...u3.items])).slice(0, 3);
      target.starLevel = 2;
      target.items = combinedItems;

      const base = CHAMPIONS_DATA[champId];
      if (base) {
        target.maxHealth = base.stats.health[1];
        target.currentHealth = target.maxHealth;
      }

      // Remove the other 2 units
      const toRemove = [u1, u2, u3].filter((u) => u.instanceId !== target.instanceId);
      for (const rem of toRemove) {
        if (rem.benchIndex !== null) player.bench[rem.benchIndex] = null;
        player.board = player.board.filter((u) => u.instanceId !== rem.instanceId);
      }

      if (player.isHuman) soundEngine.playFusion(2);

      // Check if this created a 3-star!
      this.checkUnitFusions(player, champId);
      return;
    }

    // Check 2-star -> 3-star
    const twoStars = allUnits.filter((u) => u.starLevel === 2);
    if (twoStars.length >= 3) {
      const [u1, u2, u3] = twoStars;
      const target = player.board.find((u) => u.instanceId === u1.instanceId || u.instanceId === u2.instanceId || u.instanceId === u3.instanceId) || u1;

      const combinedItems = Array.from(new Set([...u1.items, ...u2.items, ...u3.items])).slice(0, 3);
      target.starLevel = 3;
      target.items = combinedItems;

      const base = CHAMPIONS_DATA[champId];
      if (base) {
        target.maxHealth = base.stats.health[2];
        target.currentHealth = target.maxHealth;
      }

      const toRemove = [u1, u2, u3].filter((u) => u.instanceId !== target.instanceId);
      for (const rem of toRemove) {
        if (rem.benchIndex !== null) player.bench[rem.benchIndex] = null;
        player.board = player.board.filter((u) => u.instanceId !== rem.instanceId);
      }

      if (player.isHuman) soundEngine.playFusion(3);
    }
  }

  public togglePauseTimer(): boolean {
    this.isTimerPaused = !this.isTimerPaused;
    return this.isTimerPaused;
  }

  public setPauseTimer(paused: boolean) {
    this.isTimerPaused = paused;
  }

  public forceStartCombat(): boolean {
    if (this.roundPhase === 'PLANNING' || this.roundPhase === 'AUGMENT_SELECT') {
      this.startCombatPhase();
      return true;
    }
    return false;
  }

  /**
   * Move unit from bench to board or swap positions on board
   */
  public moveUnitToBoard(player: PlayerState, unitInstanceId: string, targetRow: number, targetCol: number): boolean {
    if (targetRow < 4 || targetRow > 7 || targetCol < 0 || targetCol > 6) return false;

    const unit =
      player.board.find((u) => u.instanceId === unitInstanceId) ||
      player.bench.find((u) => u && u.instanceId === unitInstanceId);
    if (!unit) return false;

    const targetCoord = rowColToAxial(targetRow, targetCol);
    const existingAtTarget = player.board.find(
      (u) => u.gridPosition && u.gridPosition.q === targetCoord.q && u.gridPosition.r === targetCoord.r && u.instanceId !== unit.instanceId
    );

    // CASE 1: Unit is coming from Bench
    if (unit.benchIndex !== null) {
      const originBenchIdx = unit.benchIndex;

      if (existingAtTarget) {
        // Swap: bench unit goes to board, board unit goes to origin bench slot
        player.bench[originBenchIdx] = existingAtTarget;
        existingAtTarget.benchIndex = originBenchIdx;
        existingAtTarget.gridPosition = null;

        player.board = player.board.filter((u) => u.instanceId !== existingAtTarget.instanceId);
        unit.benchIndex = null;
        unit.gridPosition = targetCoord;
        player.board.push(unit);
        if (player.isHuman) soundEngine.playPlaceUnit();
        return true;
      } else {
        // Moving to empty board slot: check board capacity
        if (player.board.length >= player.level) {
          return false; // Board full
        }
        player.bench[originBenchIdx] = null;
        unit.benchIndex = null;
        unit.gridPosition = targetCoord;
        player.board.push(unit);
        if (player.isHuman) soundEngine.playPlaceUnit();
        return true;
      }
    }

    // CASE 2: Unit is already on Board (Board -> Board)
    if (existingAtTarget) {
      // Swap board positions
      const oldCoord = unit.gridPosition;
      existingAtTarget.gridPosition = oldCoord;
      unit.gridPosition = targetCoord;
      if (player.isHuman) soundEngine.playPlaceUnit();
      return true;
    } else {
      // Move to empty board position
      unit.gridPosition = targetCoord;
      if (player.isHuman) soundEngine.playPlaceUnit();
      return true;
    }
  }

  /**
   * Move unit to bench (from board or repositioning within bench)
   */
  public moveUnitToBench(player: PlayerState, unitInstanceId: string, targetBenchIdx?: number): boolean {
    const unit =
      player.board.find((u) => u.instanceId === unitInstanceId) ||
      player.bench.find((u) => u && u.instanceId === unitInstanceId);
    if (!unit) return false;

    // CASE 1: Unit is already on Bench (Bench -> Bench reposition/swap)
    if (unit.benchIndex !== null) {
      const originIdx = unit.benchIndex;
      if (targetBenchIdx === undefined || targetBenchIdx === originIdx) return true;
      if (targetBenchIdx < 0 || targetBenchIdx >= 9) return false;

      const existingAtBench = player.bench[targetBenchIdx];
      if (existingAtBench && existingAtBench.instanceId !== unit.instanceId) {
        // Swap bench slots
        player.bench[originIdx] = existingAtBench;
        existingAtBench.benchIndex = originIdx;
        player.bench[targetBenchIdx] = unit;
        unit.benchIndex = targetBenchIdx;
        if (player.isHuman) soundEngine.playPlaceUnit();
        return true;
      } else {
        // Move to empty bench slot
        player.bench[originIdx] = null;
        player.bench[targetBenchIdx] = unit;
        unit.benchIndex = targetBenchIdx;
        if (player.isHuman) soundEngine.playPlaceUnit();
        return true;
      }
    }

    // CASE 2: Unit is coming from Board (Board -> Bench)
    const oldBoardCoord = unit.gridPosition;

    if (targetBenchIdx !== undefined && targetBenchIdx >= 0 && targetBenchIdx < 9) {
      const existingAtBench = player.bench[targetBenchIdx];
      if (existingAtBench) {
        // Swap: Board unit moves to target bench slot, Bench unit deploys to the vacated board hex
        player.bench[targetBenchIdx] = unit;
        unit.benchIndex = targetBenchIdx;
        unit.gridPosition = null;

        player.board = player.board.filter((u) => u.instanceId !== unit.instanceId);
        existingAtBench.benchIndex = null;
        existingAtBench.gridPosition = oldBoardCoord;
        player.board.push(existingAtBench);
        if (player.isHuman) soundEngine.playPlaceUnit();
        return true;
      } else {
        // Empty target slot
        player.board = player.board.filter((u) => u.instanceId !== unit.instanceId);
        unit.gridPosition = null;
        unit.benchIndex = targetBenchIdx;
        player.bench[targetBenchIdx] = unit;
        if (player.isHuman) soundEngine.playPlaceUnit();
        return true;
      }
    } else {
      // Find first available slot on bench
      const emptySlot = player.bench.findIndex((s) => s === null);
      if (emptySlot === -1) return false; // Bench full

      player.board = player.board.filter((u) => u.instanceId !== unit.instanceId);
      unit.gridPosition = null;
      unit.benchIndex = emptySlot;
      player.bench[emptySlot] = unit;
      if (player.isHuman) soundEngine.playPlaceUnit();
      return true;
    }
  }

  /**
   * Equip item onto champion
   */
  public equipItem(player: PlayerState, itemBenchIndex: number, unitInstanceId: string): boolean {
    const itemId = player.itemBench[itemBenchIndex];
    if (!itemId) return false;

    const unit =
      player.board.find((u) => u.instanceId === unitInstanceId) ||
      player.bench.find((u) => u && u.instanceId === unitInstanceId);
    if (!unit) return false;

    // Check if item combines with existing component on unit
    if (unit.items.length > 0) {
      const lastItem = unit.items[unit.items.length - 1];
      const recipeResult = getRecipeResult(lastItem, itemId);

      if (recipeResult) {
        // Combine into completed item!
        unit.items[unit.items.length - 1] = recipeResult;
        player.itemBench[itemBenchIndex] = null;
        if (player.isHuman) soundEngine.playEquipItem();
        return true;
      }
    }

    // Max 3 items
    if (unit.items.length >= 3) return false;

    unit.items.push(itemId);
    player.itemBench[itemBenchIndex] = null;
    if (player.isHuman) soundEngine.playEquipItem();
    return true;
  }

  /**
   * Calculate active trait tiers for a player
   */
  public getActiveTraits(player: PlayerState): Record<TraitId, number> {
    const counts: Partial<Record<TraitId, number>> = {};
    const seenChamps = new Set<string>();

    for (const unit of player.board) {
      if (seenChamps.has(unit.championId)) continue;
      seenChamps.add(unit.championId);

      const base = CHAMPIONS_DATA[unit.championId];
      if (!base) continue;

      for (const trait of base.traits) {
        counts[trait] = (counts[trait] || 0) + (trait === 'dragon' ? 1 : 1);
      }
    }

    return counts as Record<TraitId, number>;
  }

  /**
   * Round Phase Transitions
   */
  public startPlanningPhase() {
    this.roundPhase = 'PLANNING';
    this.phaseTimer = 999;
    this.isTimerPaused = true;

    // Check for Augment rounds (2-1, 3-2, 4-2)
    if (
      (this.currentStage === 2 && this.currentRound === 1) ||
      (this.currentStage === 3 && this.currentRound === 2) ||
      (this.currentStage === 4 && this.currentRound === 2)
    ) {
      this.triggerAugmentSelection();
    }

    // Give income & roll shop for all alive players
    for (const p of this.players) {
      if (p.isEliminated) continue;

      if (!p.isShopLocked) {
        this.rollShop(p, true);
      }
    }
  }

  private triggerAugmentSelection() {
    this.roundPhase = 'AUGMENT_SELECT';
    // Pick 3 random augments
    const shuffled = [...AUGMENTS_DATA].sort(() => 0.5 - Math.random());
    this.augmentOptions = shuffled.slice(0, 3);
  }

  public selectAugment(player: PlayerState, augment: AugmentData) {
    player.augments.push(augment);

    // Apply immediate effect
    if (augment.effect.type === 'gold_instant') {
      player.gold += augment.effect.value;
    } else if (augment.effect.type === 'xp_grant') {
      player.currentXp += augment.effect.value;
      while (player.currentXp >= player.requiredXp && player.level < 9) {
        player.currentXp -= player.requiredXp;
        player.level += 1;
        player.requiredXp = LEVEL_XP_REQUIREMENTS[player.level] || 999;
      }
    }

    // Resume planning
    this.roundPhase = 'PLANNING';
    soundEngine.playLevelUp();
  }

  public startCombatPhase() {
    this.roundPhase = 'COMBAT';
    this.phaseTimer = 35;
    this.activeCombatEngines.clear();

    const alivePlayers = this.players.filter((p) => !p.isEliminated);

    // Matchmaking pairs (1v1 arenas)
    const shuffled = [...alivePlayers].sort(() => 0.5 - Math.random());

    for (let i = 0; i < shuffled.length; i += 2) {
      const p1 = shuffled[i];
      const p2 = shuffled[i + 1] || shuffled[0]; // Clone / ghost if odd

      p1.currentOpponentId = p2.id;
      if (shuffled[i + 1]) p2.currentOpponentId = p1.id;

      // Invert p2's grid positions for combat so they start in enemy half (rows 0-3)
      const p2InvertedUnits = p2.board.map((u) => {
        if (!u.gridPosition) return u;
        const { row, col } = axialToRowCol(u.gridPosition);
        const invertedRow = 7 - row; // flip to rows 0-3
        const invertedCol = 6 - col;
        return {
          ...u,
          gridPosition: rowColToAxial(invertedRow, invertedCol),
        };
      });

      const engine = new CombatEngine(
        p1.board,
        p2InvertedUnits,
        this.getActiveTraits(p1),
        this.getActiveTraits(p2)
      );

      this.activeCombatEngines.set(p1.id, engine);
      if (shuffled[i + 1]) {
        this.activeCombatEngines.set(p2.id, engine);
      }
    }
  }

  public startTransitionPhase() {
    this.roundPhase = 'TRANSITION';
    this.phaseTimer = 5;

    // Evaluate combat results for all players
    const alivePlayers = this.players.filter((p) => !p.isEliminated);

    for (const player of alivePlayers) {
      const engine = this.activeCombatEngines.get(player.id);
      if (!engine) continue;

      const isWinner = engine.winner === 'ally';
      player.lastRoundWon = isWinner;

      if (isWinner) {
        player.streak = player.streak >= 0 ? player.streak + 1 : 1;
        if (player.isHuman) soundEngine.playVictory();
      } else {
        player.streak = player.streak <= 0 ? player.streak - 1 : -1;
        if (player.isHuman) soundEngine.playDefeat();

        // Calculate damage to player HP: 2 (base) + 1 per surviving enemy unit
        const survivingEnemies = engine.enemies.filter((u) => u.state !== 'DEAD' && u.currentHealth > 0);
        let damage = 2;
        for (const e of survivingEnemies) {
          damage += e.starLevel;
        }

        player.health = Math.max(0, player.health - damage);

        if (player.health === 0) {
          player.isEliminated = true;
          player.placement = this.players.filter((p) => !p.isEliminated).length + 1;
        }
      }

      // Random Item drops during PvE or round transitions
      if (Math.random() < 0.25) {
        const itemComponents = Object.keys(BASIC_COMPONENTS);
        const randomItem = itemComponents[Math.floor(Math.random() * itemComponents.length)];
        const emptySlot = player.itemBench.findIndex((s) => s === null);
        if (emptySlot !== -1) {
          player.itemBench[emptySlot] = randomItem;
        }
      }
    }

    // Update placements
    const activeSorted = [...this.players].sort((a, b) => b.health - a.health);
    activeSorted.forEach((p, idx) => {
      if (!p.isEliminated) {
        p.placement = idx + 1;
      }
    });
  }

  /**
   * Main game loop tick (invoked from requestAnimationFrame / interval)
   */
  public update(dt: number) {
    const adjustedDt = dt * this.gameSpeed;

    // In sandbox/board mode, keep indefinitely in planning mode
    if (this.roundPhase === 'PLANNING') {
      this.phaseTimer = 999;
      return;
    }

    this.phaseTimer -= adjustedDt;

    if (this.roundPhase === 'COMBAT') {
      let allCombatsOver = true;
      for (const engine of Array.from(this.activeCombatEngines.values())) {
        engine.step(adjustedDt);
        if (!engine.isOver) {
          allCombatsOver = false;
        }
      }

      if (allCombatsOver || this.phaseTimer <= 0) {
        this.startTransitionPhase();
      }
    } else if (this.roundPhase === 'TRANSITION') {
      if (this.phaseTimer <= 0) {
        this.startPlanningPhase();
      }
    }
  }

  public addGold(player: PlayerState, amount = 10) {
    player.gold += amount;
    if (player.isHuman) soundEngine.playBuy();
  }

  public addXp(player: PlayerState, amount = 4) {
    if (player.level >= 9) return;
    player.currentXp += amount;
    while (player.currentXp >= player.requiredXp && player.level < 9) {
      player.currentXp -= player.requiredXp;
      player.level += 1;
      player.requiredXp = LEVEL_XP_REQUIREMENTS[player.level] || 999;
    }
    if (player.isHuman) soundEngine.playLevelUp();
  }

  public clearBoard(player: PlayerState) {
    const units = [...player.board];
    for (const u of units) {
      this.moveUnitToBench(player, u.instanceId);
    }
  }

  public spawnChampion(player: PlayerState, championId: string) {
    const emptyBench = player.bench.findIndex((b) => b === null);
    if (emptyBench === -1) return false;
    const unit = this.createBoardUnit(championId, player.id, 1, 0, 0);
    unit.gridPosition = null;
    unit.benchIndex = emptyBench;
    player.bench[emptyBench] = unit;
    this.checkUnitFusions(player, championId);
    if (player.isHuman) soundEngine.playPlaceUnit();
    return true;
  }

  /**
   * Simple Bot AI to buy champions, level up, position units, equip items
   */
  private executeBotAI(bot: PlayerState) {
    // Level up if high gold
    if (bot.gold >= 30 && bot.level < 8) {
      this.buyXp(bot);
    }

    // Buy matching shop units
    bot.shop.forEach((champId, idx) => {
      if (champId && bot.gold >= 6) {
        this.buyChampion(bot, idx);
      }
    });

    // Place bench units onto board if under level cap
    const benchUnits = bot.bench.filter((u): u is BoardUnit => u !== null);
    for (const bUnit of benchUnits) {
      if (bot.board.length < bot.level) {
        // Find empty allied tile
        for (let r = 4; r <= 7; r++) {
          for (let c = 0; c <= 6; c++) {
            const coord = rowColToAxial(r, c);
            const isTaken = bot.board.some(
              (u) => u.gridPosition && u.gridPosition.q === coord.q && u.gridPosition.r === coord.r
            );
            if (!isTaken) {
              this.moveUnitToBoard(bot, bUnit.instanceId, r, c);
              break;
            }
          }
          if (bUnit.gridPosition) break;
        }
      }
    }

    // Equip items
    bot.itemBench.forEach((itemId, idx) => {
      if (itemId && bot.board.length > 0) {
        const carry = bot.board[0];
        if (carry.items.length < 3) {
          this.equipItem(bot, idx, carry.instanceId);
        }
      }
    });
  }

  public setGameSpeed(speed: number) {
    this.gameSpeed = speed;
  }

  public toggleLockShop(player: PlayerState) {
    player.isShopLocked = !player.isShopLocked;
  }

  public setPlayerLittleLegend(playerId: string, legendId: string) {
    const p = this.players.find((pl) => pl.id === playerId);
    if (p) {
      p.littleLegendId = legendId;
    }
  }
}
