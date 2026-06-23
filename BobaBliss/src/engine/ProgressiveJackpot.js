/*
 * ProgressiveJackpot.js — DEAD-CODE COMMENTED OUT 2026-06-22.
 *
 * Standalone progressive pool that the main `JackpotEngine`
 * instantiated alongside its own `pool` field. The shipped game
 * only ever reads `jackpotEngine.pool`; the `ProgressiveJackpot`
 * instance was orphaned on init. Commented out together with the
 * `this.progressive = new ProgressiveJackpot()` line in
 * `JackpotEngine.js`. See `engine/JackpotEngine.js` for the
 * survivor.
 *
 * Original contents preserved below for future restoration:
 */


class ProgressiveJackpot {
    constructor() {
        this.pool = 100000;
    }

    contribute(bet) {
        this.pool += bet * 0.01;
    }

    award() {
        const amount = this.pool;
        this.pool = 100000;
        return amount;
    }
}

export default ProgressiveJackpot;
