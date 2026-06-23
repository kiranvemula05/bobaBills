/*
 * StateManager.js — DEAD-CODE COMMENTED OUT 2026-06-22.
 *
 * Pre-Zustand singleton state container. Replaced by
 * `store/gameStore.js` (Zustand) which is the only state owner
 * the rest of the codebase reads from. The original module's
 * `setState(...)` pattern was the migration's source of truth;
 * its methods are now `setBalance` / `setJackpot` / `setFreeSpins`
 * / etc. on the Zustand store. No file in `src/` imports
 * `StateManager`.
 *
 * Original contents preserved below for future restoration:
 */


class StateManager {
    constructor() {
        this.state = {
            balance: 1000,
            bet: 10,
            totalWin: 0,
            freeSpins: 0,
            reels: []
        };
    }

    getState() {
        return this.state;
    }

    update(data) {
        this.state = {
            ...this.state,
            ...data
        };
    }
}

export default new StateManager();
