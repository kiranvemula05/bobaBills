/*
 * EngineFactory.js — DEAD-CODE PAYLINE BRANCH COMMENTED OUT 2026-06-22.
 *
 * The shipped game is "Sugar Rush Inspired" which uses cluster
 * pays (`winType === "CLUSTER"`, see `games/suger-rush/config.js`).
 * The `PAYLINE` branch and the `PaylineEngine` import have been
 * commented out since `PaylineEngine.js` is itself dead code. The
 * "WaysEngine" reference in the header comment was historical —
 * no such engine ever existed on disk; the note is preserved.
 *
 * Build the win-evaluation engine for the active game.
 *
 *   winType === "CLUSTER" -> ClusterEngine
 *
 * The previous version of this file referenced a "WaysEngine" that
 * never existed on disk; that branch is intentionally removed.
 */
// import PaylineEngine from "./PaylineEngine"; // DEAD — commented 2026-06-22 (see PaylineEngine.js)
import ClusterEngine from "./ClusterEngine";

export default class EngineFactory {
    static create(gameConfig) {
        switch (gameConfig.winType) {
            // case "PAYLINE": // DEAD — commented 2026-06-22 (see PaylineEngine.js)
            //     return new PaylineEngine(
            //         gameConfig.paylines ?? []
            //     );

            case "CLUSTER":
                return new ClusterEngine(
                    gameConfig.minClusterSize ?? 8
                );

            default:
                throw new Error(
                    `Unsupported win type: ${gameConfig.winType}`
                );
        }
    }
}