import { Direction } from '../types';

export class InputManager {
  private bufferedDir: Direction | null = null;
  private currentDir: Direction = Direction.Right;
  private touchStartX = 0;
  private touchStartY = 0;
  private readonly SWIPE_THRESHOLD = 30;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
  }

  private onKeyDown(e: KeyboardEvent) {
    let dir: Direction | null = null;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': dir = Direction.Up; break;
      case 'ArrowRight': case 'd': case 'D': dir = Direction.Right; break;
      case 'ArrowDown': case 's': case 'S': dir = Direction.Down; break;
      case 'ArrowLeft': case 'a': case 'A': dir = Direction.Left; break;
    }
    if (dir !== null) {
      e.preventDefault();
      this.tryBuffer(dir);
    }
  }

  private onTouchStart(e: TouchEvent) {
    e.preventDefault();
    const t = e.touches[0];
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
  }

  private onTouchEnd(e: TouchEvent) {
    e.preventDefault();
    const t = e.changedTouches[0];
    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;
    if (Math.abs(dx) < this.SWIPE_THRESHOLD && Math.abs(dy) < this.SWIPE_THRESHOLD) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.tryBuffer(dx > 0 ? Direction.Right : Direction.Left);
    } else {
      this.tryBuffer(dy > 0 ? Direction.Down : Direction.Up);
    }
  }

  private tryBuffer(dir: Direction) {
    // Prevent 180-degree reversal
    if ((dir + 2) % 4 === this.currentDir) return;
    this.bufferedDir = dir;
  }

  consumeDirection(): Direction {
    if (this.bufferedDir !== null) {
      this.currentDir = this.bufferedDir;
      this.bufferedDir = null;
    }
    return this.currentDir;
  }

  getCurrentDirection(): Direction {
    return this.currentDir;
  }

  setDirection(dir: Direction) {
    this.currentDir = dir;
  }
}
