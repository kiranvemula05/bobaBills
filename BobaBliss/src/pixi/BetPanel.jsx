import { useEffect, useState } from "react";
import { Assets } from "pixi.js";
import { useGameStore } from "../store/gameStore";
import gameConfig from "../games/suger-rush/config.js";
import ButtonSound from "../components/ButtonSound.js";

const MIN_BET = gameConfig.minBet;
const MAX_BET = gameConfig.maxBet;

/**
 * BetPanel
 *
 * Bottom-left HUD panel showing the current bet. Layout, label,
 * font sizes and bet step all come from gameConfig.layout.betPanel
 * and gameConfig.layout.betPanelText — nothing hard-coded here.
 *
 * The − and + buttons render the PlusMinusButton.png texture
 * (`gameConfig.layout.betPanel.plusMinus.asset`) as a background
 * sprite behind the −/+ glyph text. Clicks are bound directly on
 * the background sprite so the hit area exactly matches the
 * visible button.
 */
function BetPanel() {
    const [panelTexture, setPanelTexture] = useState(null);
    const [pmTexture, setPmTexture] = useState(null);

    const currentBet = useGameStore(
        state => state.currentBet
    );

    const layout = gameConfig.layout.betPanel;
    const text = gameConfig.layout.betPanelText;
    const hud = gameConfig.layout.hudText;
    const url = gameConfig.assets.ui.betPanel;
    const pm = layout.plusMinus;

    useEffect(() => {
        Assets.load(url)
            .then(setPanelTexture)
            .catch(console.error);
    }, [url]);

    useEffect(() => {
        Assets.load(pm.asset)
            .then(setPmTexture)
            .catch(console.error);
    }, [pm.asset]);

    const increaseBet = () => {
        const store = useGameStore.getState();
        const next = Math.min(
            store.currentBet + 1,
            MAX_BET
        );

        if (next === store.currentBet) return;

        ButtonSound.play("betPlus");
        store.setCurrentBet(next);
    };

    const decreaseBet = () => {
        const store = useGameStore.getState();
        const next = Math.max(
            store.currentBet - 1,
            MIN_BET
        );

        if (next === store.currentBet) return;

        ButtonSound.play("betMinus");
        store.setCurrentBet(next);
    };

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

            {/* Minus button: background sprite is the hit target. */}
            {pmTexture && (
                <pixiSprite
                    texture={pmTexture}
                    x={text.minus.x}
                    y={text.minus.y}
                    anchor={0.5}
                    width={pm.width}
                    height={pm.height}
                    eventMode="static"
                    cursor="pointer"
                    onClick={decreaseBet}
                />
            )}
            <pixiText
                text="-"
                x={text.minus.x}
                y={text.minus.y}
                anchor={0.5}
                style={{
                    fill: hud.valueFill,
                    fontSize: 26,
                    fontWeight: hud.fontWeight
                }}
            />

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
                text={`${layout.valuePrefix}${currentBet}`}
                x={text.value.x}
                y={text.value.y}
                anchor={0.5}
                style={{
                    fill: hud.valueFill,
                    fontSize: layout.valueFontSize,
                    fontWeight: hud.fontWeight
                }}
            />

            {/* Plus button: background sprite is the hit target. */}
            {pmTexture && (
                <pixiSprite
                    texture={pmTexture}
                    x={text.plus.x}
                    y={text.plus.y}
                    anchor={0.5}
                    width={pm.width}
                    height={pm.height}
                    eventMode="static"
                    cursor="pointer"
                    onClick={increaseBet}
                />
            )}
            <pixiText
                text="+"
                x={text.plus.x}
                y={text.plus.y}
                anchor={0.5}
                style={{
                    fill: hud.valueFill,
                    fontSize: 26,
                    fontWeight: hud.fontWeight
                }}
            />
        </pixiContainer>
    );
}
export default BetPanel;