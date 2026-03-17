// Grid
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 640;
export const CELL_SIZE = 40;
export const GRID_COLS = 20;
export const GRID_ROWS = 16;
export const HUD_ROWS = 2;
export const PLAY_ROWS = GRID_ROWS - HUD_ROWS; // 14
export const PLAY_Y_OFFSET = HUD_ROWS; // play area starts at row 2

// Timing
export const SNAKE_TICK_MS = 150;
export const MERGE_GLOW_MS = 150;
export const MERGE_SHRINK_MS = 150;
export const MERGE_DELAY_MS = MERGE_GLOW_MS + MERGE_SHRINK_MS; // 300 total per step

// Gameplay
export const DECAY_DISTANCE = 8;
export const INITIAL_LIVES = 3;
export const INITIAL_HEAD_VALUE = 4;
export const FOOD_COUNT_TARGET = 8;
export const MAX_FOOD_VALUE_BASE = 4; // max food value in round 1

// Scoring
export const MERGE_BASE_SCORE = 10;
export const CHAIN_MULTIPLIER = 2; // each chain step multiplies score

// Round
export const ROUND_1_TARGET_SCORE = 500;
export const ROUND_SCORE_MULTIPLIER = 1.8;
export const ROUND_FOOD_VALUE_INCREASE = 2; // max food value increases per round

// Colors
export const COLOR_BG = '#1a1a2e';
export const COLOR_GRID = '#16213e';
export const COLOR_GRID_LINE = '#0f3460';
export const COLOR_SNAKE_HEAD = '#e94560';
export const COLOR_SNAKE_BODY = '#533483';
export const COLOR_FOOD_SAFE = '#4ecca3';
export const COLOR_FOOD_DANGER = '#e23e57';
export const COLOR_FOOD_MERGEABLE = '#ffd369';
export const COLOR_FENCE_ACTIVE = '#00d2ff';
export const COLOR_FENCE_INACTIVE = '#333';
export const COLOR_HUD_BG = '#0f0f23';
export const COLOR_TEXT = '#eee';
export const COLOR_MERGE_GLOW = '#ffd700';
