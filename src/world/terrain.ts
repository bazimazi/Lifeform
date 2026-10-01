import type { GameState, Vec } from '../core/types';
import type { Region } from './types';
import { hash, clamp } from '../core/random';
import { BIOMES } from '../data/biology';
export interface Terrain {
  columns: number;
  rows: number;
  heights: number[];
  moisture: number[];
  rivers: Vec[][];
}
export function createTerrain(
  seed: string,
  width: number,
  height: number,
  regions: Region[],
): Terrain {
  const columns = 32,
    rows = 24,
    heights: number[] = [],
    moisture: number[] = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const px = ((x + 0.5) * width) / columns,
        py = ((y + 0.5) * height) / rows,
        r = regions.find(
          (r) => px >= r.x && px < r.x + r.width && py >= r.y && py < r.y + r.height,
        )!,
        b = BIOMES.find((b) => b.id === r.biomeId)!;
      const noise = (hash(`${seed}:relief:${x}:${y}`) % 1000) / 1000;
      heights.push(clamp((b.aquatic ? 0.1 : b.elevation * 0.6 + 0.2) + noise * 0.15, 0, 1));
      moisture.push(clamp(r.moisture + (noise - 0.5) * 0.2, 0, 1));
    }
  const source = regions.find((r) => r.biomeId === 'mountain')!,
    sea = regions.find((r) => r.biomeId === 'ocean')!;
  const rivers = [0, 1, 2].map((i) =>
    Array.from({ length: 16 }, (_, j) => {
      const t = j / 15,
        wave = Math.sin(t * Math.PI * 3 + i) * width * 0.035 * Math.sin(t * Math.PI);
      return {
        x: clamp(
          (source.x + source.width * (0.3 + i * 0.2)) * (1 - t) +
            (sea.x + sea.width * (0.3 + i * 0.2)) * t +
            wave,
          20,
          width - 20,
        ),
        y: clamp(
          (source.y + source.height * 0.5) * (1 - t) + (sea.y + sea.height * 0.5) * t,
          20,
          height - 20,
        ),
      };
    }),
  );
  return { columns, rows, heights, moisture, rivers };
}
export function terrainAt(s: GameState, p: Vec) {
  const t = s.world.terrain;
  if (!t) return { height: 0, moisture: 0.5, river: false };
  const index =
    Math.min(t.rows - 1, Math.max(0, Math.floor((p.y / s.world.height) * t.rows))) * t.columns +
    Math.min(t.columns - 1, Math.max(0, Math.floor((p.x / s.world.width) * t.columns)));
  const river = t.rivers.some((path) =>
    path.some((a, i) => {
      if (!i) return false;
      const b = path[i - 1],
        dx = b.x - a.x,
        dy = b.y - a.y,
        u = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      return Math.hypot(p.x - a.x - u * dx, p.y - a.y - u * dy) < 35;
    }),
  );
  return { height: t.heights[index], moisture: river ? 1 : t.moisture[index], river };
}
export function validateTerrain(s: GameState) {
  const t = s.world.terrain;
  if (!t) return;
  const n = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (
    !Number.isInteger(t.columns) ||
    !Number.isInteger(t.rows) ||
    t.columns < 1 ||
    t.rows < 1 ||
    t.columns > 128 ||
    t.rows > 128 ||
    !Array.isArray(t.heights) ||
    !Array.isArray(t.moisture) ||
    t.heights.length !== t.columns * t.rows ||
    t.moisture.length !== t.heights.length ||
    [...t.heights, ...t.moisture].some((v) => !n(v) || v < 0 || v > 1) ||
    !Array.isArray(t.rivers) ||
    t.rivers.length > 20 ||
    t.rivers.some(
      (path) =>
        !Array.isArray(path) ||
        path.length > 100 ||
        path.some(
          (p) =>
            !p ||
            !n(p.x) ||
            !n(p.y) ||
            p.x < 0 ||
            p.y < 0 ||
            p.x > s.world.width ||
            p.y > s.world.height,
        ),
    )
  )
    throw new Error('Invalid save: terrain');
}
