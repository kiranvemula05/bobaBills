import { useEffect, useState } from "react";
import { Assets } from "pixi.js";
import gameConfig from "../games/suger-rush/config.js";

/**
 * GameLogo
 *
 * Reads x/y/width/asset from gameConfig.layout.gameLogo and
 * gameConfig.assets.ui.logo.
 */
function GameLogo() {
    const [texture, setTexture] = useState(null);

    const { x, y, width } = gameConfig.layout.gameLogo;
    const url = gameConfig.assets.ui.logo;

    useEffect(() => {
        Assets.load(url)
            .then(setTexture)
            .catch(console.error);
    }, [url]);

    if (!texture) return null;

    // Aspect-ratio preserved: scale height by texture's natural ratio.
    const naturalWidth = texture.width || 1;
    const naturalHeight = texture.height || 1;
    const height = (naturalHeight / naturalWidth) * width;

    return (
        <pixiSprite
            texture={texture}
            x={x}
            y={y}
            width={width}
            height={height}
            eventMode="static"
            cursor="pointer"
            pointertap={() => {
                console.log("Game Logo Clicked");
            }}
        />
    );
}

export default GameLogo;