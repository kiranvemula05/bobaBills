import { useEffect } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Sprite, Text, Graphics } from "pixi.js";
import SlotEngine from "./engine/SlotEngine.js";
import { useGameStore } from "./store/gameStore.js";
import { useEventBusEffect } from "./hooks/useEventBus.js";
import { useGameAssets } from "./hooks/useGameAssets.js";
// Side-effect import: registers sugar-rush with the AssetRegistry
// before useGameAssets() runs. The registry is idempotent.
import "./games/suger-rush/index.js";
import SpinButton from "./pixi/SpinButton.jsx";
import FreeSpinDisplay from "./components/FreeSpinDisplay.jsx";
import BackgroundMusic from "./components/BackgroundMusic.jsx";
import ButtonSound from "./components/ButtonSound.js";
import SettingsPopup from "./components/SettingsPopup.jsx";
import PaytablePopup from "./components/PaytablePopup.jsx";
import AutoSpinPopup from "./components/AutoSpinPopup.jsx";
import PixiGrid from "./pixi/PixiGrid.jsx";
import PixiEffects from "./pixi/PixiEffects.jsx";
import PixiOverlay from "./pixi/PixiOverlay.jsx";
import Background from "./pixi/Background.jsx";
import BoardFrame from "./pixi/BoardFrame.jsx";
import TopBar from "./pixi/TopBar.jsx";
import GameLogo from "./pixi/GameLogo.jsx";
import GameMessage from "./pixi/GameMessage.jsx";
import BetPanel from "./pixi/BetPanel.jsx";
import SettingsButton from "./pixi/SettingsButton.jsx";
import SoundButton from "./pixi/sound.jsx";
import BalancePanel from "./pixi/BalancePanel.jsx";
import AutoSpinButton from "./pixi/autoSpinButton.jsx";
import PaytableButton from "./pixi/PaytableButton.jsx";

/*
 * import BuyBonusPanel from "./components/BuyBonusPanel.jsx";
 *
 * BuyBonusPanel never landed on disk; the file path above would
 * fail to resolve at build time. Commented out during the
 * 2026-06-22 dead-code pass. If a future buy-bonus feature is
 * reintroduced, restore the import + render it inside <HUD>.
 */
import "./app.css";


// Register Pixi v8 classes as JSX elements. Without this, the
// <pixiContainer>, <pixiSprite>, <pixiText> tags will not render.
extend({ Container, Sprite, Text, Graphics });

function HUD() {
    // Suspends until the active game's asset bundle is loaded.
    // While suspended, the <Suspense fallback={<LoadingScreen />}>
    // in main.jsx shows the live progress bar driven by the
    // underlying Preloader singleton.
    useGameAssets();

    useEffect(() => {
        // Pre-warm the most common button sounds so the very
        // first press is loud instead of fading in.
        ButtonSound.preload([
            "spin",
            "lobby",
            "paytable",
            "settings",
            "sound",
            "autoSpin",
            "betPlus",
            "betMinus",
        ]);
        // Wires the slot socket handlers (SPIN_RESULT /
        // JACKPOT_UPDATE / FREE_SPIN_UPDATE) onto the EventBus.
        // Called once at boot — a second call would register a
        // duplicate handler set and double-fire each event.
        SlotEngine.initialize();
    }, []);

    // Side-effect-only listeners: these push values into the
    // Zustand store, which already re-renders the relevant
    // components. Cascade-driven overlays (PixiOverlay,
    // PixiGrid, PixiEffects) subscribe via `useEventBus`
    // directly so they only re-render when their specific
    // event fires — not on every emit.
    useEventBusEffect(
        "SPIN_COMPLETE",
        (result) => {
            useGameStore.setState({ grid: result.grid });
        },
        []
    );

    useEventBusEffect(
        "WIN_CALCULATED",
        ({ totalWin, tumbleWin }) => {
            useGameStore.setState({
                currentWin: tumbleWin,
                totalWin,
            });
        },
        []
    );

    useEventBusEffect(
        "WIN_COMPLETE",
        (win) => {
            useGameStore.setState({ totalWin: win });
        },
        []
    );

    useEventBusEffect(
        "BONUS_TRIGGERED",
        (bonus) => {
            // Award table is now resolved on the engine side
            // (see `BonusEngine.checkTrigger`) — it walks
            // `gameConfig.freeSpins.awards` for the largest
            // matching scatter count, so the same `4 → 10`,
            // `5 → 12`, `6 → 15`, `7 → 20` ladder the paytable
            // uses. We just record the total for this run.
            const freeSpins = bonus?.freeSpins ?? 0;
            if (freeSpins > 0) {
                useGameStore.setState((state) => ({
                    freeSpins: state.freeSpins + freeSpins,
                }));
            }
        },
        []
    );

    useEventBusEffect(
        "JACKPOT_WON",
        () => {
            // Jackpot amount is read directly from the engine
            // by listeners that care (e.g. JackpotDisplay).
            // No state push here — the jackpot pool is owned by
            // JackpotEngine, not the store.
        },
        []
    );

    return (
        <>
            <BackgroundMusic />
            <PixiStage />
            <FreeSpinDisplay />
        </>
    );
}

/**
 * PixiStage
 *
 * The single <Application> for the whole game. Every overlay —
 * including the formerly-DOM TopBar, GameLogo, and SpinButton —
 * renders inside the Pixi reconciler so they share the same
 * coordinate system as BetPanel / SettingsButton / SoundButton.
 */
function PixiStage() {
    return (
        <Application
            width={1280}
            height={720}
            background={0x0b0d12}
            antialias
            autoDensity
        >
            <pixiContainer>
                <Background />
                <BoardFrame />
                <PixiGrid />
                <PixiOverlay />
                <PixiEffects />
                <TopBar />
                <GameLogo />
                <GameMessage />
                <SpinButton />
                <BetPanel />
                <SettingsButton />
                <SoundButton />
                <BalancePanel />
                <AutoSpinButton />
                <PaytableButton />
                <SettingsPopup />
                <PaytablePopup />
                <AutoSpinPopup />
            </pixiContainer>
        </Application >

    );
}

export default HUD;