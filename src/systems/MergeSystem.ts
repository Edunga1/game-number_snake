import { Snake } from '../entities/Snake';
import { MergeEvent } from '../types';
import { Vec2 } from '../utils/Vec2';
import { MERGE_BASE_SCORE, CHAIN_MULTIPLIER, MERGE_GLOW_MS, MERGE_SHRINK_MS } from '../constants';

export interface CompletedMerge {
  pos: Vec2;
  resultValue: number;
  chainStep: number;
}

export class MergeSystem {
  activeMerge: MergeEvent | null = null;
  chainCount = 0;
  pendingScore = 0;
  completedMerges: CompletedMerge[] = [];
  private mergeStartTime = 0;

  /** After eating, scan for merges from tail toward head */
  startMergeScan(snake: Snake): boolean {
    this.chainCount = 0;
    this.pendingScore = 0;
    this.completedMerges = [];
    return this.findNextMerge(snake);
  }

  private findNextMerge(snake: Snake): boolean {
    const segs = snake.segments;
    // Scan from tail toward head: find last pair of adjacent equal values
    for (let i = segs.length - 1; i > 0; i--) {
      if (segs[i].value === segs[i - 1].value) {
        this.activeMerge = {
          index: i - 1,
          resultValue: segs[i].value * 2,
          startTime: performance.now(),
          phase: 'glow',
        };
        this.mergeStartTime = performance.now();
        return true;
      }
    }
    this.activeMerge = null;
    return false;
  }

  /** Call every frame during merging state. Returns true while still merging. */
  update(snake: Snake, now: number): boolean {
    if (!this.activeMerge) return false;

    const elapsed = now - this.mergeStartTime;

    if (elapsed < MERGE_GLOW_MS) {
      this.activeMerge.phase = 'glow';
      return true;
    }

    if (elapsed < MERGE_GLOW_MS + MERGE_SHRINK_MS) {
      this.activeMerge.phase = 'shrink';
      return true;
    }

    // Store merge position before applying
    const mergePos = { ...snake.segments[this.activeMerge.index].pos };
    const resultValue = this.activeMerge.resultValue;

    // Done — apply merge
    this.applyMerge(snake);

    // Record completed merge
    this.chainCount++;
    this.completedMerges.push({ pos: mergePos, resultValue, chainStep: this.chainCount });
    this.pendingScore += MERGE_BASE_SCORE * resultValue * Math.pow(CHAIN_MULTIPLIER, this.chainCount - 1);

    if (this.findNextMerge(snake)) {
      this.mergeStartTime = now;
      return true;
    }

    // All merges done
    this.activeMerge = null;
    return false;
  }

  private applyMerge(snake: Snake) {
    if (!this.activeMerge) return;
    const idx = this.activeMerge.index;
    snake.segments[idx].value = this.activeMerge.resultValue;
    snake.segments.splice(idx + 1, 1);
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

  getMergeAnimInfo(): { index: number; phase: 'glow' | 'shrink' | 'done'; progress: number } | null {
    if (!this.activeMerge) return null;
    const elapsed = performance.now() - this.mergeStartTime;
    let progress = 0;
    if (this.activeMerge.phase === 'glow') {
      progress = Math.min(elapsed / MERGE_GLOW_MS, 1);
    } else if (this.activeMerge.phase === 'shrink') {
      progress = Math.min((elapsed - MERGE_GLOW_MS) / MERGE_SHRINK_MS, 1);
    }
    return {
      index: this.activeMerge.index,
      phase: this.activeMerge.phase,
      progress,
    };
  }
}
