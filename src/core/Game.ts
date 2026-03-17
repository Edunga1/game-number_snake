import { GameState } from '../types';
import { Snake } from '../entities/Snake';
import { FoodManager } from '../entities/Food';
import { FoodSpawner } from '../entities/FoodSpawner';
import { CollisionSystem } from '../systems/CollisionSystem';
import { MergeSystem } from '../systems/MergeSystem';
import { DecaySystem } from '../systems/DecaySystem';
import { RoundSystem } from '../systems/RoundSystem';
import { InputManager } from './InputManager';
import { GameLoop } from './GameLoop';
import { Renderer } from '../rendering/Renderer';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, SNAKE_TICK_MS,
  INITIAL_LIVES, INITIAL_HEAD_VALUE,
  GRID_COLS, PLAY_Y_OFFSET, PLAY_ROWS, CELL_SIZE,
} from '../constants';

export class Game {
  private ctx: CanvasRenderingContext2D;
  private snake = new Snake();
  private food = new FoodManager();
  private foodSpawner = new FoodSpawner();
  private collision = new CollisionSystem();
  private mergeSystem = new MergeSystem();
  private decaySystem = new DecaySystem();
  private roundSystem = new RoundSystem();
  private input: InputManager;
  private loop: GameLoop;
  private renderer = new Renderer();

  private state: GameState = 'round_start';
  private lives = INITIAL_LIVES;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    this.ctx = canvas.getContext('2d')!;

    this.input = new InputManager(canvas);
    this.loop = new GameLoop(SNAKE_TICK_MS, () => this.tick(), (dt) => this.render(dt));

    window.addEventListener('keydown', (e) => {
      if (e.key === ' ') this.handleAction();
    });
    canvas.addEventListener('touchstart', () => {
      if (this.state !== 'playing' && this.state !== 'merging') {
        this.handleAction();
      }
    });

    this.startRound();
    this.loop.start();
  }

  private handleAction() {
    if (this.state === 'round_start') {
      this.state = 'playing';
    } else if (this.state === 'game_over') {
      this.resetGame();
    } else if (this.state === 'round_clear') {
      this.roundSystem.advanceRound();
      this.startRound();
    }
  }

  private startRound() {
    const config = this.roundSystem.getRoundConfig();
    this.snake.reset();
    this.snake.head.value = INITIAL_HEAD_VALUE;
    this.food.clear();
    this.foodSpawner.spawn(this.food, this.snake, config.maxFoodValue);
    this.loop.setTickMs(config.tickMs);
    this.state = 'round_start';
  }

  private resetGame() {
    this.roundSystem = new RoundSystem();
    this.lives = INITIAL_LIVES;
    this.mergeSystem = new MergeSystem();
    this.startRound();
  }

  private tick() {
    if (this.state !== 'playing') return;

    const config = this.roundSystem.getRoundConfig();
    const dir = this.input.consumeDirection();
    this.snake.direction = dir;

    // Check collision before moving
    const result = this.collision.check(this.snake, this.food, this.roundSystem.fenceActive);

    if (result.wall || result.self) {
      this.loseLife();
      return;
    }

    if (result.food && result.foodDangerous) {
      // Eating dangerous food
      this.loseLife();
      return;
    }

    if (result.food) {
      // Eat food: move and grow
      const eaten = this.food.removeAt(result.food.pos)!;
      this.snake.move(false); // move head forward
      this.snake.addTailSegment(eaten.value); // add food value at tail

      // Spawn replacement
      this.foodSpawner.spawnSingle(this.food, this.snake, config.maxFoodValue);

      // Start merge scan
      if (this.mergeSystem.startMergeScan(this.snake)) {
        this.state = 'merging';
      }
    } else {
      // Normal move
      this.snake.move(false);

      // Check if snake exited through the right side (round clear)
      if (!this.roundSystem.fenceActive && this.snake.head.pos.x >= GRID_COLS) {
        this.state = 'round_clear';
        return;
      }

      // Wrap around if fence is off and exiting (top/bottom/left for now just right exit)
      if (!this.roundSystem.fenceActive) {
        const h = this.snake.head;
        if (h.pos.x < 0) h.pos.x = GRID_COLS - 1;
        if (h.pos.y < PLAY_Y_OFFSET) h.pos.y = PLAY_Y_OFFSET + PLAY_ROWS - 1;
        if (h.pos.y >= PLAY_Y_OFFSET + PLAY_ROWS) h.pos.y = PLAY_Y_OFFSET;
      }
    }

    // Head decay
    if (this.decaySystem.update(this.snake)) {
      this.loseLife();
      return;
    }
  }

  private loseLife() {
    this.lives--;
    if (this.lives <= 0) {
      this.state = 'game_over';
      this.snake.alive = false;
    } else {
      // Respawn snake
      this.snake.reset();
      this.snake.head.value = INITIAL_HEAD_VALUE;
      this.input.setDirection(this.snake.direction);
    }
  }

  private render(dt: number) {
    const now = performance.now();

    // Update merge animation
    if (this.state === 'merging') {
      const stillMerging = this.mergeSystem.update(this.snake, now);
      if (!stillMerging) {
        // Spawn particles for completed merges
        const merges = this.mergeSystem.consumeCompletedMerges();
        for (const m of merges) {
          this.renderer.mergeAnimator.spawnBurst(
            m.pos.x * CELL_SIZE,
            m.pos.y * CELL_SIZE,
            m.resultValue,
          );
        }

        // Collect score
        const score = this.mergeSystem.consumeScore();
        this.roundSystem.addScore(score);

        this.state = 'playing';
      }
    }

    this.renderer.render(
      this.ctx,
      this.snake,
      this.food,
      this.mergeSystem,
      this.roundSystem,
      this.lives,
      this.state,
      dt,
    );
  }
}
