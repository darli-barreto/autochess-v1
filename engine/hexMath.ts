// src/engine/hexMath.ts

import { AxialCoord } from '@/types/game';
import { ARENA_CONFIG } from '@/components/arena/arenaConfig';

export const BOARD_ROWS = 8; // 0 to 3: enemy, 4 to 7: ally
export const BOARD_COLS = 7;
export const HEX_RADIUS = 1.0; // 1 unit in 3D world

// Axial directions for pointy-topped / staggered hex grid
export const HEX_DIRECTIONS: AxialCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/**
 * Convert row & col (0-7, 0-6) into axial coordinate (q, r)
 * Uses "odd-r" horizontal layout standard in TFT
 */
export function rowColToAxial(row: number, col: number): AxialCoord {
  const q = col - Math.floor(row / 2);
  const r = row;
  return { q, r };
}

/**
 * Convert axial coordinate (q, r) back to (row, col)
 */
export function axialToRowCol(coord: AxialCoord): { row: number; col: number } {
  const row = coord.r;
  const col = coord.q + Math.floor(coord.r / 2);
  return { row, col };
}

/**
 * Check if axial coordinate is on valid board
 */
export function isValidBoardCoord(coord: AxialCoord): boolean {
  const { row, col } = axialToRowCol(coord);
  return row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS;
}

/**
 * Calculate axial distance between two coordinates
 */
export function hexDistance(a: AxialCoord, b: AxialCoord): number {
  const aq = a.q;
  const ar = a.r;
  const as = -aq - ar;

  const bq = b.q;
  const br = b.r;
  const bs = -bq - br;

  return Math.max(Math.abs(aq - bq), Math.abs(ar - br), Math.abs(as - bs));
}

/**
 * Get 6 neighboring axial coordinates
 */
export function getHexNeighbors(coord: AxialCoord): AxialCoord[] {
  return HEX_DIRECTIONS.map((dir) => ({
    q: coord.q + dir.q,
    r: coord.r + dir.r,
  })).filter(isValidBoardCoord);
}

/**
 * ⬡ Convierte coordenada axial a posición 3D usando el espaciado dinámico de arenaConfig
 */
export function axialToWorld3D(coord: AxialCoord, heightOffset = 0): { x: number; y: number; z: number } {
  const { row, col } = axialToRowCol(coord);
  const conf = ARENA_CONFIG.hexGrid;

  // Usa spacingX y spacingZ configurados en arenaConfig.ts
  const width = conf?.spacingX ?? (Math.sqrt(3) * (conf?.radius || HEX_RADIUS));
  const height = conf?.spacingZ ?? (1.5 * (conf?.radius || HEX_RADIUS));

  const xOffset = (row % 2) * (width / 2);
  const x = (col - (BOARD_COLS - 1) / 2) * width + xOffset - (width / 4) + (conf?.offsetX || 0);
  const z = (row - (BOARD_ROWS - 1) / 2) * height + (conf?.offsetZ || 0);

  return { x, y: heightOffset, z };
}

/**
 * 🟦 Convierte índice de banca aliada (0..8) a 3D usando la configuración de arenaConfig
 */
export function benchIndexToWorld3D(index: number): { x: number; y: number; z: number } {
  const conf = ARENA_CONFIG.benches.ally;
  const spacing = conf?.spacing ?? 1.32;
  const startX = -((9 - 1) * spacing) / 2 + (conf?.xOffset ?? 0);
  const x = startX + index * spacing;
  const z = conf?.z ?? 6.7;
  return { x, y: conf?.y ?? 0.1, z };
}

/**
 * 🟥 Convierte índice de banca enemiga (0..8) a 3D usando la configuración de arenaConfig
 */
export function enemyBenchIndexToWorld3D(index: number): { x: number; y: number; z: number } {
  const conf = ARENA_CONFIG.benches.enemy;
  const spacing = conf?.spacing ?? 1.32;
  const startX = -((9 - 1) * spacing) / 2 + (conf?.xOffset ?? 0);
  const x = startX + index * spacing;
  const z = conf?.z ?? -6.7;
  return { x, y: conf?.y ?? 0.1, z };
}

/**
 * A* Pathfinding Algorithm on Axial Hex Grid
 */
interface AStarNode {
  coord: AxialCoord;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export function findHexPath(
  start: AxialCoord,
  goal: AxialCoord,
  occupiedCoords: Set<string>,
  maxRange = 1
): AxialCoord[] {
  if (hexDistance(start, goal) <= maxRange) {
    return [];
  }

  const coordKey = (c: AxialCoord) => `${c.q},${c.r}`;
  const openSet: AStarNode[] = [];
  const closedSet = new Set<string>();

  const startNode: AStarNode = {
    coord: start,
    g: 0,
    h: hexDistance(start, goal),
    f: hexDistance(start, goal),
    parent: null,
  };
  openSet.push(startNode);

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const curKey = coordKey(current.coord);

    if (hexDistance(current.coord, goal) <= maxRange) {
      const path: AxialCoord[] = [];
      let temp: AStarNode | null = current;
      while (temp && temp.parent) {
        path.unshift(temp.coord);
        temp = temp.parent;
      }
      return path;
    }

    closedSet.add(curKey);

    const neighbors = getHexNeighbors(current.coord);
    for (const neighbor of neighbors) {
      const nKey = coordKey(neighbor);
      if (closedSet.has(nKey)) continue;

      if (occupiedCoords.has(nKey) && nKey !== coordKey(goal)) {
        continue;
      }

      const tentativeG = current.g + 1;
      let neighborNode = openSet.find((node) => coordKey(node.coord) === nKey);

      if (!neighborNode) {
        const h = hexDistance(neighbor, goal);
        neighborNode = {
          coord: neighbor,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current,
        };
        openSet.push(neighborNode);
      } else if (tentativeG < neighborNode.g) {
        neighborNode.g = tentativeG;
        neighborNode.f = tentativeG + neighborNode.h;
        neighborNode.parent = current;
      }
    }
  }

  return [];
}