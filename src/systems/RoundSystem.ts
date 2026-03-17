import { RoundConfig } from '../types';
import {
  ROUND_1_TARGET_SCORE,
  ROUND_SCORE_MULTIPLIER,
  MAX_FOOD_VALUE_BASE,
  ROUND_FOOD_VALUE_INCREASE,
  SNAKE_TICK_MS,
} from '../constants';

export class RoundSystem {
  currentRound = 1;
  score = 0;
  fenceActive = true;

  getRoundConfig(): RoundConfig {
    const r = this.currentRound;
    return {
      round: r,
      targetScore: Math.floor(ROUND_1_TARGET_SCORE * Math.pow(ROUND_SCORE_MULTIPLIER, r - 1)),
      maxFoodValue: MAX_FOOD_VALUE_BASE + (r - 1) * ROUND_FOOD_VALUE_INCREASE,
      tickMs: Math.max(80, SNAKE_TICK_MS - (r - 1) * 10),
    };
  }

  addScore(points: number): boolean {
    this.score += points;
    const config = this.getRoundConfig();
    if (this.score >= config.targetScore && this.fenceActive) {
      this.fenceActive = false;
      return true; // fence just deactivated
    }
    return false;
  }

  advanceRound() {
    this.currentRound++;
    this.score = 0;
    this.fenceActive = true;
  }
}
