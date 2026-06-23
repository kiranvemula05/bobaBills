import { useEffect, useState } from "react";
import { Assets } from "pixi.js";
import gameConfig from "../games/suger-rush/config.js";
import { useGameStore } from "../store/gameStore.js";

/**
 * GameMessage (Pixi)
 *
 * Static notification / status strip drawn just below the
 * BoardFrame (ReelFrame). Reads position, size and asset URL
 * entirely from `gameConfig` — no values are hard-coded here so
 * a designer can re-position or re-skin the strip from
 * `src/games/suger-rush/config.js` alone.
 *
 *   layout.gameMessage = { x, y, width, height, asset }
 *   assets.ui.gameMessage = "/assets/ui/GameMessage.png"
 *
 * Texture loading goes through the shared `Preloader` instance
 * (the same path `BoardFrame`, `GameLogo` and the symbols use)
 * so the texture lands in Pixi's shared cache and a future
 * caller asking for the same URL gets the same `Texture`
 * reference. While the texture is loading the component
 * renders nothing so the rest of the HUD doesn't shift around
 * when the strip pops in.
 *
 * Text overlay priority
 * ----------------------
 * The strip can show one of three things, in priority order:
 *
 *   1. Auto-spin counter — "SPIN X / Y" while a run is active
 *      (same behaviour as before, captured via `pickedCount`).
 *   2. Free-spin counter — "X / TOTAL" while a free-spin
 *      session is in progress (`state.freeSpins > 0`). The
 *      total is the original award captured the moment the
 *      counter flips from 0 → N, so the strip reads
 *      "9 / 10", "8 / 10", …, "1 / 10", "FREE SPINS COMPLETE"
 *      rather than "9 / 9", "8 / 8", etc.
 *   3. Welcome banner — "Welcome to BOBA Bliss" when neither
 *      of the above is active. The string is read from
 *      `gameConfig.gameMessage.welcome` so it can be re-skinned
 *      without touching code.
 *
 * The auto-spin overlay wins over the free-spin overlay wins
 * over the welcome banner.
 */
function GameMessage() {
    const [texture, setTexture] = useState(null);

    const layout = gameConfig.layout.gameMessage;
    const url = gameConfig.assets.ui.gameMessage;
    const welcomeText =
        gameConfig?.gameMessage?.welcome ??
        "Welcome to BOBA Bliss";

    const autoSpinRemaining = useGameStore((s) => s.autoSpinRemaining);
    const freeSpins = useGameStore((s) => s.freeSpins);

    // The count the user picked for the *current* auto-spin run.
    // Starts at 0 (idle); bumped to the picked value the moment
    // the store flips from 0 to N, reset when it returns to 0.
    const [pickedCount, setPickedCount] = useState(0);
    useEffect(() => {
        if (autoSpinRemaining > 0 && pickedCount === 0) {
            setPickedCount(autoSpinRemaining);
        } else if (autoSpinRemaining === 0 && pickedCount !== 0) {
            setPickedCount(0);
        }
    }, [autoSpinRemaining, pickedCount]);
    const autoSpinPanelOpen = useGameStore((s) => s.autoSpinPanelOpen);
    useEffect(() => {
        if (autoSpinPanelOpen) setPickedCount(0);
    }, [autoSpinPanelOpen]);

    // The total free spins awarded for the *current* session.
    // Captured from the running `freeSpins` value the moment
    // it jumps to a new peak. While freeSpins > 0 we render
    // "X / total"; when it returns to 0 we render the welcome
    // banner again.
    //
    // Strategy: monotonically increase on each non-zero store
    // value. A retrigger (more scatters while a session is
    // already active) bumps the store counter; we want the
    // new peak to become the displayed total rather than
    // freezing on the original award.
    const [freeSpinTotal, setFreeSpinTotal] = useState(0);
    useEffect(() => {
        setFreeSpinTotal((prev) => {
            if (freeSpins === 0) return 0;
            return freeSpins > prev ? freeSpins : prev;
        });
    }, [freeSpins]);

    useEffect(() => {
        Assets.load(url)
            .then(setTexture)
            .catch(console.error);
    }, [url]);

    if (!texture) return null;

    // Preserve the asset's natural aspect ratio so the strip
    // doesn't squash if a designer changes only `width` in the
    // config.
    const naturalWidth = texture.width || 1;
    const naturalHeight = texture.height || 1;
    const height = (naturalHeight / naturalWidth) * layout.width;

    // The strip is centred horizontally at layout.x + width/2;
    // text is vertically centred in the strip.
    const stripCenterX = layout.x + layout.width / 2;
    const stripCenterY = layout.y + height / 2;

    const autoSpinActive = pickedCount > 0 && autoSpinRemaining > 0;
    const autoSpinText = autoSpinActive
        ? `SPIN ${autoSpinRemaining} / ${pickedCount}`
        : null;

    // Free-spin overlay: "X / TOTAL" while the session runs.
    // The session is "in progress" the moment we've captured a
    // total and `freeSpins` is still > 0. Once it hits 0 the
    // store-driven `freeSpinTotal` resets and the welcome
    // banner re-asserts itself.
    const freeSpinActive = freeSpinTotal > 0 && freeSpins > 0;
    const freeSpinText = freeSpinActive
        ? `${freeSpins} / ${freeSpinTotal}`
        : null;

    // Pick exactly one overlay. Auto-spin wins over free-spin
    // wins over the welcome banner.
    let overlayText = null;
    if (autoSpinText) overlayText = autoSpinText;
    else if (freeSpinText) overlayText = freeSpinText;
    else overlayText = welcomeText;

    // Font size scales with strip height so it stays readable
    // across the default 60-px-tall strip and any resized
    // variant a designer might configure.
    const fontSize = Math.max(14, Math.round(height * 0.5));

    return (
        <pixiContainer>
            <pixiSprite
                texture={texture}
                x={layout.x}
                y={layout.y}
                width={layout.width}
                height={height}
            />
            {overlayText && (
                <pixiText
                    text={overlayText}
                    x={stripCenterX}
                    y={stripCenterY}
                    anchor={0.5}
                    style={{
                        fill: 0xffffff,
                        fontSize,
                        fontWeight: "700",
                        letterSpacing: 2,
                        align: "center",
                        // Subtle dark stroke so the text stays
                        // legible over either a light or dark
                        // strip background.
                        stroke: { color: 0x050a28, width: 3 },
                    }}
                />
            )}
        </pixiContainer>
    );
}

export default GameMessage;