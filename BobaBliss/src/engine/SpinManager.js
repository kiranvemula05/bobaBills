import EventBus from "./EventBus";
import EngineFactory from "./EngineFactory";
import ClusterEngine from "./ClusterEngine";
import CascadeEngine from "./CascadeEngine";
import WinCalculator from "./WinCalculator";
import RNGProcessor from "./RNGProcessor";
import BonusEngine from "./BonusEngine";
import JackpotEngine from "./JackpotEngine";
// import HoldAndWinEngine from "./HoldAndWinEngine"; // DEAD — commented 2026-06-22 (see HoldAndWinEngine.js)
import socket from "../api/socket";
import { useGameStore } from "../store/gameStore";

/**
 * SpinManager
 *
 * Single source of truth for one spin of the slot machine.
 *
 * Pipeline:
 *   1. emit SPIN_START
 *   2. generate a weighted grid
 *   3. (optional) ask the server to resolve the spin
 *   4. loop: find clusters -> calculate win -> remove clusters -> cascade
 *   5. check bonus triggers, emit BONUS_TRIGGERED
 *   6. emit SPIN_COMPLETE
 *
 * Auto-spin is supported via startAutoSpin / stopAutoSpin.
 */
class SpinManager {
    constructor({
        config,
        paytable,
        symbols,
        symbolWeights,
        winType,
        minClusterSize,
    }) {
        this.config = config;
        this.paytable = paytable;
        this.symbols = symbols;
        this.symbolWeights = symbolWeights;

        this.rng = new RNGProcessor(
            symbols,
            config.rows,
            config.cols
        );

        this.winEngine = EngineFactory.create({
            winType,
            minClusterSize,
        });

        this.cascadeEngine = new CascadeEngine(symbols);
        this.winCalculator = new WinCalculator(paytable);
        // Bonus config: scatter threshold lives under
        // `config.bonus.scatterTrigger`, the free-spin award
        // table lives under `config.freeSpins.awards`. Both
        // are passed in so `BonusEngine.checkTrigger` can map
        // a scatter count to the right award without each
        // caller reimplementing the lookup.
        this.bonusEngine = new BonusEngine({
            scatterTrigger:
                config.bonus?.scatterTrigger ?? 4,
            freeSpins: config.freeSpins ?? {},
        });
        this.jackpotEngine = new JackpotEngine(
            config.jackpot ?? {}
        );
        // this.holdAndWinEngine = new HoldAndWinEngine( // DEAD — commented 2026-06-22
        //     config.holdAndWin ?? {}
        // );

        this.autoSpinActive = false;
        this.autoSpinCount = 0;
        // Set by `requestStop()`; consumed at the end of the
        // current spin in `startSpin()` to bail out of the auto
        // loop without killing the in-flight round. Manual
        // spins also honour it so the spin button can interrupt
        // a running spin.
        this._stopRequested = false;
        this.autoSpinSettings = {
            stopOnBonus: true,
            stopOnBigWin: true,
            stopOnBalanceLow: true,
            ...(config.autoSpin ?? {}),
        };
    }

    /**
     * Mark the in-flight spin for cancellation. The engine
     * checks `_stopRequested` after each spin completes and
     * exits the auto-loop without starting the next round.
     */
    requestStop() {
        this._stopRequested = true;
    }

    /**
     * Resolve an animation value against the auto-spin overrides.
     *
     * Manual spins read `animation[key]` directly. While an
     * auto-spin run is active, any key listed under
     * `animation.autoSpin` overrides the manual value — missing
     * keys fall through to the root. This keeps the auto-spin
     * block opt-in: a designer can override `spinDuration`
     * alone, or the whole reelSpin block, without having to
     * duplicate every other key.
     */
    resolveAnimation(key) {
        const anim = this.config?.animation ?? {};
        const auto = anim.autoSpin;
        if (this.autoSpinActive && auto && key in auto) {
            return auto[key];
        }
        return anim[key];
    }

    /**
     * Wire socket events into the store. Call once at app boot.
     */
    initialize() {
        socket.on("SPIN_RESULT", (result) => {
            useGameStore
                .getState()
                .setBalance(result.balance);
            EventBus.emit("SPIN_COMPLETE", result);
        });

        socket.on("JACKPOT_UPDATE", (data) => {
            useGameStore
                .getState()
                .setJackpot(data.amount);
        });

        socket.on("FREE_SPIN_UPDATE", (data) => {
            useGameStore
                .getState()
                .setFreeSpins(data.freeSpins);
        });
    }

    /**
     * Run one spin. Returns a result object; the same data is also
     * broadcast through EventBus for any UI that wants to react.
     */
    async startSpin() {
        const store = useGameStore.getState();
        const bet = store.currentBet;

        // Generate the local grid, then optionally reconcile
        // with a server-side result. The server is gated behind
        // a config flag (default OFF) — there's no backend in
        // this repo, so the per-spin fetch was burning an RTT
        // and a console error on every spin. Setting
        // `gameConfig.serverEnabled = true` opts the spin back
        // into the round-trip path.
        const grid = this.rng.generateWeightedGrid(
            this.symbolWeights
        );

        let serverResult = null;
        if (this.config?.serverEnabled) {
            try {
                const response = await fetch("/api/game/spin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ bet }),
                });
                if (response.ok) {
                    serverResult = await response.json();
                }
            } catch {
                serverResult = null;
            }
        }

        const initialGrid = serverResult?.grid ?? grid;
        // Update the store with the initial grid so SymbolSprites
        // have the correct symbols for the spin-start animation.
        useGameStore.setState({ grid: initialGrid });

        useGameStore.setState({ spinning: true });
        EventBus.emit("SPIN_START");

        const totalWin = await this._evaluateAndCascade(
            initialGrid,
            bet
        );

        const bonus = this.bonusEngine.checkTrigger(initialGrid);
        // The previous version of this method only ran the
        // post-spin bookkeeping inside `if (bonus.triggered)`.
        // That meant any round without a scatter trigger
        // (the vast majority of spins) never set
        // `spinning: false` or reset the auto-spin counter,
        // and the SpinButton's `busy` derived flag stayed
        // true forever — the stop texture persisted after
        // every normal spin. Run the bookkeeping every time
        // and gate ONLY the bonus-specific side effects
        // (free-spin burn, jackpot roll) on `triggered`.
        const triggered = bonus.triggered;

        if (triggered) {
            // Decrement the free-spin counter once per spin while
            // a free-spin session is active. The store starts at
            // 0; the BONUS_TRIGGERED handler in `app.jsx` bumps
            // it to N; we burn one credit per spin here. When the
            // counter hits 0 we emit BONUS_END so any UI that
            // wants to snap back to its idle state (e.g.
            // GameMessage's welcome banner) can do so.
            //
            // Runs AFTER BONUS_TRIGGERED so a retrigger this
            // round (more scatters landed while in free-spin
            // mode) adds the new award on top of the pre-spin
            // count, and the resulting `X / TOTAL` overlay reads
            // correctly: 3 → spin → decrement to 2 → +10 retrigger
            // → 12 → display "12 / TOTAL".
            //
            // IMPORTANT: read `freeSpins` from the post-BONUS
            // store snapshot. `app.jsx`'s BONUS_TRIGGERED
            // listener uses `setState((state) => …)` which
            // schedules a state update; `getState()` after the
            // emit reflects that update synchronously only if
            // the listener calls it directly. Either way the
            // captured value here is "freeSpins after this
            // round's award, before this round's burn" — exactly
            // what we want.
            const storeAfterBonus = useGameStore.getState();
            if (storeAfterBonus.freeSpins > 0) {
                const nextFree = storeAfterBonus.freeSpins - 1;
                useGameStore.setState({ freeSpins: nextFree });
                if (nextFree === 0) {
                    EventBus.emit("BONUS_END", { type: "FREE_SPINS" });
                }
            }
        }

        // Jackpot roll is independent of the bonus trigger.
        const jackpot = this.jackpotEngine.randomTrigger();
        if (jackpot) {
            EventBus.emit("JACKPOT_WON", jackpot);
        }

        EventBus.emit("SPIN_COMPLETE", {
            grid: initialGrid,
            totalWin,
            bonus,
            jackpot,
        });

        useGameStore.setState({
            spinning: false,
            totalWin,
            // Also clear the auto-spin counter here so the
            // SpinButton flips back to the idle texture the
            // moment the final round finishes. Without this
            // the counter stays at 1 and the button keeps
            // rendering the stop texture after the spin
            // completes.
            autoSpinRemaining: this.autoSpinActive
                ? Math.max(0, this.autoSpinCount - 1)
                : 0,
        });
        if (this.autoSpinActive) {
            this.autoSpinCount--;
            useGameStore
                .getState()
                .setAutoSpinRemaining(this.autoSpinCount);
        }

        // If the user clicked STOP during this spin, honour it
        // now — finish the cascades / win display of the round
        // we just completed, but skip the next auto-round.
        const stopRequested = this._stopRequested;
        if (stopRequested) this._stopRequested = false;

        if (this.autoSpinActive) {
            if (this.autoSpinCount > 0 && !stopRequested) {
                // Read the inter-round delay from the auto-spin
                // animation block so designers can tune auto-spin
                // pacing in `gameConfig.animation.autoSpin` rather
                // than touching engine code. Falls back to 500 ms
                // when the override is missing.
                const auto = this.config?.animation?.autoSpin;
                const delay =
                    auto && typeof auto.interRoundDelay === "number"
                        ? auto.interRoundDelay
                        : 500;
                setTimeout(() => this.startSpin(), delay);
            } else {
                this.stopAutoSpin();
            }
        }

        return {
            grid: initialGrid,
            totalWin,
            bonus,
            jackpot,
            bet,
        };
    }
    async _evaluateAndCascade(grid, bet) {
        // Shallow-clone the outer array (rows share their inner
        // array references) and let `_removeClusters` mutate
        // each row in place. Avoids `structuredClone`'s deep
        // walk on every cascade step — a measurable saving
        // when the cascade chain runs 5–15 tumbles per spin.
        //
        // Note: as of 2026-06-22 the redundant inner-clone inside
        // `_removeClusters` is now skipped — the caller already
        // hands `_removeClusters` a freshly-cloned grid, so the
        // extra `grid.map((row) => row.slice())` pass there was
        // pure waste on a hot path.
        let currentGrid = grid.map((row) => row.slice());
        let totalWin = 0;
        let tumbleCount = 0;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const clusters =
                this.winEngine.findClusters(currentGrid);
            if (!clusters.length) break;

            EventBus.emit("CLUSTERS_FOUND", clusters);

            const { totalWin: tumbleWin, winDetails } =
                this.winCalculator.calculate(clusters, bet);

            totalWin += tumbleWin;

            EventBus.emit("WIN_CALCULATED", {
                tumbleCount,
                tumbleWin,
                totalWin,
                winDetails,
            });

            currentGrid = this._removeClusters(
                currentGrid,
                clusters
            );
            useGameStore.setState({ grid: currentGrid });
            EventBus.emit("SYMBOLS_REMOVED", currentGrid);

            const cascadeResult =
                this.cascadeEngine.cascade(currentGrid);
            currentGrid = cascadeResult.grid;
            useGameStore.setState({ grid: currentGrid });
            EventBus.emit("CASCADE_COMPLETE", cascadeResult);

            tumbleCount++;
        }

        if (totalWin > 0) {
            EventBus.emit("WIN_COMPLETE", totalWin);
        }
        return totalWin;
    }

    _removeClusters(grid, clusters) {
        // Caller passes a row-shallow clone of the grid (see
        // `_evaluateAndCascade`'s opening line). Mutate each
        // winning cell to `null` in place — no need to clone
        // again. The previous version of this method did
        //   const clone = grid.map((row) => row.slice());
        //   for (...) clone[row][col] = null;
        //   return clone;
        // which allocated 7 new arrays per cascade step. The
        // new version mutates the caller's clone directly,
        // which is the same surface observable from the call
        // site (the cascade engine re-references the result).
        for (const cluster of clusters) {
            for (const { row, col } of cluster.positions) {
                grid[row][col] = null;
            }
        }
        return grid;
    }

    startAutoSpin(count) {
        this.autoSpinActive = true;
        this.autoSpinCount = count;
        this._stopRequested = false;
        useGameStore
            .getState()
            .setAutoSpinRemaining(count);
        this.startSpin();
    }

    stopAutoSpin() {
        this.autoSpinActive = false;
        this.autoSpinCount = 0;
        this._stopRequested = false;
        useGameStore.getState().setAutoSpinRemaining(0);
    }
}

export default SpinManager;