import SpinManager from "./SpinManager";
import gameConfig from "../games/suger-rush/config.js";
import { PAYTABLE } from "../games/suger-rush/paytable.js";

/**
 * SlotEngine
 *
 * Public façade for the slot game. Components should import this
 * module's default export and never touch SpinManager directly.
 *
 * The engine is a singleton so the auto-spin flag, RNG state, and
 * socket wiring are shared across the React tree.
 */
class SlotEngine {
    constructor() {
        this.spinManager = new SpinManager({
            config: gameConfig,
            paytable: PAYTABLE,
            symbols: gameConfig.symbols,
            symbolWeights: gameConfig.symbolWeights,
            winType: gameConfig.winType,
            minClusterSize: gameConfig.minClusterSize,
        });
    }

    initialize() {
        this.spinManager.initialize();
    }

    async spin() {
        return this.spinManager.startSpin();
    }

    /**
     * Request that the in-flight spin stop at the next safe
     * checkpoint (after cascades finish, before the next auto
     * round begins). Sets a flag on `SpinManager`; the engine
     * checks it on its way out of `startSpin`. Idempotent — safe
     * to call multiple times while a spin is running.
     *
     * Manual spins: the current spin finishes its cascades and
     * the loop halts before the auto-round `setTimeout` fires.
     *
     * Auto-spins: same — the engine finishes the in-flight round
     * then bails out of the loop, leaving `autoSpinRemaining`
     * at whatever value it had before the round.
     */
    stopSpin() {
        return this.spinManager.requestStop();
    }

    startAutoSpin(count) {
        return this.spinManager.startAutoSpin(count);
    }

    stopAutoSpin() {
        return this.spinManager.stopAutoSpin();
    }
}

const slotEngine = new SlotEngine();
export default slotEngine;
