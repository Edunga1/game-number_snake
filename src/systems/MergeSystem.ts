import { Snake } from '../entities/Snake';
import { Vec2 } from '../utils/Vec2';
import { MERGE_BASE_SCORE, CHAIN_MULTIPLIER, MERGE_GLOW_MS, MERGE_SHRINK_MS } from '../constants';

export interface CompletedMerge {
  pos: Vec2;
  resultValue: number;
  chainStep: number;
}

interface MergePair {
  index: number;
  resultValue: number;
}

export class MergeSystem {
  private activePass: { pairs: MergePair[]; startTime: number; phase: 'glow' | 'shrink' } | null = null;
  private passCount = 0;
  pendingScore = 0;
  completedMerges: CompletedMerge[] = [];

  /** Start merge cascade. Returns true if any merges found. */
  startMergeScan(snake: Snake): boolean {
    this.passCount = 0;
    this.pendingScore = 0;
    this.completedMerges = [];
    return this.startNextPass(snake);
  }

  private startNextPass(snake: Snake): boolean {
    const pairs = this.findPairs(snake);
    if (pairs.length === 0) {
      this.activePass = null;
      return false;
    }
    this.activePass = { pairs, startTime: performance.now(), phase: 'glow' };
    return true;
  }

  /** Greedy pairing from head to tail: pair adjacent equals without overlap */
  private findPairs(snake: Snake): MergePair[] {
    const segs = snake.segments;
    const pairs: MergePair[] = [];
    let i = 0;
    while (i < segs.length - 1) {
      if (segs[i].value === segs[i + 1].value) {
        pairs.push({ index: i, resultValue: segs[i].value + 1 });
        i += 2; // skip both
      } else {
        i++;
      }
    }
    return pairs;
  }

  /** Call every frame during merging. Returns true while still merging. */
  update(snake: Snake, now: number): boolean {
    if (!this.activePass) return false;

    const elapsed = now - this.activePass.startTime;

    if (elapsed < MERGE_GLOW_MS) {
      this.activePass.phase = 'glow';
      return true;
    }

    if (elapsed < MERGE_GLOW_MS + MERGE_SHRINK_MS) {
      this.activePass.phase = 'shrink';
      return true;
    }

    // Apply all merges (reverse order to preserve indices)
    this.passCount++;
    for (let j = this.activePass.pairs.length - 1; j >= 0; j--) {
      const pair = this.activePass.pairs[j];
      const pos = { ...snake.segments[pair.index].pos };
      snake.segments[pair.index].value = pair.resultValue;
      snake.segments.splice(pair.index + 1, 1);
      this.completedMerges.push({ pos, resultValue: pair.resultValue, chainStep: this.passCount });
      this.pendingScore += MERGE_BASE_SCORE * pair.resultValue * Math.pow(CHAIN_MULTIPLIER, this.passCount - 1);
    }

    // Try next pass
    return this.startNextPass(snake);
  }

  consumeScore(): number {
    const s = this.pendingScore;
    this.pendingScore = 0;
    return s;
  }

  consumeCompletedMerges(): CompletedMerge[] {
    const m = this.completedMerges;
    this.completedMerges = [];
    return m;
  }

  getMergeAnimInfo(): { pairs: { index: number }[]; phase: 'glow' | 'shrink'; progress: number } | null {
    if (!this.activePass) return null;
    const elapsed = performance.now() - this.activePass.startTime;
    let progress = 0;
    if (this.activePass.phase === 'glow') {
      progress = Math.min(elapsed / MERGE_GLOW_MS, 1);
    } else {
      progress = Math.min((elapsed - MERGE_GLOW_MS) / MERGE_SHRINK_MS, 1);
    }
    return {
      pairs: this.activePass.pairs.map(p => ({ index: p.index })),
      phase: this.activePass.phase,
      progress,
    };
  }
}
