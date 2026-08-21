// --- ARCHIVO: src/data/littleLegends.ts ---

export interface LittleLegendData {
  id: string;
  name: string;
  title: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  color: number;
  accentColor: number;
  icon: string;
  modelFile?: string; // Solo poner si el archivo .glb EXISTE en public/minileyendas/
  scale?: number;
  offsetY?: number;
  proceduralType?: 'river_sprite' | 'pengu' | 'dowsie' | 'furyhorn';
  description: string;
}

export const LITTLE_LEGENDS: LittleLegendData[] = [
  {
    id: 'prestige_chibi_spirit_blossom_ahri',
    name: 'Chibi Ahri',
    title: 'Espíritu de Nueve Colas',
    rarity: 'mythic',
    color: 0xf43f5e,
    accentColor: 0xa855f7,
    icon: '🦊',
    modelFile: 'prestige_chibi_spirit_blossom_ahri.glb', // ✅ Archivo presente en public/minileyendas/
    scale: 1.0,
    description: 'Mítica estratega de espíritu zorro con orbes mágicos y giros celestiales.',
  },
   {
    id: 'chibi_battle_bat_xayah',
    name: 'Chibi Xayah Murciélago de Batalla',
    title: 'Vanguardia Nocturna',
    rarity: 'mythic',
    color: 0xa855f7,
    accentColor: 0xec4899,
    icon: '🦇',
    modelFile: 'chibi_battle_bat_xayah.glb', // 👈 Archivo del rival en public/minileyendas/
    scale: 1.0,
    description: 'Estratega alada con plumas afiladas y estilo de combate acrobático.',
  },
  {
    id: 'arcane_jinx_unbound',
    name: 'Jinx Arcane Desatada',
    title: 'La Chispa del Caos',
    rarity: 'mythic',
    color: 0x06b6d4,
    accentColor: 0xec4899,
    icon: '💣',
    modelFile: 'arcane_jinx_unbound.glb',
    scale: 1.0,
    description: 'Estratega explosiva con armas personalizadas y actitud caótica.',
  },
  {
    id: 'chibi_aatrox',
    name: 'Chibi Aatrox',
    title: 'La Espada de los Oscuros',
    rarity: 'mythic',
    color: 0xef4444,
    accentColor: 0x991b1b,
    icon: '🗡️',
    modelFile: 'chibi_aatrox.glb',
    scale: 1.0,
    description: 'Guerrero oscuro colosal listo para dominar la arena.',
  },
  {
    id: 'river_sprite',
    name: 'Sprite del Río',
    title: 'Guardián de Aguas Celestiales',
    rarity: 'common',
    color: 0x38bdf8,
    accentColor: 0x0284c7,
    icon: '🌊',
    proceduralType: 'river_sprite',
    description: 'El fiel y clásico compañero de todo estratega.',
  },
  {
    id: 'pengu_knight',
    name: 'Pingüino Emplumado',
    title: 'Caballero de la Pluma',
    rarity: 'epic',
    color: 0x0284c7,
    accentColor: 0xf59e0b,
    icon: '🐧',
    proceduralType: 'pengu',
    description: 'El legendario espadachín emplumado con capa real.',
  },
];

export function getLittleLegendById(id: string): LittleLegendData {
  return LITTLE_LEGENDS.find((l) => l.id === id) || LITTLE_LEGENDS[0];
}