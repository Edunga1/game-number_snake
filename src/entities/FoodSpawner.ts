import { FoodItem } from '../types';
import { Vec2 } from '../utils/Vec2';
import { FoodManager } from './Food';
import { Snake } from './Snake';
import {
  GRID_COLS, PLAY_ROWS, PLAY_Y_OFFSET, FOOD_COUNT_TARGET,
  FOOD_CHANCE_MEANINGFUL, FOOD_CHANCE_EDIBLE, FOOD_CHANCE_DANGEROUS,
} from '../constants';
import { weightedRandom } from '../utils/random';

interface FoodPick {
  value: number;
  type: 'normal' | 'removal';
}

export class FoodSpawner {
  spawn(foodManager: FoodManager, snake: Snake): void {
    while (foodManager.items.length < FOOD_COUNT_TARGET) {
      const pos = this.findEmptyCell(foodManager, snake);
      if (!pos) break;
      const pick = this.pickFoodValue(snake);
      foodManager.add({ pos, value: pick.value, type: pick.type });
    }
  }

  spawnSingle(foodManager: FoodManager, snake: Snake): FoodItem | null {
    const pos = this.findEmptyCell(foodManager, snake);
    if (!pos) return null;
    const pick = this.pickFoodValue(snake);
    const item: FoodItem = { pos, value: pick.value, type: pick.type };
    foodManager.add(item);
    return item;
  }

  private pickFoodValue(snake: Snake): FoodPick {
    const headValue = snake.head.value;
    const tailValue = snake.tail.value;
    const segmentValues = new Set(snake.segments.map(s => s.value));

    // Build category pools
    const meaningful = [...segmentValues].filter(v => v <= headValue);
    const edible: number[] = [];
    for (let v = 1; v <= headValue; v++) {
      if (!segmentValues.has(v)) edible.push(v);
    }
    const dangerous: number[] = [];
    for (let v = headValue + 1; v <= headValue + 3; v++) {
      dangerous.push(v);
    }
    const minSegment = Math.min(...segmentValues);
    const lowOutliers: number[] = [];
    for (let v = 1; v < minSegment; v++) {
      lowOutliers.push(v);
    }

    // Adjust category chances: if edible is empty, merge into meaningful
    let chanceMeaningful = FOOD_CHANCE_MEANINGFUL;
    let chanceEdible = FOOD_CHANCE_EDIBLE;
    if (edible.length === 0) {
      chanceMeaningful += chanceEdible;
      chanceEdible = 0;
    }

    // Roll category
    const roll = Math.random();
    let cumulative = 0;

    // Meaningful (60%)
    cumulative += chanceMeaningful;
    if (roll < cumulative && meaningful.length > 0) {
      return { value: this.pickMeaningful(meaningful, tailValue, snake), type: 'normal' };
    }

    // Edible (25%)
    cumulative += chanceEdible;
    if (roll < cumulative && edible.length > 0) {
      const idx = Math.floor(Math.random() * edible.length);
      return { value: edible[idx], type: 'normal' };
    }

    // Dangerous (10%)
    cumulative += FOOD_CHANCE_DANGEROUS;
    if (roll < cumulative) {
      return { value: this.pickDangerous(dangerous), type: 'normal' };
    }

    // Special (5%)
    return this.pickSpecial(lowOutliers);
  }

  private pickMeaningful(values: number[], tailValue: number, snake: Snake): number {
    const secondTailValue = snake.segments.length >= 2
      ? snake.segments[snake.segments.length - 2].value
      : -1;

    const weights = values.map(v => {
      if (v === tailValue) return 3;
      if (v === secondTailValue) return 2;
      return 1;
    });
    return values[weightedRandom(weights)];
  }

  private pickDangerous(values: number[]): number {
    // head+1 most common, decreasing
    const weights = values.map((_, i) => values.length - i);
    return values[weightedRandom(weights)];
  }

  private pickSpecial(lowOutliers: number[]): FoodPick {
    // Half removal, half low outliers. If no low outliers, all removal.
    if (lowOutliers.length === 0 || Math.random() < 0.5) {
      return { value: 0, type: 'removal' };
    }
    const idx = Math.floor(Math.random() * lowOutliers.length);
    return { value: lowOutliers[idx], type: 'normal' };
  }

  private findEmptyCell(foodManager: FoodManager, snake: Snake): Vec2 | null {
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
}
