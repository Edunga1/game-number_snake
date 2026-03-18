import { Snake } from '../entities/Snake';
import { FoodManager } from '../entities/Food';
import { FoodItem } from '../types';
import { Vec2, vec2Eq } from '../utils/Vec2';
import { GRID_COLS, PLAY_ROWS, PLAY_Y_OFFSET } from '../constants';

export interface CollisionResult {
  self: boolean;
  food: FoodItem | null;
  foodDangerous: boolean;
}

/** Wrap position to play area bounds */
export function wrapPos(pos: Vec2): Vec2 {
  let { x, y } = pos;
  if (x < 0) x = GRID_COLS - 1;
  else if (x >= GRID_COLS) x = 0;
  if (y < PLAY_Y_OFFSET) y = PLAY_Y_OFFSET + PLAY_ROWS - 1;
  else if (y >= PLAY_Y_OFFSET + PLAY_ROWS) y = PLAY_Y_OFFSET;
  return { x, y };
}

export class CollisionSystem {
  check(snake: Snake, foodManager: FoodManager): CollisionResult {
    const nextPos = wrapPos(snake.nextHeadPos());
    const result: CollisionResult = {
      self: false,
      food: null,
      foodDangerous: false,
    };

    // Food collision
    const food = foodManager.getAt(nextPos);

    // Self collision
    const tailPos = snake.tail.pos;
    const willGrow = food !== undefined && food.type === 'normal';
    const isSelfHit = snake.occupies(nextPos, true);
    if (isSelfHit) {
      const hittingTailOnly = vec2Eq(nextPos, tailPos);
      if (!hittingTailOnly || willGrow) {
        result.self = true;
        return result;
      }
    }
    if (food) {
      result.food = food;
      result.foodDangerous = food.type === 'normal' && food.value > snake.head.value;
    }

    return result;
  }
}
