import { Snake } from '../entities/Snake';
import { FoodManager } from '../entities/Food';
import { FoodItem } from '../types';
import { Vec2 } from '../utils/Vec2';

export interface CollisionResult {
  wall: boolean;
  self: boolean;
  food: FoodItem | null;
  foodDangerous: boolean; // food value > head value
}

export class CollisionSystem {
  check(snake: Snake, foodManager: FoodManager, fenceActive: boolean): CollisionResult {
    const nextPos = snake.nextHeadPos();
    const result: CollisionResult = {
      wall: false,
      self: false,
      food: null,
      foodDangerous: false,
    };

    // Wall collision (only when fence active)
    if (fenceActive && !snake.isInBounds(nextPos)) {
      result.wall = true;
      return result;
    }

    // Self collision (skip first segment, which is the current head position)
    if (snake.occupies(nextPos, true)) {
      result.self = true;
      return result;
    }

    // Food collision
    const food = foodManager.getAt(nextPos);
    if (food) {
      result.food = food;
      result.foodDangerous = food.value > snake.head.value;
    }

    return result;
  }

  isPositionSafe(pos: Vec2, snake: Snake, fenceActive: boolean): boolean {
    if (fenceActive && !snake.isInBounds(pos)) return false;
    if (snake.occupies(pos, true)) return false;
    return true;
  }
}
