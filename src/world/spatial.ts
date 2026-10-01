import type { Vec } from '../core/types';

export class SpatialGrid<T extends Vec> {
  private cells = new Map<string, T[]>();
  constructor(private size = 160) {}
  rebuild(items: T[]) {
    this.cells.clear();
    for (const item of items) {
      const key = `${Math.floor(item.x / this.size)},${Math.floor(item.y / this.size)}`;
      const cell = this.cells.get(key);
      if (cell) cell.push(item);
      else this.cells.set(key, [item]);
    }
  }
  query(point: Vec, radius: number): T[] {
    const result: T[] = [];
    for (
      let x = Math.floor((point.x - radius) / this.size);
      x <= Math.floor((point.x + radius) / this.size);
      x++
    ) {
      for (
        let y = Math.floor((point.y - radius) / this.size);
        y <= Math.floor((point.y + radius) / this.size);
        y++
      ) {
        const cell = this.cells.get(`${x},${y}`);
        if (cell)
          for (const item of cell)
            if ((item.x - point.x) ** 2 + (item.y - point.y) ** 2 <= radius ** 2) result.push(item);
      }
    }
    return result;
  }
}
