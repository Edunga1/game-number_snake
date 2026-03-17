import { FoodItem } from '../types';
import { Vec2 } from '../utils/Vec2';
import { FoodManager } from './Food';
import { Snake } from './Snake';
import { GRID_COLS, PLAY_ROWS, PLAY_Y_OFFSET, FOOD_COUNT_TARGET } from '../constants';
import { weightedRandom } from '../utils/random';

export class FoodSpawner {
  spawn(foodManager: FoodManager, snake: Snake, maxValue: number): void {
    while (foodManager.items.length < FOOD_COUNT_TARGET) {
      const pos = this.findEmptyCell(foodManager, snake);
      if (!pos) break;
      const value = this.randomValue(maxValue);
      foodManager.add({ pos, value });
    }
  }

  private findEmptyCell(foodManager: FoodManager, snake: Snake): Vec2 | null {
    // Try random positions up to 100 times
    for (let i = 0; i < 100; i++) {
      const x = Math.floor(Math.random() * GRID_COLS);
      const y = PLAY_Y_OFFSET + Math.floor(Math.random() * PLAY_ROWS);
      const pos = { x, y };
      if (!snake.occupies(pos) && !foodManager.occupies(pos)) {
        return pos;
      }
    }
    return null;
  }

  private randomValue(maxValue: number): number {
    // Weighted: lower values more common
    const weights: number[] = [];
    for (let v = 1; v <= maxValue; v++) {
      weights.push(maxValue - v + 1); // e.g. max=4: [4,3,2,1]
    }
    return weightedRandom(weights) + 1;
  }

  spawnSingle(foodManager: FoodManager, snake: Snake, maxValue: number): FoodItem | null {
    const pos = this.findEmptyCell(foodManager, snake);
    if (!pos) return null;
    const value = this.randomValue(maxValue);
    const item: FoodItem = { pos, value };
    foodManager.add(item);
    return item;
  }
}
