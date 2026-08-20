import { AugmentData } from '@/types/game';

export const AUGMENTS_DATA: AugmentData[] = [
  // Silver
  {
    id: 'silver_rich',
    name: 'Rich Get Richer',
    tier: 'silver',
    description: 'Gain 10 Gold immediately. Maximum interest is increased to 7 Gold at 70g.',
    icon: 'Coins',
    effect: { type: 'interest_cap', value: 7 },
  },
  {
    id: 'silver_hyperoll',
    name: 'Hyperoll Express',
    tier: 'silver',
    description: 'Gain 15 Gold and 3 free shop rerolls.',
    icon: 'RefreshCw',
    effect: { type: 'gold_instant', value: 15 },
  },
  {
    id: 'silver_brawler_crest',
    name: 'Brawler Vitality',
    tier: 'silver',
    description: 'Brawlers gain an additional +200 Health and 10 Armor.',
    icon: 'Heart',
    effect: { type: 'trait_bonus', value: 200, trait: 'brawler' },
  },
  {
    id: 'silver_vanguard_iron',
    name: 'Iron Bastion',
    tier: 'silver',
    description: 'Vanguard units reflect 25 physical damage on being hit.',
    icon: 'Shield',
    effect: { type: 'trait_bonus', value: 25, trait: 'vanguard' },
  },
  {
    id: 'silver_mage_mana',
    name: 'Arcane Overflow',
    tier: 'silver',
    description: 'Mages start combat with +20 additional Mana.',
    icon: 'Sparkles',
    effect: { type: 'trait_bonus', value: 20, trait: 'mage' },
  },

  // Gold
  {
    id: 'gold_celestial_blessing',
    name: 'Celestial Blessing II',
    tier: 'gold',
    description: 'All units heal for 25% of damage dealt. Excess healing converts to a shield.',
    icon: 'Sun',
    effect: { type: 'combat_buff', value: 25 },
  },
  {
    id: 'gold_assassin_edge',
    name: 'Shadow Precision',
    tier: 'gold',
    description: 'Assassins gain +30% Crit Chance and their crits bleed for 20% damage.',
    icon: 'Crosshair',
    effect: { type: 'trait_bonus', value: 30, trait: 'assassin' },
  },
  {
    id: 'gold_level_up',
    name: 'Fast Track Fast 8',
    tier: 'gold',
    description: 'Gain 24 XP immediately and buying XP costs 1 less gold.',
    icon: 'TrendingUp',
    effect: { type: 'xp_grant', value: 24 },
  },
  {
    id: 'gold_cyber_uplink',
    name: 'Cybernetic Uplink',
    tier: 'gold',
    description: 'Cybernetic units gain +250 HP and regenerate 4 Mana per second.',
    icon: 'Cpu',
    effect: { type: 'trait_bonus', value: 250, trait: 'cybernetic' },
  },
  {
    id: 'gold_void_corruption',
    name: 'Void Corruption',
    tier: 'gold',
    description: 'Void units execute enemies below 12% max Health.',
    icon: 'Skull',
    effect: { type: 'trait_bonus', value: 12, trait: 'void' },
  },

  // Prismatic
  {
    id: 'prismatic_dragon_soul',
    name: 'Dragon Soul Ascendance',
    tier: 'prismatic',
    description: 'Dragons gain +1000 Health, +50 AP/AD, and your team counts as having +2 Dragon trait.',
    icon: 'Zap',
    effect: { type: 'combat_buff', value: 1000, trait: 'dragon' },
  },
  {
    id: 'prismatic_windfall',
    name: 'Prismatic Windfall',
    tier: 'prismatic',
    description: 'Gain 45 Gold immediately.',
    icon: 'Coins',
    effect: { type: 'gold_instant', value: 45 },
  },
  {
    id: 'prismatic_radiant_relics',
    name: 'Radiant Armory',
    tier: 'prismatic',
    description: 'All your completed items grant +30% increased stats.',
    icon: 'Gem',
    effect: { type: 'combat_buff', value: 30 },
  },
];
