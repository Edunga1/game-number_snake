import { FoodItem } from '../types';
import { Vec2, vec2Eq } from '../utils/Vec2';

export class FoodManager {
  items: FoodItem[] = [];

  add(item: FoodItem) {
    item.spawnTime = performance.now();
    this.items.push(item);
  }

  removeAt(pos: Vec2): FoodItem | null {
    const idx = this.items.findIndex(f => vec2Eq(f.pos, pos));
    if (idx === -1) return null;
    return this.items.splice(idx, 1)[0];
  }

  getAt(pos: Vec2): FoodItem | undefined {
    return this.items.find(f => vec2Eq(f.pos, pos));
  }

  occupies(pos: Vec2): boolean {
    return this.items.some(f => vec2Eq(f.pos, pos));
  }

  clear() {
    this.items = [];
  }
}
