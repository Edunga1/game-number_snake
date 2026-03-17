import { Snake } from '../entities/Snake';
import { RoundSystem } from '../systems/RoundSystem';
import { CELL_SIZE, GRID_COLS, HUD_ROWS, COLOR_HUD_BG, COLOR_TEXT, DECAY_DISTANCE } from '../constants';

export class HudRenderer {
  render(ctx: CanvasRenderingContext2D, snake: Snake, roundSystem: RoundSystem, lives: number) {
    const width = GRID_COLS * CELL_SIZE;
    const height = HUD_ROWS * CELL_SIZE;

    // HUD background
    ctx.fillStyle = COLOR_HUD_BG;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = COLOR_TEXT;
    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';

    const config = roundSystem.getRoundConfig();
    const y = height / 2;

    // Left: Round + Score
    ctx.textAlign = 'left';
    ctx.fillText(`R${config.round}`, 10, y - 12);
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText(`${roundSystem.score}/${config.targetScore}`, 10, y + 12);

    // Score bar
    const barX = 10;
    const barY = y + 22;
    const barW = 120;
    const barH = 6;
    const fillRatio = Math.min(roundSystem.score / config.targetScore, 1);
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = roundSystem.fenceActive ? '#00d2ff' : '#4ecca3';
    ctx.fillRect(barX, barY, barW * fillRatio, barH);

    // Center: Lives
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = 'bold 14px monospace';
    const heartsStr = '♥'.repeat(lives) + '♡'.repeat(Math.max(0, 3 - lives));
    ctx.fillText(heartsStr, width / 2, y - 8);

    // Head decay indicator
    const decayProgress = snake.distanceSinceDecay / DECAY_DISTANCE;
    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.fillText(`HEAD:${snake.head.value}`, width / 2, y + 10);

    // Decay bar
    const dBarX = width / 2 - 30;
    const dBarY = y + 20;
    ctx.fillStyle = '#333';
    ctx.fillRect(dBarX, dBarY, 60, 4);
    ctx.fillStyle = decayProgress > 0.7 ? '#e94560' : '#aaa';
    ctx.fillRect(dBarX, dBarY, 60 * decayProgress, 4);

    // Right: Tail preview
    ctx.textAlign = 'right';
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = '11px monospace';
    ctx.fillText('TAIL:', width - 140, y - 12);

    // Draw tail segment values as colored boxes
    const previewStart = width - 130;
    const boxSize = 20;
    const segs = snake.segments;
    const maxPreview = Math.min(segs.length, 6);

    for (let i = 0; i < maxPreview; i++) {
      const seg = segs[segs.length - 1 - i];
      const bx = previewStart + i * (boxSize + 3);
      const by = y - boxSize / 2 + 4;

      // Highlight mergeable pairs
      const isMatch = i > 0 && segs[segs.length - 1 - i].value === segs[segs.length - i].value;

      ctx.fillStyle = isMatch ? '#ffd369' : '#333';
      ctx.fillRect(bx, by, boxSize, boxSize);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(seg.value), bx + boxSize / 2, by + boxSize / 2 + 1);
    }

    if (!roundSystem.fenceActive) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#4ecca3';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('EXIT OPEN →', width / 2, y + 32);
    }
  }
}
