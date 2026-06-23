import { useEffect, useState } from "react";
import { Assets } from "pixi.js";
import gameConfig from "../games/suger-rush/config.js";
import ButtonSound from "../components/ButtonSound.js";
import { useGameStore } from "../store/gameStore.js";

/**
 * SettingsButton
 *
 * Reads x/y/width/height/asset from gameConfig.layout.settings.
 * Click toggles the SettingsPopup via the global game store.
 */
function SettingsButton() {
    const [texture, setTexture] = useState(null);
    const toggleSettings = useGameStore((s) => s.toggleSettings);

    const { x, y, width, height } = gameConfig.layout.settings;
    const url = gameConfig.assets.ui.settings;

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
                ButtonSound.play("settings");
                toggleSettings();
            }}
        />
    );
}

export default SettingsButton;