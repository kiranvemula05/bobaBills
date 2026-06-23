/**
 * RNGProcessor
 *
 * Generates the reel grid. Supports both uniform sampling and
 * weighted sampling so the game config's `symbolWeights` is honored.
 */
class RNGProcessor {
    constructor(symbols, rows = 7, cols = 7) {
        this.symbols = symbols;
        this.rows = rows;
        this.cols = cols;
    }

    generateGrid() {
        return Array.from({ length: this.rows }, () =>
            Array.from(
                { length: this.cols },
                () => this.randomSymbol()
            )
        );
    }

    /**
     * Same as generateGrid() but each symbol is picked from a weighted
     * distribution. `weights` is `{ [symbol]: number }`.
     */
    generateWeightedGrid(weights = null) {
        const w = weights ?? this._uniformWeights();
        const entries = Object.entries(w);
        const total = entries.reduce(
            (sum, [, n]) => sum + n,
            0
        );

        const pick = () => {
            let r = Math.random() * total;
            for (const [sym, n] of entries) {
                r -= n;
                if (r <= 0) return sym;
            }
            return entries[entries.length - 1][0];
        };

        return Array.from({ length: this.rows }, () =>
            Array.from({ length: this.cols }, pick)
        );
    }

    randomSymbol() {
        return this.symbols[
            Math.floor(Math.random() * this.symbols.length)
        ];
    }

    _uniformWeights() {
        const out = {};
        for (const s of this.symbols) out[s] = 1;
        return out;
    }
}

export default RNGProcessor;
