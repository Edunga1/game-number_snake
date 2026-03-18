import { GridRenderer } from './GridRenderer';
import { SnakeRenderer } from './SnakeRenderer';
import { FoodRenderer } from './FoodRenderer';
import { WallRenderer } from './WallRenderer';
import { MergeAnimator } from './MergeAnimator';
import { HudRenderer } from './HudRenderer';
import { Snake } from '../entities/Snake';
import { FoodManager } from '../entities/Food';
import { MergeSystem } from '../systems/MergeSystem';
import { GameState } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_BG } from '../constants';

export class Renderer {
  private grid = new GridRenderer();
  private snakeRenderer = new SnakeRenderer();
  private foodRenderer = new FoodRenderer();
  private wallRenderer = new WallRenderer();
  mergeAnimator = new MergeAnimator();
  private hudRenderer = new HudRenderer();

  render(
    ctx: CanvasRenderingContext2D,
    snake: Snake,
    food: FoodManager,
    mergeSystem: MergeSystem,
    score: number,
    round: number,
    targetScore: number,
    state: GameState,
    _dt: number,
    roundClearBonus = 0,
    showTutorial = false,
  ) {
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.hudRenderer.render(ctx, snake, score, round, targetScore);
    this.grid.render(ctx);
    this.wallRenderer.render(ctx);
    this.foodRenderer.render(ctx, food, snake);
    this.snakeRenderer.render(ctx, snake, mergeSystem);

    this.mergeAnimator.update(1 / 60);
    this.mergeAnimator.render(ctx);

    if (state === 'game_over') {
      this.renderOverlay(ctx, 'GAME OVER', `Score: ${score} — Press SPACE or tap`, '#e94560');
    } else if (state === 'round_clear') {
      this.renderRoundClear(ctx, round, roundClearBonus);
    } else if (state === 'ready' && showTutorial) {
      this.renderTutorial(ctx);
    } else if (state === 'ready') {
      this.renderOverlay(ctx, `ROUND ${round}`, 'Press SPACE or tap to start', '#00d2ff');
    }
  }

  private renderTutorial(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const cx = CANVAS_WIDTH / 2;
    const S = 26;
    const step = S + 2;

    ctx.textBaseline = 'middle';

    // ── Title ──
    ctx.fillStyle = '#00d2ff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HOW TO PLAY', cx, 50);

    ctx.fillStyle = '#aaa';
    ctx.font = '14px monospace';
    ctx.fillText('Swipe or ← ↑ ↓ → to move', cx, 85);

    // ── Safe eat: [1][2][3] → (2) ✓ Grow! ──
    let y = 125;
    let x = cx - 115;
    this.tSeg(ctx, x, y, 1, false, S); x += step;
    this.tSeg(ctx, x, y, 2, false, S); x += step;
    this.tSeg(ctx, x, y, 3, true, S); x += step + 10;
    this.tLabel(ctx, x, y + S / 2, '→'); x += 20;
    this.tFood(ctx, x, y, 2, '#4ecca3', S); x += step + 10;
    ctx.fillStyle = '#4ecca3'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left';
    ctx.fillText('✓ Grow!', x, y + S / 2);

    // ── Danger eat: [1][2][3] → (5) ✗ Death! ──
    y = 170;
    x = cx - 115;
    this.tSeg(ctx, x, y, 1, false, S); x += step;
    this.tSeg(ctx, x, y, 2, false, S); x += step;
    this.tSeg(ctx, x, y, 3, true, S); x += step + 10;
    this.tLabel(ctx, x, y + S / 2, '→'); x += 20;
    this.tFood(ctx, x, y, 5, '#e94560', S); x += step + 10;
    ctx.fillStyle = '#e94560'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left';
    ctx.fillText('✗ Death!', x, y + S / 2);

    ctx.textAlign = 'center'; ctx.fillStyle = '#666'; ctx.font = '12px monospace';
    ctx.fillText('HEAD is 3: eat ≤ 3 OK, > 3 kills you', cx, y + S + 16);

    // ── Merge header ──
    y = 250;
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center';
    ctx.fillText('◆ M = Merge Trigger', cx, y);

    // [1][1] + M → [2]  Score!
    y = 280;
    x = cx - 115;
    this.tSeg(ctx, x, y, 1, false, S); x += step;
    this.tSeg(ctx, x, y, 1, true, S); x += step + 4;
    this.tLabel(ctx, x + 4, y + S / 2, '+'); x += 16;
    this.tMergeItem(ctx, x, y, S); x += step + 4;
    this.tLabel(ctx, x + 4, y + S / 2, '→'); x += 16;
    this.tSeg(ctx, x, y, 2, true, S); x += step + 8;
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left';
    ctx.fillText('Score!', x, y + S / 2);

    ctx.textAlign = 'center'; ctx.fillStyle = '#666'; ctx.font = '12px monospace';
    ctx.fillText('Same numbers merge! 1+1→2, 2+2→3...', cx, y + S + 16);

    // ── Scissors: [1][2][3] → ✂ → [2][3]  Cut! ──
    y = 360;
    x = cx - 120;
    this.tSeg(ctx, x, y, 1, false, S); x += step;
    this.tSeg(ctx, x, y, 2, false, S); x += step;
    this.tSeg(ctx, x, y, 3, true, S); x += step + 4;
    this.tLabel(ctx, x + 4, y + S / 2, '→'); x += 16;
    this.tScissors(ctx, x, y, S); x += step + 4;
    this.tLabel(ctx, x + 4, y + S / 2, '→'); x += 16;
    this.tSeg(ctx, x, y, 2, false, S); x += step;
    this.tSeg(ctx, x, y, 3, true, S); x += step + 8;
    ctx.fillStyle = '#b388ff'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left';
    ctx.fillText('Cut!', x, y + S / 2);

    // ── Tap prompt ──
    const pulse = Math.sin(performance.now() / 400) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    ctx.font = '16px monospace'; ctx.textAlign = 'center';
    ctx.fillText('Tap or press SPACE', cx, 440);
  }

  // ── Tutorial mini drawing helpers ──

  private tSeg(ctx: CanvasRenderingContext2D, x: number, y: number, value: number, isHead: boolean, s: number) {
    ctx.fillStyle = isHead ? '#e94560' : '#533483';
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, s - 2, s - 2, isHead ? 5 : 3);
    ctx.fill();
    if (isHead) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(s * 0.5)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), x + s / 2, y + s / 2);
  }

  private tFood(ctx: CanvasRenderingContext2D, x: number, y: number, value: number, color: string, s: number) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(s * 0.45)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), x + s / 2, y + s / 2);
  }

  private tMergeItem(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
    const mcx = x + s / 2;
    const mcy = y + s / 2;
    const r = s * 0.38;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(mcx, mcy - r);
    ctx.lineTo(mcx + r, mcy);
    ctx.lineTo(mcx, mcy + r);
    ctx.lineTo(mcx - r, mcy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.font = `bold ${Math.floor(s * 0.45)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M', mcx, mcy);
  }

  private tScissors(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
    ctx.fillStyle = '#b388ff';
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(s * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✂', x + s / 2, y + s / 2);
  }

  private tLabel(ctx: CanvasRenderingContext2D, x: number, y: number, char: string) {
    ctx.fillStyle = '#555';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, x, y);
  }

  private renderRoundClear(ctx: CanvasRenderingContext2D, round: number, bonus: number) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#4ecca3';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`ROUND ${round} CLEAR!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

    if (bonus > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`+${bonus} BONUS`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
    }
  }

  private renderOverlay(ctx: CanvasRenderingContext2D, title: string, subtitle: string, color: string) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = color;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

    ctx.fillStyle = '#aaa';
    ctx.font = '16px monospace';
    ctx.fillText(subtitle, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
  }
}
