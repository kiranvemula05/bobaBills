/**
 * WinCalculator
 *
 * Takes the output of a win engine (a list of cluster / payline
 * objects) and the current bet, and produces a `{ totalWin,
 * winDetails }` summary.
 *
 * The previous version of this file referenced identifiers that did
 * not exist (`paylineEngine`, `winCalculator`, `reels`); this rewrite
 * keeps the original "paytable[sym]?.[count] * bet" math and nothing
 * else.
 */
class WinCalculator {
    constructor(paytable) {
        this.paytable = paytable;
    }

    calculate(wins = [], bet = 1) {
        let totalWin = 0;
        const winDetails = [];

        for (const win of wins) {
            const { symbol, count } = win;
            const payout =
                this.paytable[symbol]?.[count] ?? 0;
            const amount = payout * bet;

            if (amount > 0) {
                totalWin += amount;
                winDetails.push({ ...win, payout: amount });
            }
        }

        return { totalWin, winDetails };
    }
}

export default WinCalculator;
