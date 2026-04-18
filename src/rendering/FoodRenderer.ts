import { FoodManager } from '../entities/Food';
import { Snake } from '../entities/Snake';
import { CELL_SIZE, COLOR_BG, COLOR_FOOD_SAFE, COLOR_FOOD_DANGER, COLOR_FOOD_MERGEABLE, COLOR_FOOD_REMOVAL, COLOR_FOOD_MERGE } from '../constants';

const SPAWN_ANIM_MS = 250;

export class FoodRenderer {
  render(ctx: CanvasRenderingContext2D, foodManager: FoodManager, snake: Snake) {
    const headValue = snake.head.value;
    const tailValue = snake.tail.value;
    const now = performance.now();

    for (const food of foodManager.items) {
      const x = food.pos.x * CELL_SIZE;
      const y = food.pos.y * CELL_SIZE;
      const cx = x + CELL_SIZE / 2;
      const cy = y + CELL_SIZE / 2;
      const radius = CELL_SIZE * 0.35;

      // Spawn pop animation
      const elapsed = now - food.spawnTime;
      const animating = elapsed < SPAWN_ANIM_MS;
      if (animating) {
        const t = elapsed / SPAWN_ANIM_MS;
        const scale = 1 + 0.3 * Math.sin(t * Math.PI) * (1 - t);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
      }

      if (food.type === 'removal') {
        // Removal block: purple with ✕
        ctx.shadowColor = COLOR_FOOD_REMOVAL;
        ctx.shadowBlur = 6 + Math.sin(performance.now() / 300) * 3;

        ctx.fillStyle = COLOR_FOOD_REMOVAL;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // ✂ icon
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✂', cx, cy);
        if (animating) ctx.restore();
        continue;
      }

      if (food.type === 'merge') {
        // Merge trigger: gold star with pulsing glow
        const pulse = Math.sin(performance.now() / 250);
        ctx.shadowColor = COLOR_FOOD_MERGE;
        ctx.shadowBlur = 10 + pulse * 6;

        ctx.fillStyle = COLOR_FOOD_MERGE;
        // Draw diamond shape
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius);
        ctx.lineTo(cx + radius, cy);
        ctx.lineTo(cx, cy + radius);
        ctx.lineTo(cx - radius, cy);
        ctx.closePath();
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // "M" label
        ctx.fillStyle = COLOR_BG;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('M', cx, cy);
        if (animating) ctx.restore();
        continue;
      }

      const isDangerous = food.value > headValue;
      const isMergeable = food.value === tailValue;

      // Color
      let color: string;
      if (isDangerous) {
        color = COLOR_FOOD_DANGER;
      } else if (isMergeable) {
        color = COLOR_FOOD_MERGEABLE;
      } else {
        color = COLOR_FOOD_SAFE;
      }

      // Mergeable glow
      if (isMergeable) {
        ctx.shadowColor = COLOR_FOOD_MERGEABLE;
        ctx.shadowBlur = 8 + Math.sin(performance.now() / 200) * 4;
      }

      // Draw circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Number
      ctx.fillStyle = isDangerous ? '#fff' : COLOR_BG;
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(food.value), cx, cy);

      // Danger X marker
      if (isDangerous) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 8);
        ctx.lineTo(x + CELL_SIZE - 8, y + CELL_SIZE - 8);
        ctx.moveTo(x + CELL_SIZE - 8, y + 8);
        ctx.lineTo(x + 8, y + CELL_SIZE - 8);
        ctx.stroke();
      }

      if (animating) {
        ctx.restore();
      }
    }
  }
}
