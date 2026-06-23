import { useEffect, useState } from "react";
import { Assets } from "pixi.js";
import gameConfig from "../games/suger-rush/config.js";
import ButtonSound from "../components/ButtonSound.js";
import { useGameStore } from "../store/gameStore.js";

/**
 * PaytableButton
 *
 * Reads x/y/width/height/asset from gameConfig.layout.paytableButton.
 * Click toggles the PaytablePopup via the global game store.
 */
function PaytableButton() {
    const [texture, setTexture] = useState(null);
    const togglePaytable = useGameStore((s) => s.togglePaytable);

    const { x, y, width, height } = gameConfig.layout.paytableButton;
    const url = gameConfig.assets.ui.paytableButton;

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
                ButtonSound.play("paytable");
                togglePaytable();
            }}
        />
    );
}

export default PaytableButton;