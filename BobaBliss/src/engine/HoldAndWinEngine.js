/*
 * HoldAndWinEngine.js — DEAD-CODE COMMENTED OUT 2026-06-22.
 *
 * The "Hold & Win" bonus engine was the design target for the
 * coin-lock / respin loop. The shipped game ("Sugar Rush Inspired")
 * does not implement that mechanic; the engine is never instantiated
 * (the `holdAndWin` config key in `gameConfig` is absent), and
 * `SpinManager` still constructs one on init but no code path
 * triggers `start()` / `spin()`. The `holdAndWin` slice in
 * `store/gameStore.js` and the `HoldAndWinEngine` wiring in
 * `SpinManager` / `BonusEngine` have also been commented out so
 * nothing reads or writes the dead code.
 *
 * Original contents preserved below for future restoration:
 */


import EventBus from "./EventBus";

class HoldAndWinEngine {
    constructor(config = {}) {
        this.maxRespins =
            config.maxRespins || 3;

        this.reset();
    }

    reset() {
        this.active = false;

        this.respinsLeft = this.maxRespins;

        this.lockedSymbols = [];

        this.totalWin = 0;

    }

    start(triggerData) {
        this.reset();

        this.active = true;

        this.lockedSymbols =
            triggerData.lockedSymbols || [];

        EventBus.emit(
            "HOLD_AND_WIN_START",
            {
                lockedSymbols:
                    this.lockedSymbols
            }
        );
    }

    spin(newSymbols = []) {

        if (!this.active) {
            return;
        }

        if (newSymbols.length > 0) {

            this.lockedSymbols.push(
                ...newSymbols
            );

            this.respinsLeft =
                this.maxRespins;

        } else {

            this.respinsLeft--;

        }

        EventBus.emit(
            "HOLD_AND_WIN_UPDATE",
            {
                respinsLeft:
                    this.respinsLeft,
                lockedSymbols:
                    this.lockedSymbols
            }
        );

        if (
            this.respinsLeft <= 0
        ) {

            return this.complete();

        }
    }

    complete() {

        this.totalWin =
            this.lockedSymbols.reduce(
                (sum, symbol) =>
                    sum + symbol.value,
                0
            );

        this.active = false;

        EventBus.emit(
            "HOLD_AND_WIN_COMPLETE",
            {
                totalWin:
                    this.totalWin,
                lockedSymbols:
                    this.lockedSymbols
            }
        );

        return {
            totalWin:
                this.totalWin
        };
    }
}

export default HoldAndWinEngine;
