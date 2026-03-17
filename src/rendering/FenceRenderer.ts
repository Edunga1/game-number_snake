import { CELL_SIZE, GRID_COLS, PLAY_ROWS, PLAY_Y_OFFSET, COLOR_FENCE_ACTIVE, COLOR_FENCE_INACTIVE } from '../constants';

export class FenceRenderer {
  render(ctx: CanvasRenderingContext2D, active: boolean) {
    const startY = PLAY_Y_OFFSET * CELL_SIZE;
    const width = GRID_COLS * CELL_SIZE;
    const height = PLAY_ROWS * CELL_SIZE;

    const color = active ? COLOR_FENCE_ACTIVE : COLOR_FENCE_INACTIVE;
    const lineWidth = active ? 3 : 1;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    if (active) {
      // Animated electric effect
      const time = performance.now() / 100;
      ctx.shadowColor = COLOR_FENCE_ACTIVE;
      ctx.shadowBlur = 8 + Math.sin(time) * 5;
    }

    ctx.strokeRect(0.5, startY + 0.5, width - 1, height - 1);

    // Draw "exit" indicator when fence is deactivated
    if (!active) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Right side gap (exit)
      const exitY = startY + height / 2 - CELL_SIZE;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(width - 4, exitY, 8, CELL_SIZE * 2);

      // Arrow indicator
      ctx.fillStyle = '#4ecca3';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('→', width + 10, exitY + CELL_SIZE);
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}
