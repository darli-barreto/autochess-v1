export type TraitId = string;

export type DamageType = 'physical' | 'magic' | 'true';

export type UnitState = 'IDLE' | 'MOVING' | 'ATTACKING' | 'CASTING' | 'STUNNED' | 'DEAD';

export interface AxialCoord {
  q: number;
  r: number;
}

export interface ChampionBaseData {
  id: string;
  name: string;
  title: string;
  tier: 1 | 2 | 3 | 4 | 5;
  cost: number;
  traits: TraitId[];
  color: string;
  accentColor: string;
  image?: string;
  stats: {
    health: [number, number, number]; // 1-star, 2-star, 3-star
    armor: number;
    magicResist: number;
    attackDamage: [number, number, number];
    attackSpeed: number; // attacks per second
    attackRange: number; // in hexes (1 = melee, 2-4 = ranged)
    startingMana: number;
    maxMana: number;
    critChance: number; // e.g. 0.25 (25%)
    critMultiplier: number; // e.g. 1.5
  };
  ability: {
    name: string;
    description: string;
    targetRule: 'current_target' | 'lowest_hp' | 'furthest' | 'aoe_circle' | 'line' | 'self_buff';
    castTimeMs: number;
    damageType: DamageType;
    values: {
      damage: [number, number, number];
      heal?: [number, number, number];
      shield?: [number, number, number];
      duration?: [number, number, number];
      aoeRadius?: number;
    };
    vfxId: string;
  };
  icon?: string;
  modelType?: 'warrior' | 'mage' | 'archer' | 'beast' | 'assassin' | 'golem' | 'paladin' | 'dragon' | string;
}

export interface ItemComponent {
  id: string;
  name: string;
  icon: string;
  stats: {
    ad?: number;
    ap?: number;
    armor?: number;
    mr?: number;
    health?: number;
    mana?: number;
    attackSpeed?: number;
    critChance?: number;
    dodge?: number;
  };
  description: string;
  color: string;
}

export interface CompletedItem {
  id: string;
  name: string;
  icon: string;
  isCompleted: true;
  recipe: [string, string];
  stats: {
    ad?: number;
    ap?: number;
    armor?: number;
    mr?: number;
    health?: number;
    mana?: number;
    attackSpeed?: number;
    critChance?: number;
    dodge?: number;
  };
  passive: {
    name: string;
    description: string;
    effectType:
      | 'on_attack_burn'
      | 'mana_on_cast'
      | 'execute'
      | 'shield_on_low'
      | 'attack_speed_stack'
      | 'crit_damage'
      | 'ap_mult'
      | 'revive'
      | 'omnivamp'
      | 'spell_crit'
      | 'armor_aoe'
      | 'mr_reflect';
  };
  color: string;
}

export type ItemData = ItemComponent | CompletedItem;

export interface TraitData {
  id: TraitId;
  name: string;
  description: string;
  icon: string;
  image?: string;
  color: string;
  thresholds: {
    count: number;
    tier: 'bronze' | 'silver' | 'gold' | 'prismatic';
    description: string;
    bonus: {
      ad?: number;
      ap?: number;
      armor?: number;
      mr?: number;
      hp?: number;
      manaGen?: number;
      critChance?: number;
      lifesteal?: number;
      shield?: number;
    };
  }[];
}

export interface AugmentData {
  id: string;
  name: string;
  tier: 'silver' | 'gold' | 'prismatic';
  description: string;
  icon: string;
  effect: {
    type: 'gold_instant' | 'interest_cap' | 'xp_grant' | 'trait_bonus' | 'combat_buff' | 'reroll_free';
    value: number;
    trait?: TraitId;
  };
}

export interface BoardUnit {
  instanceId: string;
  championId: string;
  starLevel: 1 | 2 | 3;
  items: string[]; // item IDs, max 3
  gridPosition: AxialCoord | null; // null if on bench
  benchIndex: number | null; // 0-8 if on bench
  currentHealth: number;
  maxHealth: number;
  currentMana: number;
  maxMana: number;
  shield: number;
  ownerId: string; // player ID
  team: 'ally' | 'enemy';
  state: UnitState;
  targetInstanceId: string | null;
  currentPath: AxialCoord[];
  attackCooldown: number; // in seconds
  castingTimer: number;
  stunTimer: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalHealing: number;
  kills: number;
}

export type RoundPhase = 'PLANNING' | 'COMBAT' | 'TRANSITION' | 'CAROUSEL' | 'AUGMENT_SELECT';

export type RoundType = 'PVE_MINIONS' | 'PVP' | 'CAROUSEL' | 'AUGMENTS';

export interface RoundInfo {
  stage: number;
  round: number;
  type: RoundType;
  pveEnemies?: { id: string; name: string; health: number; ad: number; model: string }[];
}

export interface PlayerState {
  id: string;
  name: string;
  isHuman: boolean;
  avatar: string;
  littleLegendId?: string;
  health: number;
  level: number;
  currentXp: number;
  requiredXp: number;
  gold: number;
  streak: number; // positive for win streak, negative for loss streak
  interestEarned: number;
  board: BoardUnit[]; // active combat units on hex grid
  bench: (BoardUnit | null)[]; // 9 slots
  itemBench: (string | null)[]; // 10 slots
  shop: (string | null)[]; // 5 champion IDs
  isShopLocked: boolean;
  augments: AugmentData[];
  currentOpponentId: string | null;
  isEliminated: boolean;
  placement: number;
  lastRoundWon: boolean;
}

export interface DamageNumberEvent {
  id: string;
  amount: number;
  damageType: DamageType;
  isCrit: boolean;
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface ProjectileEvent {
  id: string;
  sourceX: number;
  sourceY: number;
  sourceZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  color: string;
  speed: number;
  progress: number; // 0 to 1
  vfx: string;
}

export interface VisualEffectEvent {
  id: string;
  type: 'spell_cast' | 'hit_impact' | 'level_up' | 'death_burst' | 'buff_ring';
  x: number;
  y: number;
  z: number;
  color: string;
  radius: number;
  duration: number;
  age: number;
}
