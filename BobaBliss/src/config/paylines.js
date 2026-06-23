/*
 * config/paylines.js — DEAD-CODE COMMENTED OUT 2026-06-22.
 *
 * Hard-coded 5×3 payline patterns from an early prototype. The
 * active game is cluster-pays (see `games/suger-rush/config.js`
 * `winType: "CLUSTER"` and `engine/ClusterEngine.js`), so no
 * payline patterns are needed. The `PaylineEngine` was already
 * commented out alongside this file. Nothing in `src/` imports
 * `PAYLINES`.
 *
 * Original contents preserved below for future restoration:
 */


export const PAYLINES = [
    [1, 1, 1, 1, 1], // Middle
    [0, 0, 0, 0, 0], // Top
    [2, 2, 2, 2, 2], // Bottom
    [0, 1, 2, 1, 0], // V
    [2, 1, 0, 1, 2]  // Inverted V
];
