/*
 * GameStateManager.js — DEAD-CODE COMMENTED OUT 2026-06-22.
 *
 * Was a planned FSM that mapped SPINNING / CASCADING / BONUS /
 * FREE_SPINS / BIG_WIN / FEATURE_COMPLETE transitions. The active
 * game uses ad-hoc booleans on the Zustand store (`spinning`,
 * `freeSpins`, `autoSpinRemaining`, `reelSpinning`) plus the
 * `EventBus` (`SPIN_START` / `WIN_CALCULATED` / `WIN_COMPLETE` /
 * `BONUS_TRIGGERED` / `BONUS_END` / `JACKPOT_WON`) instead of a
 * dedicated FSM. No file in `src/` imports `GAME_STATES`.
 *
 * Original contents:
 */

export const GAME_STATES = {
    IDLE: "IDLE",
    SPINNING: "SPINNING",
    CASCADING: "CASCADING",
    BONUS: "BONUS",
    FREE_SPINS: "FREE_SPINS",
    BIG_WIN: "BIG_WIN",
    FEATURE_COMPLETE: "FEATURE_COMPLETE"
};