import { useEffect, useState } from "react";
import { Assets } from "pixi.js";
import { useEventBus } from "../hooks/useEventBus.js";
import { PARTICLES } from "../loaders/AssetManifest.js";
import Preloader from "../loaders/Preloader.js";

/**
 * PixiEffects
 *
 * Lightweight particle layer. Subscribes to `WIN_CALCULATED` and
 * briefly fades a glow texture in/out over the center of the stage.
 *
 * The glow texture URL comes from AssetManifest.PARTICLES so the
 * preloader can warm the cache; this component reads it from
 * Pixi's cache synchronously and only falls back to a direct
 * `Assets.load` if the cache is cold.
 */
function PixiEffects() {
    const [intensity, setIntensity] = useState(0);
    const url = PARTICLES.glow;
    const [glow, setGlow] = useState(
        () => Assets.cache.get(url) ?? null
    );

    useEffect(() => {
        let cancelled = false;
        if (Assets.cache.get(url)) {
            setGlow(Assets.cache.get(url));
            return;
        }
        Promise.all([Preloader.preload(), Assets.load(url)])
            .then(([, tex]) => {
                if (!cancelled) setGlow(tex);
            })
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, [url]);

    useEventBus("WIN_CALCULATED", ({ tumbleWin }) => {
        if (tumbleWin > 0) {
            setIntensity(Math.min(1, tumbleWin / 1000));
        }
    });

    if (!glow) return null;

    return (
        <pixiContainer
            x={400}
            y={300}
            alpha={intensity * 0.5}
            scale={0.5 + intensity}
        >
            <pixiSprite texture={glow} anchor={0.5} />
        </pixiContainer>
    );
}

export default PixiEffects;