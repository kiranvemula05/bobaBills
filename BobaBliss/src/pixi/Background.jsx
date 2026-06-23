import { Assets } from "pixi.js";
import { useEffect, useState } from "react";
import gameConfig from "../games/suger-rush/config.js";

/**
 * Background
 *
 * Full-stage sprite anchored at (0,0). Asset path and dimensions
 * come from gameConfig.layout.background.
 */
function Background() {
    const layout = gameConfig.layout.background;
    const [texture, setTexture] = useState(null);

    useEffect(() => {
        Assets.load(layout.asset)
            .then(setTexture)
            .catch(console.error);
    }, [layout.asset]);

    if (!texture) return null;

    return (
        <pixiSprite
            texture={texture}
            x={layout.x}
            y={layout.y}
            width={layout.width}
            height={layout.height}
        />
    );
}

export default Background;