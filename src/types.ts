import { Vec2 } from './utils/Vec2';

export interface Segment {
  pos: Vec2;
  value: number;
}

export enum Direction {
  Up = 0,
  Right = 1,
  Down = 2,
  Left = 3,
}

export const DIR_VECTORS: Record<Direction, Vec2> = {
  [Direction.Up]: { x: 0, y: -1 },
  [Direction.Right]: { x: 1, y: 0 },
  [Direction.Down]: { x: 0, y: 1 },
  [Direction.Left]: { x: -1, y: 0 },
};

export type GameState = 'ready' | 'playing' | 'merging' | 'round_clear' | 'game_over';

export interface FoodItem {
  pos: Vec2;
  value: number;
  type: 'normal' | 'removal' | 'merge';
  spawnTime: number;
}

export interface MergeEvent {
  index: number; // index in segments where merge happens (the pair starts here)
  resultValue: number;
  startTime: number;
  phase: 'glow' | 'shrink' | 'done';
}

