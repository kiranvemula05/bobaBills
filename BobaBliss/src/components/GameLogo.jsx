/*
 * components/GameLogo.jsx — DEAD-CODE COMMENTED OUT 2026-06-22.
 *
 * DOM <img> logo that was the original pre-Pixi HUD. The shipped
 * game renders the logo as a Pixi sprite via
 * `pixi/GameLogo.jsx` (already mounted from `app.jsx`); this
 * DOM version was never imported anywhere.
 *
 * Original contents preserved below for future restoration:
 */


import "./components.css";

export default function GameLogo() {
    return (
        <div className="game-logo">
            <img
                src="/assets/ui/SRR-Logo01.png"
                alt="Game Logo"
            />
        </div>
    );
}
