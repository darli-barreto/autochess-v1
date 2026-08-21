// --- ARCHIVO: src/data/littleLegends.ts ---

export interface LittleLegendData {
  id: string;
  name: string;
  title: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  color: number;
  accentColor: number;
  icon: string;
  modelFile?: string;
  scale?: number;
  offsetY?: number;
  description?: string;
}

export const LITTLE_LEGENDS: LittleLegendData[] = [
  {
    id: 'prestige_chibi_spirit_blossom_ahri',
    name: 'Chibi Ahri Flor Espiritual Prestigio',
    title: 'Espíritu Inmortal',
    rarity: 'mythic',
    color: 0xf43f5e,
    accentColor: 0xfbbf24,
    icon: '🦊',
    modelFile: 'prestige_chibi_spirit_blossom_ahri.glb',
    scale: 1.0,
  },
  {
    id: 'chibi_spirit_blossom_ahri',
    name: 'Chibi Ahri Flor Espiritual',
    title: 'Guía de Almas',
    rarity: 'mythic',
    color: 0xec4899,
    accentColor: 0xa855f7,
    icon: '🌸',
    modelFile: 'chibi_spirit_blossom_ahri.glb',
    scale: 1.0,
  },
  {
    id: 'chibi_t1_yone',
    name: 'Chibi T1 Yone',
    title: 'Campeón Mundial',
    rarity: 'mythic',
    color: 0xd97706,
    accentColor: 0xef4444,
    icon: '⚔️',
    modelFile: 'chibi_t1_yone.glb',
    scale: 1.0,
  },
  {
    id: 'chibi_aatrox',
    name: 'Chibi Aatrox',
    title: 'Espada de los Oscuros',
    rarity: 'mythic',
    color: 0xef4444,
    accentColor: 0x7f1d1d,
    icon: '🗡️',
    modelFile: 'chibi_aatrox.glb',
    scale: 1.0,
  },
  {
    id: 'divine_brilliance_pengu',
    name: 'Pingüino Brillo Divino',
    title: 'Soberano Celestial',
    rarity: 'mythic',
    color: 0x38bdf8,
    accentColor: 0xfacc15,
    icon: '🐧',
    modelFile: 'divine_brilliance_pengu.glb',
    scale: 0.95,
  },
  {
    id: 'god_of_tactics_pengu',
    name: 'Pingüino Dios de la Estrategia',
    title: 'Señor del Tablero',
    rarity: 'legendary',
    color: 0xf59e0b,
    accentColor: 0x3b82f6,
    icon: '👑',
    modelFile: 'god_of_tactics_pengu.glb',
    scale: 0.95,
  },
  {
    id: 'chibi_iblitzcrank',
    name: 'Chibi iBlitzcrank',
    title: 'Gran Gólem Cibernético',
    rarity: 'legendary',
    color: 0x06b6d4,
    accentColor: 0x3b82f6,
    icon: '🤖',
    modelFile: 'chibi_iblitzcrank.glb',
    scale: 0.95,
  },
  {
    id: 'chibi_surprise_party_amumu',
    name: 'Chibi Amumu Fiesta Sorpresa',
    title: 'Cumpleaños Solitario',
    rarity: 'epic',
    color: 0xec4899,
    accentColor: 0xf59e0b,
    icon: '🎈',
    modelFile: 'chibi_surprise_party_amumu.glb',
    scale: 0.95,
  },
  {
    id: 'ghost_doughcat',
    name: 'Gatito Masa Espectral',
    title: 'Espíritu Amasado',
    rarity: 'epic',
    color: 0x8b5cf6,
    accentColor: 0x06b6d4,
    icon: '🐱',
    modelFile: 'ghost_doughcat.glb',
    scale: 0.9,
  },
  {
    id: 'dearest_bungo',
    name: 'Bungo Querido',
    title: 'Compañero Fiel',
    rarity: 'rare',
    color: 0x10b981,
    accentColor: 0x84cc16,
    icon: '🐾',
    modelFile: 'dearest_bungo.glb',
    scale: 0.9,
  },
];

export function getLittleLegendById(id: string): LittleLegendData {
  return LITTLE_LEGENDS.find((l) => l.id === id) || LITTLE_LEGENDS[0];
}