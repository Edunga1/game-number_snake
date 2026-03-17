import { CELL_SIZE, COLOR_MERGE_GLOW } from '../constants';

export class MergeAnimator {
  private particles: Particle[] = [];

  spawnBurst(x: number, y: number, value: number) {
    const count = Math.min(value, 12);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 40 + Math.random() * 60;
      this.particles.push({
        x: x + CELL_SIZE / 2,
        y: y + CELL_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 1.5 + Math.random() * 1,
        size: 3 + Math.random() * 3,
        color: COLOR_MERGE_GLOW,
      });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  get hasParticles(): boolean {
    return this.particles.length > 0;
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  color: string;
}
