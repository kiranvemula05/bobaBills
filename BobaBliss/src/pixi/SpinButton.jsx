import { useEffect, useMemo, useState } from "react";
import { Assets, Rectangle } from "pixi.js";
import gameConfig from "../games/suger-rush/config.js";
import ButtonSound from "../components/ButtonSound.js";
import SlotEngine from "../engine/SlotEngine.js";
import { useGameStore } from "../store/gameStore.js";

/**
 * SpinButton (Pixi)
 *
 * Position/size come from gameConfig.layout.spinButton /
 * gameConfig.layout.stopButton (which mirror each other so the
 * button doesn't shift when the texture swaps).
 *
 * Three visual / interaction modes — selected by `spinning`,
 * `autoSpinRemaining`, and `reelSpinning` on the Zustand store:
 *
 *  - **Idle**  (`spinning === false && autoSpinRemaining === 0`):
 *      renders `assets.ui.spinButton`, clickable. Click calls
 *      `SlotEngine.spin()`.
 *
 *  - **Stop**  (`spinning === true || autoSpinRemaining > 0`):
 *      renders `assets.ui.stopButton`. Clickable so the user
 *      can abort an in-flight round / auto-run.
 *
 *  - **Locked** (`reelSpinning === true`):
 *      Renders the same texture as the active mode but the
 *      sprite is non-interactive (`eventMode="none"` +
 *      `cursor="default"`) for the duration of the reel-spin
 *      GSAP tween. This matches the user's mental model:
 *      "while the reels are visibly dropping the spin button
 *      does nothing" — same as a real slot machine.
 *
 * Both textures are loaded up-front so the swap is instant
 * when the engine flips state — no flicker, no late pop-in.
 */
function SpinButton() {
    const [spinTexture, setSpinTexture] = useState(null);
    const [stopTexture, setStopTexture] = useState(null);

    const spinning = useGameStore((s) => s.spinning);
    const autoSpinRemaining = useGameStore((s) => s.autoSpinRemaining);
    const reelSpinning = useGameStore((s) => s.reelSpinning);

    const spinLayout = gameConfig.layout.spinButton;
    const stopLayout = gameConfig.layout.stopButton;
    const spinUrl = gameConfig.assets.ui.spinButton;
    const stopUrl = gameConfig.assets.ui.stopButton;

    useEffect(() => {
        let cancelled = false;
        // Load both textures in parallel so the busy-mode swap
        // is instant the moment the engine flips state.
        Promise.all([
            Assets.load(spinUrl).catch((err) => {
                // eslint-disable-next-line no-console
                console.error("SpinButton texture load failed", err);
                return null;
            }),
            Assets.load(stopUrl).catch((err) => {
                // eslint-disable-next-line no-console
                console.error("StopButton texture load failed", err);
                return null;
            }),
        ]).then(([spin, stop]) => {
            if (cancelled) return;
            setSpinTexture(spin);
            setStopTexture(stop);
        });
        return () => {
            cancelled = true;
        };
    }, [spinUrl, stopUrl]);

    const busy = spinning || autoSpinRemaining > 0;
    const locked = reelSpinning;
    const layout = busy ? stopLayout : spinLayout;
    const texture = busy ? stopTexture : spinTexture;

    // Use a `Rectangle` hitArea so every pixel inside the
    // button's 100×100 box is interactive, not just the
    // painted pixels of the circular SpinButton.png art.
    // Pixi v8's Sprite default hit-test is texture-shaped,
    // so transparent corners of a circular button would
    // otherwise swallow clicks. Memoised so the same
    // Rectangle instance is reused on every render.
    const hitArea = useMemo(
        () => new Rectangle(0, 0, layout.width, layout.height),
        [layout.width, layout.height]
    );

    const handleClick = () => {
        if (locked) return; // non-interactive during reel spin
        if (busy) {
            // Abort the in-flight spin / auto-run. The engine
            // finishes the current round's cascades + win
            // display, then bails out of the auto-loop instead
            // of scheduling the next round.
            SlotEngine.stopSpin();
            return;
        }
        ButtonSound.play("spin");
        SlotEngine.spin().catch((err) => {
            // eslint-disable-next-line no-console
            console.error("Spin failed", err);
        });
    };

    if (!texture) return null;

    return (
        <pixiContainer x={layout.x} y={layout.y}>
            {/* Invisible hit-target rectangle covering the full
               button box. Drawn opaque white at alpha 0 so Pixi
               still hit-tests the full 100×100 bounds (a
               zero-alpha fill produces a zero-area hit area in
               some Pixi v8 builds). The visible sprite is
               rendered after so the art still paints on top. */}
            <pixiGraphics
                draw={(g) => {
                    g.clear();
                    g.beginFill(0x000000, 0.0001);
                    g.drawRect(0, 0, layout.width, layout.height);
                    g.endFill();
                }}
                eventMode={locked ? "none" : "static"}
                cursor={locked ? "default" : "pointer"}
                hitArea={hitArea}
                onPointerDown={
                    locked ? undefined : handleClick
                }
                onTap={locked ? undefined : handleClick}
            />
            <pixiSprite
                texture={texture}
                width={layout.width}
                height={layout.height}
                eventMode="none"
            />
        </pixiContainer>
    );
}

export default SpinButton;