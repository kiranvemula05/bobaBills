/*
 * components/JackpotDisplay.jsx — DEAD-CODE COMMENTED OUT 2026-06-22.
 *
 * DOM-shell that listened to `JACKPOT_WON` and printed a one-line
 * "Jackpot: ₹N" message. The shipped game has jackpot values
 * rendered inside the Pixi canvas (see `pixi/TopBar.jsx` /
 * `pixi/GameMessage.jsx`); the React-DOM counterpart is not
 * mounted from `app.jsx`. Nothing imports `JackpotDisplay`.
 *
 * Original contents preserved below for future restoration:
 */


import { useState, useEffect } from "react";
import EventBus from "../engine/EventBus.js";

function JackpotDisplay() {

    const [jackpot, setJackpot] =
        useState(null);

    useEffect(() => {

        EventBus.on(
            "JACKPOT_WON",
            setJackpot
        );

    }, []);

    if (!jackpot) {
        return null;
    }

    return (
        <div>
            {jackpot.type}
            Jackpot:
            ₹{jackpot.amount}
        </div>
    );
}

export default JackpotDisplay;
