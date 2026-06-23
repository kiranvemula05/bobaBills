/*
 * PaylineEngine.js — DEAD-CODE COMMENTED OUT 2026-06-22.
 *
 * The shipped game is "Sugar Rush Inspired" which uses cluster
 * pays (`winType === "CLUSTER"`, see `games/suger-rush/config.js`
 * and `engine/EngineFactory.js`). The payline evaluator is wired
 * through `EngineFactory` but the branch is unreachable — the
 * only registered game picks the cluster branch. The `paylines`
 * field of `gameConfig` and the entire `config/paylines.js` have
 * also been commented out for symmetry.
 *
 * Original contents preserved below for future restoration:
 */


class PaylineEngine {
    constructor(paylines) {
        this.paylines = paylines;
    }

    evaluate(reels) {
        const wins = [];

        this.paylines.forEach(
            (line, lineIndex) => {

                const symbols = line.map(
                    (rowIndex, reelIndex) =>
                        reels[reelIndex][rowIndex]
                );

                const result =
                    this.evaluateLine(symbols);

                if (result.count >= 3) {

                    wins.push({
                        lineIndex,
                        symbol: result.symbol,
                        count: result.count,
                        positions:
                            this.getPositions(line)
                    });

                }
            }
        );

        return wins;
    }

    evaluateLine(symbols) {

        let baseSymbol =
            symbols.find(
                s => s !== "WILD"
            );

        if (!baseSymbol) {
            baseSymbol = "WILD";
        }

        let count = 0;

        for (
            let i = 0;
            i < symbols.length;
            i++
        ) {

            const current =
                symbols[i];

            if (
                current === baseSymbol ||
                current === "WILD"
            ) {

                count++;

            } else {

                break;

            }
        }

        return {
            symbol: baseSymbol,
            count
        };
    }

    getPositions(line) {

        return line.map(
            (row, reel) => ({
                row,
                reel
            })
        );
    }
}

export default PaylineEngine;
