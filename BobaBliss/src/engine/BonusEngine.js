// import FreeSpinEngine from "./FreeSpinEngine"; // DEAD — commented 2026-06-22 (see FreeSpinEngine.js)
// import HoldAndWinEngine from "./HoldAndWinEngine"; // DEAD — commented 2026-06-22 (see HoldAndWinEngine.js)
// import JackpotEngine from "./JackpotEngine"; // DEAD — commented 2026-06-22 (see JackpotEngine.js)

/**
 * BonusEngine
 *
 * Owns the three bonus feature engines and answers two questions:
 *
 *   1. `checkTrigger(grid)` — does this grid contain enough scatters
 *      to start a free-spin round?
 *   2. `getBonusEngine(type)` — hand back the engine that handles
 *      a given bonus type ("FREE_SPINS" | "HOLD_AND_WIN" | "JACKPOT").
 */
class BonusEngine {
    constructor(config = {}) {
        this.config = config;
        // The HoldAndWin + Jackpot engines were never wired to a
        // caller. SpinManager still constructs its own JackpotEngine
        // for the per-spin random jackpot roll. Commented out
        // alongside `BonusFactory.getBonusEngine` (also dead) so
        // this module's dependency surface matches reality.
        // this.freeSpinEngine = new FreeSpinEngine();
        // this.holdAndWinEngine = new HoldAndWinEngine(config);
        // this.jackpotEngine = new JackpotEngine(config);
    }

    checkTrigger(grid) {
        const scatterCount = this.countScatters(grid);
        const required = this.config.scatterTrigger ?? 4;
        if (scatterCount >= required) {
            // Award table from `gameConfig.freeSpins.awards` —
            // same shape the paytable uses. Largest matching
            // scatter count wins, so 7 scatters award the 7-key
            // entry rather than the 4-key one.
            const awards =
                this.config?.freeSpins?.awards ?? {};
            const awardKeys = Object.keys(awards)
                .map(Number)
                .sort((a, b) => b - a);
            let freeSpins = 0;
            for (const k of awardKeys) {
                if (scatterCount >= k) {
                    freeSpins = awards[k];
                    break;
                }
            }
            return {
                triggered: true,
                type: "FREE_SPINS",
                scatterCount,
                freeSpins,
            };
        }
        return { triggered: false };
    }

    countScatters(grid) {
        let count = 0;
        for (const row of grid) {
            for (const sym of row) {
                if (sym === "SCATTER") count++;
            }
        }
        return count;
    }
}

export default BonusEngine;