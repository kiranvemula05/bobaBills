import { useEffect, useState } from "react";
import { Assets } from "pixi.js";
import { useGameStore } from "../store/gameStore";
import gameConfig from "../games/suger-rush/config.js";

/**
 * BalancePanel
 *
 * Bottom-right HUD panel showing the live balance. All labels,
 * colors and sizes are sourced from gameConfig.layout.
 */
function BalancePanel() {
    const [panelTexture, setPanelTexture] = useState(null);

    const currentBalance = useGameStore(
        state => state.balance
    );

    const layout = gameConfig.layout.balancePanel;
    const text = gameConfig.layout.balancePanelText;
    const hud = gameConfig.layout.hudText;
    const url = gameConfig.assets.ui.balancePanel;

    useEffect(() => {
        Assets.load(url)
            .then(setPanelTexture)
            .catch(console.error);
    }, [url]);


    return (
        <pixiContainer
            x={layout.x}
            y={layout.y}
        >
            {panelTexture && (
                <pixiSprite
                    texture={panelTexture}
                    width={layout.width}
                    height={layout.height}
                />
            )}

            <pixiText
                text={layout.label}
                x={text.label.x}
                y={text.label.y}
                anchor={0.5}
                style={{
                    fill: hud.labelFill,
                    fontSize: layout.labelFontSize,
                    fontWeight: hud.fontWeight
                }}
            />

            <pixiText
                text={`${layout.valuePrefix}${currentBalance}`}
                x={text.value.x}
                y={text.value.y}
                anchor={0.5}
                style={{
                    fill: hud.valueFill,
                    fontSize: layout.valueFontSize,
                    fontWeight: hud.fontWeight
                }}
            />

        </pixiContainer>
    );
}
export default BalancePanel;