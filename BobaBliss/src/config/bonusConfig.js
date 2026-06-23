/*
 * config/bonusConfig.js — DEAD-CODE COMMENTED OUT 2026-06-22.
 *
 * Standalone scatter-trigger / free-spin awards table from an
 * early prototype. The active game's bonus config lives under
 * `gameConfig.bonus.scatterTrigger` and
 * `gameConfig.freeSpins.awards` in
 * `games/suger-rush/config.js` — the same shape the
 * `BonusEngine.checkTrigger` resolver expects. Nothing in `src/`
 * imports `BONUS_CONFIG`.
 *
 * Original contents preserved below for future restoration:
 */


export const BONUS_CONFIG = {
    scatterTrigger: 4,

    freeSpins: {
        4: 10,
        5: 15,
        6: 20
    }
};
