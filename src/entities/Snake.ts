import { Segment, Direction, DIR_VECTORS } from '../types';
import { Vec2, vec2Add, vec2Eq } from '../utils/Vec2';
import { GRID_COLS, PLAY_ROWS, PLAY_Y_OFFSET, INITIAL_HEAD_VALUE } from '../constants';

export class Snake {
  segments: Segment[] = [];
  direction: Direction = Direction.Right;
  alive = true;
  distanceSinceDecay = 0;

  constructor() {
    this.reset();
  }

  reset() {
    const startX = 5;
    const startY = PLAY_Y_OFFSET + Math.floor(PLAY_ROWS / 2);
    this.segments = [
      { pos: { x: startX, y: startY }, value: INITIAL_HEAD_VALUE },
      { pos: { x: startX - 1, y: startY }, value: 2 },
      { pos: { x: startX - 2, y: startY }, value: 1 },
    ];
    this.direction = Direction.Right;
    this.alive = true;
    this.distanceSinceDecay = 0;
  }

  get head(): Segment {
    return this.segments[0];
  }

  get tail(): Segment {
    return this.segments[this.segments.length - 1];
  }

  nextHeadPos(): Vec2 {
    const delta = DIR_VECTORS[this.direction];
    return vec2Add(this.head.pos, delta);
  }

  move(grow: boolean, newValue?: number) {
    const newHead: Segment = {
      pos: this.nextHeadPos(),
      value: this.head.value,
    };
    this.segments.unshift(newHead);
    if (grow && newValue !== undefined) {
      // The eaten food becomes a tail segment — keep current tail
      this.segments.push({ pos: this.segments[this.segments.length - 2].pos, value: newValue });
    }
    if (!grow) {
      this.segments.pop();
    }
    this.distanceSinceDecay++;
  }

  occupies(pos: Vec2, skipHead = false): boolean {
    const start = skipHead ? 1 : 0;
    for (let i = start; i < this.segments.length; i++) {
      if (vec2Eq(this.segments[i].pos, pos)) return true;
    }
    return false;
  }

  isInBounds(pos: Vec2): boolean {
    return pos.x >= 0 && pos.x < GRID_COLS && pos.y >= PLAY_Y_OFFSET && pos.y < PLAY_Y_OFFSET + PLAY_ROWS;
  }

  addTailSegment(value: number) {
    const lastSeg = this.segments[this.segments.length - 1];
    this.segments.push({ pos: { ...lastSeg.pos }, value });
  }
}
