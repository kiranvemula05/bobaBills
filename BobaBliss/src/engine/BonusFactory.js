/*
 * BonusFactory.js — DEAD-CODE COMMENTED OUT 2026-06-22.
 *
 * Lookup helper for `getBonusEngine(type, engines)`. The active
 * bonus-engine wiring lives directly in `BonusEngine.checkTrigger`
 * / `BonusEngine.constructor`; no file in `src/` imports
 * `getBonusEngine`. Commented out together with the
 * `import HoldAndWinEngine` + `import JackpotEngine` lines in
 * `BonusEngine.js` since those engines themselves have been
 * commented out as dead code.
 *
 * Original contents preserved below for future restoration:
 */


export function getBonusEngine(
    bonusType,
    engines
) {
    switch (bonusType) {
        case "FREE_SPINS":
            return engines.freeSpinEngine;

        case "HOLD_AND_WIN":
            return engines.holdAndWinEngine;

        case "JACKPOT":
            return engines.jackpotEngine;

        default:
            throw new Error(
                "Unknown bonus type"
            );
    }
}
