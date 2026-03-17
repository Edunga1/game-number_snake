import { Snake } from '../entities/Snake';
import { DECAY_DISTANCE } from '../constants';

export class DecaySystem {
  update(snake: Snake): boolean {
    if (snake.distanceSinceDecay >= DECAY_DISTANCE) {
      snake.distanceSinceDecay = 0;
      snake.head.value = Math.max(snake.head.value - 1, 0);
      if (snake.head.value <= 0) {
        return true; // head reached 0 → death
      }
    }
    return false;
  }
}
