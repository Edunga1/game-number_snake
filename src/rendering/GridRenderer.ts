import { CELL_SIZE, GRID_COLS, PLAY_ROWS, PLAY_Y_OFFSET, COLOR_GRID, COLOR_GRID_LINE } from '../constants';

export class GridRenderer {
  render(ctx: CanvasRenderingContext2D) {
    const startY = PLAY_Y_OFFSET * CELL_SIZE;
    const width = GRID_COLS * CELL_SIZE;
    const height = PLAY_ROWS * CELL_SIZE;

    // Background
    ctx.fillStyle = COLOR_GRID;
    ctx.fillRect(0, startY, width, height);

    // Grid lines
    ctx.strokeStyle = COLOR_GRID_LINE;
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, startY);
      ctx.lineTo(x * CELL_SIZE, startY + height);
      ctx.stroke();
    }

    for (let y = 0; y <= PLAY_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, startY + y * CELL_SIZE);
      ctx.lineTo(width, startY + y * CELL_SIZE);
      ctx.stroke();
    }
  }
}
