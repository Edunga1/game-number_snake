import { RoundConfig } from '../types';
import {
  ROUND_1_TARGET_SCORE,
  ROUND_SCORE_MULTIPLIER,
  SNAKE_TICK_MS,
} from '../constants';

export class RoundSystem {
  currentRound = 1;
  score = 0;
  fenceActive = true;
  fenceOpenedAt = 0;

  getRoundConfig(): RoundConfig {
    const r = this.currentRound;
    return {
      round: r,
      targetScore: Math.floor(ROUND_1_TARGET_SCORE * Math.pow(ROUND_SCORE_MULTIPLIER, r - 1)),
      tickMs: SNAKE_TICK_MS,
    };
  }

  addScore(points: number): boolean {
    this.score += points;
    const config = this.getRoundConfig();
    if (this.score >= config.targetScore && this.fenceActive) {
      this.fenceActive = false;
      this.fenceOpenedAt = performance.now();
      return true; // fence just deactivated
    }
    return false;
  }

  advanceRound() {
    this.currentRound++;
    this.score = 0;
    this.fenceActive = true;
    this.fenceOpenedAt = 0;
  }
}
