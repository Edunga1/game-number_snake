import { GameState } from '../types';
import { Snake } from '../entities/Snake';
import { FoodManager } from '../entities/Food';
import { FoodSpawner } from '../entities/FoodSpawner';
import { CollisionSystem, wrapPos } from '../systems/CollisionSystem';
import { MergeSystem } from '../systems/MergeSystem';
import { DecaySystem } from '../systems/DecaySystem';
import { InputManager } from './InputManager';
import { GameLoop } from './GameLoop';
import { Renderer } from '../rendering/Renderer';
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

  private state: GameState = 'ready';
  score = 0;
  round = 1;
  private lastFoodSpawnTime = 0;
  private showTutorial = true;
  private roundClearInfo: {
    lastPopTime: number;
    segmentScore: number;
    bonus: number;
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
        if (this.state === 'playing') {
          this.spawnMergeItem();
        } else {
          this.handleAction();
        }
      }
    });
    canvas.addEventListener('touchstart', () => {
      if (this.state === 'ready' || this.state === 'game_over') {
        this.handleAction();
      }
    });

    this.initGame();
    this.loop.start();
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
    } else if (this.state === 'game_over') {
      this.initGame();
      this.state = 'playing';
    }
  }

  // DEBUG: spawn merge item on space
  private spawnMergeItem() {
    this.foodSpawner.spawnMerge(this.food, this.snake);
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
  }

  private advanceRound() {
    this.state = 'round_clear';
    this.roundClearInfo = {
      lastPopTime: performance.now(),
      segmentScore: 0,
      bonus: this.round * ROUND_CLEAR_BONUS_BASE,
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
      return;
    }

    if (result.food && result.foodDangerous) {
      this.state = 'game_over';
      this.snake.alive = false;
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
      } else if (eaten.type === 'merge') {
        this.snake.move();
        this.wrapHead();
        if (this.mergeSystem.startMergeScan(this.snake)) {
          this.state = 'merging';
        }
      } else {
        this.snake.eat(eaten.value);
        this.wrapHead();
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

        this.score += this.mergeSystem.consumeScore();
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
          info.lastPopTime = now;
        }
        if (this.snake.segments.length <= 1) {
          this.score += info.bonus;
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
      this.showTutorial,
    );
  }
}
