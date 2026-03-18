import { Direction } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRID_WIDTH, DPAD_AREA_Y, CELL_SIZE, PLAY_Y_OFFSET, PLAY_ROWS } from '../constants';

export interface JoystickState {
  active: boolean;
  centerX: number;
  centerY: number;
  thumbX: number;
  thumbY: number;
}

// D-pad button rects — fill the bottom area
const pad = 8;
const gap = 8;
const areaH = CANVAS_HEIGHT - DPAD_AREA_Y;
const sideW = 120;
const sideH = areaH - pad * 2;
const midL = pad + sideW + gap;
const midR = CANVAS_WIDTH - pad - sideW - gap;
const midW = midR - midL;
const midH = (sideH - gap) / 2;

export const DPAD_RECTS = {
  [Direction.Up]:    { x: midL, y: DPAD_AREA_Y + pad, w: midW, h: midH },
  [Direction.Down]:  { x: midL, y: DPAD_AREA_Y + pad + midH + gap, w: midW, h: midH },
  [Direction.Left]:  { x: pad, y: DPAD_AREA_Y + pad, w: sideW, h: sideH },
  [Direction.Right]: { x: CANVAS_WIDTH - pad - sideW, y: DPAD_AREA_Y + pad, w: sideW, h: sideH },
};

export class InputManager {
  private canvas: HTMLCanvasElement;
  private bufferedDir: Direction | null = null;
  private currentDir: Direction = Direction.Right;
  private touchStartX = 0;
  private touchStartY = 0;
  private readonly SWIPE_THRESHOLD = 20;
  private isDpadTouch = false;

  readonly joystick: JoystickState = {
    active: false,
    centerX: 0,
    centerY: 0,
    thumbX: 0,
    thumbY: 0,
  };

  activeDpadDir: Direction | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => this.onKeyDown(e));

    // Touch events
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });

    // Mouse events (for D-pad on desktop)
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mouseup', () => this.onMouseUp());
  }

  private screenToCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (CANVAS_WIDTH / rect.width),
      y: (clientY - rect.top) * (CANVAS_HEIGHT / rect.height),
    };
  }

  private hitDpad(canvasX: number, canvasY: number): Direction | null {
    for (const [dirStr, r] of Object.entries(DPAD_RECTS)) {
      const dir = Number(dirStr) as Direction;
      if (canvasX >= r.x && canvasX <= r.x + r.w && canvasY >= r.y && canvasY <= r.y + r.h) {
        return dir;
      }
    }
    return null;
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
    const canvasPos = this.screenToCanvas(t.clientX, t.clientY);

    // Check D-pad first
    const dpadDir = this.hitDpad(canvasPos.x, canvasPos.y);
    if (dpadDir !== null) {
      this.isDpadTouch = true;
      this.activeDpadDir = dpadDir;
      this.tryBuffer(dpadDir);
      navigator.vibrate?.(15);
      return;
    }

    // Only activate joystick inside the play grid area
    this.isDpadTouch = false;
    const gridTop = PLAY_Y_OFFSET * CELL_SIZE;
    const gridBottom = gridTop + PLAY_ROWS * CELL_SIZE;
    if (canvasPos.x >= 0 && canvasPos.x <= GRID_WIDTH &&
        canvasPos.y >= gridTop && canvasPos.y <= gridBottom) {
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
      this.joystick.active = true;
      this.joystick.centerX = t.clientX;
      this.joystick.centerY = t.clientY;
      this.joystick.thumbX = t.clientX;
      this.joystick.thumbY = t.clientY;
    }
  }

  private onTouchMove(e: TouchEvent) {
    e.preventDefault();
    const t = e.touches[0];

    if (this.isDpadTouch) {
      const canvasPos = this.screenToCanvas(t.clientX, t.clientY);
      const dpadDir = this.hitDpad(canvasPos.x, canvasPos.y);
      if (dpadDir !== null && dpadDir !== this.activeDpadDir) {
        this.activeDpadDir = dpadDir;
        this.tryBuffer(dpadDir);
        navigator.vibrate?.(15);
      } else if (dpadDir === null) {
        this.activeDpadDir = null;
      }
      return;
    }

    // Joystick handling
    this.joystick.thumbX = t.clientX;
    this.joystick.thumbY = t.clientY;

    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;
    if (Math.abs(dx) < this.SWIPE_THRESHOLD && Math.abs(dy) < this.SWIPE_THRESHOLD) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.tryBuffer(dx > 0 ? Direction.Right : Direction.Left);
    } else {
      this.tryBuffer(dy > 0 ? Direction.Down : Direction.Up);
    }
  }

  private onTouchEnd(e: TouchEvent) {
    e.preventDefault();
    if (this.isDpadTouch) {
      this.activeDpadDir = null;
      this.isDpadTouch = false;
      return;
    }
    this.joystick.active = false;
  }

  // Mouse support for D-pad (desktop)
  private onMouseDown(e: MouseEvent) {
    const canvasPos = this.screenToCanvas(e.clientX, e.clientY);
    const dpadDir = this.hitDpad(canvasPos.x, canvasPos.y);
    if (dpadDir !== null) {
      this.activeDpadDir = dpadDir;
      this.tryBuffer(dpadDir);
    }
  }

  private onMouseUp() {
    this.activeDpadDir = null;
  }

  private tryBuffer(dir: Direction) {
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
