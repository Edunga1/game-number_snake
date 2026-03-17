export class GameLoop {
  private lastTime = 0;
  private accumulator = 0;
  private running = false;
  private rafId = 0;

  constructor(
    private tickMs: number,
    private onTick: () => void,
    private onRender: (dt: number) => void,
  ) {}

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  setTickMs(ms: number) {
    this.tickMs = ms;
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const delta = now - this.lastTime;
    this.lastTime = now;
    this.accumulator += delta;

    while (this.accumulator >= this.tickMs) {
      this.onTick();
      this.accumulator -= this.tickMs;
    }

    this.onRender(this.accumulator / this.tickMs);
    this.rafId = requestAnimationFrame(this.loop);
  };
}
