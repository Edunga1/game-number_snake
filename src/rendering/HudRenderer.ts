import { Snake } from '../entities/Snake';
import { CELL_SIZE, GRID_COLS, HUD_ROWS, COLOR_HUD_BG } from '../constants';

export class HudRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    _snake: Snake,
    score: number,
    round: number,
    targetScore: number,
  ) {
    const width = GRID_COLS * CELL_SIZE;
    const height = HUD_ROWS * CELL_SIZE;

    ctx.fillStyle = COLOR_HUD_BG;
    ctx.fillRect(0, 0, width, height);

    // Line 1: ROUND n (centered)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00d2ff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`ROUND ${round}`, width / 2, 18);

    // Line 2: Score / Target (centered)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    const scoreStr = `${score}`;
    const scoreW = ctx.measureText(scoreStr).width;
    ctx.font = '12px monospace';
    const targetStr = ` / ${targetScore}`;
    const targetW = ctx.measureText(targetStr).width;
    const totalW = scoreW + targetW;
    const startX = (width - totalW) / 2;

    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.fillText(scoreStr, startX, 44);
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.fillText(targetStr, startX + scoreW, 44);

    // Line 3: Full-width progress bar
    const barX = 10;
    const barY = 68;
    const barW = width - 20;
    const barH = 7;
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
