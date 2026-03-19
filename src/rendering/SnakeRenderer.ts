import { Snake } from '../entities/Snake';
import { MergeSystem } from '../systems/MergeSystem';
import { Direction } from '../types';
import { CELL_SIZE, COLOR_SNAKE_HEAD, COLOR_MERGE_GLOW, GRID_COLS } from '../constants';
import { getValueColor } from '../utils/colors';

export class SnakeRenderer {
  render(ctx: CanvasRenderingContext2D, snake: Snake, mergeSystem: MergeSystem) {
    const mergeInfo = mergeSystem.getMergeAnimInfo();

    for (let i = snake.segments.length - 1; i >= 0; i--) {
      const seg = snake.segments[i];
      const isHead = i === 0;

      let scale = 1;
      let glowing = false;

      // Merge animation (multiple pairs per pass)
      if (mergeInfo) {
        for (const pair of mergeInfo.pairs) {
          if (i === pair.index || i === pair.index + 1) {
            if (mergeInfo.phase === 'glow') {
              glowing = true;
            } else if (mergeInfo.phase === 'shrink' && i === pair.index + 1) {
              scale = 1 - mergeInfo.progress * 0.8;
            }
            break;
          }
        }
      }

      // Draw segment (and ghost copy at wrap edge if near boundary)
      const offsets = this.getWrapOffsets(seg.pos.x, seg.pos.y);
      for (const [ox, oy] of offsets) {
        this.drawSegment(ctx, ox, oy, seg.value, isHead, scale, glowing);
        if (isHead) this.drawDirectionArrow(ctx, ox, oy, snake.direction);
      }
    }
  }

  private getWrapOffsets(gx: number, gy: number): [number, number][] {
    const x = gx * CELL_SIZE;
    const y = gy * CELL_SIZE;
    const offsets: [number, number][] = [[x, y]];
    const totalW = GRID_COLS * CELL_SIZE;

    // Ghost copies at wrap edges (horizontal only — vertical ghosts would appear in HUD)
    if (gx === 0) offsets.push([x + totalW, y]);
    if (gx === GRID_COLS - 1) offsets.push([x - totalW, y]);

    return offsets;
  }

  private drawSegment(
    ctx: CanvasRenderingContext2D, x: number, y: number,
    value: number, isHead: boolean, scale: number, glowing: boolean,
  ) {
    const pad = CELL_SIZE * (1 - scale) * 0.5;
    const size = CELL_SIZE * scale;

    // Glow effect
    if (glowing) {
      ctx.shadowColor = COLOR_MERGE_GLOW;
      ctx.shadowBlur = 15;
    }

    // Body fill
    ctx.fillStyle = isHead ? COLOR_SNAKE_HEAD : getValueColor(value);
    const radius = isHead ? 8 : 4;
    this.roundRect(ctx, x + pad + 1, y + pad + 1, size - 2, size - 2, radius);
    ctx.fill();

    if (glowing) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    // Number text
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(14 * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), x + CELL_SIZE / 2, y + CELL_SIZE / 2);

    // Head indicator
    if (isHead) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      this.roundRect(ctx, x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 8);
      ctx.stroke();
    }
  }

  private drawDirectionArrow(ctx: CanvasRenderingContext2D, x: number, y: number, dir: Direction) {
    const cx = x + CELL_SIZE / 2;
    const cy = y + CELL_SIZE / 2;
    const s = 6;
    const t = (performance.now() % 800) / 800;

    ctx.globalAlpha = 0.4 + t * 0.4;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    switch (dir) {
      case Direction.Up:
        ctx.moveTo(cx, y - s);
        ctx.lineTo(cx - s, y);
        ctx.lineTo(cx + s, y);
        break;
      case Direction.Down:
        ctx.moveTo(cx, y + CELL_SIZE + s);
        ctx.lineTo(cx - s, y + CELL_SIZE);
        ctx.lineTo(cx + s, y + CELL_SIZE);
        break;
      case Direction.Left:
        ctx.moveTo(x - s, cy);
        ctx.lineTo(x, cy - s);
        ctx.lineTo(x, cy + s);
        break;
      case Direction.Right:
        ctx.moveTo(x + CELL_SIZE + s, cy);
        ctx.lineTo(x + CELL_SIZE, cy - s);
        ctx.lineTo(x + CELL_SIZE, cy + s);
        break;
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
