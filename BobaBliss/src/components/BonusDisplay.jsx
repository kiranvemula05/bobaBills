/*
 * components/BonusDisplay.jsx — DEAD-CODE COMMENTED OUT 2026-06-22.
 *
 * DOM-shell that printed "Free Spins: N" as a debug overlay.
 * The shipped game surfaces the free-spin counter through the
 * Pixi `GameMessage` strip (see `pixi/GameMessage.jsx`) and the
 * `FreeSpinDisplay` chip in the React-DOM tree
 * (`components/FreeSpinDisplay.jsx`). Nothing imports
 * `BonusDisplay` from `app.jsx`.
 *
 * Original contents preserved below for future restoration:
 */


function BonusDisplay({
    freeSpins
}) {
    return (
        <div>
            Free Spins:
            {freeSpins}
        </div>
    );
}

export default BonusDisplay;
