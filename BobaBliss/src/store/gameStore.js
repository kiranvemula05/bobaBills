import { create } from "zustand";
import gameConfig from "../games/suger-rush/config.js";

// Build the initial 7×7 grid at boot so the PixiGrid has
// symbols to render on first paint (before the player has
// pressed Spin). Without this the store's `grid: []` means
// PixiGrid sees no rows, renders nothing, and the board
// stays blank until the first spin triggers an engine grid
// write. Mirrors what `RNGProcessor.generateWeightedGrid`
// produces so the first spin's grid is a clean
// replace-in-place rather than the only populated grid.
//
// We deliberately generate the same shape the engine
// produces (rows×cols of weighted symbols) so the
// SymbolSprite cascade keys (`${r}-${c}`) are stable across
// the transition: no remount, no flicker.
function buildInitialGrid() {
    const rows = gameConfig.rows;
    const cols = gameConfig.cols;
    const weights = gameConfig.symbolWeights;
    const entries = Object.entries(weights);
    const total = entries.reduce(
        (sum, [, n]) => sum + n,
        0
    );
    const grid = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            let pick = Math.random() * total;
            let chosen = entries[entries.length - 1][0];
            for (const [sym, n] of entries) {
                pick -= n;
                if (pick <= 0) {
                    chosen = sym;
                    break;
                }
            }
            row.push(chosen);
        }
        grid.push(row);
    }
    return grid;
}

const createGameSlice = (set) => ({
    grid: buildInitialGrid(),
    totalWin: 0,
    currentWin: 0,
    balance: 1000,
    jackpot: 100000,
    freeSpins: 0,
    currentBet: 10,
    spinning: false,
    autoSpinRemaining: 0,
    // True while the reel-drop GSAP tween is playing. The
    // SpinButton uses this to lock itself out (non-clickable)
    // for the duration of the visible reel animation, so the
    // user can't fire a second spin while the first reel is
    // still falling. Engine sets this true on SPIN_START and
    // false once the tween has settled.
    reelSpinning: false,
    settingsOpen: false,
    paytableOpen: false,
    autoSpinPanelOpen: false,

    setGrid: (grid) => set({ grid }),
    setTotalWin: (totalWin) => set({ totalWin }),
    setCurrentWin: (currentWin) => set({ currentWin }),
    setBalance: (balance) => set({ balance }),
    setJackpot: (jackpot) => set({ jackpot }),
    setFreeSpins: (freeSpins) => set({ freeSpins }),
    setCurrentBet: (currentBet) => set({ currentBet }),
    setSpinning: (spinning) => set({ spinning }),
    setAutoSpinRemaining: (autoSpinRemaining) =>
        set({ autoSpinRemaining }),
    setReelSpinning: (reelSpinning) => set({ reelSpinning }),
    setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
    toggleSettings: () =>
        set((state) => ({ settingsOpen: !state.settingsOpen })),
    setPaytableOpen: (paytableOpen) => set({ paytableOpen }),
    togglePaytable: () =>
        set((state) => ({ paytableOpen: !state.paytableOpen })),
    setAutoSpinPanelOpen: (autoSpinPanelOpen) =>
        set({ autoSpinPanelOpen }),
    toggleAutoSpinPanel: () =>
        set((state) => ({ autoSpinPanelOpen: !state.autoSpinPanelOpen })),
});

const createHoldAndWinSlice = (set) => ({
    holdAndWin: {
        active: false,
        respinsLeft: 3,
        lockedSymbols: [],
    },

    startHoldAndWin: (lockedSymbols = []) =>
        set({
            holdAndWin: {
                active: true,
                respinsLeft: 3,
                lockedSymbols,
            },
        }),

    addLockedSymbol: (symbol) =>
        set((state) => {
            if (!state.holdAndWin.active) return state;
            return {
                holdAndWin: {
                    ...state.holdAndWin,
                    respinsLeft: 3,
                    lockedSymbols: [
                        ...state.holdAndWin.lockedSymbols,
                        symbol,
                    ],
                },
            };
        }),

    tickRespin: () =>
        set((state) => {
            if (!state.holdAndWin.active) return state;
            const respinsLeft = state.holdAndWin.respinsLeft - 1;
            return {
                holdAndWin: {
                    ...state.holdAndWin,
                    respinsLeft,
                },
            };
        }),

    endHoldAndWin: () =>
        set({
            holdAndWin: {
                active: false,
                respinsLeft: 3,
                lockedSymbols: [],
            },
        }),
});

export const useGameStore = create((...a) => ({
    ...createGameSlice(...a),
    ...createHoldAndWinSlice(...a),
}));