import gameConfig from "../games/suger-rush/config.js";

const grid = gameConfig.layout.grid;
const ROW_GAP = grid.rowGap;
const COL_GAP = grid.colGap;
const TOTAL_GAP = ROW_GAP * 6; // 6 gaps across 7 rows

export const BOARD_X = grid.boardX;
export const BOARD_Y = grid.boardY;

export const BOARD_WIDTH = grid.boardWidth;
export const BOARD_HEIGHT = grid.boardHeight;

export const SYMBOL_SIZE = grid.symbolSize;

export const CELL_SIZE_X = SYMBOL_SIZE + COL_GAP;
export const CELL_SIZE_Y = SYMBOL_SIZE + ROW_GAP;
export const GRID_OFFSET = {
    x: BOARD_X + 8,
    y: BOARD_Y + 8 - TOTAL_GAP / 2,
};

// Source of truth lives in games/suger-rush/config.js so the
// per-game AssetRegistry and the renderer never disagree about
// which URL a symbol uses.
export const SYMBOL_TEXTURES = gameConfig.assets.symbols;

export const SYMBOL_FALLBACK_COLOR = gameConfig.layout.symbolFallbackColor;

// Re-export the game config for convenience.
export { gameConfig };