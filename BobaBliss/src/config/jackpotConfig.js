/*
 * config/jackpotConfig.js — DEAD-CODE COMMENTED OUT 2026-06-22.
 *
 * Standalone jackpot tier table from an early prototype. The
 * active game's jackpot tier config lives under
 * `gameConfig.jackpot` in `games/suger-rush/config.js` and is
 * passed into `JackpotEngine` via the constructor (see
 * `engine/SpinManager.js`). Nothing in `src/` imports
 * `JACKPOT_CONFIG`.
 *
 * Original contents preserved below for future restoration:
 */


export const JACKPOT_CONFIG = {
    mini: 500,
    minor: 2000,
    major: 10000,
    grand: 100000
};
