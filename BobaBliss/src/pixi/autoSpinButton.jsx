import { useEffect, useState } from "react";
import { Assets } from "pixi.js";
import gameConfig from "../games/suger-rush/config.js";
import ButtonSound from "../components/ButtonSound.js";
import { useGameStore } from "../store/gameStore.js";

/**
 * AutoSpinButton
 *
 * Reads x/y/width/height/asset from gameConfig.layout.autoSpin.
 * Click toggles the AutoSpinPopup picker.
 */
function AutoSpinButton() {
    const [texture, setTexture] = useState(null);
    const toggleAutoSpinPanel = useGameStore((s) => s.toggleAutoSpinPanel);

    const { x, y, width, height } = gameConfig.layout.autoSpin;
    const url = gameConfig.assets.ui.autoSpin;

    useEffect(() => {
        Assets.load(url)
            .then(setTexture)
            .catch(console.error);
    }, [url]);

    if (!texture) return null;

    return (
        <pixiSprite
            texture={texture}
            x={x}
            y={y}
            width={width}
            height={height}
            eventMode="static"
            cursor="pointer"
            onClick={() => {
                ButtonSound.play("autoSpin");
                toggleAutoSpinPanel();
            }}
        />
    );
}

export default AutoSpinButton;