import { CELL_SIZE, GRID_COLS, PLAY_ROWS, PLAY_Y_OFFSET, COLOR_WALL } from '../constants';

export class WallRenderer {
  render(ctx: CanvasRenderingContext2D) {
    const startY = PLAY_Y_OFFSET * CELL_SIZE;
    const width = GRID_COLS * CELL_SIZE;
    const height = PLAY_ROWS * CELL_SIZE;

    ctx.strokeStyle = COLOR_WALL;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLOR_WALL;
    ctx.shadowBlur = 6;
    ctx.strokeRect(0.5, startY + 0.5, width - 1, height - 1);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}
