// Legacy module kept for backwards compatibility. The new game-level
// entry point is `loaders/AssetRegistry.js`, which reads URLs from
// each game's `config.js`. This file used to hardcode a flat asset
// list; it now mirrors the URLs the registry produces so older
// imports of `ASSETS` / `SYMBOLS` still resolve to real files.
//
// New code should import from `games/<game>/config.js` via the
// AssetRegistry instead.


// Import UI assets to get their public URLs (handles hashing in production)
import sugarRushConfig from "../games/suger-rush/config.js";
import uiBoardFrame from "/assets/ui/SRR-ReelFrame01.png";

const SYMBOLS = { ...sugarRushConfig.assets.symbols };
const BACKGROUNDS = {
    game: sugarRushConfig.assets.background,
    freeSpin: "/assets/backgrounds/free-spin-bg.png",
    bonus: "/assets/backgrounds/bonus-bg.png",
};
const PARTICLES = {
    glow: "/assets/particles/glow.png",
    sparkle: "/assets/particles/sparkle.png",
    candyBurst: "/assets/particles/candy-burst.png",
};
// UI keys map to URLs that exist under `public/assets/ui/`.
// Static-import URLs are kept only for files that are reliably
// on disk (`SRR-ReelFrame01.png`). Everything else is read
// from the game's config so the URLs stay in sync with
// `gameConfig.assets.ui.*` and don't need a matching file
// to satisfy the bundler's resolver.
const UI = {
        logo: "/assets/ui/SRR-Logo01.png",
        spinButton: sugarRushConfig.assets.ui.spinButton,
        autoSpinButton: sugarRushConfig.assets.ui.autoSpin,
        // PlusMinus button used in betPanel
        plusMinusButton: "/assets/ui/PlusMinusButton.png",
        boardFrame: uiBoardFrame,
        // GameMessage is the notification strip drawn under the
        // BoardFrame. Add it to the UI map so the Preloader walks
        // it during the asset phase — without this entry the URL
        // never reaches `Assets.load()` and `Assets.get(url)` returns
        // null at first mount, leaving the strip hidden until a
        // later consumer happens to load it.
        gameMessage: sugarRushConfig.assets.ui.gameMessage,
        // stopButton is the dedicated texture the SpinButton swaps
        // to while a spin / auto-spin run is in flight. Listed so
        // the preloader warms it up the same way it warms every
        // other UI sprite.
        stopButton: sugarRushConfig.assets.ui.stopButton,
        // clockIcon is the small Time.png rendered to the left of
        // the clock text in the TopBar. Listed so the preloader
        // warms it up during the standard asset phase.
        clockIcon: sugarRushConfig.assets.ui.clockIcon,
};

export const BUNDLES = ["base-game", "free-spins", "bonus-game"];

export const ASSETS = [
    ...Object.values(BACKGROUNDS),
    ...Object.values(SYMBOLS),
    ...Object.values(PARTICLES),
    ...Object.values(UI)
];

export { SYMBOLS, BACKGROUNDS, PARTICLES, UI };