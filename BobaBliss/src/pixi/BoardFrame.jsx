import { Assets } from "pixi.js";
import { useEffect, useState } from "react";
import gameConfig from "../games/suger-rush/config.js";

/**
 * BoardFrame
 *
 * Decorative sprite framing the playfield. Geometry and asset
 * path come from gameConfig.layout.boardFrame.
 */
function BoardFrame() {
    const layout = gameConfig.layout.boardFrame;
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

export default BoardFrame;