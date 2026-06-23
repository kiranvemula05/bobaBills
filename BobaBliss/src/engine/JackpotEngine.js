// import ProgressiveJackpot from "./ProgressiveJackpot"; // DEAD — commented 2026-06-22 (see ProgressiveJackpot.js)

import EventBus from "./EventBus";

class JackpotEngine {
    constructor(config = {}) {
        this.config = {
            mini: 500,
            minor: 2000,
            major: 10000,
            grand: 100000,
            ...config
        };
        this.basePool = 100000;
        this.pool = this.basePool;
        // this.progressive = new ProgressiveJackpot(); // DEAD — commented 2026-06-22
    }


    contribute(bet) {
        this.pool += bet * 0.01;
    }

    getPool() {
        return this.pool;
    }

    award() {
        const amount = this.pool;

        this.pool = this.basePool;

        EventBus.emit("JACKPOT_WON", {
            type: "PROGRESSIVE",
            amount
        });

        return amount;
    }

    trigger(type) {

        const amount =
            this.config[type];

        if (!amount) {
            throw new Error(
                `Unknown jackpot type: ${type}`
            );
        }

        EventBus.emit(
            "JACKPOT_WON",
            {
                type,
                amount
            }
        );

        return {
            type,
            amount
        };
    }

    randomTrigger() {

        const random =
            Math.random();

        if (random < 0.0001) {
            return this.trigger(
                "grand"
            );
        }

        if (random < 0.001) {
            return this.trigger(
                "major"
            );
        }

        if (random < 0.01) {
            return this.trigger(
                "minor"
            );
        }

        if (random < 0.05) {
            return this.trigger(
                "mini"
            );
        }

        return null;
    }
}

export default JackpotEngine;