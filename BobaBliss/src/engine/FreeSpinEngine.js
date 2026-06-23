import { Assets } from "pixi.js";

/**
 * FreeSpinEngine
 *
 * Owns the "free spins" bonus round. When triggered, it loads
 * the "free-spins" Pixi asset bundle (background, additional
 * sounds, etc.) and tracks the remaining spin count.
 */
class FreeSpinEngine {
    constructor() {
        this.active = false;
        this.spinsRemaining = 0;
        this.totalAwarded = 0;
    }

    async start(scatterCount = 4) {
        try {
            await Assets.loadBundle("free-spins");
        } catch {
            // bundle may be missing in dev
        }
        this.active = true;
        this.spinsRemaining = this._awardFor(scatterCount);
        this.totalAwarded = this.spinsRemaining;
        return { spinsRemaining: this.spinsRemaining };
    }

    consume() {
        if (!this.active) return 0;
        this.spinsRemaining = Math.max(0, this.spinsRemaining - 1);
        if (this.spinsRemaining === 0) {
            this.active = false;
        }
        return this.spinsRemaining;
    }

    stop() {
        this.active = false;
        this.spinsRemaining = 0;
    }

    /**
     * Map a scatter count to the number of free spins awarded.
     * Mirrors the paytable's FREE_SPINS_* keys.
     */
    _awardFor(scatterCount) {
        if (scatterCount >= 7) return 20;
        if (scatterCount >= 6) return 15;
        if (scatterCount >= 5) return 12;
        if (scatterCount >= 4) return 10;
        return 0;
    }
}

export default FreeSpinEngine;
