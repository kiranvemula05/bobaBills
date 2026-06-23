/*
 * websocket/SocketEvents.js — DEAD-CODE COMMENTED OUT 2026-06-22.
 *
 * The `registerSocketEvents()` helper is never called. The same
 * three socket subscriptions (`JACKPOT_UPDATE`, `FREE_SPIN_UPDATE`)
 * are already wired inside `SpinManager.initialize()` (see
 * `engine/SpinManager.js`). Keeping the second copy risked
 * duplicate handler sets if anyone imported it. The lazy socket
 * proxy in `api/socket.js` makes the duplicate harmless, but
 * commented out for clarity.
 *
 * Original contents preserved below for future restoration:
 */


import socket from "../api/socket";
import { useGameStore } from "../store/gameStore";

export function registerSocketEvents() {

    socket.on("JACKPOT_UPDATE", (data) => {
        useGameStore.getState().setJackpot(
            data.amount
        );
    });

    socket.on("FREE_SPIN_UPDATE", (data) => {
        useGameStore.getState().setFreeSpins(
            data.freeSpins
        );
    });

}
