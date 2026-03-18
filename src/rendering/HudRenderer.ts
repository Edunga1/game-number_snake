import { Snake } from '../entities/Snake';
import { CANVAS_WIDTH, CELL_SIZE, HUD_ROWS, COLOR_HUD_BG } from '../constants';

export class HudRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    _snake: Snake,
    score: number,
    round: number,
    targetScore: number,
  ) {
    const width = CANVAS_WIDTH;
    const height = HUD_ROWS * CELL_SIZE;

    ctx.fillStyle = COLOR_HUD_BG;
    ctx.fillRect(0, 0, width, height);

    // Line 1: ROUND n (left) + Score/Target (right)
    const cy = 18;
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#00d2ff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`R${round}`, 10, cy);

    ctx.font = 'bold 14px monospace';
    const scoreStr = `${score}`;
    const scoreW = ctx.measureText(scoreStr).width;
    ctx.font = '11px monospace';
    const targetStr = `/${targetScore}`;
    const targetW = ctx.measureText(targetStr).width;

    const scoreX = width - 10 - scoreW - targetW;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.fillText(scoreStr, scoreX, cy);
    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.fillText(targetStr, scoreX + scoreW, cy);

    // Line 2: Progress bar
    const barX = 10;
    const barY = 38;
    const barW = width - 20;
    const barH = 6;
    const fillRatio = Math.min(score / targetScore, 1);

    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fill();

    if (fillRatio > 0) {
      const barColor = fillRatio >= 1 ? '#4ecca3' : '#00d2ff';
      ctx.shadowColor = barColor;
      ctx.shadowBlur = 6;
      ctx.fillStyle = barColor;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(barH, barW * fillRatio), barH, 3);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  }
}
