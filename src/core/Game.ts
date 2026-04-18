import { GameState } from '../types';
import { Snake } from '../entities/Snake';
import { FoodManager } from '../entities/Food';
import { FoodSpawner } from '../entities/FoodSpawner';
import { CollisionSystem, wrapPos } from '../systems/CollisionSystem';
import { MergeSystem } from '../systems/MergeSystem';
import { InputManager } from './InputManager';
import { GameLoop } from './GameLoop';
import { Renderer } from '../rendering/Renderer';
import { HudRenderer } from '../rendering/HudRenderer';
import { SoundManager } from './SoundManager';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, SNAKE_TICK_MS,
  CELL_SIZE, MAX_FOOD_VALUE,
  ROUND_1_TARGET_SCORE, ROUND_SCORE_MULTIPLIER,
  ROUND_SPEED_DECREASE, MIN_TICK_MS,
  ROUND_CLEAR_POP_MS, ROUND_CLEAR_BONUS_BASE, MERGE_BASE_SCORE,
  FOOD_SPAWN_INTERVAL_MS, FOOD_COUNT_MAX,
} from '../constants';

export class Game {
  private ctx: CanvasRenderingContext2D;
  private snake = new Snake();
  private food = new FoodManager();
  private foodSpawner = new FoodSpawner();
  private collision = new CollisionSystem();
  private mergeSystem = new MergeSystem();
  // @ts-ignore reserved for hard mode
  private decaySystem = new DecaySystem();
  private input: InputManager;
  private loop: GameLoop;
  private renderer = new Renderer();
  private sound = new SoundManager();

  private state: GameState = 'ready';
  score = 0;
  round = 1;
  private highScore = 0;
  private highRound = 0;
  private lastFoodSpawnTime = 0;
  private showTutorial = true;
  private chainCombo: { count: number; startTime: number } | null = null;
  private roundClearInfo: {
    lastPopTime: number;
    segmentScore: number;
    bonus: number;
    headBonus: number;
    phase: 'popping' | 'showing';
    showStartTime: number;
  } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    this.ctx = canvas.getContext('2d')!;

    this.input = new InputManager(canvas);
    this.loop = new GameLoop(SNAKE_TICK_MS, () => this.tick(), (dt) => this.render(dt));

    window.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        this.handleAction();
      } else if (e.key === 'm' || e.key === 'M') {
        this.sound.toggle();
      }
    });
    canvas.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      if (t && this.hitSoundIcon(t.clientX, t.clientY)) {
        e.preventDefault();
        this.sound.toggle();
        return;
      }
      if (this.state === 'ready') {
        this.handleAction();
      } else if (this.state === 'game_over') {
        this.handleGameOverTap(e);
      }
    });
    canvas.addEventListener('mousedown', (e) => {
      if (this.hitSoundIcon(e.clientX, e.clientY)) {
        this.sound.toggle();
        return;
      }
      if (this.state === 'game_over') {
        this.handleGameOverClick(e);
      }
    });

    this.initGame();

    // Store screenshot generator: append ?screenshot=1 or ?screenshot=2 to URL.
    // Renders a staged game scene at 3x resolution and auto-downloads as PNG.
    // Mode 1: mid-game play scene, Mode 2: merge animation scene.
    const params = new URLSearchParams(window.location.search);
    const ss = params.get('screenshot');
    if (ss) {
      this.setupScreenshot(parseInt(ss));
      if (parseInt(ss) === 2) {
        this.state = 'merging';
        this.mergeSystem.startMergeScan(this.snake);
      }
      const scale = 3;
      canvas.width = CANVAS_WIDTH * scale;
      canvas.height = CANVAS_HEIGHT * scale;
      this.ctx.scale(scale, scale);
      this.render(0);
      // Auto download
      const dl = document.createElement('a');
      dl.download = 'screenshot-' + ss + '.png';
      dl.href = canvas.toDataURL('image/png');
      dl.click();
      return;
    }

    this.loop.start();
  }

  /** Screenshot presets: ?screenshot=1 or ?screenshot=2 */
  private setupScreenshot(mode: number) {
    this.showTutorial = false;
    this.state = 'playing';
    this.food.clear();

    if (mode === 1) {
      // Scene 1: Mid-game play with long snake and diverse food
      this.round = 2;
      this.score = 720;
      this.snake.segments = [
        { pos: { x: 8, y: 10 }, value: 16 },
        { pos: { x: 7, y: 10 }, value: 8 },
        { pos: { x: 6, y: 10 }, value: 8 },
        { pos: { x: 5, y: 10 }, value: 4 },
        { pos: { x: 4, y: 10 }, value: 4 },
        { pos: { x: 3, y: 10 }, value: 2 },
        { pos: { x: 3, y: 11 }, value: 2 },
        { pos: { x: 3, y: 12 }, value: 1 },
      ];
      this.food.items = [
        { pos: { x: 10, y: 8 }, value: 4, type: 'normal', spawnTime: 0 },
        { pos: { x: 6, y: 14 }, value: 2, type: 'normal', spawnTime: 0 },
        { pos: { x: 11, y: 12 }, value: 8, type: 'normal', spawnTime: 0 },
        { pos: { x: 1, y: 6 }, value: 1, type: 'normal', spawnTime: 0 },
        { pos: { x: 9, y: 16 }, value: 0, type: 'merge', spawnTime: 0 },
        { pos: { x: 12, y: 5 }, value: 3, type: 'normal', spawnTime: 0 },
        { pos: { x: 5, y: 18 }, value: 16, type: 'normal', spawnTime: 0 },
        { pos: { x: 2, y: 15 }, value: 0, type: 'removal', spawnTime: 0 },
      ];
    } else if (mode === 2) {
      // Scene 2: About to merge - adjacent same numbers
      this.round = 3;
      this.score = 1850;
      this.snake.segments = [
        { pos: { x: 9, y: 12 }, value: 32 },
        { pos: { x: 8, y: 12 }, value: 8 },
        { pos: { x: 7, y: 12 }, value: 8 },
        { pos: { x: 6, y: 12 }, value: 4 },
        { pos: { x: 6, y: 13 }, value: 4 },
        { pos: { x: 6, y: 14 }, value: 2 },
      ];
      this.food.items = [
        { pos: { x: 10, y: 10 }, value: 0, type: 'merge', spawnTime: 0 },
        { pos: { x: 3, y: 8 }, value: 4, type: 'normal', spawnTime: 0 },
        { pos: { x: 11, y: 15 }, value: 2, type: 'normal', spawnTime: 0 },
        { pos: { x: 1, y: 18 }, value: 8, type: 'normal', spawnTime: 0 },
        { pos: { x: 8, y: 6 }, value: 1, type: 'normal', spawnTime: 0 },
        { pos: { x: 12, y: 19 }, value: 0, type: 'removal', spawnTime: 0 },
      ];
    }
  }

  get targetScore(): number {
    return Math.floor(ROUND_1_TARGET_SCORE * Math.pow(ROUND_SCORE_MULTIPLIER, this.round - 1));
  }

  get advanceReady(): boolean {
    return this.score >= this.targetScore;
  }

  get tickMs(): number {
    return Math.max(MIN_TICK_MS, SNAKE_TICK_MS - (this.round - 1) * ROUND_SPEED_DECREASE);
  }

  get maxFoodValue(): number {
    return Math.max(MAX_FOOD_VALUE, Math.floor(Math.sqrt(this.snake.head.value)));
  }

  private handleAction() {
    if (this.showTutorial) {
      this.showTutorial = false;
      return;
    }
    if (this.state === 'ready') {
      this.state = 'playing';
    }
  }

  private restartGame() {
    this.initGame();
    this.showTutorial = true;
    // state is 'ready' from initGame, tutorial will show
  }

  private hitSoundIcon(clientX: number, clientY: number): boolean {
    const rect = this.ctx.canvas.getBoundingClientRect();
    const canvasX = (clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const canvasY = (clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    const r = HudRenderer.SOUND_ICON_RECT;
    return canvasX >= r.x && canvasX <= r.x + r.w && canvasY >= r.y && canvasY <= r.y + r.h;
  }

  private hitRestartButton(canvasX: number, canvasY: number): boolean {
    const r = this.renderer.restartButtonRect;
    if (!r) return false;
    return canvasX >= r.x && canvasX <= r.x + r.w && canvasY >= r.y && canvasY <= r.y + r.h;
  }

  private handleGameOverTap(e: TouchEvent) {
    const t = e.touches[0];
    if (!t) return;
    const rect = this.ctx.canvas.getBoundingClientRect();
    const canvasX = (t.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const canvasY = (t.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    if (this.hitRestartButton(canvasX, canvasY)) {
      this.restartGame();
    }
  }

  private handleGameOverClick(e: MouseEvent) {
    const rect = this.ctx.canvas.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const canvasY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    if (this.hitRestartButton(canvasX, canvasY)) {
      this.restartGame();
    }
  }

  private initGame() {
    this.snake.reset();
    this.food.clear();
    this.round = 1;
    this.foodSpawner.spawn(this.food, this.snake, this.maxFoodValue);
    this.score = 0;
    this.lastFoodSpawnTime = performance.now();
    this.mergeSystem = new MergeSystem();
    this.loop.setTickMs(this.tickMs);
    this.state = 'ready';
    this.highScore = parseInt(localStorage.getItem('numberSnake_highScore') ?? '0', 10) || 0;
    this.highRound = parseInt(localStorage.getItem('numberSnake_highRound') ?? '0', 10) || 0;
  }

  private advanceRound() {
    this.state = 'round_clear';
    this.roundClearInfo = {
      lastPopTime: performance.now(),
      segmentScore: 0,
      bonus: this.round * this.round * ROUND_CLEAR_BONUS_BASE,
      headBonus: 0,
      phase: 'popping',
      showStartTime: 0,
    };
  }

  private tick() {
    if (this.state !== 'playing') return;

    const dir = this.input.consumeDirection();
    this.snake.direction = dir;

    const result = this.collision.check(this.snake, this.food);

    if (result.self) {
      this.state = 'game_over';
      this.snake.alive = false;
      this.sound.death();
      navigator.vibrate?.(200);
      this.saveHighScore();
      return;
    }

    if (result.food && result.foodDangerous) {
      this.state = 'game_over';
      this.snake.alive = false;
      this.sound.death();
      navigator.vibrate?.(200);
      this.saveHighScore();
      return;
    }

    if (result.food) {
      const eaten = this.food.removeAt(result.food.pos)!;

      if (eaten.type === 'removal') {
        this.snake.move();
        this.wrapHead();
        if (this.snake.segments.length > 1) {
          this.snake.segments.pop();
        }
        this.sound.eat();
      } else if (eaten.type === 'merge') {
        this.snake.move();
        this.wrapHead();
        if (this.mergeSystem.startMergeScan(this.snake)) {
          this.state = 'merging';
        }
      } else {
        this.snake.eat(eaten.value);
        this.wrapHead();
        this.sound.eat();
      }

    } else {
      this.snake.move();
      this.wrapHead();
    }

    // Spawn food over time
    const now = performance.now();
    if (this.food.items.length < FOOD_COUNT_MAX && now - this.lastFoodSpawnTime >= FOOD_SPAWN_INTERVAL_MS) {
      this.foodSpawner.spawnSingle(this.food, this.snake, this.maxFoodValue);
      this.lastFoodSpawnTime = now;
    }
  }

  private saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('numberSnake_highScore', String(this.highScore));
    }
    if (this.round > this.highRound) {
      this.highRound = this.round;
      localStorage.setItem('numberSnake_highRound', String(this.highRound));
    }
  }

  private wrapHead() {
    const h = this.snake.head;
    const wrapped = wrapPos(h.pos);
    h.pos.x = wrapped.x;
    h.pos.y = wrapped.y;
  }

  private render(dt: number) {
    const now = performance.now();

    if (this.state === 'merging') {
      const stillMerging = this.mergeSystem.update(this.snake, now);
      if (!stillMerging) {
        const merges = this.mergeSystem.consumeCompletedMerges();
        for (const m of merges) {
          this.renderer.mergeAnimator.spawnBurst(
            m.pos.x * CELL_SIZE,
            m.pos.y * CELL_SIZE,
            m.resultValue,
          );
        }

        this.sound.merge();
        navigator.vibrate?.(50);
        this.score += this.mergeSystem.consumeScore();
        if (this.mergeSystem.chainCount > 1) {
          this.chainCombo = { count: this.mergeSystem.chainCount, startTime: now };
        }
        if (this.advanceReady) {
          this.advanceRound();
        } else {
          this.state = 'playing';
        }
      }
    }

    if (this.state === 'round_clear' && this.roundClearInfo) {
      const info = this.roundClearInfo;
      if (info.phase === 'popping') {
        if (this.snake.segments.length > 1 && now - info.lastPopTime >= ROUND_CLEAR_POP_MS) {
          const seg = this.snake.segments.pop()!;
          const points = seg.value * MERGE_BASE_SCORE;
          info.segmentScore += points;
          this.score += points;
          this.renderer.mergeAnimator.spawnBurst(
            seg.pos.x * CELL_SIZE, seg.pos.y * CELL_SIZE, seg.value,
          );
          this.sound.pop();
          info.lastPopTime = now;
        }
        if (this.snake.segments.length <= 1) {
          info.headBonus = this.snake.head.value * MERGE_BASE_SCORE * this.round;
          this.score += info.bonus + info.headBonus;
          this.sound.roundClear();
          navigator.vibrate?.(100);
          info.phase = 'showing';
          info.showStartTime = now;
        }
      } else if (info.phase === 'showing') {
        if (now - info.showStartTime > 1500) {
          this.round++;
          this.loop.setTickMs(this.tickMs);
          this.food.clear();
          this.foodSpawner.spawn(this.food, this.snake, this.maxFoodValue);
          this.lastFoodSpawnTime = performance.now();
          this.roundClearInfo = null;
          this.state = 'ready';
        }
      }
    }

    const clearBonus = this.roundClearInfo?.phase === 'showing' ? this.roundClearInfo.bonus : 0;
    const clearHeadBonus = this.roundClearInfo?.phase === 'showing' ? this.roundClearInfo.headBonus : 0;

    // Expire chain combo after total animation duration (2.2s)
    if (this.chainCombo && now - this.chainCombo.startTime > 2200) {
      this.chainCombo = null;
    }

    this.renderer.render(
      this.ctx,
      this.snake,
      this.food,
      this.mergeSystem,
      this.score,
      this.round,
      this.targetScore,
      this.state,
      dt,
      clearBonus,
      clearHeadBonus,
      this.showTutorial,
      this.input.joystick,
      this.input.activeDpadDir,
      this.highScore,
      this.chainCombo,
      this.sound.muted,
    );
  }
}
