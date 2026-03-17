import { FoodManager } from '../entities/Food';
import { Snake } from '../entities/Snake';
import { CELL_SIZE, COLOR_FOOD_SAFE, COLOR_FOOD_DANGER, COLOR_FOOD_MERGEABLE } from '../constants';

export class FoodRenderer {
  render(ctx: CanvasRenderingContext2D, foodManager: FoodManager, snake: Snake) {
    const headValue = snake.head.value;
    const tailValue = snake.tail.value;

    for (const food of foodManager.items) {
      const x = food.pos.x * CELL_SIZE;
      const y = food.pos.y * CELL_SIZE;

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
      const cx = x + CELL_SIZE / 2;
      const cy = y + CELL_SIZE / 2;
      const radius = CELL_SIZE * 0.35;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Number
      ctx.fillStyle = isDangerous ? '#fff' : '#1a1a2e';
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
    }
  }
}
