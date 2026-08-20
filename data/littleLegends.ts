export interface LittleLegendData {
  id: string;
  name: string;
  title: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  color: number;
  accentColor: number;
  icon: string;
  modelId?: string; // 3D GLB model key if available
  proceduralType?: 'river_sprite' | 'pengu' | 'dowsie' | 'furyhorn';
  description: string;
}

export const LITTLE_LEGENDS: LittleLegendData[] = [
  {
    id: 'river_sprite',
    name: 'Sprite del Río',
    title: 'Guardián de Aguas Celestiales',
    rarity: 'common',
    color: 0x38bdf8,
    accentColor: 0x0284c7,
    icon: '🌊',
    proceduralType: 'river_sprite',
    description: 'El fiel y clásico compañero de todo estratega. Brilla con energía de agua pura.',
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
    description: 'El legendario espadachín emplumado con capa real y pasión por la victoria.',
  },
  {
    id: 'scuttlecrab',
    name: 'Kabu Escarabajo',
    title: 'Cangrejo del Río Místico',
    rarity: 'rare',
    color: 0x10b981,
    accentColor: 0x059669,
    icon: '🦀',
    modelId: 'scuttlecrab',
    description: 'Ágil y escurridizo habitante del río que adora bailar sobre los hexágonos.',
  },
  {
    id: 'cinderling',
    name: 'Cinderling Ígneo',
    title: 'Llama Danzante',
    rarity: 'epic',
    color: 0xf97316,
    accentColor: 0xef4444,
    icon: '🔥',
    modelId: 'cinderling',
    description: 'Espíritu de fuego voraz que deja estelas incandescentes al correr por la arena.',
  },
  {
    id: 'kobuko',
    name: 'Kobuko Panda',
    title: 'Maestro de la Fortuna',
    rarity: 'legendary',
    color: 0x84cc16,
    accentColor: 0xfacc15,
    icon: '🐼',
    modelId: 'kobuko',
    description: 'Estratega pacífico y sabio que bendice las tiradas de la tienda con buena suerte.',
  },
  {
    id: 'teemo_chibi',
    name: 'Chibi Teemo',
    title: 'Explorador Veloz',
    rarity: 'mythic',
    color: 0x14b8a6,
    accentColor: 0x10b981,
    icon: '🦡',
    modelId: 'teemo',
    description: 'El explorador más temido y adorable, siempre listo con sus risas y saltos acrobáticos.',
  },
  {
    id: 'pebbles',
    name: 'Pebbles Golem',
    title: 'Roca Sagrada',
    rarity: 'rare',
    color: 0x64748b,
    accentColor: 0x38bdf8,
    icon: '🪨',
    modelId: 'pebbles',
    description: 'Pequeño golem de piedra rúnica que vibra con poder arcano.',
  },
  {
    id: 'ahri_chibi',
    name: 'Chibi Ahri',
    title: 'Espíritu de Nueve Colas',
    rarity: 'mythic',
    color: 0xf43f5e,
    accentColor: 0xa855f7,
    icon: '🦊',
    modelId: 'ahri',
    description: 'Mítica estratega de espíritu zorro con orbes mágicos flotantes y giros celestiales.',
  },
  {
    id: 'gromp',
    name: 'Gromp Saltarín',
    title: 'Señor del Pantano',
    rarity: 'rare',
    color: 0x0d9488,
    accentColor: 0xa3e635,
    icon: '🐸',
    modelId: 'gromp',
    description: 'Rana gigante que rebota con gracia sobre el tablero celebrando cada ronda.',
  },
];

export function getLittleLegendById(id: string): LittleLegendData {
  return LITTLE_LEGENDS.find((l) => l.id === id) || LITTLE_LEGENDS[0];
}
